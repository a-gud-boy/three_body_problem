import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Play, Pause, RotateCcw, Info, Activity, Settings, MousePointer2, Move3d, Globe, Sparkles, Plus, Hand, Merge, Calculator, X, Target, Eye, Video, LineChart as LineChartIcon, Clock, Download, HelpCircle, Upload, Trash2, Tag, Maximize, Minimize, Camera, ArrowRight, PanelRightClose, PanelRightOpen, Cpu } from 'lucide-react';
import { usePhysicsWorker } from './hooks/usePhysicsWorker';

const DEFAULT_PANEL_WIDTH = 380;
const MIN_PANEL_WIDTH = 260;
const MAX_PANEL_WIDTH = 600;
const PANEL_STORAGE_KEY = 'tbp-panel-width';

const clampPanelWidth = (value) => Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, value));

const getStoredPanelWidth = () => {
    if (typeof window === 'undefined') return DEFAULT_PANEL_WIDTH;
    const stored = parseInt(window.localStorage.getItem(PANEL_STORAGE_KEY) || '', 10);
    if (!Number.isNaN(stored)) {
        return clampPanelWidth(stored);
    }
    return DEFAULT_PANEL_WIDTH;
};

// --- Physics Constants & Presets ---

const SCENARIOS = {
    FIGURE_8: {
        name: "The Figure-8 (Planar)",
        description: "A stable, periodic solution where three bodies of equal mass chase each other in a figure-eight loop. (Z-axis is 0).",
        g: 1,
        bodies: [
            { x: 0.97000436, y: -0.24308753, z: 0, vx: 0.4662036850, vy: 0.4323657300, vz: 0, mass: 1, color: 0x3b82f6 }, // Blue
            { x: -0.97000436, y: 0.24308753, z: 0, vx: 0.4662036850, vy: 0.4323657300, vz: 0, mass: 1, color: 0xef4444 }, // Red
            { x: 0, y: 0, z: 0, vx: -2 * 0.4662036850, vy: -2 * 0.4323657300, vz: 0, mass: 1, color: 0x22c55e }  // Green
        ],
        scale: 150,
        cameraPos: { r: 400, theta: Math.PI / 4, phi: Math.PI / 3 }
    },
    SUN_EARTH_MOON: {
        name: "Hierarchical (Star-Planet-Moon)",
        description: "A hierarchical system. Stable over short terms. We've added slight inclination to the moon to make it 3D.",
        g: 0.8,
        bodies: [
            { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, mass: 200, color: 0xeab308 }, // Sun
            { x: 250, y: 0, z: 0, vx: 0, vy: 0.7, vz: 0, mass: 10, color: 0x3b82f6 }, // Earth
            { x: 270, y: 0, z: 5, vx: 0, vy: 1.1, vz: 0.2, mass: 0.1, color: 0x9ca3af }  // Moon
        ],
        scale: 1,
        cameraPos: { r: 500, theta: Math.PI / 3, phi: Math.PI / 4 }
    },
    CHAOS_RANDOM: {
        name: "3D Random Chaos",
        description: "Random positions and velocities in all three dimensions (X, Y, Z). Highly unpredictable.",
        g: 1,
        bodies: [], // Generated dynamically
        scale: 100,
        cameraPos: { r: 600, theta: 0.5, phi: 1.0 }
    },
    BURRAU: {
        name: "Pythagorean Problem",
        description: "Bodies of masses 3, 4, and 5 placed at the vertices of a 3-4-5 right triangle. A famous chaotic evolution.",
        g: 1,
        bodies: [
            { x: 0, y: 2, z: 0, vx: 0, vy: 0, vz: 0, mass: 3, color: 0xef4444 },
            { x: 2, y: -1, z: 0, vx: 0, vy: 0, vz: 0, mass: 4, color: 0x22c55e },
            { x: -1, y: -1, z: 0, vx: 0, vy: 0, vz: 0, mass: 5, color: 0x3b82f6 }
        ],
        scale: 80,
        cameraPos: { r: 500, theta: 0.2, phi: 0.5 }
    },
    LAGRANGE: {
        name: "Lagrange Points (L4/L5)",
        description: "Demonstrates Lagrange points L4 and L5 where a small body can orbit in stable equilibrium 60° ahead/behind a planet.",
        g: 1,
        bodies: [
            { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, mass: 100, color: 0xeab308 }, // Sun (massive)
            { x: 10, y: 0, z: 0, vx: 0, vy: 3.16227766, vz: 0, mass: 1, color: 0x3b82f6 }, // Planet (circular orbit)
            { x: 5, y: 8.66025404, z: 0, vx: -2.73861279, vy: 1.58113883, vz: 0, mass: 0.001, color: 0xff6600 } // Trojan at L4 (60° ahead)
        ],
        scale: 100,
        cameraPos: { r: 2500, theta: Math.PI / 6, phi: Math.PI / 3 }
    },
    SITNIKOV: {
        name: "Sitnikov Problem",
        description: "Two equal masses orbit in the XY plane while a third mass oscillates along the Z-axis perpendicular to their orbit.",
        g: 1,
        bodies: [
            { x: 1, y: 0, z: 0, vx: 0, vy: 0.5, vz: 0, mass: 1, color: 0x3b82f6 }, // Binary star 1
            { x: -1, y: 0, z: 0, vx: 0, vy: -0.5, vz: 0, mass: 1, color: 0xef4444 }, // Binary star 2
            { x: 0, y: 0, z: 3, vx: 0, vy: 0, vz: 0, mass: 0.001, color: 0x22c55e } // Test particle on Z-axis
        ],
        scale: 100,
        cameraPos: { r: 550, theta: Math.PI / 4, phi: Math.PI / 4 }
    },
    FOUR_BODY: {
        name: "4-Body Chaos",
        description: "Four equal masses arranged in a square with circular initial velocities. Chaotic and unpredictable evolution.",
        g: 1,
        bodies: [
            { x: 1, y: 1, z: 0, vx: -0.35, vy: 0.35, vz: 0, mass: 1, color: 0xef4444 },
            { x: -1, y: 1, z: 0, vx: -0.35, vy: -0.35, vz: 0, mass: 1, color: 0x3b82f6 },
            { x: -1, y: -1, z: 0, vx: 0.35, vy: -0.35, vz: 0, mass: 1, color: 0x22c55e },
            { x: 1, y: -1, z: 0, vx: 0.35, vy: 0.35, vz: 0, mass: 1, color: 0xeab308 }
        ],
        scale: 80,
        cameraPos: { r: 300, theta: 0.3, phi: 0.6 }
    }
};

// --- Helper Functions ---

const generateRandomBody = () => {
    const colors = [0xef4444, 0x3b82f6, 0x22c55e, 0xeab308, 0xa855f7, 0xec4899, 0x06b6d4];
    return {
        x: (Math.random() * 4 - 2), y: (Math.random() * 4 - 2), z: (Math.random() * 4 - 2),
        vx: (Math.random() - 0.5) * 0.8, vy: (Math.random() - 0.5) * 0.8, vz: (Math.random() - 0.5) * 0.8,
        mass: Math.random() * 3 + 0.5,
        color: colors[Math.floor(Math.random() * colors.length)]
    };
};

const generateRandomBodies = () => [generateRandomBody(), generateRandomBody(), generateRandomBody()];

const createGlowTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.2, 'rgba(255,255,255,0.6)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.2)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
    return canvas;
};

// Cached textures (created once, reused for all bodies)
let cachedGlowCanvas = null;
const getCachedGlowCanvas = () => {
    if (!cachedGlowCanvas) {
        cachedGlowCanvas = createGlowTexture();
    }
    return cachedGlowCanvas;
};

// Circular texture for stars
const createStarTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 32, 32);
    return canvas;
};

const loadThreeScript = (callback) => {
    if (window.THREE) { callback(); return; }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    script.onload = callback;
    document.head.appendChild(script);
};

