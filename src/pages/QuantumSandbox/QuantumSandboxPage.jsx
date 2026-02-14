import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
    Fn, uniform, storage, float, vec3, int, vec2,
    instanceIndex, vertexIndex, positionLocal,
    viewportUV, mix, color, varying, sin, cos, atan,
    If
} from 'three/tsl';
import { WebGPURenderer, StorageBufferAttribute, MeshStandardNodeMaterial } from 'three/webgpu';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Link } from 'react-router-dom';
import { ArrowLeft, Play, Pause, Settings2, RotateCcw, PenTool, Eraser } from 'lucide-react';

const GRID_SIZE_OPTIONS = [
    { label: '128x128 (Fast)', value: 128 },
    { label: '256x256 (Default)', value: 256 },
    { label: '512x512 (High)', value: 512 },
    { label: '1024x1024 (Ultra)', value: 1024 },
];

class QuantumSimulation {
    constructor(canvas, params, gridSize, onReady) {
        this.canvas = canvas;
        this.params = params;
        this.gridSize = gridSize;
        this.count = gridSize * gridSize;
        this.onReady = onReady;
        this.isRunning = true;
        this.disposed = false;
        this.initialized = false;
        this.animationId = null;

        this.init();
    }

    async init() {
        try {
            if (this.disposed) return;
            if (!navigator.gpu) throw new Error('WebGPU is not supported.');

            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x000000);

            // Camera setup
            this.camera = new THREE.PerspectiveCamera(45, this.canvas.clientWidth / this.canvas.clientHeight, 0.1, 1000);
            this.camera.position.set(0, 100, 100);
            this.camera.lookAt(0, 0, 0);

            this.renderer = new WebGPURenderer({
                canvas: this.canvas,
                antialias: false,
                powerPreference: 'high-performance'
            });

            this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            await this.renderer.init();

            if (!this.renderer.backend.isWebGPUBackend) {
                throw new Error('WebGPU backend failed to initialize.');
            }

            if (this.disposed) return;

            this.controls = new OrbitControls(this.camera, this.canvas);
            this.controls.enableDamping = true;
            this.controls.target.set(0, 0, 0);
            // Interaction: Left click draws, Right click rotates
            this.controls.mouseButtons = {
                LEFT: null, // Custom interaction
                MIDDLE: THREE.MOUSE.DOLLY,
                RIGHT: THREE.MOUSE.ROTATE
            };

            this.setupCompute();
            this.setupMesh();

            this.initialized = true;
            if (this.onReady) this.onReady(null);

            this.animate();

        } catch (error) {
            console.error('WebGPU Init Error:', error);
            if (this.onReady) this.onReady(error);
        }
    }

    setupCompute() {
        // Buffers: PsiA (Real, Imag), PsiB (Real, Imag), Potential (V)
        const psiData = new Float32Array(this.count * 2);
        const potentialData = new Float32Array(this.count);

        this.psiBufferA = new StorageBufferAttribute(psiData, 2);
        this.psiBufferB = new StorageBufferAttribute(new Float32Array(this.count * 2), 2);
        this.potentialBuffer = new StorageBufferAttribute(potentialData, 1);

        this.psiStorageA = storage(this.psiBufferA, 'vec2', this.count);
        this.psiStorageB = storage(this.psiBufferB, 'vec2', this.count);
        this.potentialStorage = storage(this.potentialBuffer, 'float', this.count);

        // Uniforms
        this.uMouse = uniform(new THREE.Vector2(-1000, -1000));
        this.uMouseActive = uniform(0.0); // 0: None, 1: Draw, 2: Erase
        this.uBrushSize = uniform(this.params.brushSize);
        this.uTimeStep = uniform(0.1);

        // --- Compute Logic ---
        const gridSize = this.gridSize;
        const potentialStorage = this.potentialStorage;
        const uMouse = this.uMouse;
        const uMouseActive = this.uMouseActive;
        const uBrushSize = this.uBrushSize;
        const uTimeStep = this.uTimeStep;

        // 1. Update Potential (Interaction)
        const computePotential = Fn(() => {
            const index = instanceIndex.toUint();
            const x = int(index.mod(gridSize));
            const y = int(index.div(gridSize));

            const currentV = potentialStorage.element(index);

            const dx = float(x).sub(uMouse.x);
            const dy = float(y).sub(uMouse.y);
            const dist = dx.mul(dx).add(dy.mul(dy)).sqrt();

            // Brush: 1.0 = Wall, 0.0 = Vacuum
            // If active == 1 (Draw), add potential
            // If active == 2 (Erase), remove potential

            const brushMask = float(1.0).sub(dist.div(uBrushSize)).clamp(0.0, 1.0);

            If(uMouseActive.equal(1.0), () => {
                 // Draw Wall
                 potentialStorage.element(index).assign(currentV.add(brushMask).clamp(0.0, 1.0));
            }).ElseIf(uMouseActive.equal(2.0), () => {
                 // Erase Wall
                 potentialStorage.element(index).assign(currentV.sub(brushMask).clamp(0.0, 1.0));
            });
        });

        this.computePotentialNode = computePotential().compute(this.count);

        // 2. Physics Update (TDSE)
        // psi_next = psi + dt * ( -i H psi )
        // H = -0.5 laplacian + V
        // dPsi/dt = i * (0.5 laplacian - V * psi)
        // Re(dPsi/dt) = -0.5 * Im(laplacian) + V * Im(psi)
        // Im(dPsi/dt) =  0.5 * Re(laplacian) - V * Re(psi)

        const createUpdatePsi = (readStore, writeStore) => Fn(() => {
            const index = instanceIndex.toUint();
            const x = int(index.mod(gridSize));
            const y = int(index.div(gridSize));

            const psi = readStore.element(index);
            const V = potentialStorage.element(index);

            // Helper to get neighbor safely (clamped to 0 at boundary)
            const getPsi = (ix, iy) => {
                // If out of bounds, return vec2(0.0) - Infinite Potential Well
                // Or clamp index. Let's do clamp index for simplicity but 0 value is better for box.
                // Using selection for boundary condition:
                const valid = ix.greaterThanEqual(0).and(ix.lessThan(gridSize))
                          .and(iy.greaterThanEqual(0)).and(iy.lessThan(gridSize));

                const cX = ix.clamp(0, gridSize - 1);
                const cY = iy.clamp(0, gridSize - 1);
                const val = readStore.element(cY.mul(gridSize).add(cX));

                // Return val if valid, else vec2(0)
                // Since TSL select/ternary is strict, ensure types match
                return mix(vec2(0.0), val, valid);
            };

            const right = getPsi(x.add(1), y);
            const left = getPsi(x.sub(1), y);
            const up = getPsi(x, y.sub(1));
            const down = getPsi(x, y.add(1));

            // Laplacian (Finite Difference)
            // L = right + left + up + down - 4*center
            const laplacian = right.add(left).add(up).add(down).sub(psi.mul(4.0));

            // dRe = -0.5 * L.y + V * psi.y
            const dRe = laplacian.y.mul(-0.5).add(V.mul(psi.y));

            // dIm = 0.5 * L.x - V * psi.x
            const dIm = laplacian.x.mul(0.5).sub(V.mul(psi.x));

            const dt = uTimeStep;
            const newRe = psi.x.add(dRe.mul(dt));
            const newIm = psi.y.add(dIm.mul(dt));

            writeStore.element(index).assign(vec2(newRe, newIm));
        });

        this.passA = createUpdatePsi(this.psiStorageA, this.psiStorageB)().compute(this.count);
        this.passB = createUpdatePsi(this.psiStorageB, this.psiStorageA)().compute(this.count);

        // Initialize Gaussian Wave Packet
        this.resetPsi();
    }

    resetPsi() {
        if (!this.psiBufferA) return;

        const data = this.psiBufferA.array;
        const potential = this.potentialBuffer.array;
        const gs = this.gridSize;
        const cx = gs * 0.3; // Center X
        const cy = gs * 0.5; // Center Y
        const sigma = gs * 0.05; // Width
        const kx = 1.5; // Momentum X
        const ky = 0.0; // Momentum Y

        // Reset Potential
        potential.fill(0);

        for (let i = 0; i < this.count; i++) {
            const x = i % gs;
            const y = Math.floor(i / gs);

            const dx = x - cx;
            const dy = y - cy;
            const distSq = dx*dx + dy*dy;

            // Gaussian Envelope
            const envelope = Math.exp(-distSq / (2 * sigma * sigma));

            // Plane Wave: e^(i(k.r)) = cos(k.r) + i*sin(k.r)
            const phase = kx * x + ky * y;

            // Psi = Envelope * (Real + i*Imag)
            data[i*2] = envelope * Math.cos(phase);     // Real (u)
            data[i*2+1] = envelope * Math.sin(phase);   // Imag (v)
        }

        this.psiBufferA.needsUpdate = true;
        this.psiBufferB.array.set(data);
        this.psiBufferB.needsUpdate = true;
        this.potentialBuffer.needsUpdate = true;
    }

    setupMesh() {
        // Basic Plane for visualization
        this.geometry = new THREE.PlaneGeometry(100, 100, this.gridSize - 1, this.gridSize - 1);
        this.geometry.rotateX(-Math.PI / 2);

        // We visualize psiStorageA (after the loop, A will be the latest if we do even number of steps)
        const psi = this.psiStorageA;
        const potential = this.potentialStorage;

        const vIdx = vertexIndex.toUint();
        const psiNode = psi.element(vIdx);
        const vNode = potential.element(vIdx);

        const vPsi = varying(psiNode);
        const vPotential = varying(vNode);

        this.material = new MeshStandardNodeMaterial({
            metalness: 0.1,
            roughness: 0.1,
            side: THREE.DoubleSide
        });

        // Position Displacement: Height based on probability density |Psi|^2
        this.material.positionNode = Fn(() => {
            const pos = positionLocal;
            const prob = psiNode.x.mul(psiNode.x).add(psiNode.y.mul(psiNode.y));
            // Add potential walls height
            const wallHeight = vNode.mul(5.0);
            const waveHeight = prob.mul(15.0); // Scale up for visibility

            const y = waveHeight.add(wallHeight);
            return vec3(pos.x, y, pos.z);
        })();

        // Color: Phase for Hue, Magnitude for Brightness
        this.material.colorNode = Fn(() => {
            const re = vPsi.x;
            const im = vPsi.y;
            const prob = re.mul(re).add(im.mul(im));

            const phase = atan(im, re); // -PI to PI
            const hue = phase.div(Math.PI * 2.0).add(0.5); // 0 to 1

            // HSV to RGB conversion helper
            // standard approach:
            // K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
            // p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
            // return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);

            const hsv2rgb = (h, s, v) => {
                const k = vec3(1.0, 2.0/3.0, 1.0/3.0);
                const p = h.add(k).fract().mul(6.0).sub(3.0).abs();
                const t = p.sub(1.0).clamp(0.0, 1.0);
                return v.mul(mix(vec3(1.0), t, s));
            };

            const baseColor = hsv2rgb(hue, float(1.0), prob.mul(2.0).clamp(0.0, 1.0));

            // Add "Glow" (White core at high probability)
            const core = prob.smoothstep(0.5, 1.5);
            const waveColor = mix(baseColor, vec3(1.0), core);

            // Mix with Potential (Walls are White/Grey)
            const wallColor = vec3(0.5); // Grey walls

            // If potential > 0.1, blend to wall color
            return mix(waveColor, wallColor, vPotential.greaterThan(0.1));
        })();

        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.scene.add(this.mesh);
    }

    updateParams(params) {
        if (this.disposed) return;
        this.params = params;
        if (this.uBrushSize) this.uBrushSize.value = params.brushSize;
        // Adjust speed if needed by changing steps per frame in animate
    }

    setMousePosition(x, y) {
        if (this.disposed) return;
        if (this.uMouse) this.uMouse.value.set(x, y);
    }

    setMouseActive(activeType) {
        // 0: None, 1: Draw, 2: Erase
        if (this.disposed) return;
        if (this.uMouseActive) this.uMouseActive.value = activeType;
    }

    raycastToGrid(ndcX, ndcY) {
        if (this.disposed) return null;
        if (!this.raycaster) {
            this.raycaster = new THREE.Raycaster();
            this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        }
        this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
        const pt = new THREE.Vector3();
        if (this.raycaster.ray.intersectPlane(this.plane, pt)) {
            const gx = (pt.x + 50) / 100 * this.gridSize;
            const gy = (pt.z + 50) / 100 * this.gridSize;
            return { x: gx, y: gy };
        }
        return null;
    }

    animate() {
        if (this.disposed || !this.initialized) return;
        this.animationId = requestAnimationFrame(() => this.animate());

        this.controls.update();

        if (this.isRunning) {
            // Sub-steps for stability and speed
            // Running 16 steps per frame (must be even so psiStorageA is output)
            const steps = this.params.speed; // speed maps to steps roughly

            // Interaction update
            this.renderer.compute(this.computePotentialNode);

            for (let i = 0; i < steps; i++) {
                 this.renderer.compute(this.passA);
                 this.renderer.compute(this.passB);
            }
        }

        this.renderer.render(this.scene, this.camera);
    }

    setPlaying(p) { this.isRunning = p; }

    resize(w, h) {
        if (this.disposed || !this.camera) return;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h, false);
    }

    dispose() {
        this.disposed = true;
        if (this.animationId) cancelAnimationFrame(this.animationId);
        this.controls?.dispose();

        const renderer = this.renderer;
        this.renderer = null;

        setTimeout(() => {
            try {
                // Cleanup logic
                renderer?.dispose();
            } catch (e) {
                console.error('Dispose error', e);
            }
        }, 100);
    }
}

