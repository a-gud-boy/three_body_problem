import React, { useState, useCallback } from 'react';

import { Link } from 'react-router-dom';
import { ArrowLeft, Play, Pause, Thermometer, Gauge, Box } from 'lucide-react';
import GasContainer from './components/GasContainer';
import DataPlots from './components/DataPlots';
import PistonControl from './components/PistonControl';
import './ThermodynamicsPage.css';

export default function ThermodynamicsPage() {
    const [paused, setPaused] = useState(false);
    const [demonMode, setDemonMode] = useState(false);
    const [pistonPosition, setPistonPosition] = useState(100); // % of width
    const [stats, setStats] = useState({
        temperature: 0,
        pressure: 0,
        speedDistribution: [],
        history: [] // Array of {t, P, V}
    });

    const handleStatsUpdate = useCallback((newStats) => {
        setStats(prev => {
            const history = [...prev.history, {
                time: Date.now(),
                pressure: newStats.pressure,
                volume: newStats.volume
            }].slice(-100); // Keep last 100 points

            return {
                ...newStats,
                history
            };
        });
    }, []);

    return (
        <div className="thermodynamics-page">
            <header className="thermo-header">
                <div className="thermo-title">
                    <Link to="/" className="text-slate-400 hover:text-white transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    Entropy Lab: Maxwell's Demon
                </div>
                <div className="flex gap-4">
                    <button
                        className={`btn-toggle ${paused ? 'bg-yellow-500 text-black' : ''}`}
                        onClick={() => setPaused(!paused)}
                    >
                        {paused ? <Play size={16} /> : <Pause size={16} />}
                    </button>
                </div>
            </header>

            <div className="thermo-content">
                <div className="canvas-container">
                    <GasContainer
                        paused={paused}
                        demonMode={demonMode}
                        pistonPosition={pistonPosition}
                        onStatsUpdate={handleStatsUpdate}
                    />

                    {/* Overlay Controls */}
                    <div className="controls-overlay">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-bold text-slate-200">Lab Controls</h3>
                        </div>

                        <PistonControl
                            value={pistonPosition}
                            onChange={setPistonPosition}
                        />

                        <div className="control-group">
                            <label className="control-label">Maxwell's Demon</label>
                            <div className="flex items-center justify-between bg-slate-700/50 p-3 rounded-lg border border-slate-600">
                                <span className="text-sm text-slate-300">Sort Particles</span>
                                <button
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${demonMode ? 'bg-purple-500' : 'bg-slate-600'}`}
                                    onClick={() => setDemonMode(!demonMode)}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${demonMode ? 'translate-x-6' : 'translate-x-1'}`}
                                    />
                                </button>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                                Opens gate only for fast particles to right, slow to left.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-2">
                            <div className="bg-slate-700/30 p-3 rounded border border-slate-600/50">
                                <div className="text-slate-400 text-xs uppercase mb-1 flex items-center gap-1">
                                    <Thermometer size={12} /> Temp
                                </div>
                                <div className="text-2xl font-mono text-orange-400">
                                    {stats.temperature.toFixed(1)} K
                                </div>
                            </div>
                            <div className="bg-slate-700/30 p-3 rounded border border-slate-600/50">
                                <div className="text-slate-400 text-xs uppercase mb-1 flex items-center gap-1">
                                    <Gauge size={12} /> Pressure
                                </div>
                                <div className="text-2xl font-mono text-cyan-400">
                                    {stats.pressure.toFixed(2)} Pa
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Data Panel */}
                    <div className="data-panel">
                        <DataPlots
                            speedDistribution={stats.speedDistribution}
                            history={stats.history}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