const App = () => {
    // --- State ---
    const [isPlaying, setIsPlaying] = useState(false);
    const [scenarioKey, setScenarioKey] = useState('FIGURE_8');
    const [simSpeed, setSimSpeed] = useState(1);
    const [gravityG, setGravityG] = useState(1);
    const [trailLength, setTrailLength] = useState(300);
    const [showTrails, setShowTrails] = useState(true);
    const [stats, setStats] = useState({ time: 0, totalEnergy: 0, bodyCount: 3 });
    const [threeLoaded, setThreeLoaded] = useState(false);
    const [dragMode, setDragMode] = useState(false);
    const [enableCollisions, setEnableCollisions] = useState(false);
    const [physicsMode, setPhysicsMode] = useState('EULER');
    const [selectedBodyIndex, setSelectedBodyIndex] = useState(null);
    const [forceUpdateToken, setForceUpdateToken] = useState(0);
    const [showAnalysis, setShowAnalysis] = useState(false);
    const [performanceMode, setPerformanceMode] = useState(true); // Simple trails by default
    const [useWebWorker, setUseWebWorker] = useState(true); // Offload physics to Web Worker
    const [showGrid, setShowGrid] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [showLabels, setShowLabels] = useState(true);
    const [showVelocityVectors, setShowVelocityVectors] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showPanel, setShowPanel] = useState(true);
    const [panelWidth, setPanelWidth] = useState(() => getStoredPanelWidth());
    const panelResizeRef = useRef({ isResizing: false, startX: 0, startWidth: 0 });
    const [isPanelResizing, setIsPanelResizing] = useState(false);
    const [isLargeScreen, setIsLargeScreen] = useState(() => (typeof window === 'undefined' ? true : window.innerWidth >= 1024));

    // Time Control
    const [timeDirection, setTimeDirection] = useState(1); // 1 forward, -1 reverse
    const [isStepMode, setIsStepMode] = useState(false);
    const [bookmarks, setBookmarks] = useState([]);

    // Reference Frame
    const [referenceFrame, setReferenceFrame] = useState('inertial'); // 'inertial' or 'barycentric'

    // Analysis
    const [showCOM, setShowCOM] = useState(false);
    const [energyDrift, setEnergyDrift] = useState(0);
    const [initialEnergy, setInitialEnergy] = useState(null);

    // Expose selection for testing
    useEffect(() => {
        window.selectBody = (index) => setSelectedBodyIndex(index);
    }, []);

    // Refs for high-frequency data (to avoid re-renders)
    const statsRef = useRef({ time: 0, totalEnergy: 0, bodyCount: 3 });
    const analysisDataRef = useRef([]);

    // Camera State
    const [cameraMode, setCameraMode] = useState('ORBIT'); // 'ORBIT', 'LOCK', 'COCKPIT'
    const [cameraTargetIdx, setCameraTargetIdx] = useState(0);

    // --- Refs ---
    const mountRef = useRef(null);
    const appContainerRef = useRef(null);
    const requestRef = useRef();
    const bodiesRef = useRef([]);
    const trailsRef = useRef([]);
    const timeRef = useRef(0);
    const frameCountRef = useRef(0);
    const gridRef = useRef(null);
    const gizmoRef = useRef(null);
    const comMarkerRef = useRef(null);

    // Gizmo refs (corner axis indicator)
    const gizmoSceneRef = useRef(null);
    const gizmoCameraRef = useRef(null);

    // Three.js Objects Refs
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const rendererRef = useRef(null);
    const meshRefs = useRef([]);
    const glowRefs = useRef([]);
    const trailLineRefs = useRef([]);
    const labelRefs = useRef([]);
    const velocityArrowRefs = useRef([]);

    // Interaction Refs
    const raycasterRef = useRef(null);
    const dragPlaneRef = useRef(null);
    const draggedBodyIndexRef = useRef(null);
    const hoveredBodyIndexRef = useRef(null);

    // Physics Web Worker
    const { updatePhysics: workerUpdatePhysics, isReady: workerReady, isSupported: workerSupported } = usePhysicsWorker();
    const workerPendingRef = useRef(false); // Prevent overlapping worker calls

    const needsRenderRef = useRef(true);
    const markNeedsRender = useCallback(() => {
        needsRenderRef.current = true;
    }, []);

    // --- Keyboard Controls ---
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ignore if typing in an input
            if (e.target.tagName === 'INPUT') return;

            switch (e.key.toLowerCase()) {
                case 'k':
                case ' ':
                    e.preventDefault();
                    setIsPlaying(prev => !prev);
                    break;
                case 'r':
                    if (!e.ctrlKey && !e.metaKey) {
                        setIsPlaying(false);
                        resetSimulation(scenarioKey);
                    }
                    break;
                case 'g':
                    setShowGrid(prev => !prev);
                    break;
                case 't':
                    setShowTrails(prev => !prev);
                    break;
                case 'c':
                    setShowCOM(prev => !prev);
                    break;
                case 'l':
                    setShowLabels(prev => !prev);
                    break;
                case 'v':
                    setShowVelocityVectors(prev => !prev);
                    break;
                case 'f':
                    toggleFullscreen();
                    break;
                case 'a':
                    setShowAnalysis(prev => !prev);
                    break;
                case 'p':
                    setShowPanel(prev => !prev);
                    break;
                case '?':
                case 'h':
                    setShowHelp(prev => !prev);
                    break;
                case 'escape':
                    setShowHelp(false);
                    setSelectedBodyIndex(null);
                    break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [scenarioKey]);

    const cameraControlsRef = useRef({
        isDragging: false,
        dragMode: 'ROTATE',
        previousMouse: { x: 0, y: 0 },
        radius: 300,
        theta: Math.PI / 4,
        phi: Math.PI / 3,
        target: { x: 0, y: 0, z: 0 }
    });

    // --- Visual Management Helpers ---

    // Procedural Texture Generator
    const createProceduralTexture = (mass, colorHex) => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        const color = new window.THREE.Color(colorHex);

        // Fill background
        ctx.fillStyle = '#' + color.getHexString();
        ctx.fillRect(0, 0, 512, 512);

        if (mass > 2) {
            // Gas Giant (Banded)
            for (let i = 0; i < 20; i++) {
                const y = Math.random() * 512;
                const h = Math.random() * 50 + 10;
                ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.2})`;
                ctx.fillRect(0, y, 512, h);

                // Dark bands
                if (Math.random() > 0.5) {
                    const y2 = Math.random() * 512;
                    const h2 = Math.random() * 30 + 5;
                    ctx.fillStyle = `rgba(0, 0, 0, ${Math.random() * 0.3})`;
                    ctx.fillRect(0, y2, 512, h2);
                }
            }
            // Blur bands slightly
            ctx.filter = 'blur(4px)';
            ctx.drawImage(canvas, 0, 0);
            ctx.filter = 'none';
        } else {
            // Rocky Planet (Noise/Craters)
            for (let i = 0; i < 400; i++) {
                const x = Math.random() * 512;
                const y = Math.random() * 512;
                const r = Math.random() * 10 + 2;
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(0, 0, 0, ${Math.random() * 0.2})`;
                ctx.fill();
            }
            for (let i = 0; i < 200; i++) {
                const x = Math.random() * 512;
                const y = Math.random() * 512;
                const r = Math.random() * 5 + 1;
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.15})`;
                ctx.fill();
            }
        }

        const texture = new window.THREE.CanvasTexture(canvas);
        return texture;
    };

    const addBodyVisuals = (body) => {
        if (!window.THREE || !sceneRef.current) return;
        const THREE = window.THREE;
        const scene = sceneRef.current;

        // 1. Mesh
        const geometry = new THREE.SphereGeometry(1, 32, 32);
        const texture = createProceduralTexture(body.mass, body.color);
        const material = new THREE.MeshStandardMaterial({
            map: texture,
            color: 0xffffff, // Use white so texture color shows through
            roughness: 0.8,
            metalness: 0.2,
            emissive: body.color,
            emissiveIntensity: 0.5
        });
        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);
        meshRefs.current.push(mesh);

        // 2. Glow (reuse cached canvas texture)
        const glowTex = new THREE.CanvasTexture(getCachedGlowCanvas());
        const spriteMat = new THREE.SpriteMaterial({
            map: glowTex, color: body.color, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending
        });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(20, 20, 1);
        scene.add(sprite);
        glowRefs.current.push(sprite);

        // 3. Trail
        const lineGeo = new THREE.BufferGeometry();
        const lineMat = new THREE.LineBasicMaterial({
            vertexColors: true, blending: THREE.NormalBlending, transparent: true, opacity: 0.8, depthWrite: false
        });
        const line = new THREE.Line(lineGeo, lineMat);
        scene.add(line);
        trailLineRefs.current.push(line);

        trailsRef.current.push([]);
    };

    const removeBodyVisuals = (index) => {
        if (!sceneRef.current) return;
        const scene = sceneRef.current;

        // Remove from scene
        scene.remove(meshRefs.current[index]);
        scene.remove(glowRefs.current[index]);
        scene.remove(trailLineRefs.current[index]);

        // Dispose mesh resources (geometry, material, texture)
        meshRefs.current[index].geometry.dispose();
        if (meshRefs.current[index].material.map) {
            meshRefs.current[index].material.map.dispose();
        }
        meshRefs.current[index].material.dispose();

        // Dispose glow sprite resources
        if (glowRefs.current[index].material.map) {
            glowRefs.current[index].material.map.dispose();
        }
        glowRefs.current[index].material.dispose();

        // Dispose trail line resources
        trailLineRefs.current[index].geometry.dispose();
        trailLineRefs.current[index].material.dispose();

        // Remove from arrays
        meshRefs.current.splice(index, 1);
        glowRefs.current.splice(index, 1);
        trailLineRefs.current.splice(index, 1);
        trailsRef.current.splice(index, 1);
    };

    // --- Time Control & Analysis Helpers ---

    const saveBookmark = () => {
        const bookmark = {
            time: timeRef.current,
            bodies: JSON.parse(JSON.stringify(bodiesRef.current)), // Deep copy
            timestamp: Date.now()
        };
        setBookmarks(prev => [...prev, bookmark]);
    };

    const restoreBookmark = (index) => {
        if (index < 0 || index >= bookmarks.length) return;
        const bookmark = bookmarks[index];
        bodiesRef.current = JSON.parse(JSON.stringify(bookmark.bodies)); // Deep copy
        timeRef.current = bookmark.time;

        // Clear trails
        trailsRef.current.forEach(() => []);
        trailsRef.current = bodiesRef.current.map(() => []);

        // Reset initial energy for drift calculation
        setInitialEnergy(null);
        markNeedsRender();
    };

    const deleteBookmark = (index) => {
        setBookmarks(prev => prev.filter((_, i) => i !== index));
    };

    const calculateCOM = () => {
        const bodies = bodiesRef.current;
        let totalMass = 0;
        let comX = 0, comY = 0, comZ = 0;
        let comVx = 0, comVy = 0, comVz = 0;

        bodies.forEach(body => {
            totalMass += body.mass;
            comX += body.x * body.mass;
            comY += body.y * body.mass;
            comZ += body.z * body.mass;
            comVx += body.vx * body.mass;
            comVy += body.vy * body.mass;
            comVz += body.vz * body.mass;
        });

        return {
            x: comX / totalMass,
            y: comY / totalMass,
            z: comZ / totalMass,
            vx: comVx / totalMass,
            vy: comVy / totalMass,
            vz: comVz / totalMass
        };
    };



    const handleAddBody = () => {
        const newBody = generateRandomBody();
        bodiesRef.current.push(newBody);
        addBodyVisuals(newBody);
        setStats(prev => ({ ...prev, bodyCount: bodiesRef.current.length }));
        markNeedsRender();
    };

    const handleDeleteBody = (index) => {
        if (bodiesRef.current.length <= 2) {
            alert('Cannot delete: minimum 2 bodies required for simulation');
            return;
        }
        removeBodyVisuals(index);
        bodiesRef.current.splice(index, 1);
        setSelectedBodyIndex(null);
        setStats(prev => ({ ...prev, bodyCount: bodiesRef.current.length }));
        markNeedsRender();
    };

    // --- Import State ---
    const importState = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const state = JSON.parse(event.target.result);

                    // Validate structure
                    if (!state.bodies || !Array.isArray(state.bodies)) {
                        throw new Error('Invalid file: missing bodies array');
                    }

                    // Clear existing visuals
                    while (meshRefs.current.length > 0) {
                        removeBodyVisuals(0);
                    }

                    // Load bodies
                    bodiesRef.current = state.bodies.map(b => ({
                        x: b.x || 0, y: b.y || 0, z: b.z || 0,
                        vx: b.vx || 0, vy: b.vy || 0, vz: b.vz || 0,
                        mass: b.mass || 1,
                        color: b.color || 0x3b82f6
                    }));

                    // Create visuals
                    bodiesRef.current.forEach(body => addBodyVisuals(body));

                    // Restore settings
                    if (state.gravityG) setGravityG(state.gravityG);
                    if (state.time) timeRef.current = state.time;
                    if (state.settings) {
                        if (state.settings.physicsMode) setPhysicsMode(state.settings.physicsMode);
                        if (state.settings.simSpeed) setSimSpeed(state.settings.simSpeed);
                        if (state.settings.enableCollisions !== undefined) setEnableCollisions(state.settings.enableCollisions);
                    }

                    // Clear trails
                    trailsRef.current = bodiesRef.current.map(() => []);

                    setStats(prev => ({ ...prev, bodyCount: bodiesRef.current.length }));
                    setIsPlaying(false);
                    setSelectedBodyIndex(null);
                    setInitialEnergy(null);
                    markNeedsRender();

                    alert(`Loaded ${bodiesRef.current.length} bodies from file`);
                } catch (err) {
                    alert('Failed to load file: ' + err.message);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    };

    // --- Screenshot ---
    const takeScreenshot = () => {
        if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;

        // Render one frame to ensure it's up to date
        rendererRef.current.render(sceneRef.current, cameraRef.current);

        // Get canvas data
        const canvas = rendererRef.current.domElement;
        const dataURL = canvas.toDataURL('image/png');

        // Download
        const a = document.createElement('a');
        a.href = dataURL;
        a.download = `three-body-screenshot-${Date.now()}.png`;
        a.click();
    };

    // --- Fullscreen ---
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            appContainerRef.current?.requestFullscreen?.();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen?.();
            setIsFullscreen(false);
        }
    };

    // Listen for fullscreen changes
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // --- Physics & Integration ---

    const getDerivatives = (state, bodies, G, soft) => {
        return state.map((body, i) => {
            let ax = 0, ay = 0, az = 0;
            for (let j = 0; j < state.length; j++) {
                if (i === j) continue;
                const dx = state[j].x - body.x;
                const dy = state[j].y - body.y;
                const dz = state[j].z - body.z;
                const distSq = dx * dx + dy * dy + dz * dz + soft * soft;
                const dist = Math.sqrt(distSq); // We need sqrt for gravity (1/r^2 force)
                const f = (G * state[j].mass) / distSq;
                ax += f * (dx / dist);
                ay += f * (dy / dist);
                az += f * (dz / dist);
            }
            return { dx: body.vx, dy: body.vy, dz: body.vz, dvx: ax, dvy: ay, dvz: az };
        });
    };

    const updatePhysics = () => {
        const bodies = bodiesRef.current;
        const dt = 0.01 * simSpeed * timeDirection; // Apply time direction
        const soft = 0.1;

        const skipIndex = draggedBodyIndexRef.current;

        // 1. Integration Step
        if (physicsMode === 'EULER') {
            const accelerations = bodies.map(() => ({ ax: 0, ay: 0, az: 0 }));
            for (let i = 0; i < bodies.length; i++) {
                if (i === skipIndex) continue;
                for (let j = 0; j < bodies.length; j++) {
                    if (i === j) continue;
                    const dx = bodies[j].x - bodies[i].x;
                    const dy = bodies[j].y - bodies[i].y;
                    const dz = bodies[j].z - bodies[i].z;
                    const distSq = dx * dx + dy * dy + dz * dz + soft * soft;
                    const dist = Math.sqrt(distSq);
                    const f = (gravityG * bodies[j].mass) / distSq;
                    accelerations[i].ax += f * (dx / dist);
                    accelerations[i].ay += f * (dy / dist);
                    accelerations[i].az += f * (dz / dist);
                }
            }
            for (let i = 0; i < bodies.length; i++) {
                if (i === skipIndex) continue;
                bodies[i].vx += accelerations[i].ax * dt;
                bodies[i].vy += accelerations[i].ay * dt;
                bodies[i].vz += accelerations[i].az * dt;
                bodies[i].x += bodies[i].vx * dt;
                bodies[i].y += bodies[i].vy * dt;
                bodies[i].z += bodies[i].vz * dt;
            }
        } else {
            // Optimized RK4 Integration (Minimal Allocation)
            const n = bodies.length;

            // Helper to calculate derivatives into a buffer
            // state: array of {x,y,z,vx,vy,vz,mass}
            // out: array of {dx,dy,dz,dvx,dvy,dvz}
            const calcDerivatives = (state, out) => {
                for (let i = 0; i < n; i++) {
                    let ax = 0, ay = 0, az = 0;
                    for (let j = 0; j < n; j++) {
                        if (i === j) continue;
                        const dx = state[j].x - state[i].x;
                        const dy = state[j].y - state[i].y;
                        const dz = state[j].z - state[i].z;
                        const distSq = dx * dx + dy * dy + dz * dz + soft * soft;
                        const dist = Math.sqrt(distSq);
                        const f = (gravityG * state[j].mass) / distSq;
                        ax += f * (dx / dist);
                        ay += f * (dy / dist);
                        az += f * (dz / dist);
                    }
                    out[i] = { dx: state[i].vx, dy: state[i].vy, dz: state[i].vz, dvx: ax, dvy: ay, dvz: az };
                }
            };

            // We need buffers for intermediate states. 
            // Ideally these should be reused across frames, but for now we just avoid map() inside the steps.
            // A full optimization would use Float32Arrays for everything.

            // Initial State (k1 input)
            const s0 = bodies;
            const k1 = new Array(n);
            calcDerivatives(s0, k1);

            // K2 State
            const s1 = new Array(n);
            for (let i = 0; i < n; i++) {
                s1[i] = {
                    x: s0[i].x + k1[i].dx * dt * 0.5,
                    y: s0[i].y + k1[i].dy * dt * 0.5,
                    z: s0[i].z + k1[i].dz * dt * 0.5,
                    vx: s0[i].vx + k1[i].dvx * dt * 0.5,
                    vy: s0[i].vy + k1[i].dvy * dt * 0.5,
                    vz: s0[i].vz + k1[i].dvz * dt * 0.5,
                    mass: s0[i].mass
                };
            }
            const k2 = new Array(n);
            calcDerivatives(s1, k2);

            // K3 State
            const s2 = new Array(n);
            for (let i = 0; i < n; i++) {
                s2[i] = {
                    x: s0[i].x + k2[i].dx * dt * 0.5,
                    y: s0[i].y + k2[i].dy * dt * 0.5,
                    z: s0[i].z + k2[i].dz * dt * 0.5,
                    vx: s0[i].vx + k2[i].dvx * dt * 0.5,
                    vy: s0[i].vy + k2[i].dvy * dt * 0.5,
                    vz: s0[i].vz + k2[i].dvz * dt * 0.5,
                    mass: s0[i].mass
                };
            }
            const k3 = new Array(n);
            calcDerivatives(s2, k3);

            // K4 State
            const s3 = new Array(n);
            for (let i = 0; i < n; i++) {
                s3[i] = {
                    x: s0[i].x + k3[i].dx * dt,
                    y: s0[i].y + k3[i].dy * dt,
                    z: s0[i].z + k3[i].dz * dt,
                    vx: s0[i].vx + k3[i].dvx * dt,
                    vy: s0[i].vy + k3[i].dvy * dt,
                    vz: s0[i].vz + k3[i].dvz * dt,
                    mass: s0[i].mass
                };
            }
            const k4 = new Array(n);
            calcDerivatives(s3, k4);

            // Final Integration
            for (let i = 0; i < n; i++) {
                if (i === skipIndex) continue;
                bodies[i].x += (k1[i].dx + 2 * k2[i].dx + 2 * k3[i].dx + k4[i].dx) * dt / 6;
                bodies[i].y += (k1[i].dy + 2 * k2[i].dy + 2 * k3[i].dy + k4[i].dy) * dt / 6;
                bodies[i].z += (k1[i].dz + 2 * k2[i].dz + 2 * k3[i].dz + k4[i].dz) * dt / 6;
                bodies[i].vx += (k1[i].dvx + 2 * k2[i].dvx + 2 * k3[i].dvx + k4[i].dvx) * dt / 6;
                bodies[i].vy += (k1[i].dvy + 2 * k2[i].dvy + 2 * k3[i].dvy + k4[i].dvy) * dt / 6;
                bodies[i].vz += (k1[i].dvz + 2 * k2[i].dvz + 2 * k3[i].dvz + k4[i].dvz) * dt / 6;
            }
        }

        // 2. Collisions (Elastic Bouncing)
        if (enableCollisions) {
            const indicesToRemove = new Set();
            const mergeThreshold = 0.3; // Very close = merge

            for (let i = 0; i < bodies.length; i++) {
                if (indicesToRemove.has(i)) continue;

                for (let j = i + 1; j < bodies.length; j++) {
                    if (indicesToRemove.has(j)) continue;
                    if (i === skipIndex || j === skipIndex) continue;

                    const dx = bodies[i].x - bodies[j].x;
                    const dy = bodies[i].y - bodies[j].y;
                    const dz = bodies[i].z - bodies[j].z;

                    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

                    const r1 = Math.cbrt(bodies[i].mass) * 0.5;
                    const r2 = Math.cbrt(bodies[j].mass) * 0.5;
                    const collisionDist = (r1 + r2);

                    if (dist < collisionDist) {
                        // Check if they're too close (merge)
                        if (dist < collisionDist * mergeThreshold) {
                            // Merge j into i
                            const m1 = bodies[i].mass;
                            const m2 = bodies[j].mass;
                            const totalM = m1 + m2;

                            bodies[i].vx = (m1 * bodies[i].vx + m2 * bodies[j].vx) / totalM;
                            bodies[i].vy = (m1 * bodies[i].vy + m2 * bodies[j].vy) / totalM;
                            bodies[i].vz = (m1 * bodies[i].vz + m2 * bodies[j].vz) / totalM;
                            bodies[i].x = (m1 * bodies[i].x + m2 * bodies[j].x) / totalM;
                            bodies[i].y = (m1 * bodies[i].y + m2 * bodies[j].y) / totalM;
                            bodies[i].z = (m1 * bodies[i].z + m2 * bodies[j].z) / totalM;
                            bodies[i].mass = totalM;

                            indicesToRemove.add(j);
                        } else {
                            // Elastic collision-bounce off each other

                            // Collision normal (unit vector from i to j)
                            const nx = dx / dist;
                            const ny = dy / dist;
                            const nz = dz / dist;

                            // Relative velocity
                            const dvx = bodies[i].vx - bodies[j].vx;
                            const dvy = bodies[i].vy - bodies[j].vy;
                            const dvz = bodies[i].vz - bodies[j].vz;

                            // Relative velocity along collision normal
                            const dvn = dvx * nx + dvy * ny + dvz * nz;

                            // Don't apply collision if bodies are separating
                            if (dvn > 0) {
                                const m1 = bodies[i].mass;
                                const m2 = bodies[j].mass;

                                // Coefficient of restitution (1.0 = perfectly elastic)
                                const restitution = 0.95;

                                // Impulse scalar
                                const impulse = (-(1 + restitution) * dvn) / (1 / m1 + 1 / m2);

                                // Apply impulse
                                bodies[i].vx += (impulse / m1) * nx;
                                bodies[i].vy += (impulse / m1) * ny;
                                bodies[i].vz += (impulse / m1) * nz;

                                bodies[j].vx -= (impulse / m2) * nx;
                                bodies[j].vy -= (impulse / m2) * ny;
                                bodies[j].vz -= (impulse / m2) * nz;

                                // Separate bodies to avoid overlap
                                const overlap = collisionDist - dist;
                                const separation = overlap * 0.5;

                                bodies[i].x += nx * separation;
                                bodies[i].y += ny * separation;
                                bodies[i].z += nz * separation;

                                bodies[j].x -= nx * separation;
                                bodies[j].y -= ny * separation;
                                bodies[j].z -= nz * separation;
                            }
                        }
                    }
                }
            }

            // Batch Remove
            if (indicesToRemove.size > 0) {
                const sortedIndices = Array.from(indicesToRemove).sort((a, b) => b - a);
                sortedIndices.forEach(index => {
                    bodiesRef.current.splice(index, 1);
                    removeBodyVisuals(index);
                });

                if (selectedBodyIndex !== null) {
                    if (indicesToRemove.has(selectedBodyIndex)) {
                        setSelectedBodyIndex(null);
                    } else {
                        let shift = 0;
                        sortedIndices.forEach(removedIdx => {
                            if (removedIdx < selectedBodyIndex) shift++;
                        });
                        if (shift > 0) setSelectedBodyIndex(selectedBodyIndex - shift);
                    }
                }
                // setStats removed for performance-statsRef is updated below
            }
        }

        // 3. Update Stats & Trails
        timeRef.current += dt;

        let totalKE = 0;
        let totalPE = 0;

        // Kinetic Energy
        bodiesRef.current.forEach(b => {
            totalKE += 0.5 * b.mass * (b.vx ** 2 + b.vy ** 2 + b.vz ** 2);
        });

        // Update Trails
        for (let i = 0; i < bodies.length; i++) {
            if (trailsRef.current[i]) {
                trailsRef.current[i].push(new window.THREE.Vector3(bodies[i].x, bodies[i].y, bodies[i].z));
                if (trailsRef.current[i].length > trailLength) trailsRef.current[i].shift();
            }
        }

        // Update Stats & Analysis Data (Throttled)
        // Reduce update frequency to prevent UI lag (every 30 frames)
        if (frameCountRef.current % 30 === 0) {

            // Calculate PE only when needed for display
            let totalPE = 0;
            for (let i = 0; i < bodies.length; i++) {
                for (let j = i + 1; j < bodies.length; j++) {
                    const dx = bodies[i].x - bodies[j].x;
                    const dy = bodies[i].y - bodies[j].y;
                    const dz = bodies[i].z - bodies[j].z;
                    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                    if (dist > 0.1) {
                        totalPE -= (gravityG * bodies[i].mass * bodies[j].mass) / dist;
                    }
                }
            }

            // Update Stats Ref (No Re-render)
            const currentEnergy = totalKE + totalPE;

            // Track energy drift for analysis
            if (initialEnergy === null) {
                setInitialEnergy(currentEnergy);
            } else if (initialEnergy !== 0) {
                const drift = ((currentEnergy - initialEnergy) / initialEnergy) * 100;
                setEnergyDrift(drift);
            }

            statsRef.current = {
                time: timeRef.current,
                totalEnergy: currentEnergy,
                bodyCount: bodies.length
            };

            // Update Analysis Data Ref (No Re-render)
            if (showAnalysis) {
                const newDataPoint = {
                    time: parseFloat(timeRef.current.toFixed(1)),
                    ke: totalKE,
                    pe: totalPE,
                    total: totalKE + totalPE,
                    x: bodies[selectedBodyIndex || 0]?.x || 0,
                    px: (bodies[selectedBodyIndex || 0]?.vx || 0) * (bodies[selectedBodyIndex || 0]?.mass || 1)
                };

                analysisDataRef.current.push(newDataPoint);
                if (analysisDataRef.current.length > 100) {
                    analysisDataRef.current.shift();
                }
            }
        }
    };

    // --- Three.js Lifecycle ---
    useEffect(() => {
        loadThreeScript(() => setThreeLoaded(true));
    }, []);

    useEffect(() => {
        if (!threeLoaded || !mountRef.current) return;

        const THREE = window.THREE;
        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0f172a);
        // Reduced fog density to prevent darkening at large distances
        scene.fog = new THREE.FogExp2(0x0f172a, 0.0002);

        const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 15000);
        camera.position.z = 300;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        mountRef.current.appendChild(renderer.domElement);

        // --- Grid ---
        const gridSize = 10000;
        const gridDivisions = 100;
        const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x334155, 0x1e293b);
        scene.add(gridHelper);
        gridRef.current = gridHelper;

        // High ambient light ensures bodies are always visible regardless of distance
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
        scene.add(ambientLight);

        // DirectionalLight has NO distance falloff (like sunlight) - perfect for large-scale scenes
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
        directionalLight.position.set(1, 1, 1).normalize();
        scene.add(directionalLight);

        // Secondary light from opposite direction for better depth
        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.6);
        directionalLight2.position.set(-1, -0.5, -1).normalize();
        scene.add(directionalLight2);

        const starGeo = new THREE.BufferGeometry();
        const starCount = 2000;
        const starPos = new Float32Array(starCount * 3);
        for (let i = 0; i < starCount * 3; i++) { starPos[i] = (Math.random() - 0.5) * 1500; }
        starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));

        const starTex = new THREE.CanvasTexture(createStarTexture());
        const starMat = new THREE.PointsMaterial({
            color: 0x888888,
            size: 3,
            sizeAttenuation: true,
            map: starTex,
            transparent: true,
            alphaTest: 0.1
        });
        const stars = new THREE.Points(starGeo, starMat);
        scene.add(stars);

        // Create Blender-style Axis Gizmo (renders in corner)
        const gizmoScene = new THREE.Scene();
        const gizmoCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
        gizmoCamera.position.set(0, 0, 5);
        gizmoSceneRef.current = gizmoScene;
        gizmoCameraRef.current = gizmoCamera;

        const gizmoGroup = new THREE.Group();
        const gizmoAxisLength = 1.5;
        const coneRadius = 0.12;
        const coneHeight = 0.35;

        // Create axis with arrow (no label - labels added separately)
        const createGizmoAxis = (color, direction) => {
            const axisGroup = new THREE.Group();

            // Cylinder for the axis line
            const cylGeo = new THREE.CylinderGeometry(0.04, 0.04, gizmoAxisLength, 8);
            const cylMat = new THREE.MeshBasicMaterial({ color });
            const cyl = new THREE.Mesh(cylGeo, cylMat);

            // Arrow cone
            const coneGeo = new THREE.ConeGeometry(coneRadius, coneHeight, 12);
            const coneMat = new THREE.MeshBasicMaterial({ color });
            const cone = new THREE.Mesh(coneGeo, coneMat);
            cone.position.y = gizmoAxisLength / 2 + coneHeight / 2;

            axisGroup.add(cyl);
            axisGroup.add(cone);

            // Rotate to point in correct direction
            if (direction === 'x') {
                axisGroup.rotation.z = -Math.PI / 2;
            } else if (direction === 'z') {
                axisGroup.rotation.x = Math.PI / 2;
            }
            // Y is default (no rotation needed)

            return axisGroup;
        };

        // Create label sprite (added to gizmoGroup, not rotated axisGroup)
        const createGizmoLabel = (label, colorHex, position) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 64;
            canvas.height = 64;
            ctx.font = 'bold 48px Arial';
            ctx.fillStyle = colorHex;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, 32, 32);

            const texture = new THREE.CanvasTexture(canvas);
            const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
            const sprite = new THREE.Sprite(spriteMat);
            sprite.scale.set(0.5, 0.5, 1);
            sprite.position.set(...position);

            return sprite;
        };

        // X-axis (Red)
        gizmoGroup.add(createGizmoAxis(0xff4444, 'x'));
        // Y-axis (Green)
        gizmoGroup.add(createGizmoAxis(0x44ff44, 'y'));
        // Z-axis (Blue)
        gizmoGroup.add(createGizmoAxis(0x4488ff, 'z'));

        // Add labels at correct world positions (not rotated)
        const labelOffset = gizmoAxisLength / 2 + coneHeight + 0.3;
        gizmoGroup.add(createGizmoLabel('X', '#ff6666', [labelOffset, 0, 0]));
        gizmoGroup.add(createGizmoLabel('Y', '#66ff66', [0, labelOffset, 0]));
        gizmoGroup.add(createGizmoLabel('Z', '#6699ff', [0, 0, labelOffset]));

        // Origin sphere
        const gizmoOriginGeo = new THREE.SphereGeometry(0.12, 16, 16);
        const gizmoOriginMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const gizmoOriginSphere = new THREE.Mesh(gizmoOriginGeo, gizmoOriginMat);
        gizmoGroup.add(gizmoOriginSphere);

        // Add negative axis indicators (small spheres)
        const negIndicatorGeo = new THREE.SphereGeometry(0.06, 8, 8);
        const negX = new THREE.Mesh(negIndicatorGeo, new THREE.MeshBasicMaterial({ color: 0x882222 }));
        negX.position.set(-gizmoAxisLength / 2 - 0.2, 0, 0);
        gizmoGroup.add(negX);

        const negY = new THREE.Mesh(negIndicatorGeo, new THREE.MeshBasicMaterial({ color: 0x228822 }));
        negY.position.set(0, -gizmoAxisLength / 2 - 0.2, 0);
        gizmoGroup.add(negY);

        const negZ = new THREE.Mesh(negIndicatorGeo, new THREE.MeshBasicMaterial({ color: 0x224488 }));
        negZ.position.set(0, 0, -gizmoAxisLength / 2 - 0.2);
        gizmoGroup.add(negZ);

        gizmoScene.add(gizmoGroup);
        gizmoRef.current = gizmoGroup;

        // Create COM Marker (crosshair)
        const comGroup = new THREE.Group();
        const axisLength = 20;
        const axisWidth = 2;

        // X-axis (red)
        const xGeom = new THREE.BoxGeometry(axisLength, axisWidth, axisWidth);
        const xMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const xAxis = new THREE.Mesh(xGeom, xMat);
        comGroup.add(xAxis);

        // Y-axis (green)
        const yGeom = new THREE.BoxGeometry(axisWidth, axisLength, axisWidth);
        const yMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const yAxis = new THREE.Mesh(yGeom, yMat);
        comGroup.add(yAxis);

        // Z-axis (blue)
        const zGeom = new THREE.BoxGeometry(axisWidth, axisWidth, axisLength);
        const zMat = new THREE.MeshBasicMaterial({ color: 0x0000ff });
        const zAxis = new THREE.Mesh(zGeom, zMat);
        comGroup.add(zAxis);

        comGroup.visible = showCOM;
        scene.add(comGroup);
        comMarkerRef.current = comGroup;

        raycasterRef.current = new THREE.Raycaster();
        raycasterRef.current.params.Points.threshold = 5;
        dragPlaneRef.current = new THREE.Plane();

        sceneRef.current = scene;
        cameraRef.current = camera;
        rendererRef.current = renderer;

        // Init Visuals
        meshRefs.current = []; glowRefs.current = []; trailLineRefs.current = []; trailsRef.current = [];
        bodiesRef.current.forEach(body => addBodyVisuals(body));

        const handleResize = () => {
            if (!mountRef.current) return;
            const w = mountRef.current.clientWidth;
            const h = mountRef.current.clientHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);

            // Cancel animation loop
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }

            // Dispose all body visuals
            while (meshRefs.current.length > 0) {
                const idx = meshRefs.current.length - 1;
                scene.remove(meshRefs.current[idx]);
                meshRefs.current[idx].geometry.dispose();
                if (meshRefs.current[idx].material.map) meshRefs.current[idx].material.map.dispose();
                meshRefs.current[idx].material.dispose();
                meshRefs.current.pop();
            }
            while (glowRefs.current.length > 0) {
                const idx = glowRefs.current.length - 1;
                scene.remove(glowRefs.current[idx]);
                if (glowRefs.current[idx].material.map) glowRefs.current[idx].material.map.dispose();
                glowRefs.current[idx].material.dispose();
                glowRefs.current.pop();
            }
            while (trailLineRefs.current.length > 0) {
                const idx = trailLineRefs.current.length - 1;
                scene.remove(trailLineRefs.current[idx]);
                trailLineRefs.current[idx].geometry.dispose();
                trailLineRefs.current[idx].material.dispose();
                trailLineRefs.current.pop();
            }

            // Dispose stars
            if (stars) {
                scene.remove(stars);
                starGeo.dispose();
                starMat.dispose();
                if (starTex) starTex.dispose();
            }

            // Dispose gizmo
            if (gizmoSceneRef.current && gizmoRef.current) {
                gizmoSceneRef.current.remove(gizmoRef.current);
                gizmoRef.current.traverse((child) => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (child.material.map) child.material.map.dispose();
                        child.material.dispose();
                    }
                });
                gizmoSceneRef.current = null;
                gizmoCameraRef.current = null;
            }

            // Dispose COM marker
            if (comMarkerRef.current) {
                scene.remove(comMarkerRef.current);
                comMarkerRef.current.children.forEach(child => {
                    child.geometry.dispose();
                    child.material.dispose();
                });
            }

            // Remove canvas and dispose renderer
            if (mountRef.current && renderer.domElement) {
                mountRef.current.removeChild(renderer.domElement);
            }
            renderer.dispose();

            // Clear refs
            sceneRef.current = null;
            cameraRef.current = null;
            rendererRef.current = null;
        };

    }, [threeLoaded]);

    const animate = useCallback(() => {
        if (!sceneRef.current || !threeLoaded) return;

        const THREE = window.THREE;
        const scale = SCENARIOS[scenarioKey].scale || 100;

        const idleCamera = !isPlaying
            && !cameraControlsRef.current.isDragging
            && draggedBodyIndexRef.current === null
            && !workerPendingRef.current;

        if (idleCamera && !needsRenderRef.current) {
            requestRef.current = requestAnimationFrame(animate);
            return;
        }

        needsRenderRef.current = false;

        // Only run physics if playing AND not in step mode
        // (step mode requires manual stepping via a button)
        if (isPlaying && !isStepMode) {
            // Check if we should use Web Worker
            const shouldUseWorker = useWebWorker && workerReady && workerSupported && !workerPendingRef.current;

            if (shouldUseWorker) {
                // Use Web Worker for physics (async)
                workerPendingRef.current = true;

                const config = {
                    simSpeed,
                    timeDirection,
                    gravityG,
                    physicsMode,
                    enableCollisions,
                    skipIndex: draggedBodyIndexRef.current,
                    currentTime: timeRef.current
                };

                workerUpdatePhysics(bodiesRef.current, config, (result) => {
                    workerPendingRef.current = false;

                    // Apply results from worker
                    const { bodies, stats, removedIndices } = result;

                    // Update body positions/velocities
                    bodies.forEach((b, i) => {
                        if (bodiesRef.current[i]) {
                            bodiesRef.current[i].x = b.x;
                            bodiesRef.current[i].y = b.y;
                            bodiesRef.current[i].z = b.z;
                            bodiesRef.current[i].vx = b.vx;
                            bodiesRef.current[i].vy = b.vy;
                            bodiesRef.current[i].vz = b.vz;
                            bodiesRef.current[i].mass = b.mass;
                        }
                    });

                    // Handle removed bodies (collisions/merges)
                    if (removedIndices && removedIndices.length > 0) {
                        removedIndices.forEach(index => {
                            bodiesRef.current.splice(index, 1);
                            removeBodyVisuals(index);
                        });

                        // Adjust selected body index if needed
                        if (selectedBodyIndex !== null) {
                            if (removedIndices.includes(selectedBodyIndex)) {
                                setSelectedBodyIndex(null);
                            } else {
                                let shift = 0;
                                removedIndices.forEach(removedIdx => {
                                    if (removedIdx < selectedBodyIndex) shift++;
                                });
                                if (shift > 0) setSelectedBodyIndex(selectedBodyIndex - shift);
                            }
                        }
                    }

                    // Update time and stats
                    timeRef.current = stats.time;

                    // Update trails in worker callback
                    for (let i = 0; i < bodiesRef.current.length; i++) {
                        if (trailsRef.current[i]) {
                            trailsRef.current[i].push(new THREE.Vector3(
                                bodiesRef.current[i].x,
                                bodiesRef.current[i].y,
                                bodiesRef.current[i].z
                            ));
                            if (trailsRef.current[i].length > trailLength) {
                                trailsRef.current[i].shift();
                            }
                        }
                    }

                    // Throttled stats update
                    if (frameCountRef.current % 30 === 0) {
                        // Track energy drift
                        if (initialEnergy === null) {
                            setInitialEnergy(stats.total);
                        } else if (initialEnergy !== 0) {
                            const drift = ((stats.total - initialEnergy) / initialEnergy) * 100;
                            setEnergyDrift(drift);
                        }

                        statsRef.current = {
                            time: stats.time,
                            totalEnergy: stats.total,
                            bodyCount: bodiesRef.current.length
                        };

                        // Update Analysis Data
                        if (showAnalysis) {
                            const newDataPoint = {
                                time: parseFloat(stats.time.toFixed(1)),
                                ke: stats.ke,
                                pe: stats.pe,
                                total: stats.total,
                                x: bodiesRef.current[selectedBodyIndex || 0]?.x || 0,
                                px: (bodiesRef.current[selectedBodyIndex || 0]?.vx || 0) *
                                    (bodiesRef.current[selectedBodyIndex || 0]?.mass || 1)
                            };

                            analysisDataRef.current.push(newDataPoint);
                            if (analysisDataRef.current.length > 100) {
                                analysisDataRef.current.shift();
                            }
                        }
                    }
                });
            } else {
                // Fallback to main thread physics
                updatePhysics();
            }
        }

        // Throttle trail updates (every 4th frame)
        const shouldUpdateTrails = frameCountRef.current % 4 === 0;

        // Calculate COM for barycentric frame
        let comOffset = { x: 0, y: 0, z: 0 };
        if (referenceFrame === 'barycentric') {
            const com = calculateCOM();
            comOffset = { x: com.x, y: com.y, z: com.z };
        }

        bodiesRef.current.forEach((body, i) => {
            if (!meshRefs.current[i]) return;

            // Apply barycentric frame offset (subtract COM from all positions)
            const renderX = (body.x - comOffset.x) * scale;
            const renderY = (body.y - comOffset.y) * scale;
            const renderZ = (body.z - comOffset.z) * scale;
            meshRefs.current[i].position.set(renderX, renderY, renderZ);

            // Increased base size for better visibility, with scenario-specific scaling
            const visualMult = (scenarioKey === 'LAGRANGE') ? 3.5 : 1;
            const r = Math.max(8, Math.cbrt(body.mass) * 8) * visualMult;

            // --- Visual Logic (Hover/Select/Pulse) ---
            let targetScale = r;
            let targetEmissive = 0.6; // Increased from 0.2 for better visibility

            // Selected Body Pulse
            if (selectedBodyIndex === i) {
                const pulse = (Math.sin(Date.now() * 0.005) + 1) * 0.1 + 1; // 1.0 to 1.2
                targetScale = r * pulse;
                targetEmissive = 1.0; // Increased from 0.8
            }
            // Hover Effect
            else if (hoveredBodyIndexRef.current === i) {
                targetScale = r * 1.3; // Pop up
                targetEmissive = 0.9; // Increased from 0.6
            }

            // Smooth Scale Transition (Lerp) - skip on first frame to avoid "zoom in" effect
            const currentScale = meshRefs.current[i].scale.x;
            const isFirstFrame = currentScale === 1; // Default scale when mesh is created
            const lerpFactor = 0.2; // fast but smooth
            const newScale = isFirstFrame ? targetScale : currentScale + (targetScale - currentScale) * lerpFactor;

            meshRefs.current[i].scale.set(newScale, newScale, newScale);
            meshRefs.current[i].material.color.setHex(body.color);
            meshRefs.current[i].material.emissive.setHex(body.color);
            meshRefs.current[i].material.emissiveIntensity = targetEmissive;

            // Glow Update-Increased glow size and opacity
            if (glowRefs.current[i]) {
                glowRefs.current[i].position.copy(meshRefs.current[i].position);
                glowRefs.current[i].scale.set(newScale * 6, newScale * 6, 1); // Increased from 4
                glowRefs.current[i].material.color.setHex(body.color);
                glowRefs.current[i].material.opacity = 0.4; // Increased from default
            }

            // Throttle expensive trail updates
            if (trailLineRefs.current[i] && showTrails && shouldUpdateTrails) {
                const trail = trailsRef.current[i];
                if (trail.length > 2) {
                    let smoothPoints;

                    if (performanceMode) {
                        // Performance Mode: Simple line segments (NO spline calculation)
                        smoothPoints = trail.map(p => new THREE.Vector3(p.x * scale, p.y * scale, p.z * scale));
                        smoothPoints.push(new THREE.Vector3(body.x * scale, body.y * scale, body.z * scale));
                    } else {
                        // Quality Mode: Smooth spline curves (EXPENSIVE)
                        const rawPoints = trail.map(p => new THREE.Vector3(p.x * scale, p.y * scale, p.z * scale));
                        rawPoints.push(new THREE.Vector3(body.x * scale, body.y * scale, body.z * scale));
                        const curve = new THREE.CatmullRomCurve3(rawPoints, false, 'centripetal');
                        const pointsCount = Math.min(trail.length * 3, 500);
                        smoothPoints = curve.getPoints(pointsCount);
                    }

                    const geometry = trailLineRefs.current[i].geometry;
                    const numPoints = smoothPoints.length;
                    const bodyColor = new THREE.Color(body.color);

                    // Reuse existing buffers if they exist and are large enough
                    let posAttr = geometry.getAttribute('position');
                    let colAttr = geometry.getAttribute('color');

                    if (!posAttr || posAttr.count < numPoints) {
                        // Create new buffers with extra capacity to reduce reallocations
                        const capacity = Math.max(numPoints * 2, 512);
                        posAttr = new THREE.BufferAttribute(new Float32Array(capacity * 3), 3);
                        posAttr.setUsage(THREE.DynamicDrawUsage);
                        geometry.setAttribute('position', posAttr);

                        colAttr = new THREE.BufferAttribute(new Float32Array(capacity * 3), 3);
                        colAttr.setUsage(THREE.DynamicDrawUsage);
                        geometry.setAttribute('color', colAttr);
                    }

                    // Update buffer data directly
                    for (let j = 0; j < numPoints; j++) {
                        posAttr.setXYZ(j, smoothPoints[j].x, smoothPoints[j].y, smoothPoints[j].z);
                        const alpha = j / (numPoints - 1);
                        colAttr.setXYZ(j, bodyColor.r * alpha, bodyColor.g * alpha, bodyColor.b * alpha);
                    }

                    // Update draw range and mark for upload
                    geometry.setDrawRange(0, numPoints);
                    posAttr.needsUpdate = true;
                    colAttr.needsUpdate = true;
                    geometry.computeBoundingSphere();
                    trailLineRefs.current[i].visible = true;
                } else {
                    trailLineRefs.current[i].visible = false;
                }
            }
        });

        const { radius, theta, phi, target } = cameraControlsRef.current;

        let camX, camY, camZ, lookX, lookY, lookZ;

        if (cameraMode === 'COCKPIT' && bodiesRef.current[cameraTargetIdx]) {
            // Cockpit Mode: Camera is AT the body, looking OUT
            const body = bodiesRef.current[cameraTargetIdx];
            camX = body.x * scale;
            camY = body.y * scale;
            camZ = body.z * scale;

            // Look direction based on theta/phi (spherical coords)
            lookX = camX + Math.sin(phi) * Math.sin(theta) * 100;
            lookY = camY + Math.cos(phi) * 100;
            lookZ = camZ + Math.sin(phi) * Math.cos(theta) * 100;

        } else if (cameraMode === 'LOCK' && bodiesRef.current[cameraTargetIdx]) {
            // Lock Mode: Camera orbits AROUND the body
            const body = bodiesRef.current[cameraTargetIdx];
            const targetX = body.x * scale;
            const targetY = body.y * scale;
            const targetZ = body.z * scale;

            camX = targetX + radius * Math.sin(phi) * Math.sin(theta);
            camY = targetY + radius * Math.cos(phi);
            camZ = targetZ + radius * Math.sin(phi) * Math.cos(theta);

            lookX = targetX;
            lookY = targetY;
            lookZ = targetZ;

        } else {
            // Orbit Mode (Default): Camera orbits around (0,0,0) or pan target
            camX = (target.x + radius * Math.sin(phi) * Math.sin(theta));
            camY = (target.y + radius * Math.cos(phi));
            camZ = (target.z + radius * Math.sin(phi) * Math.cos(theta));

            lookX = target.x;
            lookY = target.y;
            lookZ = target.z;
        }

        cameraRef.current.position.set(camX, camY, camZ);
        cameraRef.current.lookAt(lookX, lookY, lookZ);

        // Update COM marker position (always at origin in barycentric, or actual COM in inertial)
        if (comMarkerRef.current && showCOM) {
            if (referenceFrame === 'barycentric') {
                // In barycentric frame, COM is at origin
                comMarkerRef.current.position.set(0, 0, 0);
            } else {
                // In inertial frame, show actual COM position
                const com = calculateCOM();
                comMarkerRef.current.position.set(com.x * scale, com.y * scale, com.z * scale);
            }
        }

        rendererRef.current.render(sceneRef.current, cameraRef.current);

        // Render corner gizmo (Blender-style axis indicator)
        if (gizmoSceneRef.current && gizmoCameraRef.current && gizmoRef.current) {
            // Sync gizmo rotation with main camera orientation
            const mainCamDir = new THREE.Vector3();
            cameraRef.current.getWorldDirection(mainCamDir);

            // Position gizmo camera to look at the gizmo from the same angle as main camera
            gizmoCameraRef.current.position.copy(mainCamDir).multiplyScalar(-5);
            gizmoCameraRef.current.lookAt(0, 0, 0);

            // Render gizmo in corner viewport
            const gizmoSize = 120;
            const margin = 20;
            rendererRef.current.setViewport(margin, margin, gizmoSize, gizmoSize);
            rendererRef.current.setScissor(margin, margin, gizmoSize, gizmoSize);
            rendererRef.current.setScissorTest(true);
            rendererRef.current.setClearColor(0x000000, 0);
            rendererRef.current.clear();
            rendererRef.current.render(gizmoSceneRef.current, gizmoCameraRef.current);

            // Reset viewport to full screen
            const w = mountRef.current.clientWidth;
            const h = mountRef.current.clientHeight;
            rendererRef.current.setViewport(0, 0, w, h);
            rendererRef.current.setScissorTest(false);
        }

        frameCountRef.current++;
        requestRef.current = requestAnimationFrame(animate);
    }, [isPlaying, simSpeed, gravityG, trailLength, showTrails, scenarioKey, threeLoaded, enableCollisions, physicsMode, selectedBodyIndex, cameraMode, cameraTargetIdx, showAnalysis, isStepMode, referenceFrame, showCOM, showGrid, useWebWorker, workerReady, workerSupported, workerUpdatePhysics, timeDirection, initialEnergy]);

    useEffect(() => {
        if (threeLoaded) {
            requestRef.current = requestAnimationFrame(animate);
            return () => cancelAnimationFrame(requestRef.current);
        }
    }, [animate, threeLoaded]);

    // Toggle grid visibility
    useEffect(() => {
        if (gridRef.current) {
            gridRef.current.visible = showGrid;
        }
    }, [showGrid]);

    useEffect(() => {
        if (comMarkerRef.current) {
            comMarkerRef.current.visible = showCOM;
        }
    }, [showCOM]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(PANEL_STORAGE_KEY, String(panelWidth));
    }, [panelWidth]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const handleResize = () => {
            setIsLargeScreen(window.innerWidth >= 1024);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const handlePointerMove = (event) => {
            if (!panelResizeRef.current.isResizing) return;
            const delta = panelResizeRef.current.startX - event.clientX;
            const nextWidth = clampPanelWidth(panelResizeRef.current.startWidth + delta);
            setPanelWidth(nextWidth);
        };
        const stopResize = () => {
            if (!panelResizeRef.current.isResizing) return;
            panelResizeRef.current.isResizing = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            setIsPanelResizing(false);
        };
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', stopResize);
        window.addEventListener('pointercancel', stopResize);
        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', stopResize);
            window.removeEventListener('pointercancel', stopResize);
        };
    }, []);

    useEffect(() => {
        if (!showPanel && panelResizeRef.current.isResizing) {
            panelResizeRef.current.isResizing = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            setIsPanelResizing(false);
        }
    }, [showPanel]);

    // Use ResizeObserver to handle canvas resizing (works for panel toggle and window resize)
    useEffect(() => {
        if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                if (width > 0 && height > 0 && cameraRef.current && rendererRef.current) {
                    cameraRef.current.aspect = width / height;
                    cameraRef.current.updateProjectionMatrix();
                    rendererRef.current.setSize(width, height);
                }
            }
        });

        resizeObserver.observe(mountRef.current);

        return () => resizeObserver.disconnect();
    }, [threeLoaded]);

    // --- Interaction ---
    const resetSimulation = useCallback((key) => {
        const scenario = SCENARIOS[key];
        if (key === 'CHAOS_RANDOM') {
            bodiesRef.current = JSON.parse(JSON.stringify(generateRandomBodies()));
        } else {
            bodiesRef.current = JSON.parse(JSON.stringify(scenario.bodies));
        }

        if (meshRefs.current) {
            while (meshRefs.current.length > 0) removeBodyVisuals(0);
        }

        trailsRef.current = [];
        bodiesRef.current.forEach(body => addBodyVisuals(body));

        setGravityG(scenario.g);
        timeRef.current = 0;
        setGravityG(scenario.g);
        timeRef.current = 0;
        statsRef.current = { time: 0, totalEnergy: 0, bodyCount: bodiesRef.current.length };
        analysisDataRef.current = [];
        setSelectedBodyIndex(null);

        if (scenario.cameraPos) {
            cameraControlsRef.current.radius = scenario.cameraPos.r;
            cameraControlsRef.current.theta = scenario.cameraPos.theta;
            cameraControlsRef.current.phi = scenario.cameraPos.phi;
            cameraControlsRef.current.target = { x: 0, y: 0, z: 0 };
        }
        markNeedsRender();
    }, []);

    useEffect(() => { resetSimulation(scenarioKey); }, []);

    useEffect(() => {
        markNeedsRender();
    }, [markNeedsRender, isPlaying, scenarioKey, showGrid, showCOM, showTrails, showLabels, showVelocityVectors, cameraMode, cameraTargetIdx, selectedBodyIndex, referenceFrame, showAnalysis, showHelp, showPanel, panelWidth, performanceMode, enableCollisions, physicsMode, dragMode, forceUpdateToken, useWebWorker, workerReady, workerSupported, isStepMode, simSpeed, gravityG, trailLength, timeDirection]);

    const handleScenarioChange = (key) => {
        setScenarioKey(key);
        resetSimulation(key);
        setIsPlaying(false);
    };

    const getMouseCoords = (e) => {
        const rect = mountRef.current.getBoundingClientRect();
        return {
            x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
            y: -((e.clientY - rect.top) / rect.height) * 2 + 1
        };
    };

    const handleMouseDown = (e) => {
        const mouse = getMouseCoords(e);
        const THREE = window.THREE;

        // Raycast to find body
        raycasterRef.current.setFromCamera(mouse, cameraRef.current);
        const intersects = raycasterRef.current.intersectObjects(meshRefs.current);

        // Body Click Logic
        if (intersects.length > 0) {
            const object = intersects[0].object;
            const index = meshRefs.current.indexOf(object);

            // ALWAYS select the body if paused (View or Drag mode)
            if (!isPlaying) {
                setSelectedBodyIndex(index);
            }

            // Check if we CAN drag (Paused + Drag Mode + Left Click)
            if (dragMode && !isPlaying && e.button === 0) {
                draggedBodyIndexRef.current = index;

                const normal = new THREE.Vector3();
                cameraRef.current.getWorldDirection(normal);
                dragPlaneRef.current.setFromNormalAndCoplanarPoint(normal, object.position);

                cameraControlsRef.current.isDragging = false;
                mountRef.current.style.cursor = 'grabbing';
                return;
            }

            // If playing, ignore drag attempts
            if (isPlaying && dragMode) {
                return;
            }
        } else {
            // Clicked on Empty Space
            if (!isPlaying && e.button === 0 && !dragMode) {
                setSelectedBodyIndex(null);
            }
        }

        // Camera Controls
        cameraControlsRef.current.isDragging = true;
        mountRef.current.style.cursor = 'grabbing';
        cameraControlsRef.current.previousMouse = { x: e.clientX, y: e.clientY };
        if (e.button === 0) cameraControlsRef.current.dragMode = 'ROTATE';
        if (e.button === 2) cameraControlsRef.current.dragMode = 'PAN';
        markNeedsRender();
    };

    const handleMouseMove = (e) => {
        const THREE = window.THREE;

        // --- 1. Hover Detection (Visuals Only) ---
        // We only check for hover if we aren't actively dragging camera or a body
        if (!cameraControlsRef.current.isDragging && draggedBodyIndexRef.current === null) {
            const mouse = getMouseCoords(e);
            raycasterRef.current.setFromCamera(mouse, cameraRef.current);
            const intersects = raycasterRef.current.intersectObjects(meshRefs.current);

            if (intersects.length > 0) {
                const index = meshRefs.current.indexOf(intersects[0].object);
                if (hoveredBodyIndexRef.current !== index) {
                    hoveredBodyIndexRef.current = index;
                    // Force cursor update
                    mountRef.current.style.cursor = 'pointer';
                    markNeedsRender();
                }
            } else {
                if (hoveredBodyIndexRef.current !== null) {
                    hoveredBodyIndexRef.current = null;
                    // Revert cursor based on current mode
                    mountRef.current.style.cursor = dragMode && !isPlaying ? 'crosshair' : 'default';
                    markNeedsRender();
                }
            }
        }

        // --- 2. Handle Body Drag ---
        if (draggedBodyIndexRef.current !== null) {
            if (isPlaying) { draggedBodyIndexRef.current = null; return; }

            const mouse = getMouseCoords(e);
            raycasterRef.current.setFromCamera(mouse, cameraRef.current);
            const target = new THREE.Vector3();
            raycasterRef.current.ray.intersectPlane(dragPlaneRef.current, target);

            if (target) {
                const index = draggedBodyIndexRef.current;
                const scale = SCENARIOS[scenarioKey].scale || 100;

                bodiesRef.current[index].x = target.x / scale;
                bodiesRef.current[index].y = target.y / scale;
                bodiesRef.current[index].z = target.z / scale;
                bodiesRef.current[index].vx = 0;
                bodiesRef.current[index].vy = 0;
                bodiesRef.current[index].vz = 0;

                // Force UI update if dragged body is selected
                if (index === selectedBodyIndex) {
                    setForceUpdateToken(prev => prev + 1);
                }
            }
            mountRef.current.style.cursor = 'grabbing';
            return;
        }

        // --- 3. Handle Camera Drag ---
        if (!cameraControlsRef.current.isDragging) return;
        mountRef.current.style.cursor = 'grabbing';
        const deltaX = e.clientX - cameraControlsRef.current.previousMouse.x;
        const deltaY = e.clientY - cameraControlsRef.current.previousMouse.y;
        cameraControlsRef.current.previousMouse = { x: e.clientX, y: e.clientY };

        if (cameraControlsRef.current.dragMode === 'ROTATE') {
            cameraControlsRef.current.theta -= deltaX * 0.005;
            cameraControlsRef.current.phi -= deltaY * 0.005;
            // Clamp phi to prevent gimbal lock (camera flipping at poles)
            const epsilon = 0.01;
            cameraControlsRef.current.phi = Math.max(epsilon, Math.min(Math.PI - epsilon, cameraControlsRef.current.phi));
        } else if (cameraControlsRef.current.dragMode === 'PAN' && cameraRef.current) {
            const right = new THREE.Vector3();
            const up = new THREE.Vector3();
            cameraRef.current.updateMatrixWorld();
            right.setFromMatrixColumn(cameraRef.current.matrix, 0);
            up.setFromMatrixColumn(cameraRef.current.matrix, 1);
            const panSpeed = cameraControlsRef.current.radius * 0.002;
            const dX = -deltaX * panSpeed;
            const dY = deltaY * panSpeed;
            cameraControlsRef.current.target.x += right.x * dX + up.x * dY;
            cameraControlsRef.current.target.y += right.y * dX + up.y * dY;
            cameraControlsRef.current.target.z += right.z * dX + up.z * dY;
        }
    };

    const handleMouseUp = () => {
        cameraControlsRef.current.isDragging = false;
        draggedBodyIndexRef.current = null;

        // Restore cursor logic on release
        mountRef.current.style.cursor = dragMode && !isPlaying ? 'crosshair' : 'default';
        markNeedsRender();
    };

    const handleWheel = (e) => {
        // Proportional zoom: faster at larger distances for consistent feel
        const zoomFactor = 0.001;
        const currentRadius = cameraControlsRef.current.radius;
        const newRadius = currentRadius * (1 + e.deltaY * zoomFactor);
        // Extended zoom range for large-scale scenarios like Lagrange
        cameraControlsRef.current.radius = Math.max(20, Math.min(10000, newRadius));
        markNeedsRender();
    };

    // --- Touch Handlers for Mobile ---
    const touchRef = useRef({ lastDistance: 0, lastCenter: { x: 0, y: 0 } });

    const getTouchDistance = (touches) => {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    };

    const getTouchCenter = (touches) => ({
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2
    });

    const handleTouchStart = (e) => {
        if (e.touches.length === 2) {
            touchRef.current.lastDistance = getTouchDistance(e.touches);
            touchRef.current.lastCenter = getTouchCenter(e.touches);
        } else if (e.touches.length === 1) {
            cameraControlsRef.current.isDragging = true;
            cameraControlsRef.current.dragMode = 'ROTATE';
            cameraControlsRef.current.previousMouse = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY
            };
            markNeedsRender();
        }
    };

    const handleTouchMove = (e) => {
        e.preventDefault();

        if (e.touches.length === 2) {
            // Pinch to zoom
            const newDistance = getTouchDistance(e.touches);
            const delta = touchRef.current.lastDistance - newDistance;
            const zoomSpeed = 0.5;
            const newRadius = cameraControlsRef.current.radius + delta * zoomSpeed;
            cameraControlsRef.current.radius = Math.max(50, Math.min(2000, newRadius));
            touchRef.current.lastDistance = newDistance;
            markNeedsRender();
        } else if (e.touches.length === 1 && cameraControlsRef.current.isDragging) {
            // Single finger rotate
            const deltaX = e.touches[0].clientX - cameraControlsRef.current.previousMouse.x;
            const deltaY = e.touches[0].clientY - cameraControlsRef.current.previousMouse.y;
            cameraControlsRef.current.previousMouse = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY
            };
            cameraControlsRef.current.theta -= deltaX * 0.005;
            cameraControlsRef.current.phi -= deltaY * 0.005;
            // Allow full rotation without gimbal lock
        }
    };

    const handleTouchEnd = () => {
        cameraControlsRef.current.isDragging = false;
        touchRef.current.lastDistance = 0;
        markNeedsRender();
    };

    const handlePanelResizePointerDown = (event) => {
        if (!isLargeScreen || !showPanel) return;
        panelResizeRef.current = {
            isResizing: true,
            startX: event.clientX,
            startWidth: panelWidth,
        };
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        setIsPanelResizing(true);
        event.preventDefault();
    };

    // --- Export State ---
    const exportState = () => {
        const state = {
            scenario: scenarioKey,
            time: timeRef.current,
            gravityG,
            bodies: bodiesRef.current.map(b => ({
                x: b.x, y: b.y, z: b.z,
                vx: b.vx, vy: b.vy, vz: b.vz,
                mass: b.mass,
                color: b.color
            })),
            settings: {
                physicsMode,
                enableCollisions,
                simSpeed,
                trailLength
            },
            exportedAt: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `three-body-state-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const panelStyle = isLargeScreen ? { width: showPanel ? `${panelWidth}px` : '0px' } : undefined;
    const panelTransitionClass = isPanelResizing ? '' : 'transition-all duration-300';

    return (
        <div ref={appContainerRef} className="flex flex-col lg:flex-row h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">

            {/* 3D Viewport */}
            <div
                className={`flex-1 min-w-0 relative h-[60vh] lg:h-full ${dragMode && !isPlaying ? 'cursor-crosshair' : 'cursor-default'}`}
                ref={mountRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onContextMenu={e => e.preventDefault()}
            >
                {!threeLoaded && <div className="absolute inset-0 flex items-center justify-center text-blue-400">Loading 3D Engine...</div>}

                {/* Top Left Overlay */}
                <div className="absolute top-4 left-4 pointer-events-none select-none z-10">
                    <h1 className="text-2xl font-bold text-slate-200 opacity-90 drop-shadow-lg flex items-center gap-2">
                        Three-Body Problem <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded">3D</span>
                    </h1>
                    <p className="text-sm text-slate-400 drop-shadow-md mt-1">
                        {isPlaying
                            ? "Running... Dragging disabled."
                            : dragMode
                                ? "PAUSED (Drag Mode): Click & Drag bodies"
                                : "PAUSED: Click bodies for info • Drag background to rotate"}
                    </p>
                </div>

                {/* Active Body Stats HUD (Top Right)-Real-time */}
                {selectedBodyIndex !== null && bodiesRef.current[selectedBodyIndex] && (
                    <BodyStatsPanel
                        bodiesRef={bodiesRef}
                        selectedBodyIndex={selectedBodyIndex}
                        onClose={() => setSelectedBodyIndex(null)}
                        onDelete={handleDeleteBody}
                        dragMode={dragMode}
                        isPlaying={isPlaying}
                    />
                )}

                {/* Body Labels Overlay */}
                {showLabels && threeLoaded && (
                    <BodyLabelsOverlay
                        bodiesRef={bodiesRef}
                        meshRefs={meshRefs}
                        cameraRef={cameraRef}
                        mountRef={mountRef}
                        selectedBodyIndex={selectedBodyIndex}
                        cameraMode={cameraMode}
                        cameraTargetIdx={cameraTargetIdx}
                    />
                )}

                {/* Bottom Info Bar */}
                <StatusFooter statsRef={statsRef} physicsMode={physicsMode} enableCollisions={enableCollisions} useWorker={useWebWorker} workerActive={workerReady} />

                {/* Analysis Panel Overlay - Draggable Window */}
                {showAnalysis && (
                    <AnalysisPanel
                        dataRef={analysisDataRef}
                        onClose={() => setShowAnalysis(false)}
                        selectedBodyIndex={selectedBodyIndex}
                        containerRef={mountRef}
                    />
                )}

                {/* Help Modal */}
                {showHelp && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-30 backdrop-blur-sm" onClick={() => setShowHelp(false)}>
                        <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <HelpCircle className="w-5 h-5 text-blue-400" /> Keyboard Shortcuts
                                </h2>
                                <button onClick={() => setShowHelp(false)} className="text-slate-400 hover:text-white">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-slate-800 px-3 py-2 rounded"><kbd className="text-blue-400">Space</kbd> / <kbd className="text-blue-400">K</kbd></div>
                                    <div className="text-slate-300">Play / Pause</div>

                                    <div className="bg-slate-800 px-3 py-2 rounded"><kbd className="text-blue-400">R</kbd></div>
                                    <div className="text-slate-300">Reset simulation</div>

                                    <div className="bg-slate-800 px-3 py-2 rounded"><kbd className="text-blue-400">G</kbd></div>
                                    <div className="text-slate-300">Toggle grid</div>

                                    <div className="bg-slate-800 px-3 py-2 rounded"><kbd className="text-blue-400">T</kbd></div>
                                    <div className="text-slate-300">Toggle trails</div>

                                    <div className="bg-slate-800 px-3 py-2 rounded"><kbd className="text-blue-400">C</kbd></div>
                                    <div className="text-slate-300">Toggle center of mass</div>

                                    <div className="bg-slate-800 px-3 py-2 rounded"><kbd className="text-blue-400">L</kbd></div>
                                    <div className="text-slate-300">Toggle body labels</div>

                                    <div className="bg-slate-800 px-3 py-2 rounded"><kbd className="text-blue-400">V</kbd></div>
                                    <div className="text-slate-300">Toggle velocity vectors</div>

                                    <div className="bg-slate-800 px-3 py-2 rounded"><kbd className="text-blue-400">F</kbd></div>
                                    <div className="text-slate-300">Toggle fullscreen</div>

                                    <div className="bg-slate-800 px-3 py-2 rounded"><kbd className="text-blue-400">P</kbd></div>
                                    <div className="text-slate-300">Toggle side panel</div>

                                    <div className="bg-slate-800 px-3 py-2 rounded"><kbd className="text-blue-400">A</kbd></div>
                                    <div className="text-slate-300">Toggle analysis panel</div>

                                    <div className="bg-slate-800 px-3 py-2 rounded"><kbd className="text-blue-400">H</kbd> / <kbd className="text-blue-400">?</kbd></div>
                                    <div className="text-slate-300">Show this help</div>

                                    <div className="bg-slate-800 px-3 py-2 rounded"><kbd className="text-blue-400">Esc</kbd></div>
                                    <div className="text-slate-300">Close panels</div>
                                </div>
                                <div className="border-t border-slate-700 pt-3 mt-3">
                                    <p className="text-slate-400 text-xs"><strong>Mouse:</strong> Left-drag to rotate • Right-drag to pan • Scroll to zoom</p>
                                    <p className="text-slate-400 text-xs mt-1"><strong>Touch:</strong> One finger to rotate • Pinch to zoom</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Help Button */}
                <button
                    onClick={() => setShowHelp(true)}
                    className="absolute bottom-4 right-4 p-2 bg-slate-800/80 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors z-10"
                    title="Keyboard Shortcuts (H)"
                >
                    <HelpCircle className="w-5 h-5" />
                </button>

                {/* Screenshot Button */}
                <button
                    onClick={takeScreenshot}
                    className="absolute bottom-4 right-16 p-2 bg-slate-800/80 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors z-10"
                    title="Take Screenshot"
                >
                    <Camera className="w-5 h-5" />
                </button>

                {/* Fullscreen Button */}
                <button
                    onClick={toggleFullscreen}
                    className={`absolute bottom-4 right-28 p-2 rounded-full transition-colors z-10 ${isFullscreen
                        ? 'bg-blue-600/90 hover:bg-blue-500 text-white'
                        : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white'
                        }`}
                    title={isFullscreen ? "Exit Fullscreen (F or Esc)" : "Enter Fullscreen (F)"}
                >
                    {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                </button>

                {/* Toggle Panel Button */}
                <button
                    onClick={() => setShowPanel(prev => !prev)}
                    className={`absolute bottom-4 right-40 p-2 rounded-full transition-colors z-10 ${showPanel
                        ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white'
                        : 'bg-blue-600/90 hover:bg-blue-500 text-white'
                        }`}
                    title={showPanel ? "Hide Panel (P)" : "Show Panel (P)"}
                >
                    {showPanel ? <PanelRightClose className="w-5 h-5" /> : <PanelRightOpen className="w-5 h-5" />}
                </button>

                {/* Velocity Vectors Overlay */}
                {showVelocityVectors && threeLoaded && (
                    <VelocityVectorsOverlay
                        bodiesRef={bodiesRef}
                        meshRefs={meshRefs}
                        cameraRef={cameraRef}
                        mountRef={mountRef}
                        scale={SCENARIOS[scenarioKey].scale}
                        cameraMode={cameraMode}
                        cameraTargetIdx={cameraTargetIdx}
                    />
                )}
            </div>

            {showPanel && isLargeScreen && (
                <div
                    className="hidden lg:flex items-center justify-center w-2 cursor-col-resize bg-slate-900/20 hover:bg-blue-500/40 transition-colors"
                    onPointerDown={handlePanelResizePointerDown}
                >
                    <div className="w-[2px] h-16 bg-white/40 rounded" />
                </div>
            )}

            {/* Controls Sidebar */}
            <div
                className={`bg-slate-900 border-l border-slate-800 flex flex-col overflow-y-auto z-10 shadow-xl flex-shrink-0 ${panelTransitionClass} ${showPanel
                    ? 'w-full lg:w-auto h-[40vh] lg:h-full opacity-100'
                    : 'w-0 h-0 lg:h-full overflow-hidden opacity-0 pointer-events-none'
                    }`}
                style={panelStyle}
            >

                {/* Header / Status */}
                <div className="p-6 border-b border-slate-800">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center space-x-2">
                            <Activity className="w-5 h-5 text-blue-400" />
                            <span className="font-semibold text-blue-100">System Status</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowAnalysis(!showAnalysis)}
                                className={`p-1.5 rounded transition-colors ${showAnalysis ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'} `}
                                title="Toggle Analysis Graphs"
                            >
                                <LineChartIcon className="w-4 h-4" />
                            </button>
                            <TimeDisplay statsRef={statsRef} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-800/50 p-3 rounded-lg">
                            <div className="text-xs text-slate-400 uppercase">Total Energy</div>
                            <EnergyDisplay statsRef={statsRef} />
                        </div>
                        <div className="bg-slate-800/50 p-3 rounded-lg">
                            <button
                                onClick={handleAddBody}
                                className="w-full h-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-500 rounded transition-colors text-sm font-semibold"
                            >
                                <Plus className="w-4 h-4" /> <span>Add Body</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Time Control & Analysis */}
                <div className="p-6 border-b border-slate-800">
                    <div className="flex items-center space-x-2 mb-3">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <h3 className="text-sm font-semibold text-slate-300">Time Control & Analysis</h3>
                    </div>

                    {/* Play/Pause Button */}
                    <button
                        onClick={() => {
                            if (isStepMode) {
                                setIsStepMode(false);
                                setIsPlaying(true);
                            } else {
                                setIsPlaying(!isPlaying);
                            }
                        }}
                        className={`w-full flex items-center justify-center space-x-2 py-3 mb-4 rounded-lg font-semibold transition-colors ${isPlaying && !isStepMode ? 'bg-amber-500/10 text-amber-500 border border-amber-500/50' : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20'} `}
                    >
                        {isPlaying && !isStepMode ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
                        <span>{isPlaying && !isStepMode ? "Pause" : (isStepMode ? "Resume" : "Start Simulation")}</span>
                    </button>

                    {/* Time Direction & Stepping */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                        <button
                            onClick={() => setTimeDirection(timeDirection * -1)}
                            className={`text-xs py-2 px-2 rounded border transition-all ${timeDirection === -1 ? 'bg-amber-600 border-amber-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'} `}
                            title="Reverse Time"
                        >
                            ⏮️ Reverse
                        </button>
                        <button
                            onClick={() => {
                                if (!isStepMode) {
                                    setIsStepMode(true);
                                    setIsPlaying(true);
                                } else {
                                    updatePhysics();
                                }
                            }}
                            className={`text-xs py-2 px-2 rounded border transition-all ${isStepMode ? 'bg-amber-600 border-amber-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'} `}
                            title={isStepMode ? "Click to Step Forward" : "Enter Frame Stepping Mode"}
                        >
                            {isStepMode ? "⏯️ Next Frame" : "⏭️ Step Mode"}
                        </button>
                        <button
                            onClick={saveBookmark}
                            className="text-xs py-2 px-2 rounded border bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 transition-all"
                            title="Save Bookmark"
                        >
                            🔖 Save
                        </button>
                    </div>

                    {/* Bookmarks List */}
                    {bookmarks.length > 0 && (
                        <div className="mb-3 bg-slate-800/50 rounded p-2">
                            <div className="text-[10px] text-slate-500 uppercase mb-1">Bookmarks ({bookmarks.length})</div>
                            <div className="space-y-1 max-h-20 overflow-y-auto">
                                {bookmarks.map((bookmark, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-xs bg-slate-900 rounded px-2 py-1">
                                        <button
                                            onClick={() => restoreBookmark(idx)}
                                            className="flex-1 text-left text-blue-400 hover:text-blue-300"
                                        >
                                            t={bookmark.time.toFixed(2)}
                                        </button>
                                        <button
                                            onClick={() => deleteBookmark(idx)}
                                            className="text-red-400 hover:text-red-300 ml-2"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Analysis Metrics */}
                    <div className="grid grid-cols-2 gap-2 mb-2">
                        <div className="bg-slate-800/50 p-2 rounded">
                            <div className="text-[10px] text-slate-500 uppercase">Energy Drift</div>
                            <div className={`text-sm font-semibold ${Math.abs(energyDrift) > 1 ? 'text-red-400' : 'text-green-400'} `}>
                                {energyDrift.toFixed(4)}%
                            </div>
                        </div>
                        <button
                            onClick={() => setShowCOM(!showCOM)}
                            className={`text-xs p-2 rounded border transition-all ${showCOM ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-700'} `}
                        >
                            {showCOM ? '✓' : '○'} Show COM
                        </button>
                    </div>



                    {/* Reference Frame */}
                    <div className="mt-2">
                        <div className="text-[10px] text-slate-500 uppercase mb-1">Reference Frame</div>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setReferenceFrame('inertial')}
                                className={`text-xs py-1.5 rounded border transition-all ${referenceFrame === 'inertial' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'} `}
                            >
                                Inertial
                            </button>
                            <button
                                onClick={() => setReferenceFrame('barycentric')}
                                className={`text-xs py-1.5 rounded border transition-all ${referenceFrame === 'barycentric' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'} `}
                            >
                                Barycentric
                            </button>
                        </div>
                    </div>
                </div>

                {/* Scenario Selector */}
                <div className="p-6 border-b border-slate-800">
                    <div className="flex items-center space-x-2 mb-3">
                        <Globe className="w-4 h-4 text-purple-400" />
                        <h3 className="text-sm font-semibold text-slate-300">Select Scenario</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                        {Object.keys(SCENARIOS).map((key) => (
                            <button
                                key={key}
                                onClick={() => handleScenarioChange(key)}
                                className={`text-xs py-2 px-3 rounded-md transition-all border ${scenarioKey === key ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                                    } `}
                                title={SCENARIOS[key].description}
                            >
                                {SCENARIOS[key].name}
                            </button>
                        ))}
                    </div>
                    {/* Active Scenario Description */}
                    <div className="bg-slate-800/50 p-2 rounded text-[11px] text-slate-400 leading-relaxed">
                        <Info className="w-3 h-3 inline mr-1 text-blue-400" />
                        {SCENARIOS[scenarioKey].description}
                    </div>
                </div>

                {/* Camera Controls */}
                <div className="p-6 border-b border-slate-800">
                    <div className="flex items-center space-x-2 mb-3">
                        <Video className="w-4 h-4 text-pink-400" />
                        <h3 className="text-sm font-semibold text-slate-300">Camera Mode</h3>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-3">
                        <button
                            onClick={() => setCameraMode('ORBIT')}
                            className={`text-xs py-2 rounded border transition-all ${cameraMode === 'ORBIT' ? 'bg-pink-600 border-pink-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'} `}
                        >
                            Orbit
                        </button>
                        <button
                            onClick={() => setCameraMode('LOCK')}
                            className={`text-xs py-2 rounded border transition-all ${cameraMode === 'LOCK' ? 'bg-pink-600 border-pink-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'} `}
                        >
                            Lock
                        </button>
                        <button
                            onClick={() => setCameraMode('COCKPIT')}
                            className={`text-xs py-2 rounded border transition-all ${cameraMode === 'COCKPIT' ? 'bg-pink-600 border-pink-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'} `}
                        >
                            Cockpit
                        </button>
                    </div>

                    {(cameraMode === 'LOCK' || cameraMode === 'COCKPIT') && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                            <div className="text-xs text-slate-400">Target Body</div>
                            <div className="grid grid-cols-3 gap-2">
                                {bodiesRef.current.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setCameraTargetIdx(i)}
                                        className={`text-xs py-1 rounded border ${cameraTargetIdx === i ? 'bg-slate-600 border-slate-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-500'} `}
                                    >
                                        Body {i + 1}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Advanced Controls */}
                <div className="p-6 space-y-6 flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                        <Settings className="w-4 h-4 text-orange-400" />
                        <h3 className="text-sm font-semibold text-slate-300">Advanced Physics</h3>
                    </div>

                    <div className="space-y-3">
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={useWebWorker}
                                onChange={(e) => setUseWebWorker(e.target.checked)}
                                disabled={!workerSupported}
                                className="w-4 h-4 rounded bg-slate-700 border-slate-600 disabled:opacity-50"
                            />
                            <span className={`text-xs ${workerSupported ? 'text-slate-300' : 'text-slate-500'}`}>
                                Web Worker Physics {workerReady && useWebWorker ? '✓' : ''}
                                {!workerSupported && ' (Not Supported)'}
                            </span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={performanceMode}
                                onChange={(e) => setPerformanceMode(e.target.checked)}
                                className="w-4 h-4 rounded bg-slate-700 border-slate-600"
                            />
                            <span className="text-xs text-slate-300">Performance Mode (Simple Trails)</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={showGrid}
                                onChange={(e) => setShowGrid(e.target.checked)}
                                className="w-4 h-4 rounded bg-slate-700 border-slate-600"
                            />
                            <span className="text-xs text-slate-300">Show 3D Grid (X, Y, Z Axes)</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={showLabels}
                                onChange={(e) => setShowLabels(e.target.checked)}
                                className="w-4 h-4 rounded bg-slate-700 border-slate-600"
                            />
                            <span className="text-xs text-slate-300">Show Body Labels</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={showVelocityVectors}
                                onChange={(e) => setShowVelocityVectors(e.target.checked)}
                                className="w-4 h-4 rounded bg-slate-700 border-slate-600"
                            />
                            <span className="text-xs text-slate-300">Show Velocity Vectors</span>
                        </label>
                    </div>

                    {/* Toggles Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setDragMode(!dragMode)}
                            className={`flex items-center justify-center space-x-2 py-3 px-2 rounded border text-xs font-medium transition-all ${dragMode
                                ? isPlaying
                                    ? 'bg-orange-900/20 border-orange-900 text-orange-700 cursor-not-allowed opacity-50' // Dimmed when playing
                                    : 'bg-orange-500/20 border-orange-500 text-orange-400'
                                : 'bg-slate-800 border-slate-700 text-slate-400'
                                } `}
                            title={isPlaying ? "Pause simulation to drag bodies" : "Toggle Drag Mode"}
                        >
                            <Hand className="w-4 h-4" /> <span>Drag Bodies</span>
                        </button>

                        <button
                            onClick={() => setEnableCollisions(!enableCollisions)}
                            className={`flex items-center justify-center space-x-2 py-3 px-2 rounded border text-xs font-medium transition-all ${enableCollisions ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-slate-800 border-slate-700 text-slate-400'
                                } `}
                        >
                            <Merge className="w-4 h-4" /> <span>Collision Merge</span>
                        </button>

                        <button
                            onClick={() => setPhysicsMode(physicsMode === 'EULER' ? 'RK4' : 'EULER')}
                            className={`col-span-2 flex items-center justify-center space-x-2 py-3 px-2 rounded border text-xs font-medium transition-all ${physicsMode === 'RK4' ? 'bg-purple-500/20 border-purple-500 text-purple-400' : 'bg-slate-800 border-slate-700 text-slate-400'
                                } `}
                        >
                            <Calculator className="w-4 h-4" />
                            <span>Integrator: {physicsMode === 'RK4' ? 'Runge-Kutta 4 (Precision)' : 'Symplectic Euler (Speed)'}</span>
                        </button>
                    </div>

                    {/* Sliders */}
                    <div className="space-y-4 pt-2 border-t border-slate-800">
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs text-slate-400">
                                <span>Gravitational Constant (G)</span>
                                <span>{gravityG.toFixed(2)}</span>
                            </div>
                            <input type="range" min="0.1" max="5" step="0.1" value={gravityG} onChange={(e) => setGravityG(parseFloat(e.target.value))} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-xs text-slate-400">
                                <span>Time Step</span>
                                <span>{simSpeed.toFixed(1)}x</span>
                            </div>
                            <input type="range" min="0.1" max="4" step="0.1" value={simSpeed} onChange={(e) => setSimSpeed(parseFloat(e.target.value))} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500" />
                            {/* Speed Presets */}
                            <div className="flex gap-1 mt-2">
                                {[0.25, 0.5, 1, 2, 4].map(speed => (
                                    <button
                                        key={speed}
                                        onClick={() => setSimSpeed(speed)}
                                        className={`flex-1 text-[10px] py-1 rounded transition-all ${Math.abs(simSpeed - speed) < 0.05
                                            ? 'bg-green-600 text-white'
                                            : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                                            }`}
                                    >
                                        {speed}x
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-slate-800 bg-slate-900/50">
                    <div className="flex space-x-3">
                        <button
                            onClick={exportState}
                            className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 hover:text-white transition-colors border border-slate-700"
                            title="Export State (JSON)"
                        >
                            <Download className="w-5 h-5" />
                            <span>Export</span>
                        </button>
                        <button
                            onClick={importState}
                            className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 hover:text-white transition-colors border border-slate-700"
                            title="Import State (JSON)"
                        >
                            <Upload className="w-5 h-5" />
                            <span>Import</span>
                        </button>
                        <button
                            onClick={() => { setIsPlaying(false); resetSimulation(scenarioKey); }}
                            className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 hover:text-white transition-colors border border-slate-700"
                            title="Reset Scenario"
                        >
                            <RotateCcw className="w-5 h-5" />
                            <span>Reset</span>
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default App;

// Helper component for inline editing
const EditableValue = ({ field, value, editing, setEditing, editValue, setEditValue, onApply, onLiveUpdate, color = "text-white" }) => {
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        if (editing === field) {
            setIsDirty(false);
        }
    }, [editing, field]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') onApply(isDirty);
        if (e.key === 'Escape') setEditing(null);
    };

    if (editing === field) {
        return (
            <input
                type="text"
                value={editValue}
                onChange={(e) => {
                    const val = e.target.value;
                    setEditValue(val);
                    setIsDirty(true);
                    if (onLiveUpdate) onLiveUpdate(val);
                }}
                onKeyDown={handleKeyDown}
                onBlur={() => onApply(isDirty)}
                autoFocus
                className="bg-slate-700 text-white px-1 py-0.5 rounded w-full text-center font-semibold"
                onClick={(e) => e.stopPropagation()}
            />
        );
    }
    return (
        <div
            onClick={(e) => {
                e.stopPropagation();
                setEditing(field);
                setEditValue(typeof value === 'number' ? value.toFixed(2) : value.toString());
            }}
            className={`${color} font-semibold cursor-pointer hover: bg-slate-700 px-1 py-0.5 rounded transition-colors`}
            title="Click to edit, Enter to apply"
        >
            {typeof value === 'number' ? value.toFixed(field === 'mass' ? 2 : 2) : value}
        </div>
    );
};

// Real-time Body Stats Panel Component with Inline Editing
const BodyStatsPanel = ({ bodiesRef, selectedBodyIndex, onClose, onDelete, dragMode, isPlaying }) => {
    const [stats, setStats] = useState({ mass: 0, speed: 0, vx: 0, vy: 0, vz: 0, x: 0, y: 0, z: 0, color: 0xffffff });
    const [editing, setEditing] = useState(null); // Track which field is being edited
    const [editValue, setEditValue] = useState('');

    useEffect(() => {
        const interval = setInterval(() => {
            if (bodiesRef.current[selectedBodyIndex]) {
                const body = bodiesRef.current[selectedBodyIndex];
                setStats({
                    mass: body.mass,
                    speed: Math.sqrt(body.vx ** 2 + body.vy ** 2 + body.vz ** 2),
                    vx: body.vx,
                    vy: body.vy,
                    vz: body.vz,
                    x: body.x,
                    y: body.y,
                    z: body.z,
                    color: body.color
                });
            }
        }, 50); // Update 20 times per second
        return () => clearInterval(interval);
    }, [bodiesRef, selectedBodyIndex]);

    const onLiveUpdate = (val) => {
        if (editing && bodiesRef.current[selectedBodyIndex]) {
            const value = parseFloat(val);
            if (!isNaN(value)) {
                const body = bodiesRef.current[selectedBodyIndex];
                if (editing === 'speed') {
                    // Scale velocity vector to match new speed
                    const currentSpeed = Math.sqrt(body.vx ** 2 + body.vy ** 2 + body.vz ** 2);
                    if (currentSpeed > 0.000001) {
                        const scale = value / currentSpeed;
                        body.vx *= scale;
                        body.vy *= scale;
                        body.vz *= scale;
                    } else {
                        // If speed was 0, set arbitrary direction (x-axis)
                        body.vx = value;
                        body.vy = 0;
                        body.vz = 0;
                    }
                } else {
                    body[editing] = value;
                }
            }
        }
    };

    const applyEdit = (isDirty) => {
        // Only apply if the user actually changed something (isDirty is true)
        // This prevents accidental rounding when just clicking and clicking off
        if (isDirty && editing && bodiesRef.current[selectedBodyIndex]) {
            const value = parseFloat(editValue);
            if (!isNaN(value)) {
                const body = bodiesRef.current[selectedBodyIndex];
                if (editing === 'speed') {
                    // Scale velocity vector to match new speed
                    const currentSpeed = Math.sqrt(body.vx ** 2 + body.vy ** 2 + body.vz ** 2);
                    if (currentSpeed > 0.000001) {
                        const scale = value / currentSpeed;
                        body.vx *= scale;
                        body.vy *= scale;
                        body.vz *= scale;
                    } else {
                        body.vx = value;
                        body.vy = 0;
                        body.vz = 0;
                    }
                } else {
                    body[editing] = value;
                }
            }
        }
        setEditing(null);
    };

    return (
        <div
            className="absolute top-4 right-4 bg-slate-900/90 border border-slate-700 rounded-lg p-4 w-72 shadow-2xl backdrop-blur z-20 animate-in fade-in slide-in-from-right-4 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
        >
            <div className="flex justify-between items-start mb-3 border-b border-slate-700 pb-2">
                <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#' + stats.color.toString(16).padStart(6, '0') }}></div>
                    <h3 className="font-bold text-slate-100">Body {selectedBodyIndex + 1}</h3>
                </div>
                <div className="flex items-center space-x-1">
                    <button
                        onClick={() => onDelete(selectedBodyIndex)}
                        className="text-red-400 hover:text-red-300 p-1 hover:bg-red-500/20 rounded transition-colors"
                        title="Delete this body"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <button onClick={onClose} className="text-slate-400 hover:text-white p-1"><X className="w-4 h-4" /></button>
                </div>
            </div>

            <div className="space-y-3 text-xs font-mono text-slate-300">
                <div className="bg-slate-800 p-2 rounded">
                    <div className="text-slate-500 mb-1">Mass</div>
                    <EditableValue
                        field="mass"
                        value={stats.mass}
                        editing={editing}
                        setEditing={setEditing}
                        editValue={editValue}
                        setEditValue={setEditValue}
                        onApply={applyEdit}
                        onLiveUpdate={onLiveUpdate}
                    />
                </div>

                <div className="bg-slate-800 p-2 rounded">
                    <div className="text-slate-500 mb-1 flex justify-between items-center">
                        <span>Velocity</span>
                        <Activity className="w-3 h-3" />
                    </div>

                    <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-700/50">
                        <span className="text-slate-400">|v| Speed</span>
                        <span className="text-emerald-400 font-semibold text-sm">{stats.speed.toFixed(2)}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-1 text-center">
                        <div>
                            <span className="text-blue-400 mr-1">î</span>
                            <EditableValue
                                field="vx"
                                value={stats.vx}
                                editing={editing}
                                setEditing={setEditing}
                                editValue={editValue}
                                setEditValue={setEditValue}
                                onApply={applyEdit}
                                onLiveUpdate={onLiveUpdate}
                            />
                        </div>
                        <div>
                            <span className="text-green-400 mr-1">ĵ</span>
                            <EditableValue
                                field="vy"
                                value={stats.vy}
                                editing={editing}
                                setEditing={setEditing}
                                editValue={editValue}
                                setEditValue={setEditValue}
                                onApply={applyEdit}
                                onLiveUpdate={onLiveUpdate}
                            />
                        </div>
                        <div>
                            <span className="text-red-400 mr-1">k̂</span>
                            <EditableValue
                                field="vz"
                                value={stats.vz}
                                editing={editing}
                                setEditing={setEditing}
                                editValue={editValue}
                                setEditValue={setEditValue}
                                onApply={applyEdit}
                                onLiveUpdate={onLiveUpdate}
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-slate-800 p-2 rounded">
                    <div className="text-slate-500 mb-1 flex justify-between">
                        <span>Position (x, y, z)</span>
                        <Target className="w-3 h-3" />
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-center">
                        <div>
                            <span className="text-slate-600 mr-1">X</span>
                            <EditableValue
                                field="x"
                                value={stats.x}
                                editing={editing}
                                setEditing={setEditing}
                                editValue={editValue}
                                setEditValue={setEditValue}
                                onApply={applyEdit}
                                onLiveUpdate={onLiveUpdate}
                            />
                        </div>
                        <div>
                            <span className="text-slate-600 mr-1">Y</span>
                            <EditableValue
                                field="y"
                                value={stats.y}
                                editing={editing}
                                setEditing={setEditing}
                                editValue={editValue}
                                setEditValue={setEditValue}
                                onApply={applyEdit}
                                onLiveUpdate={onLiveUpdate}
                            />
                        </div>
                        <div>
                            <span className="text-slate-600 mr-1">Z</span>
                            <EditableValue
                                field="z"
                                value={stats.z}
                                editing={editing}
                                setEditing={setEditing}
                                editValue={editValue}
                                setEditValue={setEditValue}
                                onApply={applyEdit}
                                onLiveUpdate={onLiveUpdate}
                            />
                        </div>
                    </div>
                </div>

                {dragMode && !isPlaying && (
                    <div className="text-[10px] text-center text-orange-400 pt-1 italic">
                        Drag active: Move body to update pos
                    </div>
                )}

                <div className="text-[10px] text-center text-blue-400 pt-1">
                    💡 Click values to edit • Press Enter to apply
                </div>
            </div>
        </div>
    );
};

// --- Isolated Components for Performance ---

const TimeDisplay = ({ statsRef }) => {
    const [time, setTime] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => {
            if (statsRef.current) setTime(statsRef.current.time);
        }, 100);
        return () => clearInterval(interval);
    }, []);
    return <span className="text-xs font-mono text-slate-500">T: {time.toFixed(2)}</span>;
};

const EnergyDisplay = ({ statsRef }) => {
    const [energy, setEnergy] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => {
            if (statsRef.current) setEnergy(statsRef.current.totalEnergy);
        }, 200);
        return () => clearInterval(interval);
    }, []);
    return <div className="text-lg font-mono text-emerald-400 truncate">{energy.toFixed(4)}</div>;
};

const StatusFooter = ({ statsRef, physicsMode, enableCollisions, useWorker, workerActive }) => {
    const [bodyCount, setBodyCount] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => {
            if (statsRef.current) setBodyCount(statsRef.current.bodyCount);
        }, 200);
        return () => clearInterval(interval);
    }, []);
    return (
        <div className="absolute bottom-4 left-4 pointer-events-none text-xs text-slate-500 flex gap-4 z-10 bg-slate-900/50 p-2 rounded backdrop-blur-sm border border-slate-800/50">
            <span>Engine: {physicsMode}</span>
            <span>Collisions: {enableCollisions ? 'ON' : 'OFF'}</span>
            {useWorker && <span className={workerActive ? 'text-green-400' : 'text-yellow-400'}>
                Worker: {workerActive ? 'Active' : 'Pending'}
            </span>}
            <span className="text-white font-bold">Active Bodies: {bodyCount}</span>
        </div>
    );
};



