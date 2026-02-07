import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
    Fn, uniform, storage, float, vec3, int,
    instanceIndex, vertexIndex, positionLocal,
    viewportUV, mix, color
} from 'three/tsl';
import { WebGPURenderer, StorageBufferAttribute, MeshStandardNodeMaterial } from 'three/webgpu';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Link } from 'react-router-dom';
import { ArrowLeft, Play, Pause, Settings2, MousePointer2, AlertCircle, RotateCcw, CloudRain } from 'lucide-react';

const RESOLUTION_OPTIONS = [
    { label: '64x64 (Low)', value: 64 },
    { label: '128x128 (Medium)', value: 128 },
    { label: '256x256 (High)', value: 256 },
    { label: '512x512 (Ultra)', value: 512 },
];

class WebGPUWaterSimulation {
    constructor(canvas, params, gridSize, onReady) {
        this.canvas = canvas;
        this.params = params;
        this.onReady = onReady;
        this.isRunning = true;
        this.animationId = null;
        this.initialized = false;
        this.disposed = false;
        this.gridSize = gridSize;
        this.count = gridSize * gridSize;
        this.rainTriggered = false;

        this.init();
    }

    async init() {
        try {
            if (this.disposed) return;

            if (!navigator.gpu) {
                throw new Error('WebGPU is not supported.');
            }

            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x0f172a);

            this.camera = new THREE.PerspectiveCamera(45, this.canvas.clientWidth / this.canvas.clientHeight, 0.1, 1000);
            this.camera.position.set(0, 80, 80);
            this.camera.lookAt(0, 0, 0);

            this.renderer = new WebGPURenderer({
                canvas: this.canvas,
                antialias: false, // Disabled for stability
                powerPreference: 'high-performance'
            });

            this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

            await this.renderer.init();

            if (this.disposed) return;

            this.controls = new OrbitControls(this.camera, this.canvas);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.target.set(0, 0, 0);

            // Interaction Configuration:
            // LEFT: Ripples (Custom) - Disable Orbit
            // MIDDLE: Zoom (Dolly)
            // RIGHT: Rotate
            // SHIFT + RIGHT: Pan (Handled via key listeners below)
            this.controls.mouseButtons = {
                LEFT: null,
                MIDDLE: THREE.MOUSE.DOLLY,
                RIGHT: THREE.MOUSE.ROTATE
            };

            this.setupCompute();
            this.setupWaterMesh();
            this.setupLights();
            this.setupBackground();
            this.createInitialRipples();

            this.initialized = true;

            if (this.onReady) this.onReady(null);

            this.animate();

        } catch (error) {
            console.error('WebGPU Init Error:', error);
            if (this.onReady) this.onReady(error);
        }
    }

    setupBackground() {
        const colA = color(new THREE.Color(0x0f172a)); // Deep slate
        const colB = color(new THREE.Color(0x1e293b)); // Lighter slate
        this.scene.backgroundNode = mix(colB, colA, viewportUV.y);

        // Procedural environment map
        const width = 256;
        const height = 128;
        const size = width * height;
        const data = new Uint8Array(4 * size);

        for (let i = 0; i < size; i++) {
            const y = Math.floor(i / width);
            const v = y / height;

            let r, g, b;

            if (v < 0.5) {
                // Sky (top half) - lighter blue to white
                const t = v * 2;
                r = Math.floor(THREE.MathUtils.lerp(135, 255, t));
                g = Math.floor(THREE.MathUtils.lerp(206, 255, t));
                b = Math.floor(THREE.MathUtils.lerp(235, 255, t));
            } else {
                // Ground/Sea (bottom half) - dark blue
                const t = (v - 0.5) * 2;
                r = Math.floor(THREE.MathUtils.lerp(255, 15, t));
                g = Math.floor(THREE.MathUtils.lerp(255, 23, t));
                b = Math.floor(THREE.MathUtils.lerp(255, 42, t));
            }

            data[i * 4] = r;
            data[i * 4 + 1] = g;
            data[i * 4 + 2] = b;
            data[i * 4 + 3] = 255;
        }

        const envTexture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
        envTexture.colorSpace = THREE.SRGBColorSpace;
        envTexture.mapping = THREE.EquirectangularReflectionMapping;
        envTexture.needsUpdate = true;

        this.scene.environment = envTexture;
        this.scene.environmentIntensity = 1.0;
    }

    setupCompute() {
        // Two buffers: Height (Position) and Velocity
        const heightData = new Float32Array(this.count);
        const velocityData = new Float32Array(this.count);

        this.heightBuffer = new StorageBufferAttribute(heightData, 1);
        this.velocityBuffer = new StorageBufferAttribute(velocityData, 1);

        this.heightStorage = storage(this.heightBuffer, 'float', this.count);
        this.velocityStorage = storage(this.velocityBuffer, 'float', this.count);

        // Uniforms
        this.uMouse = uniform(new THREE.Vector2(-1000, -1000));
        this.uMouseActive = uniform(0.0);
        this.uDamping = uniform(this.params.damping);
        this.uBrushSize = uniform(this.params.brushSize);
        this.uBrushStrength = uniform(this.params.brushStrength);
        this.uSpeed = uniform(this.params.speed);

        // Rain Uniforms
        this.uRainPos = uniform(new THREE.Vector2(-1000, -1000));
        this.uRainActive = uniform(0.0);
        this.uRainSize = uniform(2.0);
        this.uRainStrength = uniform(3.0);

        const gridSize = this.gridSize;
        const heightStorage = this.heightStorage;
        const velocityStorage = this.velocityStorage;

        // --- Pass 1: Update Velocity (Force Calculation) ---
        // Reads Height (neighbors), Reads/Writes Velocity
        const computeVelocity = Fn(() => {
            const index = instanceIndex.toUint();
            const x = int(index.mod(gridSize));
            const y = int(index.div(gridSize));

            const currentH = heightStorage.element(index);
            const currentV = velocityStorage.element(index);
            const getH = (ix, iy) => {
                const cX = ix.clamp(0, gridSize - 1);
                const cY = iy.clamp(0, gridSize - 1);
                return heightStorage.element(cY.mul(gridSize).add(cX));
            };

            const right = getH(x.add(1), y);
            const left = getH(x.sub(1), y);
            const up = getH(x, y.sub(1));
            const down = getH(x, y.add(1));

            // Laplacian: sum(neighbors) - 4*current
            const laplacian = right.add(left).add(up).add(down).sub(currentH.mul(4.0));
            const accel = laplacian.mul(this.uSpeed).mul(0.5); // Speed factor

            // Mouse Interaction (Force)
            const mousePos = this.uMouse;
            const dx = float(x).sub(mousePos.x);
            const dy = float(y).sub(mousePos.y);
            const dist = dx.mul(dx).add(dy.mul(dy)).sqrt();
            const brush = this.uBrushStrength.mul(
                float(1.0).sub(dist.div(this.uBrushSize)).clamp(0.0, 1.0)
            ).mul(this.uMouseActive).mul(0.1);

            // Rain Interaction (Force)
            const rainPos = this.uRainPos;
            const rdx = float(x).sub(rainPos.x);
            const rdy = float(y).sub(rainPos.y);
            const rdist = rdx.mul(rdx).add(rdy.mul(rdy)).sqrt();
            const rain = this.uRainStrength.mul(
                float(1.0).sub(rdist.div(this.uRainSize)).clamp(0.0, 1.0)
            ).mul(this.uRainActive).mul(0.1);

            // v_new = (v + a + brush + rain) * damping
            const newV = currentV.add(accel).add(brush).add(rain).mul(this.uDamping);

            velocityStorage.element(index).assign(newV);
        });

        // --- Pass 2: Update Height (Advection) ---
        // Reads Velocity, Reads/Writes Height
        const computeHeight = Fn(() => {
            const index = instanceIndex.toUint();
            const v = velocityStorage.element(index);
            const h = heightStorage.element(index);

            // h_new = h + v
            heightStorage.element(index).assign(h.add(v));
        });

        this.computeVelocityNode = computeVelocity().compute(this.count);
        this.computeHeightNode = computeHeight().compute(this.count);
    }

    setupWaterMesh() {
        this.geometry = new THREE.PlaneGeometry(100, 100, this.gridSize - 1, this.gridSize - 1);
        this.geometry.rotateX(-Math.PI / 2);

        const heightStorage = this.heightStorage;
        this.uColor = uniform(new THREE.Color(this.params.color));
        const gridSize = this.gridSize;

        try {
            this.material = new MeshStandardNodeMaterial({
                metalness: 0.1,
                roughness: 0.02,
                side: THREE.DoubleSide,
            });

            this.material.colorNode = this.uColor;

            const heightScale = float(5.0);

            // Vertex Displacement
            this.material.positionNode = Fn(() => {
                const idx = vertexIndex.toUint();
                const h = heightStorage.element(idx);
                const pos = positionLocal;
                return vec3(pos.x, h.mul(heightScale), pos.z);
            })();

            // Normal Recalculation
            this.material.normalNode = Fn(() => {
                const idx = vertexIndex.toUint();
                const x = int(idx.mod(gridSize));
                const y = int(idx.div(gridSize));

                const getH = (ix, iy) => {
                    const cX = ix.clamp(0, gridSize - 1);
                    const cY = iy.clamp(0, gridSize - 1);
                    return heightStorage.element(cY.mul(gridSize).add(cX));
                };

                const hL = getH(x.sub(1), y);
                const hR = getH(x.add(1), y);
                const hD = getH(x, y.sub(1));
                const hU = getH(x, y.add(1));

                const scale = heightScale.mul(2.0);
                const dx = hR.sub(hL).mul(scale);
                const dy = hU.sub(hD).mul(scale);
                const gridSpacing = float(100.0 / gridSize);

                return vec3(dx.negate(), gridSpacing.mul(2.0), dy.negate()).normalize();
            })();

        } catch (e) {
            console.warn("Material fallback", e);
            this.material = new THREE.MeshStandardMaterial({ color: 0x0088ff });
        }

        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.frustumCulled = false;
        this.scene.add(this.mesh);
    }

    setupLights() {
        const hemiLight = new THREE.HemisphereLight(0x88ccff, 0x224466, 0.6);
        this.scene.add(hemiLight);
        const sunLight = new THREE.DirectionalLight(0xffffee, 1.2);
        sunLight.position.set(30, 50, 20);
        this.scene.add(sunLight);

        const fillLight = new THREE.DirectionalLight(0x8888ff, 0.4);
        fillLight.position.set(-30, 20, -20);
        this.scene.add(fillLight);

        const rimLight = new THREE.PointLight(0xffffff, 0.8, 150);
        rimLight.position.set(0, 30, -50);
        this.scene.add(rimLight);
        const accentLight = new THREE.PointLight(0x00ffff, 0.6, 120);
        accentLight.position.set(-40, 15, 40);
        this.scene.add(accentLight);
    }

    createInitialRipples() {
        const h = this.heightBuffer.array;
        const center = Math.floor(this.count / 2 + this.gridSize / 2);
        h[center] = 5.0;
        this.heightBuffer.needsUpdate = true;
    }

    setMousePosition(x, y) {
        if (this.disposed) return;
        if (this.uMouse) this.uMouse.value.set(x, y);
    }

    setMouseActive(active) {
        if (this.disposed) return;
        if (this.uMouseActive) this.uMouseActive.value = active ? 1.0 : 0.0;
    }

    triggerRainDrop() {
        if (this.disposed) return;
        if (!this.uRainPos || !this.uRainActive) return;

        const x = Math.random() * this.gridSize;
        const y = Math.random() * this.gridSize;

        this.uRainPos.value.set(x, y);
        this.uRainActive.value = 1.0;

        this.rainTriggered = true;
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

    updateParams(params) {
        if (this.disposed) return;
        this.params = params;
        if (this.uDamping) this.uDamping.value = params.damping;
        if (this.uBrushSize) this.uBrushSize.value = params.brushSize;
        if (this.uBrushStrength) this.uBrushStrength.value = params.brushStrength;
        if (this.uSpeed) this.uSpeed.value = params.speed;
        if (this.uColor) this.uColor.value.set(params.color);
    }

    setPlaying(p) { this.isRunning = p; }

    reset() {
        if (this.disposed) return;
        this.heightBuffer.array.fill(0);
        this.velocityBuffer.array.fill(0);
        this.heightBuffer.needsUpdate = true;
        this.velocityBuffer.needsUpdate = true;
        this.createInitialRipples();
    }

    animate() {
        if (this.disposed || !this.initialized) return;
        this.animationId = requestAnimationFrame(() => this.animate());

        this.controls.update();

        if (this.isRunning) {
            this.renderer.compute(this.computeVelocityNode);
            this.renderer.compute(this.computeHeightNode);

            // Reset rain after one frame
            if (this.rainTriggered) {
                this.rainTriggered = false;
                if (this.uRainActive) this.uRainActive.value = 0.0;
            }
        }

        this.renderer.render(this.scene, this.camera);
    }

    resize(w, h) {
        if (this.disposed || !this.camera) return;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
    }

    cleanupScene() {
        if (this.scene) {
            this.scene.traverse((object) => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(m => m.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
            if (this.scene.environment) this.scene.environment.dispose();
            if (this.scene.background && this.scene.background.isTexture) {
                this.scene.background.dispose();
            }
        }
    }

    dispose() {
        this.disposed = true;
        if (this.animationId) cancelAnimationFrame(this.animationId);
        this.controls?.dispose();

        const renderer = this.renderer;
        this.renderer = null;

        if (renderer) {
            // Delay disposal slightly to allow pending GPU commands to finish
            // This prevents "Buffer destroyed" errors if the loop was just active
            // We also move cleanupScene here to ensure resources aren't freed while GPU is busy
            setTimeout(() => {
                try {
                    this.cleanupScene();
                    renderer.dispose();
                } catch (e) {
                    console.error('Error disposing WebGPU renderer:', e);
                }
            }, 100);
        } else {
            this.cleanupScene();
        }
    }
}

export default function ExperimentalFluidPage() {
    const [params, setParams] = useState({
        damping: 0.98,
        speed: 0.5,
        brushSize: 8.0,
        brushStrength: 5.0,
        color: '#0088ff'
    });
    const [resolution, setResolution] = useState(256);
    const [isPlaying, setIsPlaying] = useState(true);
    const [isRaining, setIsRaining] = useState(false);
    const [rainIntensity, setRainIntensity] = useState(5);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

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
            simulationRef.current = new WebGPUWaterSimulation(
                canvasRef.current,
                params,
                resolution,
                (err) => {
                    setIsLoading(false);
                    if (err) setError(err.message || 'WebGPU Init Failed');
                }
            );
        }, 100);

        return () => {
            clearTimeout(timeout);
            simulationRef.current?.dispose();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resolution]);

    useEffect(() => {
        simulationRef.current?.updateParams(params);
    }, [params]);

    useEffect(() => {
        simulationRef.current?.setPlaying(isPlaying);
    }, [isPlaying]);

    useEffect(() => {
        if (!isRaining || !isPlaying) return;

        const minDelay = 10;
        const maxDelay = 500;
        const delay = maxDelay - ((rainIntensity - 1) / 9) * (maxDelay - minDelay);

        const interval = setInterval(() => {
            if (simulationRef.current && Math.random() > 0.3) {
                simulationRef.current.triggerRainDrop();
            }
        }, delay);

        return () => clearInterval(interval);
    }, [isRaining, rainIntensity, isPlaying]);

    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current && simulationRef.current) {
                const { clientWidth, clientHeight } = containerRef.current;
                simulationRef.current.resize(clientWidth, clientHeight);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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
        if (e.button === 0) simulationRef.current?.setMouseActive(true);
    }, []);

    const onPointerUp = useCallback(() => simulationRef.current?.setMouseActive(false), []);

    // Custom Key Handler for Shift+Right Pan
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.shiftKey && simulationRef.current?.controls) {
                // Swap Right Click to PAN
                simulationRef.current.controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
            }
        };
        const handleKeyUp = (e) => {
            if (!e.shiftKey && simulationRef.current?.controls) {
                // Swap Right Click back to ROTATE
                simulationRef.current.controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    return (
        <div className="w-full h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 p-4 z-10 flex justify-between items-start pointer-events-none">
                <div className="flex flex-col gap-2 pointer-events-auto">
                    <Link to="/" className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-600/50 rounded-lg text-slate-300 hover:text-white text-sm font-medium transition-all backdrop-blur-sm">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Hub
                    </Link>
                    <h1 className="text-2xl font-bold text-slate-200 drop-shadow-lg flex items-center gap-2">
                        Water Ripple Simulation
                        <span className="text-xs bg-purple-600 text-white px-1.5 py-0.5 rounded">WebGPU</span>
                    </h1>
                </div>
            </div>

            {isLoading && (
                <div className="absolute inset-0 z-30 bg-slate-950 flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-slate-300">Initializing WebGPU...</p>
                </div>
            )}

            {error && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950 text-red-500 p-8 text-center flex-col gap-4">
                    <AlertCircle className="w-16 h-16 text-red-500" />
                    <p>{error}</p>
                    <Link to="/" className="px-4 py-2 bg-slate-800 rounded">Return Home</Link>
                </div>
            )}

            <div ref={containerRef} className="absolute inset-0 z-0">
                <canvas
                    ref={canvasRef}
                    className="w-full h-full block"
                    onPointerMove={onPointerMove}
                    onPointerDown={onPointerDown}
                    onPointerUp={onPointerUp}
                    onPointerLeave={onPointerUp}
                />
            </div>

            {!error && (
                <aside className="absolute right-0 top-0 bottom-0 w-80 bg-slate-900/90 backdrop-blur-md border-l border-slate-700 p-6 z-20 overflow-y-auto">
                    <div className="mb-6 flex items-center gap-2 text-purple-400">
                        <Settings2 className="w-5 h-5" />
                        <h2 className="font-bold text-lg">Configuration</h2>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setIsPlaying(!isPlaying)}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-semibold transition-all ${isPlaying
                                            ? 'bg-amber-500/10 text-amber-500 border border-amber-500/50 hover:bg-amber-500/20'
                                            : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg'
                                        }`}
                                >
                                    {isPlaying ? <><Pause className="w-4 h-4" /> Pause</> : <><Play className="w-4 h-4" /> Resume</>}
                                </button>
                                <button
                                    onClick={() => simulationRef.current?.reset()}
                                    className="px-4 py-3 rounded-lg font-semibold bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all"
                                    title="Reset simulation"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="space-y-2 pt-2 border-t border-slate-700/50">
                                <button
                                    onClick={() => setIsRaining(!isRaining)}
                                    className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg font-medium transition-all ${isRaining
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                        }`}
                                >
                                    <CloudRain className={`w-4 h-4 ${isRaining ? 'animate-bounce' : ''}`} />
                                    {isRaining ? 'Rain Active' : 'Enable Rain'}
                                </button>

                                {isRaining && (
                                    <div className="space-y-1 pt-1 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <label className="text-xs text-slate-400 flex justify-between">
                                            Rain Intensity
                                            <span className="text-slate-200 font-mono">{rainIntensity}</span>
                                        </label>
                                        <input
                                            type="range" min="1" max="10" step="1"
                                            value={rainIntensity}
                                            onChange={e => setRainIntensity(parseInt(e.target.value, 10))}
                                            className="w-full accent-blue-500 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm text-slate-400">Resolution</label>
                                <select
                                    value={resolution}
                                    onChange={e => setResolution(parseInt(e.target.value, 10))}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500"
                                >
                                    {RESOLUTION_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm text-slate-400 flex justify-between">
                                    Damping
                                    <span className="text-slate-200 font-mono">{params.damping.toFixed(3)}</span>
                                </label>
                                <input
                                    type="range" min="0.900" max="0.999" step="0.001"
                                    value={params.damping}
                                    onChange={e => setParams({ ...params, damping: parseFloat(e.target.value) })}
                                    className="w-full accent-purple-500"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm text-slate-400 flex justify-between">
                                    Wave Speed
                                    <span className="text-slate-200 font-mono">{params.speed.toFixed(1)}</span>
                                </label>
                                <input
                                    type="range" min="0.1" max="1.4" step="0.1"
                                    value={params.speed}
                                    onChange={e => setParams({ ...params, speed: parseFloat(e.target.value) })}
                                    className="w-full accent-purple-500"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm text-slate-400 flex justify-between">
                                    Brush Size
                                    <span className="text-slate-200 font-mono">{params.brushSize.toFixed(1)}</span>
                                </label>
                                <input
                                    type="range" min="1.0" max="30.0" step="0.5"
                                    value={params.brushSize}
                                    onChange={e => setParams({ ...params, brushSize: parseFloat(e.target.value) })}
                                    className="w-full accent-purple-500"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm text-slate-400 flex justify-between">
                                    Brush Strength
                                    <span className="text-slate-200 font-mono">{params.brushStrength.toFixed(1)}</span>
                                </label>
                                <input
                                    type="range" min="0.1" max="10.0" step="0.1"
                                    value={params.brushStrength}
                                    onChange={e => setParams({ ...params, brushStrength: parseFloat(e.target.value) })}
                                    className="w-full accent-purple-500"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm text-slate-400">Water Color</label>
                                <div className="flex gap-2">
                                    {['#0088ff', '#00ffcc', '#ff0088', '#8800ff'].map(c => (
                                        <button
                                            key={c}
                                            onClick={() => setParams({ ...params, color: c })}
                                            className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${params.color === c ? 'border-white scale-110' : 'border-transparent'}`}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-800/50 rounded-lg text-xs text-slate-400 leading-relaxed border border-slate-700/50">
                            <div className="flex items-center gap-2 mb-2 font-semibold text-slate-300">
                                <MousePointer2 className="w-4 h-4" /> Interaction
                            </div>
                            <ul className="list-disc list-inside space-y-1 mb-2">
                                <li><strong>Left Click + Drag:</strong> Create Ripples</li>
                                <li><strong>Right Click + Drag:</strong> Rotate Camera</li>
                                <li><strong>Shift + Right Click:</strong> Pan Camera</li>
                                <li><strong>Scroll:</strong> Zoom</li>
                            </ul>
                            <p>Adjust damping for wave decay, brush size/strength for ripple intensity.</p>
                        </div>

                        <div className="p-3 bg-purple-900/30 rounded-lg text-xs text-purple-300 border border-purple-700/50">
                            <p className="font-semibold">100% GPU Accelerated</p>
                            <p className="text-purple-400 mt-1">Wave simulation AND vertex displacement run entirely on GPU using WebGPU compute shaders with {resolution}x{resolution} = {(resolution * resolution).toLocaleString()} vertices.</p>
                        </div>
                    </div>
                </aside>
            )}
        </div>
    );
}