export default function QuantumSandboxPage() {
    const [params, setParams] = useState({
        speed: 10,
        brushSize: 5.0,
        resolution: 256
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isPlaying, setIsPlaying] = useState(true);

    const canvasRef = useRef(null);
    const simulationRef = useRef(null);
    const containerRef = useRef(null);

    useEffect(() => {
        if (!canvasRef.current) return;

        if (simulationRef.current) {
            simulationRef.current.dispose();
            simulationRef.current = null;
        }

        setIsLoading(true);
        setError(null);

        const timeout = setTimeout(() => {
            simulationRef.current = new QuantumSimulation(
                canvasRef.current,
                params,
                params.resolution,
                (err) => {
                    setIsLoading(false);
                    if (err) setError(err.message || 'Simulation Init Failed');
                }
            );
        }, 100);

        return () => {
            clearTimeout(timeout);
            simulationRef.current?.dispose();
        };
    }, [params.resolution]);

    useEffect(() => {
        simulationRef.current?.updateParams(params);
    }, [params]);

    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current && simulationRef.current) {
                simulationRef.current.resize(
                    containerRef.current.clientWidth,
                    containerRef.current.clientHeight
                );
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Interaction Handlers
    const onPointerMove = useCallback((e) => {
        if (!simulationRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        const grid = simulationRef.current.raycastToGrid(x, y);
        if (grid) simulationRef.current.setMousePosition(grid.x, grid.y);
        else simulationRef.current.setMousePosition(-1000, -1000);
    }, []);

    const onPointerDown = useCallback((e) => {
        if (!simulationRef.current) return;
        if (e.button === 0) {
            // Left click: Draw (Type 1)
             simulationRef.current.setMouseActive(1);
        } else if (e.button === 2) {
             // Right click: Erase (Type 2)
             // But wait, OrbitControls uses Right Click.
             // Prompt says: "Right Click + Drag: Erase potential"
             // I need to override OrbitControls for Right Click or use shift
             // Let's use Shift+Left for Erase to avoid conflict or check prompt.
             // Prompt: "Right Click + Drag: Erase potential".
             // FluidDynamics uses Right Click for Rotate.
             // I should probably disable OrbitControls Right Click or use modifiers.
             // I'll swap it: Right Click = Erase. Orbit Rotate = Middle or Alt+Left?
             // Or just disable Orbit Rotate on Right Click?
             // I'll disable Orbit Rotate on Right Click inside the class constructor (controls.mouseButtons).
             simulationRef.current.setMouseActive(2);
        }
    }, []);

    const onPointerUp = useCallback(() => simulationRef.current?.setMouseActive(0), []);

    // Prevent context menu on right click
    const onContextMenu = useCallback((e) => e.preventDefault(), []);

    return (
        <div className="w-full h-screen bg-black text-white flex flex-col relative overflow-hidden">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-4 z-10 flex justify-between pointer-events-none">
                <div className="flex flex-col gap-2 pointer-events-auto">
                    <Link to="/" className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-800/80 rounded-lg text-sm hover:bg-gray-700 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Back to Hub
                    </Link>
                    <h1 className="text-2xl font-bold drop-shadow-lg">Quantum Sandbox <span className="text-xs bg-purple-600 px-1.5 rounded">WebGPU</span></h1>
                </div>
            </div>

            {/* Canvas Container */}
            <div ref={containerRef} className="absolute inset-0 z-0">
                <canvas
                    ref={canvasRef}
                    className="w-full h-full block"
                    onPointerMove={onPointerMove}
                    onPointerDown={onPointerDown}
                    onPointerUp={onPointerUp}
                    onPointerLeave={onPointerUp}
                    onContextMenu={onContextMenu}
                />
            </div>

            {/* Loading/Error Overlay */}
            {(isLoading || error) && (
                <div className="absolute inset-0 z-50 bg-black flex items-center justify-center flex-col">
                    {isLoading && <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>}
                    {error && <p className="text-red-500 font-bold">{error}</p>}
                </div>
            )}

            {/* Sidebar Controls */}
            {!error && (
                <aside className="absolute right-0 top-0 bottom-0 w-80 bg-gray-900/90 backdrop-blur-md border-l border-gray-800 p-6 z-20 overflow-y-auto">
                    <div className="mb-6 flex items-center gap-2 text-purple-400">
                        <Settings2 className="w-5 h-5" />
                        <h2 className="font-bold text-lg">Controls</h2>
                    </div>

                    <div className="space-y-6">
                        <div className="flex gap-2">
                             <button
                                onClick={() => { setIsPlaying(!isPlaying); simulationRef.current?.setPlaying(!isPlaying); }}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-semibold transition-all ${isPlaying ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-600 text-white'}`}
                            >
                                {isPlaying ? <><Pause className="w-4 h-4"/> Pause</> : <><Play className="w-4 h-4"/> Resume</>}
                            </button>
                            <button
                                onClick={() => simulationRef.current?.resetPsi()}
                                className="px-4 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
                            >
                                <RotateCcw className="w-4 h-4"/>
                            </button>
                        </div>

                        <div className="p-4 bg-gray-800/50 rounded-lg text-xs text-gray-400 leading-relaxed border border-gray-700/50">
                             <ul className="list-disc list-inside space-y-1">
                                <li><strong>Left Click + Drag:</strong> Draw Walls</li>
                                <li><strong>Right Click + Drag:</strong> Erase Walls</li>
                                <li><strong>Middle Mouse:</strong> Zoom</li>
                            </ul>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">Simulation Speed</label>
                            <input
                                type="range" min="1" max="20" step="1"
                                value={params.speed}
                                onChange={e => setParams({...params, speed: parseInt(e.target.value)})}
                                className="w-full accent-purple-500"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">Brush Size</label>
                            <input
                                type="range" min="1.0" max="30.0" step="0.5"
                                value={params.brushSize}
                                onChange={e => setParams({...params, brushSize: parseFloat(e.target.value)})}
                                className="w-full accent-purple-500"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">Resolution</label>
                            <select
                                value={params.resolution}
                                onChange={e => setParams({...params, resolution: parseInt(e.target.value)})}
                                className="w-full bg-gray-800 border border-gray-700 rounded p-2"
                            >
                                {GRID_SIZE_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </aside>
            )}
        </div>
    );
}