// Custom Canvas Graph Component (Hardware Accelerated)
const CanvasLineChart = ({ dataRef }) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        let currentWidth = 0;
        let currentHeight = 0;

        let animationId;

        const resize = () => {
            const width = container.clientWidth;
            const height = container.clientHeight;

            // Skip if size hasn't changed
            if (width === currentWidth && height === currentHeight) return;
            if (width <= 0 || height <= 0) return;

            currentWidth = width;
            currentHeight = height;

            // Set actual size in memory (scaled for retina)
            canvas.width = width * dpr;
            canvas.height = height * dpr;

            // Scale down to display size
            canvas.style.width = width + 'px';
            canvas.style.height = height + 'px';

            // Reset and scale context
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.scale(dpr, dpr);
        };

        // Use ResizeObserver to detect container size changes
        const resizeObserver = new ResizeObserver(() => resize());
        resizeObserver.observe(container);
        resize();

        const draw = () => {
            const data = dataRef.current;
            if (!data || data.length === 0) {
                animationId = requestAnimationFrame(draw);
                return;
            }

            const width = canvas.width / dpr;
            const height = canvas.height / dpr;

            // Clear
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, width, height);

            // Find min/max for scaling
            let minY = Infinity, maxY = -Infinity;
            data.forEach(d => {
                minY = Math.min(minY, d.ke, d.pe, d.total);
                maxY = Math.max(maxY, d.ke, d.pe, d.total);
            });

            // Add 10% padding to prevent clipping at edges
            const range = maxY - minY || 1;
            const margin = range * 0.1;
            minY -= margin;
            maxY += margin;
            const paddedRange = maxY - minY;

            // Responsive padding - tighter on small sizes
            const paddingLeft = Math.max(45, Math.min(60, width * 0.08));
            const paddingBottom = Math.max(30, Math.min(40, height * 0.15));
            const paddingTop = Math.max(15, Math.min(20, height * 0.08));
            const paddingRight = Math.max(10, Math.min(20, width * 0.03));
            const graphWidth = width - paddingLeft - paddingRight;
            const graphHeight = height - paddingTop - paddingBottom;

            const xScale = graphWidth / Math.max(data.length - 1, 1);
            const yScale = d => paddingTop + graphHeight - ((d - minY) / paddedRange) * graphHeight;

            // Draw grid and axes
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 0.5;
            ctx.fillStyle = '#94a3b8';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'right';

            // Y-axis grid lines and labels
            const numYTicks = 6;
            for (let i = 0; i <= numYTicks; i++) {
                const value = minY + (paddedRange * i / numYTicks);
                const y = paddingTop + graphHeight - (graphHeight * i / numYTicks);

                // Grid line
                ctx.beginPath();
                ctx.moveTo(paddingLeft, y);
                ctx.lineTo(width - paddingRight, y);
                ctx.stroke();

                // Y-axis label
                ctx.fillText(value.toFixed(2), paddingLeft - 5, y + 3);
            }

            // X-axis grid lines and labels
            const numXTicks = 5;
            ctx.textAlign = 'center';
            for (let i = 0; i <= numXTicks; i++) {
                const dataIndex = Math.floor((data.length - 1) * i / numXTicks);
                const x = paddingLeft + (graphWidth * i / numXTicks);
                const y = paddingTop + graphHeight;

                // Grid line
                ctx.beginPath();
                ctx.moveTo(x, paddingTop);
                ctx.lineTo(x, y);
                ctx.stroke();

                // X-axis label
                if (data[dataIndex]) {
                    ctx.fillText(data[dataIndex].time.toFixed(1), x, y + 15);
                }
            }

            // Draw axes borders
            ctx.strokeStyle = '#64748b';
            ctx.lineWidth = 1;
            ctx.strokeRect(paddingLeft, paddingTop, graphWidth, graphHeight);

            // Axis titles
            ctx.fillStyle = '#cbd5e1';
            ctx.font = '11px sans-serif';
            ctx.textAlign = 'center';

            // X-axis title
            ctx.fillText('Time', paddingLeft + graphWidth / 2, height - 10);

            // Y-axis title (rotated)
            ctx.save();
            ctx.translate(15, paddingTop + graphHeight / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.fillText('Energy', 0, 0);
            ctx.restore();

            // Draw lines
            const drawLine = (key, color) => {
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.beginPath();
                data.forEach((d, i) => {
                    const x = paddingLeft + i * xScale;
                    const y = yScale(d[key]);
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                });
                ctx.stroke();
            };

            drawLine('ke', '#10b981');
            drawLine('pe', '#3b82f6');
            drawLine('total', '#eab308');

            // Legend - inside graph area (top-right corner with background)
            const legendX = paddingLeft + graphWidth - 75;
            const legendY = paddingTop + 8;
            const legendWidth = 70;
            const legendHeight = 58;

            // Semi-transparent background
            ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
            ctx.fillRect(legendX - 5, legendY - 5, legendWidth, legendHeight);
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 1;
            ctx.strokeRect(legendX - 5, legendY - 5, legendWidth, legendHeight);

            ctx.textAlign = 'left';
            ctx.font = '9px sans-serif';
            ctx.fillStyle = '#10b981';
            ctx.fillRect(legendX, legendY, 10, 10);
            ctx.fillStyle = '#94a3b8';
            ctx.fillText('Kinetic', legendX + 14, legendY + 8);

            ctx.fillStyle = '#3b82f6';
            ctx.fillRect(legendX, legendY + 16, 10, 10);
            ctx.fillStyle = '#94a3b8';
            ctx.fillText('Potential', legendX + 14, legendY + 24);

            ctx.fillStyle = '#eab308';
            ctx.fillRect(legendX, legendY + 32, 10, 10);
            ctx.fillStyle = '#94a3b8';
            ctx.fillText('Total', legendX + 14, legendY + 40);

            animationId = requestAnimationFrame(draw);
        };

        animationId = requestAnimationFrame(draw);

        return () => {
            cancelAnimationFrame(animationId);
            resizeObserver.disconnect();
        };
    }, []);

    return (
        <div ref={containerRef} className="w-full h-full">
            <canvas ref={canvasRef} className="rounded block" />
        </div>
    );
};

