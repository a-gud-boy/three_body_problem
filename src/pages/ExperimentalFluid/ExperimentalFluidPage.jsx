import React, { useRef, useEffect, useMemo, useState, Component } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Fn, uniform, storage, float, uint, vec2, vec3, color, positionLocal, instanceIndex, vertexIndex, distance } from 'three/tsl';
import { WebGPURenderer, MeshStandardNodeMaterial } from 'three/webgpu';
import * as THREE from 'three';
import { Link } from 'react-router-dom';
import { ArrowLeft, Play, Pause, Settings2, MousePointer2, AlertCircle } from 'lucide-react';

// --- Error Boundary ---
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-slate-900 text-slate-200 p-8">
            <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
            <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
            <pre className="bg-slate-950 p-4 rounded border border-slate-800 text-red-300 overflow-auto max-w-full text-xs font-mono">
                {this.state.error?.toString()}
            </pre>
            <button
                onClick={() => window.location.reload()}
                className="mt-6 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-white"
            >
                Reload Page
            </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const SafeOrbitControls = () => {
    const { gl } = useThree();
    // Only render controls if we have a valid DOM element with style to attach events to
    if (!gl || !gl.domElement || !gl.domElement.style) return null;
    return <OrbitControls makeDefault />;
};

// --- TSL Simulation Logic ---

const GRID_SIZE = 128;
const COUNT = GRID_SIZE * GRID_SIZE;

// Define buffers globally to ensure they are stable nodes
const currentBuffer = storage(new Float32Array(COUNT), 'float', COUNT);
const prevBuffer = storage(new Float32Array(COUNT), 'float', COUNT);

// Define Uniforms globally (or at least stable refs)
const uMouse = uniform(new THREE.Vector2(-1000, -1000));
const uDamping = uniform(0.98);
const uSpeed = uniform(1.0);
const uBrushSize = uniform(5.0);
const uBrushStrength = uniform(5.0);

// Define Compute Shader
const computeWater = Fn(() => {
    const index = uint(instanceIndex);

    const x = index.mod(GRID_SIZE);
    const y = index.div(GRID_SIZE);

    const current = currentBuffer.element(index);
    const prev = prevBuffer.element(index);

    // Helper to get buffer value safely
    const getVal = (ix, iy) => {
        const cX = ix.clamp(0, GRID_SIZE - 1);
        const cY = iy.clamp(0, GRID_SIZE - 1);
        const idx = cY.mul(GRID_SIZE).add(cX);
        return currentBuffer.element(idx);
    };

    const right = getVal(x.add(1), y);
    const left = getVal(x.sub(1), y);
    const up = getVal(x, y.sub(1));
    const down = getVal(x, y.add(1));

    const neighborSum = right.add(left).add(up).add(down);
    const val = neighborSum.div(2.0).sub(prev);

    const damped = val.mul(uDamping);

    const d = distance(vec2(x, y), uMouse);
    const interaction = uBrushStrength.mul(
            float(1.0).sub(d.div(uBrushSize)).clamp(0.0, 1.0)
    );

    const finalHeight = damped.add(interaction);

    prevBuffer.element(index).assign(current);
    currentBuffer.element(index).assign(finalHeight);

}).compute(COUNT);


