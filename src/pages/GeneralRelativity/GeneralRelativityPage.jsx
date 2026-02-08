import React, { useState, Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Settings2, RefreshCcw, AlertCircle } from 'lucide-react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { WebGPURenderer } from 'three/webgpu';
import * as THREE from 'three';

import Controls from './components/Controls';
import WebGLSystem from './systems/WebGLSystem';
import WebGPUSystem from './systems/WebGPUSystem';

// Safe OrbitControls to prevent crashes in headless environments or when canvas is not ready
const SafeOrbitControls = (props) => {
    const { gl } = useThree();
    // Only render controls if we have a valid DOM element with style to attach events to
    if (!gl || !gl.domElement || !gl.domElement.style) return null;
    return <OrbitControls {...props} />;
};

export default function GeneralRelativityPage() {
    const [rendererType, setRendererType] = useState('webgl'); // 'webgl' or 'webgpu'
    const [isPlaying, setIsPlaying] = useState(true);
    const [simulationKey, setSimulationKey] = useState(0);
    const [error, setError] = useState(null);

    // Physics & Visual Parameters
    const [params, setParams] = useState({
        physicsModel: 'newtonian', // 'newtonian', 'relativistic'
        blackHoleMass: 1000,
        speedOfLight: 100,
        showGrid: true,
        showDisk: true,
        enableLensing: true,
        gridIntensity: 0.5,
    });

    const resetSimulation = () => {
        setSimulationKey(prev => prev + 1);
        setIsPlaying(true);
        setError(null);
    };

    // Canvas Configuration
    // We need different GL constructors for WebGL vs WebGPU
    // React-Three-Fiber's `gl` prop accepts a callback `(canvas) => Renderer`.

    const glConfig = (canvas) => {
        // Defensive check: sometimes canvas might be wrapped or undefined in edge cases
        const targetCanvas = (canvas && canvas.canvas) ? canvas.canvas : canvas;

        if (rendererType === 'webgpu') {
             const renderer = new WebGPURenderer({ canvas: targetCanvas, antialias: true, alpha: true });
             renderer.init().catch(e => console.error("WebGPU Init Failed", e));
             return renderer;
        } else {
            return new THREE.WebGLRenderer({ canvas: targetCanvas, antialias: true, alpha: true });
        }
    };

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-slate-200">
                <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
                <h1 className="text-2xl font-bold mb-2">Simulation Error</h1>
                <p className="mb-4">{error.message}</p>
                <button onClick={() => window.location.reload()} className="px-4 py-2 bg-slate-700 rounded hover:bg-slate-600">
                    Reload
                </button>
            </div>
        );
    }

    return (
        <div className="w-full h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden relative">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-4 z-10 flex flex-col gap-4 pointer-events-none max-w-[calc(100%-20rem)]">
                <div className="flex flex-col gap-2 pointer-events-auto items-start">
                    <Link to="/" className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-600/50 rounded-lg text-slate-300 hover:text-white text-sm font-medium transition-all backdrop-blur-sm">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Hub
                    </Link>
                    <div className="flex items-center gap-4 flex-wrap">
                        <h1 className="text-2xl font-bold text-slate-200 drop-shadow-lg flex items-center gap-2">
                            General Relativity Simulator <span className="text-xs bg-purple-600 text-white px-1.5 py-0.5 rounded">BETA</span>
                        </h1>
                        <div className="pointer-events-auto bg-slate-900/90 backdrop-blur border border-slate-700 rounded-lg p-1.5 flex gap-1 shadow-xl">
                            <button
                                onClick={() => setRendererType('webgl')}
                                className={`px-3 py-1 rounded text-xs font-mono transition-colors ${rendererType === 'webgl' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                WebGL
                            </button>
                            <button
                                onClick={() => setRendererType('webgpu')}
                                className={`px-3 py-1 rounded text-xs font-mono transition-colors ${rendererType === 'webgpu' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                WebGPU
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Canvas */}
            <div className="absolute inset-0 z-0 bg-slate-900">
                {/*
                   Key is essential here!
                   When switching renderer types, we must fully unmount and remount the Canvas
                   because the underlying GL context is different and incompatible.
                */}
                <Canvas
                    key={rendererType}
                    camera={{ position: [0, 40, 60], fov: 45 }}
                    gl={glConfig}
                    shadows
                    onError={(e) => setError(e)}
                >
                    <color attach="background" args={['#050510']} />

                    {/* Lighting */}
                    <ambientLight intensity={0.2} />
                    <pointLight position={[100, 100, 100]} intensity={1} />

                    {/* Controls */}
                    <SafeOrbitControls makeDefault enableDamping dampingFactor={0.1} />

                    {/* System */}
                    <Suspense fallback={null}>
                        {rendererType === 'webgl' ? (
                            <WebGLSystem key={simulationKey} params={params} isPlaying={isPlaying} />
                        ) : (
                            <WebGPUSystem key={simulationKey} params={params} isPlaying={isPlaying} />
                        )}
                    </Suspense>
                </Canvas>
            </div>

            {/* Sidebar Controls */}
            <aside className="absolute right-0 top-0 bottom-0 w-80 bg-slate-900/90 backdrop-blur-md border-l border-slate-700 p-6 z-20 overflow-y-auto shadow-2xl">
                <div className="mb-6 flex items-center gap-2 text-purple-400">
                    <Settings2 className="w-5 h-5" />
                    <h2 className="font-bold text-lg">Configuration</h2>
                </div>

                <Controls
                    params={params}
                    setParams={setParams}
                    isPlaying={isPlaying}
                    setIsPlaying={setIsPlaying}
                    onReset={resetSimulation}
                />
            </aside>
        </div>
    );
}
