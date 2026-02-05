import React, { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Stats } from '@react-three/drei';
import { Link } from 'react-router-dom';
import { ArrowLeft, Play, Pause, RotateCcw, Settings2, Droplets, Layers, MousePointer2 } from 'lucide-react';
import WaterSimulation from './WaterSimulation';
import '../FluidDynamics/FluidDynamics.css';

export default function ExperimentalFluidPage() {
    const [isPlaying, setIsPlaying] = useState(true);
    const [viewMode, setViewMode] = useState('WATER'); // WATER, HEIGHT

    // Parameters
    const [params, setParams] = useState({
        damping: 0.96,
        speed: 0.3,
        mouseStrength: 0.8,
        color: '#00aaff'
    });

    const [key, setKey] = useState(0); // For resetting

    const handleReset = () => {
        setKey(prev => prev + 1);
    };

    return (
        <div className="fluid-page">
            <header className="fluid-header">
                <Link to="/" className="back-link">
                    <ArrowLeft size={20} />
                    <span>Back to Hub</span>
                </Link>
                <h1>Experimental Fluid (Wave Equation)</h1>
                <div className="header-controls">
                    <button onClick={() => setIsPlaying(!isPlaying)} className="btn-icon">
                        {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                    </button>
                    <button onClick={handleReset} className="btn-icon">
                        <RotateCcw size={20} />
                    </button>
                </div>
            </header>

            <main className="fluid-main">
                <div className="canvas-container">
                    <Canvas
                        camera={{ position: [0, 4, 6], fov: 45 }}
                        dpr={[1, 2]} // Support high DPI
                    >
                        {/* Simulation & Scene */}
                        <Suspense fallback={null}>
                            {/* Environment for reflections */}
                            <Environment preset="sunset" background />

                            {/* Water Simulation Mesh */}
                            {isPlaying && (
                                <WaterSimulation
                                    key={key}
                                    damping={params.damping}
                                    speed={params.speed}
                                    mouseStrength={params.mouseStrength}
                                    color={params.color}
                                />
                            )}

                            {/* Controls */}
                            <OrbitControls
                                makeDefault
                                minPolarAngle={0}
                                maxPolarAngle={Math.PI / 2 - 0.1} // Prevent going below surface
                                maxDistance={20}
                            />
                        </Suspense>

                        <Stats className="fluid-stats" />
                    </Canvas>

                    <div className="overlay-info">
                        <strong>Controls:</strong> Click and drag on water to create ripples.
                        <br />
                        <span className="text-sky-400">GPGPU Wave Equation Solver</span>
                    </div>
                </div>

                <aside className="fluid-sidebar">
                     {/* View Modes (Placeholder for now, could swap shaders) */}
                     <div className="sidebar-section">
                        <h2><Layers size={16} /> Visualization</h2>
                        <div className="mode-toggle">
                            <button className={viewMode === 'WATER' ? 'active' : ''} onClick={() => setViewMode('WATER')}>Water</button>
                            {/* Future: Add Height Map view */}
                        </div>
                    </div>

                    {/* Interaction */}
                    <div className="sidebar-section">
                        <h2><MousePointer2 size={16} /> Interaction</h2>
                        <div className="mode-toggle">
                            <button className="active">
                                <MousePointer2 size={14} className="mr-1" /> Touch
                            </button>
                        </div>
                    </div>

                    {/* Parameters */}
                    <div className="sidebar-section">
                        <h2><Settings2 size={16} /> Physics Parameters</h2>

                        <div className="param-group">
                            <label>Damping (Viscosity): {params.damping.toFixed(3)}</label>
                            <input
                                type="range" min="0.9" max="0.999" step="0.001"
                                value={params.damping}
                                onChange={e => setParams({ ...params, damping: Number(e.target.value) })}
                            />
                        </div>

                        <div className="param-group">
                            <label>Wave Speed: {params.speed.toFixed(2)}</label>
                            <input
                                type="range" min="0.1" max="1.0" step="0.05"
                                value={params.speed}
                                onChange={e => setParams({ ...params, speed: Number(e.target.value) })}
                            />
                        </div>

                        <div className="param-group">
                            <label>Interaction Strength: {params.mouseStrength.toFixed(1)}</label>
                            <input
                                type="range" min="0.1" max="2.0" step="0.1"
                                value={params.mouseStrength}
                                onChange={e => setParams({ ...params, mouseStrength: Number(e.target.value) })}
                            />
                        </div>
                    </div>

                    <div className="sidebar-section">
                        <h2><Droplets size={16} /> Appearance</h2>
                        <div className="param-group">
                            <label>Water Color</label>
                            <input
                                type="color"
                                value={params.color}
                                onChange={e => setParams({ ...params, color: e.target.value })}
                                style={{ width: '100%', height: '32px', cursor: 'pointer' }}
                            />
                        </div>
                    </div>

                </aside>
            </main>
        </div>
    );
}