const Simulation = ({ params, isPlaying, mousePos }) => {

    useEffect(() => {
        uDamping.value = params.damping;
        uSpeed.value = params.speed;
        uBrushSize.value = params.brushSize;
        uBrushStrength.value = params.brushStrength;
    }, [params]);

    useFrame(() => {
        if (mousePos.current) {
            uMouse.value.set(mousePos.current.x, mousePos.current.y);
        }
    });

    // 4. Material Logic
    const waterMaterial = useMemo(() => {
        const mat = new MeshStandardNodeMaterial();
        mat.colorNode = color(params.color);
        mat.roughness = 0.1;
        mat.metalness = 0.8;

        const idx = uint(vertexIndex);
        const x = idx.mod(GRID_SIZE);
        const y = idx.div(GRID_SIZE);

        // Helper to get buffer value safely
        const getVal = (ix, iy) => {
             const cX = ix.clamp(0, GRID_SIZE - 1);
             const cY = iy.clamp(0, GRID_SIZE - 1);
             const bufferIdx = cY.mul(GRID_SIZE).add(cX);
             return currentBuffer.element(bufferIdx);
        };

        const height = currentBuffer.element(idx);

        const pos = positionLocal;
        const newPos = vec3(pos.x, height.mul(5.0), pos.z);
        mat.positionNode = newPos;

        // Normal calculation for correct lighting
        const hL = getVal(x.sub(1), y);
        const hR = getVal(x.add(1), y);
        const hD = getVal(x, y.sub(1));
        const hU = getVal(x, y.add(1));

        const stride = float(1.5); // Approx 2 * (100/128)
        const heightScale = float(5.0);

        const dx = hR.sub(hL).mul(heightScale);
        const dy = hU.sub(hD).mul(heightScale);

        mat.normalNode = vec3(dx.negate(), stride, dy.negate()).normalize();

        return mat;
    }, [params.color]); // Removed currentBuffer dep as it is now global/stable

    useEffect(() => {
        waterMaterial.colorNode = color(params.color);
        waterMaterial.needsUpdate = true;
    }, [params.color, waterMaterial]);

    // 5. Render Loop
    useFrame(({ gl }) => {
        if (isPlaying) {
             // Use computeAsync if available (WebGPURenderer)
             try {
                if (gl.computeAsync) {
                    gl.computeAsync(computeWater);
                } else if (gl.compute) {
                    gl.compute(computeWater);
                }
             } catch (_) {
                 // Suppress compute errors if WebGPU is not active
             }
        }
    });

    return (
        <mesh material={waterMaterial} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[100, 100, GRID_SIZE - 1, GRID_SIZE - 1]} />
        </mesh>
    );
};

// --- Main Page Component ---

