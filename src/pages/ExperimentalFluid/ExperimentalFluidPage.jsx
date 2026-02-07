import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { 
    Fn, uniform, storage, float, vec3,
    instanceIndex, vertexIndex, positionLocal,
    viewportUV, mix, color
} from 'three/tsl';
import { WebGPURenderer, StorageBufferAttribute, MeshStandardNodeMaterial } from 'three/webgpu';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Link } from 'react-router-dom';
import { ArrowLeft, Play, Pause, Settings2, MousePointer2, AlertCircle, RotateCcw, CloudRain } from 'lucide-react';

// --- WebGPU Water Simulation Class ---
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
        
        this.init();
    }
    
    async init() {
        try {
            // Guard against disposed state (React StrictMode double-mount)
            if (this.disposed) {
                console.log('Simulation already disposed, skipping init');
                return;
            }
            
            // Check WebGPU support
            if (!navigator.gpu) {
                throw new Error('WebGPU is not supported in this browser. Please use Chrome 113+, Edge 113+, or Firefox Nightly with WebGPU enabled.');
            }
            
            console.log('WebGPU supported, initializing...');
            
            // Scene setup
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x0f172a);
            
            // Camera
            this.camera = new THREE.PerspectiveCamera(
                45, 
                this.canvas.clientWidth / this.canvas.clientHeight, 
                0.1, 
                1000
            );
            this.camera.position.set(0, 80, 80);
            this.camera.lookAt(0, 0, 0);
            
            // WebGPU Renderer
            this.renderer = new WebGPURenderer({ 
                canvas: this.canvas, 
                antialias: true,
                powerPreference: 'high-performance' // Ensure discrete GPU is used
            });
            
            // Ensure valid canvas dimensions
            const width = this.canvas.clientWidth || 800;
            const height = this.canvas.clientHeight || 600;
            
            this.renderer.setSize(width, height);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            
            // Initialize WebGPU - this is async!
            await this.renderer.init();
            
            // Check if disposed during async init
            if (this.disposed) {
                console.log('Disposed during renderer init, aborting');
                return;
            }
            
            console.log('WebGPU Renderer initialized');
            
            // Wait a frame to ensure GPU device is fully ready
            // This is important for proper resource initialization across different GPU vendors
            await new Promise(resolve => requestAnimationFrame(resolve));
            
            // Check again after frame wait
            if (this.disposed) {
                console.log('Disposed during frame wait, aborting');
                return;
            }
            
            // Orbit Controls - use right-click for rotation so left-click can create ripples
            this.controls = new OrbitControls(this.camera, this.canvas);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.target.set(0, 0, 0);
            this.controls.mouseButtons = {
                LEFT: null, // Reserved for ripples
                MIDDLE: THREE.MOUSE.DOLLY,
                RIGHT: THREE.MOUSE.ROTATE
            };
            
            // Setup compute buffers and shaders
            this.setupCompute();
            
            // Setup water mesh with GPU-based vertex displacement
            this.setupWaterMesh();
            
            // Lights
            this.setupLights();
            
            // Setup background gradient
            this.setupBackground();

            // Create initial ripples
            this.createInitialRipples();
            
            // Final disposal check before completing initialization
            if (this.disposed) {
                console.log('Disposed before init complete, aborting');
                return;
            }
            
            this.initialized = true;
            
            // Do an initial render pass to ensure all pipelines are compiled
            this.renderer.render(this.scene, this.camera);
            
            if (this.onReady && !this.disposed) this.onReady(null);
            
            // Start animation loop
            if (!this.disposed) {
                this.animate();
            }
            
        } catch (error) {
            console.error('WebGPU initialization failed:', error);
            if (this.onReady) this.onReady(error);
        }
    }
    
    setupBackground() {
        // Create a nice gradient background using TSL
        // Dark blue/slate gradient
        const colA = color(new THREE.Color(0x0f172a)); // Deep slate
        const colB = color(new THREE.Color(0x1e293b)); // Lighter slate

        // Vertical gradient (viewportUV.y is 0 at bottom, 1 at top)
        // We want dark (colA) at top, lighter (colB) at bottom?
        // Or dark at bottom?
        // Let's do dark at top (0x0f172a) and lighter at bottom (0x1e293b) to simulate depth/horizon.
        // mix(x, y, a): if a=0 -> x, if a=1 -> y.
        // if y=0 (bottom), we want colB. if y=1 (top), we want colA.
        // So mix(colB, colA, viewportUV.y)
        this.scene.backgroundNode = mix(colB, colA, viewportUV.y);

        // --- NEW: Generate a simple procedural environment map ---
        // Since we can't use PMREMGenerator or load external assets easily here,
        // we'll create a DataTexture that acts as a simple environment map (gradient).
        const width = 256;
        const height = 128;
        const size = width * height;
        const data = new Uint8Array(4 * size);

        for (let i = 0; i < size; i++) {
            // const x = i % width;
            const y = Math.floor(i / width);
            // const u = x / width;
            const v = y / height; // 0 at top, 1 at bottom usually, or vice-versa

            // Simple sky gradient: blue at top, white at horizon, dark blue at bottom
            // Horizon is at v=0.5
            let r, g, b;

            if (v < 0.5) {
                // Sky (top half) - lighter blue to white
                const t = v * 2; // 0 to 1
                r = Math.floor(THREE.MathUtils.lerp(135, 255, t));
                g = Math.floor(THREE.MathUtils.lerp(206, 255, t));
                b = Math.floor(THREE.MathUtils.lerp(235, 255, t));
            } else {
                // Ground/Sea (bottom half) - dark blue
                const t = (v - 0.5) * 2; // 0 to 1
                r = Math.floor(THREE.MathUtils.lerp(255, 15, t));
                g = Math.floor(THREE.MathUtils.lerp(255, 23, t));
                b = Math.floor(THREE.MathUtils.lerp(255, 42, t));
            }

            data[i * 4] = r;
            data[i * 4 + 1] = g;
            data[i * 4 + 2] = b;
            data[i * 4 + 3] = 255; // Alpha
        }

        const envTexture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
        envTexture.colorSpace = THREE.SRGBColorSpace;
        envTexture.mapping = THREE.EquirectangularReflectionMapping;
        envTexture.needsUpdate = true;

        this.scene.environment = envTexture;
        // Optionally blur the background reflection slightly? Not easy without PMREM.
        this.scene.environmentIntensity = 1.0;
    }

    setupCompute() {
        // Create storage buffers for wave simulation
        const currentData = new Float32Array(this.count);
        const previousData = new Float32Array(this.count);
        currentData.fill(0);
        previousData.fill(0);
        
        this.currentBuffer = new StorageBufferAttribute(currentData, 1);
        this.previousBuffer = new StorageBufferAttribute(previousData, 1);
        
        this.currentBuffer.needsUpdate = true;
        this.previousBuffer.needsUpdate = true;
        
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
        this.uRainSize = uniform(2.0); // Smaller than brush
        this.uRainStrength = uniform(3.0);

        // Storage nodes
        this.currentStorage = storage(this.currentBuffer, 'float', this.count);
        this.previousStorage = storage(this.previousBuffer, 'float', this.count);
        
        // Compute shader for wave simulation
        const uMouse = this.uMouse;
        const uMouseActive = this.uMouseActive;
        const uDamping = this.uDamping;
        const uBrushSize = this.uBrushSize;
        const uBrushStrength = this.uBrushStrength;
        const uSpeed = this.uSpeed;

        const uRainPos = this.uRainPos;
        const uRainActive = this.uRainActive;
        const uRainSize = this.uRainSize;
        const uRainStrength = this.uRainStrength;

        const currentStorage = this.currentStorage;
        const previousStorage = this.previousStorage;
        const gridSize = this.gridSize;
        
        const computeWater = Fn(() => {
            const index = instanceIndex.toUint();
            
            const x = index.mod(gridSize);
            const y = index.div(gridSize);
            
            const current = currentStorage.element(index);
            const prev = previousStorage.element(index);
            
            const getVal = (ix, iy) => {
                const cX = ix.clamp(0, gridSize - 1);
                const cY = iy.clamp(0, gridSize - 1);
                const idx = cY.mul(gridSize).add(cX);
                return currentStorage.element(idx);
            };
            
            const right = getVal(x.add(1), y);
            const left = getVal(x.sub(1), y);
            const up = getVal(x, y.sub(1));
            const down = getVal(x, y.add(1));
            
            const laplacian = right.add(left).add(up).add(down).sub(current.mul(4.0));
            const speedSq = uSpeed.mul(uSpeed).mul(0.25);
            const newVal = speedSq.mul(laplacian).add(current.mul(2.0)).sub(prev);
            
            const damped = newVal.mul(uDamping);
            
            // Mouse Interaction
            const mousePos = uMouse;
            const dx = float(x).sub(mousePos.x);
            const dy = float(y).sub(mousePos.y);
            const dist = dx.mul(dx).add(dy.mul(dy)).sqrt();
            
            const brushEffect = uBrushStrength.mul(
                float(1.0).sub(dist.div(uBrushSize)).clamp(0.0, 1.0)
            ).mul(uMouseActive);
            
            // Rain Interaction
            const rainPos = uRainPos;
            const rdx = float(x).sub(rainPos.x);
            const rdy = float(y).sub(rainPos.y);
            const rdist = rdx.mul(rdx).add(rdy.mul(rdy)).sqrt();

            const rainEffect = uRainStrength.mul(
                float(1.0).sub(rdist.div(uRainSize)).clamp(0.0, 1.0)
            ).mul(uRainActive);

            const finalHeight = damped.add(brushEffect).add(rainEffect);
            
            previousStorage.element(index).assign(current);
            currentStorage.element(index).assign(finalHeight);
        });
        
        this.computeNode = computeWater().compute(this.count);
    }
    
    setupWaterMesh() {
        // Create geometry
        this.geometry = new THREE.PlaneGeometry(100, 100, this.gridSize - 1, this.gridSize - 1);
        this.geometry.rotateX(-Math.PI / 2);
        
        this.geometry.computeBoundingSphere();
        if (this.geometry.boundingSphere) {
            this.geometry.boundingSphere.radius = 100;
        }
        
        // Water material using MeshStandardNodeMaterial
        try {
            const currentStorage = this.currentStorage;
            this.uColor = uniform(new THREE.Color(this.params.color));
            const gridSize = this.gridSize;
            
            this.material = new MeshStandardNodeMaterial({
                metalness: 0.1, // Water is dielectric, so low metalness
                roughness: 0.02, // Very smooth surface for sharp reflections
                side: THREE.DoubleSide,
            });
            
            // Set color via uniform
            this.material.colorNode = this.uColor;
            
            // GPU-based vertex displacement
            const heightScale = float(5.0);
            
            this.material.positionNode = Fn(() => {
                const idx = vertexIndex.toUint();
                const height = currentStorage.element(idx);
                const pos = positionLocal;
                return vec3(pos.x, height.mul(heightScale), pos.z);
            })();
            
            // GPU-based normal calculation
            this.material.normalNode = Fn(() => {
                const idx = vertexIndex.toUint();
                const x = idx.mod(gridSize);
                const y = idx.div(gridSize);
                
                const getHeight = (ix, iy) => {
                    const cX = ix.clamp(0, gridSize - 1);
                    const cY = iy.clamp(0, gridSize - 1);
                    const bufIdx = cY.mul(gridSize).add(cX);
                    return currentStorage.element(bufIdx);
                };
                
                const hL = getHeight(x.sub(1), y);
                const hR = getHeight(x.add(1), y);
                const hD = getHeight(x, y.sub(1));
                const hU = getHeight(x, y.add(1));
                
                const gridSpacing = float(100.0 / gridSize);
                const scale = heightScale.mul(2.0);
                
                const dx = hR.sub(hL).mul(scale);
                const dy = hU.sub(hD).mul(scale);
                
                return vec3(dx.negate(), gridSpacing.mul(2.0), dy.negate()).normalize();
            })();
            
        } catch (materialErr) {
            console.warn('Failed to create node material, using fallback:', materialErr);
            this.material = new THREE.MeshStandardMaterial({
                color: this.params.color,
                metalness: 0.1,
                roughness: 0.02,
                side: THREE.DoubleSide,
            });
        }
        
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.frustumCulled = false;
        this.scene.add(this.mesh);
    }
    
    setupLights() {
        // Hemisphere light for soft ambient sky/ground lighting
        const hemiLight = new THREE.HemisphereLight(0x88ccff, 0x224466, 0.6);
        this.scene.add(hemiLight);
        
        // Main directional light (sun-like)
        const sunLight = new THREE.DirectionalLight(0xffffee, 1.2);
        sunLight.position.set(30, 50, 20);
        this.scene.add(sunLight);
        
        // Fill light from opposite side
        const fillLight = new THREE.DirectionalLight(0x8888ff, 0.4);
        fillLight.position.set(-30, 20, -20);
        this.scene.add(fillLight);
        
        // Rim light for specular highlights
        const rimLight = new THREE.PointLight(0xffffff, 0.8, 150);
        rimLight.position.set(0, 30, -50);
        this.scene.add(rimLight);
        
        // Accent colored light
        const accentLight = new THREE.PointLight(0x00ffff, 0.6, 120);
        accentLight.position.set(-40, 15, 40);
        this.scene.add(accentLight);
    }
    
    createInitialRipples() {
        // Create initial wave data on CPU, then upload to GPU
        const data = this.currentBuffer.array;
        const size = this.gridSize;
        
        // Central ripple
        const centerIdx = Math.floor(size / 2) * size + Math.floor(size / 2);
        data[centerIdx] = 2.0;
        
        // A few random ripples
        for (let i = 0; i < 5; i++) {
            const x = Math.floor(Math.random() * size);
            const y = Math.floor(Math.random() * size);
            const idx = y * size + x;
            data[idx] = (Math.random() - 0.5) * 3;
        }
        
        this.currentBuffer.needsUpdate = true;
    }
    
    setMousePosition(x, y) {
        if (this.uMouse) {
            this.uMouse.value.set(x, y);
        }
    }
    
    // Raycast from screen coordinates to find grid position
    raycastToGrid(ndcX, ndcY) {
        if (!this.raycaster) {
            this.raycaster = new THREE.Raycaster();
            this.waterPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // Y-up plane at y=0
        }
        
        // Set raycaster from camera
        const mouse = new THREE.Vector2(ndcX, ndcY);
        this.raycaster.setFromCamera(mouse, this.camera);
        
        // Find intersection with water plane
        const intersectPoint = new THREE.Vector3();
        const ray = this.raycaster.ray;
        if (ray.intersectPlane(this.waterPlane, intersectPoint)) {
            // Convert world position to grid coordinates
            // Water mesh is 100x100 centered at origin, grid is GRID_SIZE x GRID_SIZE
            const gridX = (intersectPoint.x + 50) / 100 * this.gridSize;
            const gridY = (intersectPoint.z + 50) / 100 * this.gridSize;
            return { x: gridX, y: gridY };
        }
        return null;
    }
    
    setMouseActive(active) {
        if (this.uMouseActive) {
            this.uMouseActive.value = active ? 1.0 : 0.0;
        }
    }
    
    // Trigger a single raindrop at a random location
    triggerRainDrop() {
        if (!this.uRainPos || !this.uRainActive) return;

        // Random position on the grid
        const x = Math.random() * this.gridSize;
        const y = Math.random() * this.gridSize;

        this.uRainPos.value.set(x, y);
        this.uRainActive.value = 1.0;

        // Reset after one frame (simulated via timeout for now, or handled in animate)
        // Since WebGPU runs asynchronously, we need to ensure this stays active for at least one compute dispatch.
        // We'll reset it in the next animate loop call.
        this.rainTriggered = true;
    }

    updateParams(params) {
        this.params = params;
        
        if (this.uDamping) {
            this.uDamping.value = params.damping;
        }
        if (this.uBrushSize) {
            this.uBrushSize.value = params.brushSize;
        }
        if (this.uBrushStrength) {
            this.uBrushStrength.value = params.brushStrength;
        }
        if (this.uSpeed) {
            this.uSpeed.value = params.speed;
        }
        if (this.uColor) {
            this.uColor.value.set(params.color);
        }
    }
    
    setPlaying(isPlaying) {
        this.isRunning = isPlaying;
    }
    
    reset() {
        if (!this.currentBuffer || !this.previousBuffer) return;
        
        this.currentBuffer.array.fill(0);
        this.previousBuffer.array.fill(0);
        this.currentBuffer.needsUpdate = true;
        this.previousBuffer.needsUpdate = true;
        
        this.createInitialRipples();
    }
    
    animate() {
        // Guard against disposed state
        if (this.disposed) return;
        
        this.animationId = requestAnimationFrame(() => this.animate());
        
        if (!this.initialized || this.disposed) return;
        
        this.controls.update();
        
        try {
            if (this.isRunning && this.computeNode) {
                // Run compute shader on GPU
                this.renderer.compute(this.computeNode);

                // If we triggered rain this frame, turn it off for the next
                if (this.rainTriggered) {
                    this.rainTriggered = false;
                    // We don't want to turn it off immediately if we want it to persist for exactly one frame?
                    // Actually, setting it to 0 here means it was 1 for the *just executed* compute pass (above).
                    // So this is correct.
                    if (this.uRainActive) this.uRainActive.value = 0.0;
                }
            }
            
            this.renderer.render(this.scene, this.camera);
        } catch (renderError) {
            if (!this.renderErrorLogged) {
                this.renderErrorLogged = true;
                console.error('WebGPU render error:', renderError);
            }
        }
    }
    
    resize(width, height) {
        if (!this.initialized) return;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
    
    dispose() {
        this.disposed = true;
        this.initialized = false;
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        // Clear scene
        if (this.scene) {
            while (this.scene.children.length > 0) {
                this.scene.remove(this.scene.children[0]);
            }
        }
        
        // Dispose GPU resources
        this.geometry?.dispose();
        this.material?.dispose();
        this.currentBuffer = null;
        this.previousBuffer = null;
        this.computeNode = null;
        
        // Dispose renderer last
        this.renderer?.dispose();
        this.controls?.dispose();
    }
}