const CanvasScatterPlot = ({ dataRef, selectedBodyIndex }) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        let currentWidth = 0;
        let currentHeight = 0;

        let animationId;

        const resize = () => {
            const width = container.clientWidth;
            const height = container.clientHeight;

            // Skip if size hasn't changed
            if (width === currentWidth && height === currentHeight) return;
            if (width <= 0 || height <= 0) return;

            currentWidth = width;
            currentHeight = height;

            canvas.width = width * dpr;
            canvas.height = height * dpr;
            canvas.style.width = width + 'px';
            canvas.style.height = height + 'px';

            // Reset transform before applying new scale
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.scale(dpr, dpr);
        };

        resize();
        // Use ResizeObserver for container size changes
        const resizeObserver = new ResizeObserver(() => resize());
        resizeObserver.observe(container);

        const draw = () => {
            const data = dataRef.current;
            if (!data || data.length === 0) {
                animationId = requestAnimationFrame(draw);
                return;
            }

            const width = canvas.width / dpr;
            const height = canvas.height / dpr;

            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, width, height);

            // Grid
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 0.5;
            for (let i = 0; i <= 10; i++) {
                const x = (width / 10) * i;
                const y = (height / 10) * i;
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.stroke();
            }

            // Find ranges
            let minX = Infinity, maxX = -Infinity;
            let minPx = Infinity, maxPx = -Infinity;
            data.forEach(d => {
                minX = Math.min(minX, d.x);
                maxX = Math.max(maxX, d.x);
                minPx = Math.min(minPx, d.px);
                maxPx = Math.max(maxPx, d.px);
            });

            const rangeX = maxX - minX || 1;
            const rangePx = maxPx - minPx || 1;
            // Responsive padding
            const paddingX = Math.max(10, Math.min(30, width * 0.06));
            const paddingY = Math.max(10, Math.min(30, height * 0.08));

            const xScale = x => paddingX + ((x - minX) / rangeX) * (width - paddingX * 2);
            const yScale = px => height - paddingY - ((px - minPx) / rangePx) * (height - paddingY * 2);

            // Draw line connecting points
            ctx.strokeStyle = '#f472b6';
            ctx.lineWidth = 1;
            ctx.beginPath();
            data.forEach((d, i) => {
                const x = xScale(d.x);
                const y = yScale(d.px);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();

            // Draw points
            ctx.fillStyle = '#f472b6';
            data.forEach(d => {
                const x = xScale(d.x);
                const y = yScale(d.px);
                ctx.beginPath();
                ctx.arc(x, y, 2, 0, Math.PI * 2);
                ctx.fill();
            });

            // Labels
            ctx.fillStyle = '#94a3b8';
            ctx.font = '10px sans-serif';
            ctx.fillText(`Body ${(selectedBodyIndex || 0) + 1} `, 5, 15);
            ctx.fillText(`X: ${minX.toFixed(1)} to ${maxX.toFixed(1)} `, 5, height - 5);

            animationId = requestAnimationFrame(draw);
        };

        animationId = requestAnimationFrame(draw);

        return () => {
            cancelAnimationFrame(animationId);
            resizeObserver.disconnect();
        };
    }, [selectedBodyIndex]);

    return (
        <div ref={containerRef} className="w-full h-full">
            <canvas ref={canvasRef} className="rounded block" />
        </div>
    );
};