export default function ExperimentalFluidPage() {
    const [params, setParams] = useState({
        damping: 0.98,
        speed: 1.0,
        brushSize: 5.0,
        brushStrength: 5.0,
        color: '#0088ff'
    });
    const [isPlaying, setIsPlaying] = useState(true);

    const mousePos = useRef(new THREE.Vector2(-1000, -1000));

    const onMeshPointerMove = (e) => {
        const x = (e.point.x + 50) / 100 * GRID_SIZE;
        const y = (e.point.z + 50) / 100 * GRID_SIZE;
        mousePos.current.set(x, y);
    };

    const onMeshPointerLeave = () => {
        mousePos.current.set(-1000, -1000);
    };

    return (
        <ErrorBoundary>
            <div className="w-full h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden relative">
                 {/* Header */}
                 <div className="absolute top-0 left-0 right-0 p-4 z-10 flex justify-between items-start pointer-events-none">
                    <div className="flex flex-col gap-2 pointer-events-auto">
                        <Link to="/" className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-600/50 rounded-lg text-slate-300 hover:text-white text-sm font-medium transition-all backdrop-blur-sm">
                            <ArrowLeft className="w-4 h-4" />
                            Back to Hub
                        </Link>
                        <h1 className="text-2xl font-bold text-slate-200 drop-shadow-lg flex items-center gap-2">
                            WebGPU Water Simulation <span className="text-xs bg-purple-600 text-white px-1.5 py-0.5 rounded">Experimental</span>
                        </h1>
                    </div>
                </div>

                {/* Canvas */}
                <div className="absolute inset-0 z-0">
                    <Canvas
                        camera={{ position: [0, 80, 80], fov: 45 }}
                        gl={canvas => {
                            const renderer = new WebGPURenderer({ canvas, antialias: true });
                            // Attempt to initialize, but don't crash if it fails (handled by fallbacks internally usually)
                            renderer.init().catch(e => console.error("WebGPU init failed:", e));
                            return renderer;
                        }}
                        onCreated={({ camera }) => {
                            camera.lookAt(0, 0, 0);
                        }}
                    >
                        <color attach="background" args={['#0f172a']} />
                        <SafeOrbitControls />

                        <ambientLight intensity={0.5} />
                        <directionalLight position={[10, 20, 10]} intensity={1} />
                        <pointLight position={[-10, 10, -10]} intensity={1} color="#00ffff" />

                        <group>
                            <Simulation
                                params={params}
                                isPlaying={isPlaying}
                                mousePos={mousePos}
                            />
                            <mesh
                                rotation={[-Math.PI / 2, 0, 0]}
                                visible={false}
                                onPointerMove={onMeshPointerMove}
                                onPointerLeave={onMeshPointerLeave}
                            >
                                 <planeGeometry args={[100, 100]} />
                            </mesh>
                        </group>

                    </Canvas>
                </div>

                {/* Sidebar Controls */}
                <aside className="absolute right-0 top-0 bottom-0 w-80 bg-slate-900/90 backdrop-blur-md border-l border-slate-700 p-6 z-20 overflow-y-auto">
                     <div className="mb-6 flex items-center gap-2 text-purple-400">
                        <Settings2 className="w-5 h-5" />
                        <h2 className="font-bold text-lg">Configuration</h2>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-4">
                            <button
                                onClick={() => setIsPlaying(!isPlaying)}
                                className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold transition-all ${
                                    isPlaying
                                    ? 'bg-amber-500/10 text-amber-500 border border-amber-500/50 hover:bg-amber-500/20'
                                    : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg'
                                }`}
                            >
                                {isPlaying ? <><Pause className="w-4 h-4" /> Pause Simulation</> : <><Play className="w-4 h-4" /> Resume</>}
                            </button>

                             <div className="space-y-2">
                                <label className="text-sm text-slate-400 flex justify-between">
                                    Damping
                                    <span className="text-slate-200 font-mono">{params.damping.toFixed(3)}</span>
                                </label>
                                <input
                                    type="range" min="0.900" max="0.999" step="0.001"
                                    value={params.damping}
                                    onChange={e => setParams({...params, damping: parseFloat(e.target.value)})}
                                    className="w-full accent-purple-500"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm text-slate-400 flex justify-between">
                                    Wave Speed
                                    <span className="text-slate-200 font-mono">{params.speed.toFixed(1)}</span>
                                </label>
                                <input
                                    type="range" min="0.1" max="5.0" step="0.1"
                                    value={params.speed}
                                    onChange={e => setParams({...params, speed: parseFloat(e.target.value)})}
                                    className="w-full accent-purple-500"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm text-slate-400 flex justify-between">
                                    Brush Size
                                    <span className="text-slate-200 font-mono">{params.brushSize.toFixed(1)}</span>
                                </label>
                                <input
                                    type="range" min="1.0" max="20.0" step="0.5"
                                    value={params.brushSize}
                                    onChange={e => setParams({...params, brushSize: parseFloat(e.target.value)})}
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
                                    onChange={e => setParams({...params, brushStrength: parseFloat(e.target.value)})}
                                    className="w-full accent-purple-500"
                                />
                            </div>

                             <div className="space-y-2">
                                <label className="text-sm text-slate-400">Water Color</label>
                                <div className="flex gap-2">
                                    {['#0088ff', '#00ffcc', '#ff0088', '#8800ff'].map(c => (
                                        <button
                                            key={c}
                                            onClick={() => setParams({...params, color: c})}
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
                            Hover over the water surface to create ripples. Adjust parameters to change fluid viscosity and wave propagation properties.
                        </div>
                    </div>
                </aside>
            </div>
        </ErrorBoundary>
    );
}
