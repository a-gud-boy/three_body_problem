import React from 'react';
import { Settings2, Play, Pause, RefreshCw, Layers, Zap, Info } from 'lucide-react';

export default React.memo(function Controls({ params, setParams, isPlaying, setIsPlaying, onReset }) {

    const handleChange = (key, value) => {
        setParams(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className="space-y-6 text-slate-200">
            {/* Simulation Control */}
            <div className="flex gap-2">
                <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-semibold transition-all ${isPlaying
                        ? 'bg-amber-500/10 text-amber-500 border border-amber-500/50 hover:bg-amber-500/20'
                        : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg'
                        }`}
                >
                    {isPlaying ? <><Pause className="w-4 h-4" /> Pause</> : <><Play className="w-4 h-4" /> Resume</>}
                </button>
                <button
                    onClick={onReset}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
                    title="Reset Simulation"
                    aria-label="Reset simulation"
                >
                    <RefreshCw className="w-4 h-4" aria-hidden="true" />
                </button>
            </div>

            {/* Presets */}
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-semibold border-b border-amber-500/20 pb-2">
                    <Layers className="w-4 h-4" /> Presets
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => {
                            setParams(prev => ({ ...prev, blackHoleMass: 1000, speedOfLight: 100, physicsModel: 'newtonian' }));
                            onReset();
                        }}
                        className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-xs text-slate-300 border border-slate-700"
                    >
                        Standard Newtonian
                    </button>
                    <button
                        onClick={() => {
                            setParams(prev => ({ ...prev, blackHoleMass: 2000, speedOfLight: 60, physicsModel: 'relativistic' }));
                            onReset();
                        }}
                        className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-xs text-slate-300 border border-slate-700"
                    >
                        Relativistic Deep Well
                    </button>
                    <button
                        onClick={() => {
                            setParams(prev => ({ ...prev, blackHoleMass: 5000, speedOfLight: 100, physicsModel: 'relativistic' }));
                            onReset();
                        }}
                        className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-xs text-slate-300 border border-slate-700"
                    >
                        Supermassive
                    </button>
                    <button
                        onClick={() => {
                            setParams(prev => ({ ...prev, blackHoleMass: 500, speedOfLight: 30, physicsModel: 'relativistic' }));
                            onReset();
                        }}
                        className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-xs text-slate-300 border border-slate-700"
                    >
                        Extreme Curvature
                    </button>
                    <button
                        onClick={() => {
                            setParams(prev => ({ ...prev, blackHoleMass: 2000, speedOfLight: 50, physicsModel: 'relativistic', kerrSpinParameter: 0.8, showPhotonSphere: true }));
                            onReset();
                        }}
                        className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-xs text-slate-300 border border-slate-700"
                    >
                        ⟳ Spinning BH
                    </button>
                </div>
            </div>

            {/* Physics Parameters */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-purple-400 font-semibold border-b border-purple-500/20 pb-2">
                    <Zap className="w-4 h-4" /> Physics Engine
                </div>

                <div className="space-y-2">
                    <label className="text-xs uppercase text-slate-500 font-bold tracking-wider">Model</label>
                    <div className="flex bg-slate-800 p-1 rounded-lg">
                        <button
                            onClick={() => handleChange('physicsModel', 'newtonian')}
                            className={`flex-1 py-1.5 text-xs font-medium rounded ${params.physicsModel === 'newtonian' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Newtonian
                        </button>
                        <button
                            onClick={() => handleChange('physicsModel', 'relativistic')}
                            className={`flex-1 py-1.5 text-xs font-medium rounded ${params.physicsModel === 'relativistic' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Relativistic (GR)
                        </button>
                    </div>
                    {params.physicsModel === 'relativistic' && (
                        <p className="text-[10px] text-purple-300/80 leading-tight">
                            Uses Paczyński-Wiita potential to simulate Event Horizon & ISCO.
                        </p>
                    )}
                </div>

                <div className="space-y-1">
                    <label className="text-sm text-slate-400 flex justify-between">
                        Black Hole Mass (M)
                        <span className="font-mono text-slate-200">{params.blackHoleMass.toFixed(1)}</span>
                    </label>
                    <input
                        type="range" min="100" max="5000" step="100"
                        value={params.blackHoleMass}
                        onChange={(e) => handleChange('blackHoleMass', parseFloat(e.target.value))}
                        className="w-full accent-purple-500"
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-sm text-slate-400 flex justify-between">
                        Speed of Light (c)
                        <span className="font-mono text-slate-200">{params.speedOfLight.toFixed(0)}</span>
                    </label>
                    <input
                        type="range" min="10" max="200" step="10"
                        value={params.speedOfLight}
                        onChange={(e) => handleChange('speedOfLight', parseFloat(e.target.value))}
                        className="w-full accent-purple-500"
                    />
                    <p className="text-[10px] text-slate-500">Lower 'c' makes relativistic effects more obvious.</p>
                </div>

                <div className="space-y-1">
                    <label className="text-sm text-slate-400 flex justify-between">
                        Black Hole Spin (a)
                        <span className="font-mono text-slate-200">{(params.kerrSpinParameter || 0).toFixed(2)}</span>
                    </label>
                    <input
                        type="range" min="0" max="1" step="0.05"
                        value={params.kerrSpinParameter || 0}
                        onChange={(e) => handleChange('kerrSpinParameter', parseFloat(e.target.value))}
                        className="w-full accent-purple-500"
                    />
                    <p className="text-[10px] text-slate-500">0 = Schwarzschild (non-rotating). Higher values add frame-dragging (Kerr metric).</p>
                </div>
            </div>

            {/* Visuals */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-cyan-400 font-semibold border-b border-cyan-500/20 pb-2">
                    <Layers className="w-4 h-4" /> Visualization
                </div>

                <div className="flex items-center justify-between">
                    <label className="text-sm text-slate-300">Show Grid</label>
                    <input
                        type="checkbox"
                        checked={params.showGrid}
                        onChange={(e) => handleChange('showGrid', e.target.checked)}
                        className="accent-cyan-500"
                    />
                </div>

                <div className="flex items-center justify-between">
                    <label className="text-sm text-slate-300">Show Accretion Disk</label>
                    <input
                        type="checkbox"
                        checked={params.showDisk}
                        onChange={(e) => handleChange('showDisk', e.target.checked)}
                        className="accent-cyan-500"
                    />
                </div>

                <div className="flex items-center justify-between">
                    <label className="text-sm text-slate-300">Gravitational Lensing</label>
                    <input
                        type="checkbox"
                        checked={params.enableLensing}
                        onChange={(e) => handleChange('enableLensing', e.target.checked)}
                        className="accent-cyan-500"
                    />
                </div>

                <div className="flex items-center justify-between">
                    <label className="text-sm text-slate-300">Photon Sphere</label>
                    <input
                        type="checkbox"
                        checked={params.showPhotonSphere}
                        onChange={(e) => handleChange('showPhotonSphere', e.target.checked)}
                        className="accent-cyan-500"
                    />
                </div>

                <div className="flex items-center justify-between">
                    <label className="text-sm text-slate-300">Event Horizon</label>
                    <input
                        type="checkbox"
                        checked={params.showEventHorizon}
                        onChange={(e) => handleChange('showEventHorizon', e.target.checked)}
                        className="accent-cyan-500"
                    />
                </div>

                <div className="flex items-center justify-between">
                    <label className="text-sm text-slate-300">Time Dilation Colors</label>
                    <input
                        type="checkbox"
                        checked={params.showTimeDilation}
                        onChange={(e) => handleChange('showTimeDilation', e.target.checked)}
                        className="accent-cyan-500"
                    />
                </div>
                {params.showTimeDilation && (
                    <p className="text-[10px] text-cyan-300/80 leading-tight">
                        Particles color-coded by gravitational time dilation: blue (extreme) → green → yellow → white (none).
                    </p>
                )}

                <div className="flex items-center justify-between">
                    <label className="text-sm text-slate-300">Einstein Ring</label>
                    <input
                        type="checkbox"
                        checked={params.showEinsteinRing}
                        onChange={(e) => handleChange('showEinsteinRing', e.target.checked)}
                        className="accent-cyan-500"
                    />
                </div>
                {params.showEinsteinRing && (
                    <p className="text-[10px] text-cyan-300/80 leading-tight">
                        Places a bright background source behind the black hole. Orbit the camera to align and see the Einstein ring.
                    </p>
                )}

                <div className="space-y-1">
                    <label className="text-sm text-slate-400 flex justify-between">
                        Grid Intensity
                        <span className="font-mono text-slate-200">{params.gridIntensity.toFixed(1)}</span>
                    </label>
                    <input
                        type="range" min="0" max="1" step="0.1"
                        value={params.gridIntensity}
                        onChange={(e) => handleChange('gridIntensity', parseFloat(e.target.value))}
                        className="w-full accent-cyan-500"
                    />
                </div>
            </div>

            <div className="p-3 bg-slate-800/50 rounded-lg text-xs text-slate-400 border border-slate-700/50 flex gap-2">
                <Info className="w-4 h-4 flex-shrink-0 text-slate-500" />
                <p>
                    Tip: Switch to "Relativistic" and lower the Speed of Light to see the Event Horizon form. The grid will warp significantly near the center.
                </p>
            </div>
        </div>
    );
});