// Memoize AnalysisPanel - Draggable floating window
const AnalysisPanel = React.memo(({ dataRef, onClose, selectedBodyIndex, containerRef }) => {
    const panelRef = useRef(null);
    const [isCompactLayout, setIsCompactLayout] = useState(false);

    // Position from top-left corner (like normal windows)
    const [position, setPosition] = useState({ x: 16, y: null }); // null = will initialize on mount
    const [size, setSize] = useState({ width: 800, height: 320 });
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const dragRef = useRef({ startMouseX: 0, startMouseY: 0, startPosX: 0, startPosY: 0 });
    const resizeRef = useRef({ startMouseX: 0, startMouseY: 0, startX: 0, startY: 0, startW: 0, startH: 0, edge: null });

    // Initialize position on mount (position near bottom of container)
    useEffect(() => {
        if (position.y === null && containerRef?.current) {
            const containerHeight = containerRef.current.clientHeight;
            // Position so bottom of panel is ~64px from container bottom
            const initialY = Math.max(16, containerHeight - size.height - 64);
            setPosition(prev => ({ ...prev, y: initialY }));
        }
    }, [containerRef, size.height]);

    useEffect(() => {
        if (typeof window === 'undefined' || !panelRef.current) return;
        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;
            setIsCompactLayout(entry.contentRect.width < 500);
        });
        observer.observe(panelRef.current);
        return () => observer.disconnect();
    }, []);

    // Drag handlers
    const handleDragStart = (e) => {
        if (e.target.closest('button') || e.target.closest('.resize-handle')) return;
        e.preventDefault();
        e.stopPropagation();
        dragRef.current = {
            startMouseX: e.clientX,
            startMouseY: e.clientY,
            startPosX: position.x,
            startPosY: position.y
        };
        setIsDragging(true);
        document.body.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
    };

    const getCursorForEdge = (edge) => {
        if (edge === 'n' || edge === 's') return 'ns-resize';
        if (edge === 'e' || edge === 'w') return 'ew-resize';
        if (edge === 'nw' || edge === 'se') return 'nwse-resize';
        if (edge === 'ne' || edge === 'sw') return 'nesw-resize';
        return 'default';
    };

    const handleResizeStart = (e, edge) => {
        e.preventDefault();
        e.stopPropagation();
        resizeRef.current = {
            startMouseX: e.clientX,
            startMouseY: e.clientY,
            startX: position.x,
            startY: position.y,
            startW: size.width,
            startH: size.height,
            edge
        };
        setIsResizing(true);
        document.body.style.cursor = getCursorForEdge(edge);
        document.body.style.userSelect = 'none';
    };

    useEffect(() => {
        if (!isDragging && !isResizing) return;

        const handleMouseMove = (e) => {
            if (isDragging && containerRef?.current) {
                const container = containerRef.current.getBoundingClientRect();

                const deltaX = e.clientX - dragRef.current.startMouseX;
                const deltaY = e.clientY - dragRef.current.startMouseY;

                let newX = dragRef.current.startPosX + deltaX;
                let newY = dragRef.current.startPosY + deltaY;

                // Clamp to container bounds
                newX = Math.max(0, Math.min(newX, container.width - size.width));
                newY = Math.max(0, Math.min(newY, container.height - size.height));

                setPosition({ x: newX, y: newY });
            }

            if (isResizing && containerRef?.current) {
                const deltaX = e.clientX - resizeRef.current.startMouseX;
                const deltaY = e.clientY - resizeRef.current.startMouseY;
                const edge = resizeRef.current.edge;
                const minW = 400;
                const minH = 200;

                let newX = resizeRef.current.startX;
                let newY = resizeRef.current.startY;
                let newW = resizeRef.current.startW;
                let newH = resizeRef.current.startH;

                // East edge: expand width to the right
                if (edge.includes('e')) {
                    newW = Math.max(minW, resizeRef.current.startW + deltaX);
                }

                // West edge: expand width to the left (move x and adjust width)
                if (edge.includes('w')) {
                    const maxDelta = resizeRef.current.startW - minW;
                    const clampedDelta = Math.max(-resizeRef.current.startX, Math.min(deltaX, maxDelta));
                    newX = resizeRef.current.startX + clampedDelta;
                    newW = resizeRef.current.startW - clampedDelta;
                }

                // South edge: expand height downward
                if (edge.includes('s')) {
                    newH = Math.max(minH, resizeRef.current.startH + deltaY);
                }

                // North edge: expand height upward (move y and adjust height)
                if (edge.includes('n')) {
                    const maxDelta = resizeRef.current.startH - minH;
                    const clampedDelta = Math.max(-resizeRef.current.startY, Math.min(deltaY, maxDelta));
                    newY = resizeRef.current.startY + clampedDelta;
                    newH = resizeRef.current.startH - clampedDelta;
                }

                setPosition({ x: newX, y: newY });
                setSize({ width: newW, height: newH });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setIsResizing(false);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isResizing, containerRef, size.width, size.height]);

    const layoutClass = isCompactLayout ? 'flex-col' : 'flex-row';
    const primarySectionClass = 'flex-1 flex flex-col min-w-0 min-h-0';
    const secondarySectionBase = isCompactLayout
        ? 'border-t border-slate-700 pt-3'
        : 'border-l border-slate-700 pl-3';
    const secondarySectionClass = `flex-1 flex flex-col min-w-0 min-h-0 ${secondarySectionBase}`;

    const panelStyle = {
        left: `${position.x}px`,
        top: `${position.y ?? 100}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
    };

    // Stop propagation to prevent camera rotation
    const blockCameraInteraction = (e) => {
        e.stopPropagation();
    };

    return (
        <div
            ref={panelRef}
            className="absolute bg-slate-900/95 border border-slate-600 rounded-lg shadow-2xl backdrop-blur-sm z-30 overflow-hidden"
            style={panelStyle}
            onMouseDown={blockCameraInteraction}
        >
            {/* Draggable Title Bar */}
            <div
                className="absolute top-0 left-0 right-0 h-8 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between px-3 cursor-grab active:cursor-grabbing rounded-t-lg z-10"
                onMouseDown={handleDragStart}
            >
                <span className="text-xs font-semibold text-slate-300 select-none flex items-center gap-2">
                    <Activity className="w-3 h-3 text-blue-400" />
                    Analysis Dashboard
                </span>
                <button
                    onClick={onClose}
                    className="text-slate-400 hover:text-white hover:bg-slate-700 rounded p-0.5 transition-colors"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Content Area - fills remaining space below title bar */}
            <div
                className={`absolute top-8 left-0 right-0 bottom-0 flex ${layoutClass} gap-3 p-3`}
            >
                <div className={primarySectionClass}>
                    <h3 className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-2">
                        <Activity className="w-3 h-3" /> Energy Conservation
                    </h3>
                    <div className="flex-1 min-h-0 bg-slate-950 rounded">
                        <CanvasLineChart dataRef={dataRef} />
                    </div>
                </div>
                <div className={secondarySectionClass}>
                    <h3 className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-2">
                        <Move3d className="w-3 h-3" /> Phase Space (Body {selectedBodyIndex !== null ? selectedBodyIndex + 1 : 1})
                        <span className="text-[10px] font-normal text-slate-500 ml-auto">Pos (X) vs Momentum (Px)</span>
                    </h3>
                    <div className="flex-1 min-h-0 bg-slate-950 rounded">
                        <CanvasScatterPlot dataRef={dataRef} selectedBodyIndex={selectedBodyIndex} />
                    </div>
                </div>
            </div>

            {/* Resize Handles - All edges and corners like a real window */}
            {/* Corners */}
            <div
                className="resize-handle absolute bottom-0 right-0 w-3 h-3 cursor-nwse-resize z-20"
                onMouseDown={(e) => handleResizeStart(e, 'se')}
            />
            <div
                className="resize-handle absolute bottom-0 left-0 w-3 h-3 cursor-nesw-resize z-20"
                onMouseDown={(e) => handleResizeStart(e, 'sw')}
            />
            <div
                className="resize-handle absolute top-0 right-0 w-3 h-3 cursor-nesw-resize z-20"
                onMouseDown={(e) => handleResizeStart(e, 'ne')}
            />
            <div
                className="resize-handle absolute top-0 left-0 w-3 h-3 cursor-nwse-resize z-20"
                onMouseDown={(e) => handleResizeStart(e, 'nw')}
            />
            {/* Edges */}
            <div
                className="resize-handle absolute top-3 bottom-3 right-0 w-1 cursor-ew-resize hover:bg-blue-500/30"
                onMouseDown={(e) => handleResizeStart(e, 'e')}
            />
            <div
                className="resize-handle absolute top-3 bottom-3 left-0 w-1 cursor-ew-resize hover:bg-blue-500/30"
                onMouseDown={(e) => handleResizeStart(e, 'w')}
            />
            <div
                className="resize-handle absolute bottom-0 left-3 right-3 h-1 cursor-ns-resize hover:bg-blue-500/30"
                onMouseDown={(e) => handleResizeStart(e, 's')}
            />
            <div
                className="resize-handle absolute top-0 left-3 right-3 h-1 cursor-ns-resize hover:bg-blue-500/30"
                onMouseDown={(e) => handleResizeStart(e, 'n')}
            />
        </div>
    );
});

// Body Labels Overlay - HTML labels positioned over 3D bodies
const BodyLabelsOverlay = ({ bodiesRef, meshRefs, cameraRef, mountRef, selectedBodyIndex, cameraMode, cameraTargetIdx }) => {
    const [labelPositions, setLabelPositions] = useState([]);

    useEffect(() => {
        if (!cameraRef.current || !mountRef.current) return;

        let animationFrameId;

        const updateLabels = () => {
            if (!meshRefs.current || meshRefs.current.length === 0) {
                animationFrameId = requestAnimationFrame(updateLabels);
                return;
            }

            const camera = cameraRef.current;
            const rect = mountRef.current.getBoundingClientRect();
            const positions = [];

            meshRefs.current.forEach((mesh, i) => {
                if (!mesh) return;

                // In cockpit mode, hide the label for the body we're riding
                if (cameraMode === 'COCKPIT' && i === cameraTargetIdx) return;

                // Get world position of mesh
                const vector = mesh.position.clone();
                vector.project(camera);

                // Convert to screen coordinates
                const x = (vector.x * 0.5 + 0.5) * rect.width;
                const y = (-vector.y * 0.5 + 0.5) * rect.height;

                // Check if in front of camera (z < 1 means in front)
                // Also check that the position is within reasonable screen bounds
                const visible = vector.z < 1 && x > -100 && x < rect.width + 100 && y > -100 && y < rect.height + 100;

                positions.push({
                    x,
                    y: y - 30, // Offset above the body
                    visible,
                    index: i,
                    mass: bodiesRef.current[i]?.mass || 1,
                    color: bodiesRef.current[i]?.color || 0xffffff
                });
            });

            setLabelPositions(positions);
            animationFrameId = requestAnimationFrame(updateLabels);
        };

        animationFrameId = requestAnimationFrame(updateLabels);
        return () => cancelAnimationFrame(animationFrameId);
    }, [cameraRef, mountRef, meshRefs, bodiesRef, cameraMode, cameraTargetIdx]);

    return (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
            {labelPositions.map((pos) => (
                pos.visible && (
                    <div
                        key={pos.index}
                        className={`absolute transform -translate-x-1/2 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-lg transition-opacity ${selectedBodyIndex === pos.index
                            ? 'bg-white text-slate-900 ring-2 ring-blue-400'
                            : 'bg-slate-800/80 text-white'
                            }`}
                        style={{
                            left: pos.x,
                            top: pos.y,
                            borderLeft: `3px solid #${pos.color.toString(16).padStart(6, '0')}`
                        }}
                    >
                        Body {pos.index + 1}
                        <span className="text-slate-400 ml-1 font-normal">m={pos.mass.toFixed(1)}</span>
                    </div>
                )
            ))}
        </div>
    );
};

