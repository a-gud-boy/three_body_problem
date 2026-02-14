import { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
    Fn, uniform, storage, float, int, vec4,
    instanceIndex, positionGeometry
} from 'three/tsl';
import { WebGPURenderer, StorageBufferAttribute, MeshBasicNodeMaterial } from 'three/webgpu';
import { Link } from 'react-router-dom';
import { ArrowLeft, Play, Pause, RotateCcw, AlertCircle } from 'lucide-react';
import './QuantumSandboxPage.css';

// ─── Grid resolution options ───
const GRID_OPTIONS = [
    { label: '256×256', value: 256 },
    { label: '512×512', value: 512 },
    { label: '1024×1024', value: 1024 },
];

// ─── Presets for quick demos ───
const PRESETS = {
    tunneling: { name: 'Tunneling Demo', kx: 3.0, ky: 0.0, sigma: 20, barrierWidth: 6 },
    doubleSlit: { name: 'Double Slit', kx: 3.0, ky: 0.0, sigma: 24, barrierWidth: 6 },
    freePropagation: { name: 'Free Propagation', kx: 2.5, ky: 1.5, sigma: 30, barrierWidth: 0 },
};

// ════════════════════════════════════════════════════════════════════════
// WebGPU Quantum Simulation Engine
// ════════════════════════════════════════════════════════════════════════
class WebGPUQuantumSimulation {
    constructor(canvas, params, gridSize, onReady) {
        this.canvas = canvas;
        this.params = { ...params };
        this.gridSize = gridSize;
        this.count = gridSize * gridSize;
        this.onReady = onReady;
        this.isRunning = true;
        this.animationId = null;
        this.initialized = false;
        this.disposed = false;

        // Drawing state
        this.drawMode = 0; // 0=none, 1=draw wall, -1=erase
        this.brushGridPos = { x: -1000, y: -1000 };

        this.init();
    }

