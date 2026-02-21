import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Play, Pause, RotateCcw, Settings2, Box, Zap, MousePointer2, Layers } from 'lucide-react';
import SoftBodyPhysics from './SoftBodyPhysics';
import './SoftBody.css';

export default function SoftBodyPage() {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const simulatorRef = useRef(null);

    // State
    const [isPlaying, setIsPlaying] = useState(true);
    const [stats, setStats] = useState({ particles: 0, springs: 0 });
    const [params, setParams] = useState({
        gravity: 0.5,
        stiffness: 1.0,
        damping: 0.5 // Unused in PBD currently, but kept for future or mapped to friction
    });

    const mouseRef = useRef({
        x: 0,
        y: 0,
        isPressed: false,
        draggedParticle: null
    });

    const loadPreset = useCallback((sim, type) => {
        sim.reset();
        const cx = sim.width / 2;
        const cy = sim.height / 3;

        // Use current params for creation
        // Note: We use the ref or passed values. Since this is callback, we can use params state if we include it in deps,
        // or just pass it in. For simplicity, we use params from state (closure).

        if (type === 'BOX') {
            sim.createBox(cx - 100, cy - 100, 10, 10, 20, params.stiffness, params.damping);
        } else if (type === 'CLOTH') {
            // Pinned top corners
            sim.createBox(cx - 150, 50, 15, 12, 20, 0.8, 0.5);
            // Lock top row
            for (let i = 0; i < 15; i++) {
                sim.particles[i].locked = true;
            }
        } else if (type === 'JELLY') {
            sim.createJelly(cx, cy, 80, 16, params.stiffness);
        } else if (type === 'BRIDGE') {
            sim.createRope(50, sim.height / 2, 20, sim.width - 100, 0.8);
        }

        setStats({ particles: sim.particles.length, springs: sim.springs.length });
    }, [params.stiffness, params.damping]);

    // Initialize
    useEffect(() => {
        if (!containerRef.current) return;
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;

        const sim = new SoftBodyPhysics(width, height);
        simulatorRef.current = sim;

        // Initial load
        loadPreset(sim, 'JELLY');

        if (canvasRef.current) {
            canvasRef.current.width = width;
            canvasRef.current.height = height;
        }

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Sync Params
    useEffect(() => {
        if (simulatorRef.current) {
            simulatorRef.current.gravity = params.gravity;
            for (const s of simulatorRef.current.springs) {
                s.stiffness = params.stiffness;
            }
        }
    }, [params]);

    const handlePresetClick = (type) => {
        if (simulatorRef.current) {
            loadPreset(simulatorRef.current, type);
        }
    };

    // Mouse Inputs
    const handleMouseDown = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        mouseRef.current.x = e.clientX - rect.left;
        mouseRef.current.y = e.clientY - rect.top;
        mouseRef.current.isPressed = true;

        if (simulatorRef.current) {
            const p = simulatorRef.current.findNearestParticle(mouseRef.current.x, mouseRef.current.y);
            if (p) mouseRef.current.draggedParticle = p;
        }
    };

    const handleMouseMove = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        mouseRef.current.x = e.clientX - rect.left;
        mouseRef.current.y = e.clientY - rect.top;
    };

    const handleMouseUp = () => {
        mouseRef.current.isPressed = false;
        mouseRef.current.draggedParticle = null;
    };

    // Loop
    const animate = useCallback(() => {
        const sim = simulatorRef.current;
        const canvas = canvasRef.current;
        if (!sim || !canvas) return;

        const ctx = canvas.getContext('2d');

        if (isPlaying) {
            sim.update(mouseRef.current);
        }

        // Draw
        ctx.clearRect(0, 0, sim.width, sim.height);

        // Draw Springs
        ctx.strokeStyle = '#ec4899'; // Pink
        ctx.beginPath();
        for (const s of sim.springs) {
            ctx.moveTo(s.p1.x, s.p1.y);
            ctx.lineTo(s.p2.x, s.p2.y);
        }
        ctx.stroke();

        // Draw Particles
        ctx.fillStyle = '#fff';
        for (const p of sim.particles) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.locked ? 4 : 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw Mouse Interaction
        if (mouseRef.current.draggedParticle) {
            const p = mouseRef.current.draggedParticle;
            ctx.strokeStyle = 'rgba(255,255,255,0.5)';
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mouseRef.current.x, mouseRef.current.y);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }, [isPlaying]);

    useEffect(() => {
        let rId;
        const loop = () => {
            animate();
            rId = requestAnimationFrame(loop);
        };
        rId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rId);
    }, [animate]);

    return (
        <div className="soft-page">
            <header className="soft-header">
                <Link to="/" className="back-link">
                    <ArrowLeft size={20} />
                    <span>Back to Hub</span>
                </Link>
                <h1>Soft Body Physics</h1>
                <div className="header-controls">
                    <button onClick={() => setIsPlaying(!isPlaying)} className="btn-icon">
                        {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                    </button>
                    <button onClick={() => handlePresetClick('JELLY')} className="btn-icon">
                        <RotateCcw size={20} />
                    </button>
                </div>
            </header>

            <main className="soft-main">
                <div className="canvas-container" ref={containerRef}>
                    <canvas
                        ref={canvasRef}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        style={{ cursor: mouseRef.current.draggedParticle ? 'grabbing' : 'grab' }}
                    />
                    <div className="overlay-info">
                        Particles: {stats.particles} | Springs: {stats.springs}
                    </div>
                </div>

                <aside className="soft-sidebar">
                    <div className="sidebar-section">
                        <h2><Box size={16} /> Presets</h2>
                        <div className="scenario-grid">
                            <button onClick={() => handlePresetClick('JELLY')}>Jelly</button>
                            <button onClick={() => handlePresetClick('BOX')}>Soft Box</button>
                            <button onClick={() => handlePresetClick('CLOTH')}>Cloth</button>
                            <button onClick={() => handlePresetClick('BRIDGE')}>Rope Bridge</button>
                        </div>
                    </div>

                    <div className="sidebar-section">
                        <h2><Settings2 size={16} /> Parameters</h2>
                        <div className="param-group">
                            <label>Gravity: {params.gravity}</label>
                            <input
                                type="range" min="0" max="1" step="0.1"
                                value={params.gravity}
                                onChange={e => setParams({ ...params, gravity: Number(e.target.value) })}
                            />
                        </div>
                        <div className="param-group">
                            <label>Stiffness: {params.stiffness}</label>
                            <input
                                type="range" min="0.01" max="1.0" step="0.01"
                                value={params.stiffness}
                                onChange={e => setParams({ ...params, stiffness: Number(e.target.value) })}
                            />
                        </div>
                        <div className="param-group">
                            <label>Damping: {params.damping}</label>
                            <input
                                type="range" min="0.1" max="1.0" step="0.1"
                                value={params.damping}
                                onChange={e => setParams({ ...params, damping: Number(e.target.value) })}
                            />
                        </div>
                    </div>

                    <div className="sidebar-section">
                        <h2><MousePointer2 size={16} /> Instructions</h2>
                        <p className="text-xs text-gray-400">
                            Click and drag particles to interact with the soft bodies.
                            Some particles (like the top of the cloth) are locked in place.
                        </p>
                    </div>

                </aside>
            </main>
        </div>
    );
}