// Velocity Vectors Overlay - SVG arrows showing velocity direction/magnitude
const VelocityVectorsOverlay = ({ bodiesRef, meshRefs, cameraRef, mountRef, scale, cameraMode, cameraTargetIdx }) => {
    const [vectors, setVectors] = useState([]);

    useEffect(() => {
        if (!cameraRef.current || !mountRef.current) return;

        let animationFrameId;

        const updateVectors = () => {
            if (!meshRefs.current || meshRefs.current.length === 0 || !bodiesRef.current) {
                animationFrameId = requestAnimationFrame(updateVectors);
                return;
            }

            const camera = cameraRef.current;
            const rect = mountRef.current.getBoundingClientRect();
            const newVectors = [];

            bodiesRef.current.forEach((body, i) => {
                if (!meshRefs.current[i]) return;

                // In cockpit mode, hide the vector for the body we're riding
                if (cameraMode === 'COCKPIT' && i === cameraTargetIdx) return;

                // Body position in screen coords
                const startPos = meshRefs.current[i].position.clone();
                startPos.project(camera);
                const startX = (startPos.x * 0.5 + 0.5) * rect.width;
                const startY = (-startPos.y * 0.5 + 0.5) * rect.height;

                // Velocity endpoint in world coords (scaled for visibility)
                const speed = Math.sqrt(body.vx ** 2 + body.vy ** 2 + body.vz ** 2);
                // const velScale = Math.min(50, speed * 30); // Original line, not used in diff

                // Create a 3D point offset by velocity
                const endWorld = meshRefs.current[i].position.clone();
                endWorld.x += body.vx * scale * 0.5;
                endWorld.y += body.vy * scale * 0.5;
                endWorld.z += body.vz * scale * 0.5;
                endWorld.project(camera);

                const endX = (endWorld.x * 0.5 + 0.5) * rect.width;
                const endY = (-endWorld.y * 0.5 + 0.5) * rect.height;

                // Only show if start point is in front of camera
                if (startPos.z < 1) {
                    newVectors.push({
                        startX, startY,
                        endX, endY,
                        color: body.color,
                        index: i,
                        speed: speed // Keep speed for text display
                    });
                }
            });

            setVectors(newVectors);
            animationFrameId = requestAnimationFrame(updateVectors);
        };

        animationFrameId = requestAnimationFrame(updateVectors);
        return () => cancelAnimationFrame(animationFrameId);
    }, [cameraRef, mountRef, meshRefs, bodiesRef, scale, cameraMode, cameraTargetIdx]);

    return (
        <svg className="absolute inset-0 pointer-events-none z-10 overflow-visible">
            <defs>
                {vectors.map(v => (
                    <marker
                        key={`arrow-${v.index}`}
                        id={`arrowhead-${v.index}`}
                        markerWidth="10"
                        markerHeight="7"
                        refX="9"
                        refY="3.5"
                        orient="auto"
                    >
                        <polygon
                            points="0 0, 10 3.5, 0 7"
                            fill={`#${v.color.toString(16).padStart(6, '0')}`}
                        />
                    </marker>
                ))}
            </defs>
            {vectors.map(v => (
                <g key={v.index}>
                    <line
                        x1={v.startX}
                        y1={v.startY}
                        x2={v.endX}
                        y2={v.endY}
                        stroke={`#${v.color.toString(16).padStart(6, '0')}`}
                        strokeWidth="2"
                        markerEnd={`url(#arrowhead-${v.index})`}
                        opacity="0.8"
                    />
                    <text
                        x={(v.startX + v.endX) / 2 + 10}
                        y={(v.startY + v.endY) / 2}
                        fill="white"
                        fontSize="10"
                        className="font-mono"
                    >
                        {v.speed.toFixed(2)}
                    </text>
                </g>
            ))}
        </svg>
    );
};