// --- Main Page Component ---

export default function ExperimentalFluidPage() {
    const [params, setParams] = useState({
        damping: 0.98,
        speed: 1.0,
        brushSize: 8.0,
        brushStrength: 5.0,
        color: '#0088ff'
    });
    const [resolution, setResolution] = useState(256);
    const [isPlaying, setIsPlaying] = useState(true);
    const [isRaining, setIsRaining] = useState(false);
    const [rainIntensity, setRainIntensity] = useState(5); // 1 to 10
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isChangingResolution, setIsChangingResolution] = useState(false);

    const canvasRef = useRef(null);
    const simulationRef = useRef(null);
    const containerRef = useRef(null);
    const initTimeoutRef = useRef(null);
    const isInitialMount = useRef(true);

    // Initialize simulation
    useEffect(() => {
        if (!canvasRef.current) return;
        
        // Track if this is a resolution change vs initial mount
        const isResolutionChange = !isInitialMount.current;
        isInitialMount.current = false;
        
        if (isResolutionChange) {
            setIsChangingResolution(true);
        }
        
        // Cancel any pending initialization
        if (initTimeoutRef.current) {
            clearTimeout(initTimeoutRef.current);
            initTimeoutRef.current = null;
        }
        
        // Dispose previous simulation if it exists
        if (simulationRef.current) {
            simulationRef.current.dispose();
            simulationRef.current = null;
        }
        
        let cancelled = false;
        setIsLoading(true);
        setError(null);
        
        // Defer initialization to avoid React StrictMode double-mount issues
        initTimeoutRef.current = setTimeout(() => {
            if (cancelled || !canvasRef.current) return;
            
            simulationRef.current = new WebGPUWaterSimulation(
                canvasRef.current, 
                params,
                resolution,
                (err) => {
                    if (cancelled) return;
                    setIsLoading(false);
                    setIsChangingResolution(false);
                    if (err) {
                        setError(err.message || 'Failed to initialize WebGPU');
                    }
                }
            );
        }, 50); // Small delay to let StrictMode finish its unmount cycle
        
        return () => {
            cancelled = true;
            if (initTimeoutRef.current) {
                clearTimeout(initTimeoutRef.current);
                initTimeoutRef.current = null;
            }
            simulationRef.current?.dispose();
            simulationRef.current = null;
        };
    }, [resolution]);

    // Update params
    useEffect(() => {
        simulationRef.current?.updateParams(params);
    }, [params]);

    // Update playing state
    useEffect(() => {
        simulationRef.current?.setPlaying(isPlaying);
    }, [isPlaying]);

    // Handle Rain Loop
    useEffect(() => {
        if (!isRaining || !isPlaying) return;

        // Rain intensity determines frequency
        // 1 = sparse, 10 = heavy storm
        // Max delay 500ms, min delay 10ms
        const minDelay = 10;
        const maxDelay = 500;
        // Inverse linear mapping: intensity 1 -> 500ms, intensity 10 -> 10ms
        const delay = maxDelay - ((rainIntensity - 1) / 9) * (maxDelay - minDelay);

        const interval = setInterval(() => {
            if (simulationRef.current && Math.random() > 0.3) { // 30% chance skip for irregularity
                 simulationRef.current.triggerRainDrop();
            }
        }, delay);

        return () => clearInterval(interval);
    }, [isRaining, rainIntensity, isPlaying]);

    // Handle resize
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

    const onCanvasPointerMove = useCallback((e) => {
        if (!canvasRef.current || !simulationRef.current) return;
        
        const rect = canvasRef.current.getBoundingClientRect();
        const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Use raycasting to get proper grid coordinates regardless of camera angle
        const gridPos = simulationRef.current.raycastToGrid(ndcX, ndcY);
        if (gridPos) {
            simulationRef.current.setMousePosition(gridPos.x, gridPos.y);
        } else {
            simulationRef.current.setMousePosition(-1000, -1000);
        }
    }, []);

    const onCanvasPointerLeave = useCallback(() => {
        simulationRef.current?.setMousePosition(-1000, -1000);
        simulationRef.current?.setMouseActive(false);
    }, []);

    const onCanvasPointerDown = useCallback((e) => {
        if (e.button === 0) { // Left click only
            simulationRef.current?.setMouseActive(true);
        }
    }, []);

    const onCanvasPointerUp = useCallback(() => {
        simulationRef.current?.setMouseActive(false);
    }, []);

    const handleReset = useCallback(() => {
        simulationRef.current?.reset();
    }, []);

    return (
        <div className="w-full h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden relative">
            {/* Header */}
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

            {/* Loading Overlay */}
            {isLoading && !isChangingResolution && (
                <div className="absolute inset-0 z-30 bg-slate-950 flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-slate-300">Initializing WebGPU...</p>
                </div>
            )}

            {/* Resolution Change Indicator */}
            {isChangingResolution && (
                <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-slate-900/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-purple-500/50 flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-300 text-sm">Rebuilding simulation...</p>
                </div>
            )}

            {/* Error Overlay */}
            {error && (
                <div className="absolute inset-0 z-30 bg-slate-950 flex flex-col items-center justify-center p-8">
                    <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">WebGPU Not Available</h2>
                    <p className="text-slate-400 text-center max-w-md mb-4">{error}</p>
                    <div className="bg-slate-800/50 p-4 rounded-lg text-sm text-slate-300 max-w-md">
                        <p className="font-semibold mb-2">To enable WebGPU:</p>
                        <ul className="list-disc list-inside space-y-1 text-slate-400">
                            <li>Use Chrome 113+ or Edge 113+</li>
                            <li>Enable <code className="bg-slate-700 px-1 rounded">chrome://flags/#enable-unsafe-webgpu</code></li>
                            <li>Restart your browser</li>
                        </ul>
                    </div>
                    <Link 
                        to="/" 
                        className="mt-6 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-white"
                    >
                        Return to Home
                    </Link>
                </div>
            )}

            {/* Canvas */}
            <div ref={containerRef} className="absolute inset-0 z-0" style={{ minWidth: '100px', minHeight: '100px' }}>
                <canvas
                    ref={canvasRef}
                    className="w-full h-full block"
                    style={{ width: '100%', height: '100%', display: 'block' }}
                    onPointerMove={onCanvasPointerMove}
                    onPointerLeave={onCanvasPointerLeave}
                    onPointerDown={onCanvasPointerDown}
                    onPointerUp={onCanvasPointerUp}
                />
            </div>

            {/* Sidebar Controls */}
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
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-semibold transition-all ${
                                        isPlaying
                                        ? 'bg-amber-500/10 text-amber-500 border border-amber-500/50 hover:bg-amber-500/20'
                                        : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg'
                                    }`}
                                >
                                    {isPlaying ? <><Pause className="w-4 h-4" /> Pause</> : <><Play className="w-4 h-4" /> Resume</>}
                                </button>
                                <button
                                    onClick={handleReset}
                                    className="px-4 py-3 rounded-lg font-semibold bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all"
                                    title="Reset simulation"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="space-y-2 pt-2 border-t border-slate-700/50">
                                <button
                                    onClick={() => setIsRaining(!isRaining)}
                                    className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg font-medium transition-all ${
                                        isRaining
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
                                    type="range" min="1.0" max="30.0" step="0.5"
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
                            <p className="mb-2">Click and drag on the water to create ripples. Right-click + drag to rotate. Scroll to zoom.</p>
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
