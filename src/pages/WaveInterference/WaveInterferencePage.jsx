import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Play, Pause, RotateCcw, Settings2, Waves, Zap, Square, MousePointer2 } from 'lucide-react';
import WaveSimulator from './WaveSimulator';
import './WaveInterference.css';

export default function WaveInterferencePage() {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const simulatorRef = useRef(null);
    const imageDataRef = useRef(null);

    // Simulation resolution (lower than screen for performance + retro look)
    const SIM_WIDTH = 200;
    const SIM_HEIGHT = 200;

    // State
    const [isPlaying, setIsPlaying] = useState(true);
    const [interactionMode, setInteractionMode] = useState('TAP'); // TAP, OSCILLATOR, WALL
    const [params, setParams] = useState({
        damping: 0.98,
        frequency: 0.3,
        speed: 1
    });

    const mouseRef = useRef({ x: 0, y: 0, isPressed: false });

    // Initialize
    useEffect(() => {
        const sim = new WaveSimulator(SIM_WIDTH, SIM_HEIGHT);
        simulatorRef.current = sim;

        // Initial setup
        sim.damping = params.damping;

        // Setup canvas buffer
        if (canvasRef.current) {
            canvasRef.current.width = SIM_WIDTH;
            canvasRef.current.height = SIM_HEIGHT;
        }
    }, [params.damping]);

    // Sync Params
    useEffect(() => {
        if (simulatorRef.current) {
            simulatorRef.current.damping = params.damping;
        }
    }, [params]);

    // Input Handling
    const handleMouseDown = (e) => {
        mouseRef.current.isPressed = true;
        updateMousePos(e);
        handleInteraction();
    };

    const handleMouseMove = (e) => {
        updateMousePos(e);
        if (mouseRef.current.isPressed) {
            handleInteraction();
        }
    };

    const handleMouseUp = () => {
        mouseRef.current.isPressed = false;
    };

    const updateMousePos = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = SIM_WIDTH / rect.width;
        const scaleY = SIM_HEIGHT / rect.height;
        mouseRef.current.x = Math.floor((e.clientX - rect.left) * scaleX);
        mouseRef.current.y = Math.floor((e.clientY - rect.top) * scaleY);
    };

    const handleInteraction = () => {
        const sim = simulatorRef.current;
        const { x, y } = mouseRef.current;
        if (!sim) return;

        if (interactionMode === 'TAP') {
            sim.addDisturbance(x, y, 500);
        } else if (interactionMode === 'WALL') {
            // Draw a small 3x3 block of wall
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    sim.setWall(x + dx, y + dy, true);
                }
            }
        } else if (interactionMode === 'OSCILLATOR') {
            // Add oscillator only on initial click to avoid spamming
            // Check if source already close exists? Nah, let's just add.
            // Actually, for drag, we probably don't want to add 60 sources a second.
            // So we only add if it's a new press (handled by click) or check duplicates.
        }
    };

    // Special handler for single-click actions
    const handleClick = () => {
        if (interactionMode === 'OSCILLATOR' && simulatorRef.current) {
            const { x, y } = mouseRef.current;
            simulatorRef.current.addSource(x, y, params.frequency, 50);
        }
    };

    const loadPreset = (type) => {
        const sim = simulatorRef.current;
        if (!sim) return;
        sim.reset();

        const cx = SIM_WIDTH / 2;
        const cy = SIM_HEIGHT / 2;

        if (type === 'DOUBLE_SLIT') {
            // Draw wall
            for (let y = 0; y < SIM_HEIGHT; y++) {
                if (Math.abs(y - cy) > 20 && Math.abs(y - cy) < 40) {
                    // blocked
                } else if (Math.abs(y - cy) > 5) { // Central block
                    sim.setWall(cx, y, true);
                    sim.setWall(cx + 1, y, true);
                }
            }
            // Add source far left
            sim.addSource(20, cy, params.frequency, 50);
        } else if (type === 'REFLECTION') {
            // Diagonal Wall
            for (let i = 0; i < 100; i++) {
                sim.setWall(cx + i, 20 + i, true);
                sim.setWall(cx + i + 1, 20 + i, true);
            }
            sim.addSource(cx - 50, cy, params.frequency, 50);
        } else if (type === 'INTERFERENCE') {
            sim.addSource(cx - 40, cy, params.frequency, 50);
            sim.addSource(cx + 40, cy, params.frequency, 50);
        }
    };

    // Loop
    const animate = useCallback(() => {
        const sim = simulatorRef.current;
        const canvas = canvasRef.current;

        if (sim && canvas) {
            if (isPlaying) {
                for (let i = 0; i < params.speed; i++) {
                    sim.step();
                }
            }

            // Render
            const ctx = canvas.getContext('2d');
            if (!imageDataRef.current) {
                imageDataRef.current = ctx.createImageData(SIM_WIDTH, SIM_HEIGHT);
            }
            const imageData = imageDataRef.current;
            sim.renderToBuffer(imageData);
            ctx.putImageData(imageData, 0, 0);
        }
    }, [isPlaying, params.speed]);

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
        <div className="wave-page">
            <header className="wave-header">
                <Link to="/" className="back-link">
                    <ArrowLeft size={20} />
                    <span>Back to Hub</span>
                </Link>
                <h1>Wave Interference</h1>
                <div className="header-controls">
                    <button onClick={() => setIsPlaying(!isPlaying)} className="btn-icon">
                        {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                    </button>
                    <button onClick={() => simulatorRef.current?.reset()} className="btn-icon">
                        <RotateCcw size={20} />
                    </button>
                </div>
            </header>

            <main className="wave-main">
                <div className="canvas-container" ref={containerRef}>
                    <canvas
                        ref={canvasRef}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onClick={handleClick}
                        style={{ imageRendering: 'pixelated' }}
                    />
                    <div className="overlay-info">
                        Mode: {interactionMode}
                    </div>
                </div>

                <aside className="wave-sidebar">
                    <div className="sidebar-section">
                        <h2><MousePointer2 size={16} /> Interaction</h2>
                        <div className="mode-toggle">
                            <button className={interactionMode === 'TAP' ? 'active' : ''} onClick={() => setInteractionMode('TAP')}>
                                Tap
                            </button>
                            <button className={interactionMode === 'OSCILLATOR' ? 'active' : ''} onClick={() => setInteractionMode('OSCILLATOR')}>
                                Oscillator
                            </button>
                            <button className={interactionMode === 'WALL' ? 'active' : ''} onClick={() => setInteractionMode('WALL')}>
                                Wall
                            </button>
                        </div>
                    </div>

                    <div className="sidebar-section">
                        <h2><Settings2 size={16} /> Parameters</h2>
                        <div className="param-group">
                            <label>Damping: {params.damping}</label>
                            <input
                                type="range" min="0.90" max="0.999" step="0.001"
                                value={params.damping}
                                onChange={e => setParams({ ...params, damping: Number(e.target.value) })}
                            />
                        </div>
                        <div className="param-group">
                            <label>Frequency: {params.frequency}</label>
                            <input
                                type="range" min="0.05" max="1.0" step="0.05"
                                value={params.frequency}
                                onChange={e => setParams({ ...params, frequency: Number(e.target.value) })}
                            />
                        </div>
                        <div className="param-group">
                            <label>Speed: {params.speed}x</label>
                            <input
                                type="range" min="1" max="5" step="1"
                                value={params.speed}
                                onChange={e => setParams({ ...params, speed: Number(e.target.value) })}
                            />
                        </div>
                    </div>

                    <div className="sidebar-section">
                        <h2><Waves size={16} /> Presets</h2>
                        <div className="scenario-grid">
                            <button onClick={() => loadPreset('INTERFERENCE')}>Two Sources</button>
                            <button onClick={() => loadPreset('DOUBLE_SLIT')}>Double Slit</button>
                            <button onClick={() => loadPreset('REFLECTION')}>Reflection</button>
                        </div>
                    </div>
                </aside>
            </main>
        </div>
    );
}