    async init() {
        try {
            if (this.disposed) return;
            if (!navigator.gpu) throw new Error('WebGPU is not supported in this browser.');

            // ── Renderer ──
            this.renderer = new WebGPURenderer({ canvas: this.canvas, antialias: false });
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.resize(this.canvas.clientWidth, this.canvas.clientHeight);
            await this.renderer.init();

            if (!this.renderer.backend.isWebGPUBackend) {
                throw new Error('WebGPU backend did not initialize — your browser may need a flag enabled.');
            }
            if (this.disposed) return;

            // ── Scene: simple ortho camera + full-screen quad ──
            this.scene = new THREE.Scene();
            this.camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.01, 10);
            this.camera.position.z = 1;

            this.setupBuffers();
            this.setupCompute();
            this.setupVisualization();
            this.initWavePacket();
            this.initPotential(this.params.preset || 'tunneling');

            this.initialized = true;
            if (this.onReady) this.onReady(null);
            this.animate();
        } catch (error) {
            console.error('Quantum Sim Init Error:', error);
            if (this.onReady) this.onReady(error);
        }
    }

    // ── Buffers ──
    setupBuffers() {
        const n = this.count;
        // Ping-pong ψ buffers (real & imaginary parts)
        this.psiRealA = new StorageBufferAttribute(new Float32Array(n), 1);
        this.psiImagA = new StorageBufferAttribute(new Float32Array(n), 1);
        this.psiRealB = new StorageBufferAttribute(new Float32Array(n), 1);
        this.psiImagB = new StorageBufferAttribute(new Float32Array(n), 1);
        // Potential field V(x,y)
        this.potentialBuf = new StorageBufferAttribute(new Float32Array(n), 1);

        // Storage nodes
        this.sPsiRA = storage(this.psiRealA, 'float', n);
        this.sPsiIA = storage(this.psiImagA, 'float', n);
        this.sPsiRB = storage(this.psiRealB, 'float', n);
        this.sPsiIB = storage(this.psiImagB, 'float', n);
        this.sPot = storage(this.potentialBuf, 'float', n);
    }

    // ── Compute shaders ──
    setupCompute() {
        const gs = this.gridSize;
        const n = this.count;
        const dt = 0.15;

        const sPsiRA = this.sPsiRA;
        const sPsiIA = this.sPsiIA;
        const sPsiRB = this.sPsiRB;
        const sPsiIB = this.sPsiIB;
        const sPot = this.sPot;

        // Uniforms for drawing
        this.uBrushPos = uniform(new THREE.Vector2(-1000, -1000));
        this.uBrushSize = uniform(this.params.brushSize);
        this.uDrawMode = uniform(0.0); // 1=draw, -1=erase, 0=none
        this.uGlowIntensity = uniform(1.5);

        // ── TDSE step: A→B ──
        const stepAtoB = Fn(() => {
            const idx = instanceIndex.toUint();
            const x = int(idx.mod(gs));
            const y = int(idx.div(gs));

            const u = sPsiRA.element(idx);
            const v = sPsiIA.element(idx);
            const V = sPot.element(idx);

            // Laplacian via 5-point stencil with boundary clamping
            const getRA = (ix, iy) => {
                const cx = ix.clamp(0, gs - 1);
                const cy = iy.clamp(0, gs - 1);
                return sPsiRA.element(cy.mul(gs).add(cx));
            };
            const getIA = (ix, iy) => {
                const cx = ix.clamp(0, gs - 1);
                const cy = iy.clamp(0, gs - 1);
                return sPsiIA.element(cy.mul(gs).add(cx));
            };

            const lapU = getRA(x.add(1), y).add(getRA(x.sub(1), y))
                .add(getRA(x, y.add(1))).add(getRA(x, y.sub(1)))
                .sub(u.mul(4.0));
            const lapV = getIA(x.add(1), y).add(getIA(x.sub(1), y))
                .add(getIA(x, y.add(1))).add(getIA(x, y.sub(1)))
                .sub(v.mul(4.0));

            // TDSE FDM: u_new = u - dt*(-0.5*lap_v + V*v)
            //            v_new = v + dt*(-0.5*lap_u + V*u)
            const uNew = u.sub(float(dt).mul(float(-0.5).mul(lapV).add(V.mul(v))));
            const vNew = v.add(float(dt).mul(float(-0.5).mul(lapU).add(V.mul(u))));

            // Clamp to prevent blow-up
            sPsiRB.element(idx).assign(uNew.clamp(-50.0, 50.0));
            sPsiIB.element(idx).assign(vNew.clamp(-50.0, 50.0));
        });

        // ── TDSE step: B→A ──
        const stepBtoA = Fn(() => {
            const idx = instanceIndex.toUint();
            const x = int(idx.mod(gs));
            const y = int(idx.div(gs));

            const u = sPsiRB.element(idx);
            const v = sPsiIB.element(idx);
            const V = sPot.element(idx);

            const getRB = (ix, iy) => {
                const cx = ix.clamp(0, gs - 1);
                const cy = iy.clamp(0, gs - 1);
                return sPsiRB.element(cy.mul(gs).add(cx));
            };
            const getIB = (ix, iy) => {
                const cx = ix.clamp(0, gs - 1);
                const cy = iy.clamp(0, gs - 1);
                return sPsiIB.element(cy.mul(gs).add(cx));
            };

            const lapU = getRB(x.add(1), y).add(getRB(x.sub(1), y))
                .add(getRB(x, y.add(1))).add(getRB(x, y.sub(1)))
                .sub(u.mul(4.0));
            const lapV = getIB(x.add(1), y).add(getIB(x.sub(1), y))
                .add(getIB(x, y.add(1))).add(getIB(x, y.sub(1)))
                .sub(v.mul(4.0));

            const uNew = u.sub(float(dt).mul(float(-0.5).mul(lapV).add(V.mul(v))));
            const vNew = v.add(float(dt).mul(float(-0.5).mul(lapU).add(V.mul(u))));

            sPsiRA.element(idx).assign(uNew.clamp(-50.0, 50.0));
            sPsiIA.element(idx).assign(vNew.clamp(-50.0, 50.0));
        });

        this.computeStepAtoB = stepAtoB().compute(n);
        this.computeStepBtoA = stepBtoA().compute(n);

        // ── Brush compute: draw/erase potential ──
        const computeBrush = Fn(() => {
            const idx = instanceIndex.toUint();
            const x = float(int(idx.mod(gs)));
            const y = float(int(idx.div(gs)));

            const bx = this.uBrushPos.x;
            const by = this.uBrushPos.y;
            const dx = x.sub(bx);
            const dy = y.sub(by);
            const dist = dx.mul(dx).add(dy.mul(dy)).sqrt();
            const inBrush = float(1.0).sub(dist.div(this.uBrushSize)).clamp(0.0, 1.0);

            const mode = this.uDrawMode;
            const currentV = sPot.element(idx);

            // Draw: add potential; Erase: subtract potential
            const drawVal = currentV.add(inBrush.mul(mode).mul(50.0));
            const newV = drawVal.clamp(0.0, 100.0);

            // Only modify if mode != 0
            const isActive = mode.abs().step(0.5); // 1 if |mode|≥0.5, else 0
            const result = currentV.mul(float(1.0).sub(isActive)).add(newV.mul(isActive));
            sPot.element(idx).assign(result);
        });

        this.computeBrush = computeBrush().compute(n);
    }

    // ── Visualization: full-screen quad with fragment shader reading ψ buffers ──
    setupVisualization() {
        const gs = this.gridSize;
        const sPsiRA = this.sPsiRA;
        const sPsiIA = this.sPsiIA;
        const sPot = this.sPot;

        const geo = new THREE.PlaneGeometry(1, 1);
        const mat = new MeshBasicNodeMaterial({ side: THREE.DoubleSide });

        mat.colorNode = Fn(() => {
            // Map vertex position (-0.5..0.5) → UV (0..1)
            const uvx = positionGeometry.x.add(0.5);
            const uvy = positionGeometry.y.add(0.5);

            // Pixel indices
            const ix = uvx.mul(float(gs)).floor().clamp(0, gs - 1).toInt();
            const iy = float(1.0).sub(uvy).mul(float(gs)).floor().clamp(0, gs - 1).toInt();
            const idx = iy.mul(gs).add(ix);

            const u = sPsiRA.element(idx);
            const v = sPsiIA.element(idx);
            const V = sPot.element(idx);

            // Probability density |ψ|²
            const prob = u.mul(u).add(v.mul(v));

            // Phase → hue via cosine colour model
            const phase = v.atan2(u);
            const hue = phase.div(Math.PI).add(1.0).mul(0.5); // 0..1

            // Rainbow colour from hue (smooth cosine palette)
            const r = hue.mul(6.2832).cos().mul(0.5).add(0.5);
            const g = hue.mul(6.2832).add(2.0944).cos().mul(0.5).add(0.5); // +2π/3
            const b = hue.mul(6.2832).add(4.1888).cos().mul(0.5).add(0.5); // +4π/3

            // Glow brightness from probability density
            const brightness = prob.mul(this.uGlowIntensity).sqrt().clamp(0.0, 1.0);

            // Additive bloom approximation
            const bloom = prob.mul(this.uGlowIntensity).clamp(0.0, 1.0).mul(0.3);

            // Potential walls — subtle white overlay
            const wallBright = V.mul(0.2).clamp(0.0, 0.3);

            // Background — very dark blue-purple
            const bgR = float(0.02);
            const bgG = float(0.01);
            const bgB = float(0.05);

            const waveR = r.mul(brightness).add(bloom);
            const waveG = g.mul(brightness).add(bloom);
            const waveB = b.mul(brightness).add(bloom.mul(0.7));

            const finalR = waveR.add(wallBright).add(bgR).clamp(0.0, 1.0);
            const finalG = waveG.add(wallBright).add(bgG).clamp(0.0, 1.0);
            const finalB = waveB.add(wallBright).add(bgB).clamp(0.0, 1.0);

            return vec4(finalR, finalG, finalB, float(1.0));
        })();

        this.vizMesh = new THREE.Mesh(geo, mat);
        this.vizMesh.frustumCulled = false;
        this.scene.add(this.vizMesh);
    }

    // ── Initial wave packet: Gaussian × exp(i·k·r) ──
    initWavePacket() {
        const gs = this.gridSize;
        const preset = PRESETS[this.params.preset] || PRESETS.tunneling;
        const { kx, ky, sigma } = preset;

        const realArr = this.psiRealA.array;
        const imagArr = this.psiImagA.array;
        const realArrB = this.psiRealB.array;
        const imagArrB = this.psiImagB.array;

        // Centre slightly to the left
        const cx = gs * 0.25;
        const cy = gs * 0.5;
        const sig2 = sigma * sigma;

        for (let y = 0; y < gs; y++) {
            for (let x = 0; x < gs; x++) {
                const i = y * gs + x;
                const dx = x - cx;
                const dy = y - cy;
                const envelope = Math.exp(-(dx * dx + dy * dy) / (2 * sig2));
                const phase = kx * dx + ky * dy;
                realArr[i] = envelope * Math.cos(phase);
                imagArr[i] = envelope * Math.sin(phase);
                realArrB[i] = 0;
                imagArrB[i] = 0;
            }
        }

        this.psiRealA.needsUpdate = true;
        this.psiImagA.needsUpdate = true;
        this.psiRealB.needsUpdate = true;
        this.psiImagB.needsUpdate = true;
    }

    // ── Initialise potential field (barriers based on preset) ──
    initPotential(presetKey) {
        const gs = this.gridSize;
        const arr = this.potentialBuf.array;
        arr.fill(0);

        const preset = PRESETS[presetKey] || PRESETS.tunneling;

        if (preset.barrierWidth > 0) {
            const wallX = Math.floor(gs * 0.55);
            const halfW = Math.floor(preset.barrierWidth / 2);
            const cy = Math.floor(gs / 2);
            const V = 80.0;

            if (presetKey === 'doubleSlit') {
                // Double slit: wall with two gaps
                const slitSpacing = Math.floor(gs * 0.08);
                const slitWidth = Math.floor(gs * 0.03);
                for (let y = 0; y < gs; y++) {
                    for (let dx = -halfW; dx <= halfW; dx++) {
                        const wx = wallX + dx;
                        if (wx < 0 || wx >= gs) continue;
                        const dy = y - cy;
                        const inSlit1 = Math.abs(dy - slitSpacing) < slitWidth;
                        const inSlit2 = Math.abs(dy + slitSpacing) < slitWidth;
                        if (!inSlit1 && !inSlit2) {
                            arr[y * gs + wx] = V;
                        }
                    }
                }
            } else {
                // Single barrier (tunneling demo)
                for (let y = 0; y < gs; y++) {
                    for (let dx = -halfW; dx <= halfW; dx++) {
                        const wx = wallX + dx;
                        if (wx >= 0 && wx < gs) {
                            arr[y * gs + wx] = V;
                        }
                    }
                }
            }
        }

        this.potentialBuf.needsUpdate = true;
    }

    // ── Animation loop ──
    animate() {
        if (this.disposed || !this.initialized) return;
        this.animationId = requestAnimationFrame(() => this.animate());

        if (this.isRunning) {
            const steps = this.params.stepsPerFrame || 15;
            // We always do an even number of compute steps so ψ ends in buffer A
            // (since visualization reads from buffer A)
            const evenSteps = steps % 2 === 0 ? steps : steps + 1;
            for (let i = 0; i < evenSteps; i++) {
                if (i % 2 === 0) {
                    this.renderer.compute(this.computeStepAtoB);
                } else {
                    this.renderer.compute(this.computeStepBtoA);
                }
            }
        }

        // Brush drawing
        if (this.drawMode !== 0) {
            this.uDrawMode.value = this.drawMode;
            this.uBrushPos.value.set(this.brushGridPos.x, this.brushGridPos.y);
            this.renderer.compute(this.computeBrush);
        } else {
            this.uDrawMode.value = 0.0;
        }

        this.renderer.render(this.scene, this.camera);
    }

    // ── Mouse mapping (screen coords → grid coords) ──
    screenToGrid(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const u = (clientX - rect.left) / rect.width;
        const v = (clientY - rect.top) / rect.height; // y=0 is top, matching the viz shader
        return {
            x: Math.floor(u * this.gridSize),
            y: Math.floor(v * this.gridSize),
        };
    }

    setMousePosition(clientX, clientY) {
        this.brushGridPos = this.screenToGrid(clientX, clientY);
    }

    setDrawMode(mode) { this.drawMode = mode; }
    setPlaying(p) { this.isRunning = p; }

    updateParams(params) {
        this.params = { ...params };
        if (this.uBrushSize) this.uBrushSize.value = params.brushSize;
        if (this.uGlowIntensity) this.uGlowIntensity.value = params.glowIntensity;
    }

    reset(presetKey) {
        this.params.preset = presetKey || this.params.preset || 'tunneling';
        this.initWavePacket();
        this.initPotential(this.params.preset);
    }

    resize(w, h) {
        if (this.disposed || !this.renderer) return;
        this.renderer.setSize(w, h, false);
    }

    dispose() {
        this.disposed = true;
        if (this.animationId) cancelAnimationFrame(this.animationId);
        const renderer = this.renderer;
        this.renderer = null;
        if (renderer) {
            setTimeout(() => {
                try {
                    if (this.scene) {
                        this.scene.traverse((obj) => {
                            if (obj.geometry) obj.geometry.dispose();
                            if (obj.material) {
                                if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
                                else obj.material.dispose();
                            }
                        });
                    }
                    renderer.dispose();
                } catch (e) {
                    console.error('Error disposing quantum renderer:', e);
                }
            }, 100);
        }
    }
}

