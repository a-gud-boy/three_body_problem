import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Play, Pause, RotateCcw, Settings2, Droplets, Wind, Zap, Layers, MousePointer2, Circle } from 'lucide-react';
import FluidSimulator from './FluidSimulator';
import './FluidDynamics.css';

export default function FluidDynamicsPage() {
    // Refs
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const simulatorRef = useRef(null);
    const isInitializedRef = useRef(false);

    const fpsRef = useRef(0);
    const lastTimeRef = useRef(0);

    // State
    const [isPlaying, setIsPlaying] = useState(true);
    const [stats, setStats] = useState({ fps: 0, particles: 0 });
    const [viewMode, setViewMode] = useState('WATER'); // WATER, VELOCITY, PRESSURE
    const [interactionMode, setInteractionMode] = useState('FORCE'); // FORCE, OBSTACLE

    // Parameters State (synced with simulator)
    const [params, setParams] = useState({
        gravity: 0.5,
        viscosity: 200,
        stiffness: 3000,
        restDensity: 0.0004,
        timeScale: 1.0
    });

    // Mouse State
    const mouseRef = useRef({
        x: 0,
        y: 0,
        isPressed: false,
        button: 0,
        isPouring: false
    });

    // Initialize Simulator
    useEffect(() => {
        // Check if container and canvas are available and simulator not yet created
        if (!containerRef.current || !canvasRef.current || simulatorRef.current || isInitializedRef.current) return;

        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;

        // Only initialize if we have valid dimensions
        if (width === 0 || height === 0) return;

        const sim = new FluidSimulator(width, height);
        sim.reset('DAM_BREAK');
        simulatorRef.current = sim;

        // Initial Canvas Setup
        canvasRef.current.width = width;
        canvasRef.current.height = height;

        // Mark as initialized
        isInitializedRef.current = true;

        // Handle Resize
        const handleResize = () => {
            if (containerRef.current && canvasRef.current && simulatorRef.current) {
                const w = containerRef.current.clientWidth;
                const h = containerRef.current.clientHeight;
                canvasRef.current.width = w;
                canvasRef.current.height = h;
                simulatorRef.current.width = w;
                simulatorRef.current.height = h;
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }); // No dependency array to allow re-checking until initialized

    // Parameter Sync
    useEffect(() => {
        if (simulatorRef.current) {
            simulatorRef.current.gravity = params.gravity;
            simulatorRef.current.viscosity = params.viscosity;
            simulatorRef.current.stiffness = params.stiffness;
            simulatorRef.current.restDensity = params.restDensity;
            simulatorRef.current.timeScale = params.timeScale;
        }
    }, [params]);

    // Input Handlers
    const handleMouseDown = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        mouseRef.current.x = e.clientX - rect.left;
        mouseRef.current.y = e.clientY - rect.top;
        mouseRef.current.isPressed = true;
        mouseRef.current.button = e.button;

        if (e.shiftKey) {
            mouseRef.current.isPouring = true;
        } else if (interactionMode === 'OBSTACLE' && e.button === 0) {
            // Place Obstacle
            if (simulatorRef.current) {
                simulatorRef.current.obstacles.push({
                    x: mouseRef.current.x,
                    y: mouseRef.current.y,
                    radius: 30 + Math.random() * 20
                });
            }
        }
    };

    const handleMouseMove = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        mouseRef.current.x = e.clientX - rect.left;
        mouseRef.current.y = e.clientY - rect.top;
    };

    const handleMouseUp = () => {
        mouseRef.current.isPressed = false;
        mouseRef.current.isPouring = false;
    };

    // Render Loop
    const animate = useCallback((time) => {
        if (!simulatorRef.current || !canvasRef.current) return;

        // FPS Calculation
        const delta = time - lastTimeRef.current;
        lastTimeRef.current = time;
        if (delta > 0) {
            fpsRef.current = Math.round(1000 / delta);
        }

        const sim = simulatorRef.current;
        const ctx = canvasRef.current.getContext('2d');

        // Physics Step
        if (isPlaying) {
            // Pouring Logic
            if (mouseRef.current.isPressed && mouseRef.current.isPouring) {
                sim.addParticles(mouseRef.current.x, mouseRef.current.y, 5); // Add 5 per frame
            }

            // Simulation Step
            sim.step(mouseRef.current);
        }

        // Update Stats State (throttled)
        if (Math.random() < 0.05) { // Update ~3 times a second
            setStats({
                fps: fpsRef.current,
                particles: sim.numParticles
            });
        }

        // Rendering
        ctx.clearRect(0, 0, sim.width, sim.height);

        // Draw Obstacles
        ctx.fillStyle = '#334155';
        sim.obstacles.forEach(obs => {
            ctx.beginPath();
            ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw Particles
        // Optimization: Use direct pixel manipulation for "Water" mode if needed,
        // but for < 2000 particles, standard drawing commands are often fine and look smoother.

        if (viewMode === 'WATER') {
            // Metaball Rendering using CSS Filters trick (conceptually)
            // But here we do it via Canvas style/shadow for better control or just the drawing
            // To achieve the reference look: Soft particles + Thresholding
            // We'll rely on the CSS 'filter: contrast' applied to the canvas in styles
            // And draw blurred particles here.

            ctx.save();
            // This color will be thresholded by the CSS contrast filter
            // Ideally: Background is black, particles are white/blue with blur.

            // NOTE: The canvas itself needs the filter. We will apply it dynamically or via class.
            // For now, let's draw them "gooey".

            // Particle base
            ctx.fillStyle = '#0ea5e9'; // Bright Blue
            // ctx.shadowBlur = 6;
            // ctx.shadowColor = '#0ea5e9';

            for (let i = 0; i < sim.numParticles; i++) {
                ctx.beginPath();
                // Draw slightly larger for blending
                ctx.arc(sim.x[i], sim.y[i], sim.h * 0.6, 0, Math.PI * 2);
                ctx.fill();
            }

            // Highlights (Reflections) - drawn on top, sharp (no blur ideally, but canvas filter affects all)
            // To fix this, we'd need a second canvas overlay.
            // For this single-canvas constraint, we just draw them white.
            ctx.restore();

        } else if (viewMode === 'VELOCITY') {
            for (let i = 0; i < sim.numParticles; i++) {
                const speed = Math.sqrt(sim.vx[i] * sim.vx[i] + sim.vy[i] * sim.vy[i]);
                const t = Math.min(speed / 10, 1);
                // Heatmap: Blue (slow) -> Red (fast)
                const r = Math.floor(t * 255);
                const g = Math.floor((1 - t) * 100);
                const b = Math.floor((1 - t) * 255);

                ctx.fillStyle = `rgb(${r},${g},${b})`;
                ctx.beginPath();
                ctx.arc(sim.x[i], sim.y[i], sim.h * 0.4, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (viewMode === 'PRESSURE') {
            for (let i = 0; i < sim.numParticles; i++) {
                const p = sim.pressure[i];
                const t = Math.min(Math.max(p / 200, 0), 1);
                // Heatmap: Blue (low) -> Red (high)
                const r = Math.floor(t * 255);
                const g = Math.floor((1 - t) * 255);
                const b = 50;

                ctx.fillStyle = `rgb(${r},${g},${b})`;
                ctx.beginPath();
                ctx.arc(sim.x[i], sim.y[i], sim.h * 0.4, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Emitter Ring
        if (mouseRef.current.isPouring) {
            ctx.strokeStyle = '#fff';
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(mouseRef.current.x, mouseRef.current.y, 20, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }

    }, [isPlaying, viewMode]);

    useEffect(() => {
        let rId;
        const loop = (time) => {
            animate(time);
            rId = requestAnimationFrame(loop);
        };
        rId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rId);
    }, [animate]);

    // Helpers
    const loadScenario = (key) => {
        if (simulatorRef.current) {
            simulatorRef.current.reset(key);
            setIsPlaying(true);
        }
    };

    return (
        <div className="fluid-page">
            <header className="fluid-header">
                <Link to="/" className="back-link">
                    <ArrowLeft size={20} />
                    <span>Back to Hub</span>
                </Link>
                <h1>Fluid Dynamics (SPH)</h1>
                <div className="header-controls">
                    <button onClick={() => setIsPlaying(!isPlaying)} className="btn-icon">
                        {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                    </button>
                    <button onClick={() => loadScenario('DAM_BREAK')} className="btn-icon">
                        <RotateCcw size={20} />
                    </button>
                </div>
            </header>

            <main className="fluid-main">
                <div className="canvas-container" ref={containerRef}>
                    <canvas
                        ref={canvasRef}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onContextMenu={e => e.preventDefault()}
                        className={viewMode === 'WATER' ? 'fluid-canvas-water' : 'fluid-canvas-normal'}
                        style={{ cursor: interactionMode === 'OBSTACLE' ? 'cell' : 'crosshair' }}
                    />

                    <div className="fluid-stats">
                        <div>FPS: {stats.fps}</div>
                        <div>Particles: {stats.particles}</div>
                    </div>

                    <div className="overlay-info">
                        <strong>Controls:</strong> Left-Click to Push, Right-Click to Pull. Shift+Click to Pour.
                        <br />
                        {interactionMode === 'OBSTACLE' && <span className="text-yellow-400">Obstacle Mode Active: Click to place walls.</span>}
                    </div>
                </div>

                <aside className="fluid-sidebar">
                    {/* View Modes */}
                    <div className="sidebar-section">
                        <h2><Layers size={16} /> Visualization</h2>
                        <div className="mode-toggle">
                            <button className={viewMode === 'WATER' ? 'active' : ''} onClick={() => setViewMode('WATER')}>Water</button>
                            <button className={viewMode === 'VELOCITY' ? 'active' : ''} onClick={() => setViewMode('VELOCITY')}>Velocity</button>
                            <button className={viewMode === 'PRESSURE' ? 'active' : ''} onClick={() => setViewMode('PRESSURE')}>Pressure</button>
                        </div>
                    </div>

                    {/* Interaction Modes */}
                    <div className="sidebar-section">
                        <h2><MousePointer2 size={16} /> Interaction</h2>
                        <div className="mode-toggle">
                            <button className={interactionMode === 'FORCE' ? 'active' : ''} onClick={() => setInteractionMode('FORCE')}>
                                <Wind size={14} className="mr-1" /> Force
                            </button>
                            <button className={interactionMode === 'OBSTACLE' ? 'active' : ''} onClick={() => setInteractionMode('OBSTACLE')}>
                                <Circle size={14} className="mr-1" /> Obstacle
                            </button>
                        </div>
                    </div>

                    {/* Scenarios */}
                    <div className="sidebar-section">
                        <h2><Droplets size={16} /> Scenarios</h2>
                        <div className="scenario-grid">
                            <button onClick={() => loadScenario('DAM_BREAK')}>Dam Break</button>
                            <button onClick={() => loadScenario('DOUBLE_DAM')}>Collision</button>
                            <button onClick={() => loadScenario('ZERO_G')}>Zero Gravity</button>
                            <button onClick={() => loadScenario('GALAXY')}>Galaxy</button>
                        </div>
                    </div>

                    {/* Parameters */}
                    <div className="sidebar-section">
                        <h2><Settings2 size={16} /> Physics Parameters</h2>

                        <div className="param-group">
                            <label>Gravity: {params.gravity.toFixed(2)}</label>
                            <input
                                type="range" min="0" max="2" step="0.05"
                                value={params.gravity}
                                onChange={e => setParams({ ...params, gravity: Number(e.target.value) })}
                            />
                        </div>

                        <div className="param-group">
                            <label>Viscosity: {params.viscosity}</label>
                            <input
                                type="range" min="0" max="500" step="10"
                                value={params.viscosity}
                                onChange={e => setParams({ ...params, viscosity: Number(e.target.value) })}
                            />
                        </div>

                        <div className="param-group">
                            <label>Pressure (Stiffness): {params.stiffness}</label>
                            <input
                                type="range" min="1000" max="8000" step="100"
                                value={params.stiffness}
                                onChange={e => setParams({ ...params, stiffness: Number(e.target.value) })}
                            />
                        </div>

                        <div className="param-group">
                            <label>Time Scale: {params.timeScale.toFixed(2)}x</label>
                            <input
                                type="range" min="0.1" max="2" step="0.1"
                                value={params.timeScale}
                                onChange={e => setParams({ ...params, timeScale: Number(e.target.value) })}
                            />
                        </div>
                    </div>
                </aside>
            </main>
        </div>
    );
}