// ════════════════════════════════════════════════════════════════════════
// React Component
// ════════════════════════════════════════════════════════════════════════
export default function QuantumSandboxPage() {
    const [params, setParams] = useState({
        stepsPerFrame: 15,
        brushSize: 10,
        glowIntensity: 1.5,
        preset: 'tunneling',
    });
    const [gridSize, setGridSize] = useState(512);
    const [isPlaying, setIsPlaying] = useState(true);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const simRef = useRef(null);

    // ── Init / Teardown ──
    useEffect(() => {
        if (!canvasRef.current) return;
        if (simRef.current) { simRef.current.dispose(); simRef.current = null; }

        setIsLoading(true);
        setError(null);

        const timeout = setTimeout(() => {
            simRef.current = new WebGPUQuantumSimulation(
                canvasRef.current,
                { ...params, preset: params.preset },
                gridSize,
                (err) => {
                    setIsLoading(false);
                    if (err) setError(err.message || 'WebGPU initialisation failed');
                },
            );
        }, 100);

        return () => {
            clearTimeout(timeout);
            simRef.current?.dispose();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gridSize]);

    // ── Sync params ──
    useEffect(() => { simRef.current?.updateParams(params); }, [params]);
    useEffect(() => { simRef.current?.setPlaying(isPlaying); }, [isPlaying]);

    // ── Resize ──
    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current && simRef.current) {
                const { clientWidth, clientHeight } = containerRef.current;
                simRef.current.resize(clientWidth, clientHeight);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // ── Pointer handlers ──
    const onPointerDown = useCallback((e) => {
        if (!simRef.current) return;
        e.preventDefault();
        if (e.button === 0) simRef.current.setDrawMode(1);       // left = draw wall
        else if (e.button === 2) simRef.current.setDrawMode(-1); // right = erase
        simRef.current.setMousePosition(e.clientX, e.clientY);
    }, []);

    const onPointerMove = useCallback((e) => {
        if (!simRef.current) return;
        simRef.current.setMousePosition(e.clientX, e.clientY);
    }, []);

    const onPointerUp = useCallback(() => {
        if (simRef.current) simRef.current.setDrawMode(0);
    }, []);

    const onContextMenu = useCallback((e) => e.preventDefault(), []);

    const handleReset = useCallback(() => {
        simRef.current?.reset(params.preset);
    }, [params.preset]);

    const handlePresetChange = useCallback((presetKey) => {
        setParams(p => ({ ...p, preset: presetKey }));
        setTimeout(() => simRef.current?.reset(presetKey), 50);
    }, []);

    const updateParam = (key, value) => setParams(p => ({ ...p, [key]: value }));

    return (
        <div className="quantum-sandbox" ref={containerRef}>
            {/* Canvas */}
            <canvas
                ref={canvasRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
                onContextMenu={onContextMenu}
            />

            {/* Loading overlay */}
            {isLoading && !error && (
                <div className="qs-loading-overlay">
                    <div className="qs-loading-spinner" />
                    <div className="qs-loading-text">Initialising WebGPU Quantum Simulation…</div>
                </div>
            )}

            {/* Error overlay */}
            {error && (
                <div className="qs-error-overlay">
                    <AlertCircle size={40} className="qs-error-icon" />
                    <p className="qs-error-text">{error}</p>
                </div>
            )}

            {/* Top bar */}
            {!error && (
                <div className="qs-top-bar">
                    <Link to="/" className="qs-back-link">
                        <ArrowLeft size={14} /> Home
                    </Link>
                    <div className="qs-title-block">
                        <h1 className="qs-title">Quantum Wave Sandbox</h1>
                        <p className="qs-subtitle">Time-Dependent Schrödinger Equation · WebGPU</p>
                    </div>
                    <div className="qs-top-spacer" />
                </div>
            )}

            {/* Hint */}
            {!isLoading && !error && (
                <div className="qs-hint">
                    Left-click to draw barriers · Right-click to erase · Watch quantum tunneling &amp; interference
                </div>
            )}

            {/* Controls */}
            {!error && (
                <div className="qs-controls">
                    {/* Play / Pause */}
                    <button className="qs-btn" onClick={() => setIsPlaying(p => !p)} title={isPlaying ? 'Pause' : 'Play'}>
                        {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                    </button>

                    {/* Reset */}
                    <button className="qs-btn" onClick={handleReset} title="Reset">
                        <RotateCcw size={14} />
                    </button>

                    <div className="qs-controls-divider" />

                    {/* Preset */}
                    <select
                        className="qs-select"
                        value={params.preset}
                        onChange={(e) => handlePresetChange(e.target.value)}
                    >
                        {Object.entries(PRESETS).map(([key, p]) => (
                            <option key={key} value={key}>{p.name}</option>
                        ))}
                    </select>

                    <div className="qs-controls-divider" />

                    {/* Simulation Speed */}
                    <div className="qs-slider-group">
                        <span className="qs-slider-label">Speed</span>
                        <div className="qs-slider-row">
                            <input
                                type="range" className="qs-slider"
                                min={1} max={30} step={1}
                                value={params.stepsPerFrame}
                                onChange={(e) => updateParam('stepsPerFrame', parseInt(e.target.value))}
                            />
                            <span className="qs-slider-value">{params.stepsPerFrame}</span>
                        </div>
                    </div>

                    {/* Brush Size */}
                    <div className="qs-slider-group">
                        <span className="qs-slider-label">Brush</span>
                        <div className="qs-slider-row">
                            <input
                                type="range" className="qs-slider"
                                min={1} max={30} step={1}
                                value={params.brushSize}
                                onChange={(e) => updateParam('brushSize', parseInt(e.target.value))}
                            />
                            <span className="qs-slider-value">{params.brushSize}</span>
                        </div>
                    </div>

                    {/* Glow */}
                    <div className="qs-slider-group">
                        <span className="qs-slider-label">Glow</span>
                        <div className="qs-slider-row">
                            <input
                                type="range" className="qs-slider"
                                min={0.5} max={4.0} step={0.1}
                                value={params.glowIntensity}
                                onChange={(e) => updateParam('glowIntensity', parseFloat(e.target.value))}
                            />
                            <span className="qs-slider-value">{params.glowIntensity.toFixed(1)}</span>
                        </div>
                    </div>

                    <div className="qs-controls-divider" />

                    {/* Grid resolution */}
                    <select
                        className="qs-select"
                        value={gridSize}
                        onChange={(e) => setGridSize(parseInt(e.target.value))}
                    >
                        {GRID_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                </div>
            )}
        </div>
    );
}
