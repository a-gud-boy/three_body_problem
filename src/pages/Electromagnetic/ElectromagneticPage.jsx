import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    Play, Pause, RotateCcw, Plus, Minus, Zap,
    Eye, Trash2, ChevronRight, ChevronLeft
} from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';

import {
    calculateTotalEnergy,
    calculateField
} from '../../utils/physicsUtils';
import './ElectromagneticPage.css';

// ============== CONSTANTS ==============
const CHARGE_RADIUS = 15;
const FIELD_LINE_SEGMENTS = 3000; // Increased length for closed loops
const FIELD_LINE_STEP = 6;

// ============== SCENARIOS ==============
const SCENARIOS = {
    DIPOLE: {
        name: "Electric Dipole",
        description: "Two opposite charges",
        charges: [
            { x: -60, y: 0, z: 0, q: 1 },
            { x: 60, y: 0, z: 0, q: -1 }
        ]
    },
    QUADRUPOLE: {
        name: "Quadrupole",
        description: "Four alternating charges",
        charges: [
            { x: -50, y: -50, z: 0, q: 1 },
            { x: 50, y: -50, z: 0, q: -1 },
            { x: 50, y: 50, z: 0, q: 1 },
            { x: -50, y: 50, z: 0, q: -1 }
        ]
    },
    LINEAR: {
        name: "Linear Array",
        description: "Five alternating charges",
        charges: [
            { x: -100, y: 0, z: 0, q: 1 },
            { x: -50, y: 0, z: 0, q: -1 },
            { x: 0, y: 0, z: 0, q: 1 },
            { x: 50, y: 0, z: 0, q: -1 },
            { x: 100, y: 0, z: 0, q: 1 }
        ]
    },
    CAPACITOR: {
        name: "Capacitor",
        description: "Parallel plate charges",
        charges: [
            { x: -80, y: 50, z: 0, q: 1 }, { x: -40, y: 50, z: 0, q: 1 },
            { x: 0, y: 50, z: 0, q: 1 }, { x: 40, y: 50, z: 0, q: 1 }, { x: 80, y: 50, z: 0, q: 1 },
            { x: -80, y: -50, z: 0, q: -1 }, { x: -40, y: -50, z: 0, q: -1 },
            { x: 0, y: -50, z: 0, q: -1 }, { x: 40, y: -50, z: 0, q: -1 }, { x: 80, y: -50, z: 0, q: -1 }
        ]
    },
    RING: {
        name: "Charge Ring",
        description: "Circular arrangement",
        charges: Array.from({ length: 12 }, (_, i) => ({
            x: Math.cos((i / 12) * Math.PI * 2) * 80,
            y: Math.sin((i / 12) * Math.PI * 2) * 80,
            z: 0,
            q: i % 2 === 0 ? 1 : -1
        }))
    },
    RANDOM: {
        name: "Random Cloud",
        description: "Random charges",
        charges: []
    }
};

function generateRandomCharges(count = 15) {
    return Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * 200,
        y: (Math.random() - 0.5) * 200,
        z: (Math.random() - 0.5) * 50,
        q: Math.random() > 0.5 ? 1 : -1
    }));
}

// ============== MAIN COMPONENT ==============

// Generate symmetric 3D spherical distribution of starting points
// Uses regular latitude-longitude pattern for symmetric appearance
function generateSpherePoints(count) {
    const points = [];
    // Calculate number of latitude bands
    const latBands = Math.max(2, Math.ceil(Math.sqrt(count)));
    const lonPoints = Math.ceil(count / latBands);

    for (let lat = 0; lat < latBands; lat++) {
        // Latitude from -PI/2 to PI/2 (avoiding exact poles for better distribution)
        const theta = ((lat + 0.5) / latBands) * Math.PI - Math.PI / 2;
        const cosTheta = Math.cos(theta);
        const sinTheta = Math.sin(theta);

        // Number of longitude points scales with latitude (fewer near poles)
        const numLon = Math.max(1, Math.round(lonPoints * cosTheta));

        for (let lon = 0; lon < numLon; lon++) {
            const phi = (lon / numLon) * Math.PI * 2;
            points.push({
                x: Math.cos(phi) * cosTheta,
                y: sinTheta,
                z: Math.sin(phi) * cosTheta
            });
        }
    }
    return points;
}

// Helper to trace a field line
// direction: 1 = follow field (from positive), -1 = against field (toward negative)
// terminateAt: 'negative', 'positive', or 'any'
function traceFieldLine(startPoint, direction, charges, terminateAt = 'any') {
    const points = [];
    let current = { ...startPoint };

    for (let step = 0; step < FIELD_LINE_SEGMENTS; step++) {
        points.push(new THREE.Vector3(current.x, current.y, current.z));

        const field = calculateField(current, charges);
        const mag = Math.sqrt(field.x ** 2 + field.y ** 2 + field.z ** 2);

        if (mag < 0.001) break; // Very weak field

        // Check if near target charge type (for termination)
        if (step > 5) {
            const nearTarget = charges.some(c => {
                const d = Math.sqrt((current.x - c.x) ** 2 + (current.y - c.y) ** 2 + (current.z - c.z) ** 2);
                if (d > CHARGE_RADIUS * 1.5) return false;
                if (terminateAt === 'negative') return c.q < 0;
                if (terminateAt === 'positive') return c.q > 0;
                return true; // 'any'
            });
            if (nearTarget) break;
        }

        // Smoother, consistent step size
        const stepSize = FIELD_LINE_STEP;
        current.x += direction * (field.x / mag) * stepSize;
        current.y += direction * (field.y / mag) * stepSize;
        current.z += direction * (field.z / mag) * stepSize;

        // Extended bounds for better coverage
        if (Math.abs(current.x) > 1000 || Math.abs(current.y) > 1000 || Math.abs(current.z) > 1000) break;
    }
    return points;
}

export default function ElectromagneticPage() {
    const [charges, setCharges] = useState(SCENARIOS.DIPOLE.charges);
    const [currentScenario, setCurrentScenario] = useState('DIPOLE');
    const [isRunning, setIsRunning] = useState(false);
    const [simSpeed, setSimSpeed] = useState(1);
    const [showFieldLines, setShowFieldLines] = useState(true);
    const [showForceVectors, setShowForceVectors] = useState(false);
    const [showGrid, setShowGrid] = useState(true);
    const [fieldLineDensity, setFieldLineDensity] = useState(16);
    const [interactionMode, setInteractionMode] = useState('view');
    const [isPanelOpen, setIsPanelOpen] = useState(true);
    const [stats, setStats] = useState({ totalEnergy: 0, time: 0 });
    const [sceneReady, setSceneReady] = useState(false);

    const mountRef = useRef(null);
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const rendererRef = useRef(null);
    const controlsRef = useRef(null);
    const composerRef = useRef(null);
    const frameIdRef = useRef(null);
    const chargeMeshesRef = useRef([]);
    const fieldLinesRef = useRef([]);
    const forceArrowsRef = useRef([]);
    const gridRef = useRef(null);
    const raycasterRef = useRef(new THREE.Raycaster());
    const mouseRef = useRef(new THREE.Vector2());

    // Real-time field line update
    const updateFieldLines = useCallback(() => {
        const scene = sceneRef.current;
        if (!scene || !showFieldLines) {
            // If hidden, clear lines
            fieldLinesRef.current.forEach(line => {
                scene.remove(line);
                line.geometry?.dispose();
                line.material?.dispose();
            });
            fieldLinesRef.current = [];
            return;
        }

        // Get current charges from meshes
        let currentCharges = chargeMeshesRef.current.map(mesh => ({
            x: mesh.position.x,
            y: mesh.position.y,
            z: mesh.position.z,
            q: mesh.userData.charge
        }));

        // Fallback to state if meshes not ready (though meshes should be ready if scene is)
        if (currentCharges.length === 0 && charges.length > 0) {
             currentCharges = charges;
        }

        // Remove old field lines
        fieldLinesRef.current.forEach(line => {
            scene.remove(line);
            line.geometry?.dispose();
            line.material?.dispose();
        });
        fieldLinesRef.current = [];

        const positiveCharges = currentCharges.filter(c => c.q > 0);
        const negativeCharges = currentCharges.filter(c => c.q < 0);

        // Field lines from positive charges (outward)
        positiveCharges.forEach(charge => {
            const linesPerCharge = Math.ceil(fieldLineDensity * Math.abs(charge.q));
            const spherePoints = generateSpherePoints(linesPerCharge);
            const startOffset = CHARGE_RADIUS * 1.5;

            spherePoints.forEach(sp => {
                const startPoint = {
                    x: charge.x + sp.x * startOffset,
                    y: charge.y + sp.y * startOffset,
                    z: charge.z + sp.z * startOffset
                };

                const points = traceFieldLine(startPoint, 1, currentCharges, 'negative');

                if (points.length > 2) {
                    const geometry = new THREE.BufferGeometry().setFromPoints(points);
                    const colors = [];
                    for (let j = 0; j < points.length; j++) {
                        const t = j / points.length;
                        colors.push(1, 0.4 + t * 0.4, t * 0.4); // Orange to yellow gradient
                    }
                    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

                    const material = new THREE.LineBasicMaterial({
                        vertexColors: true,
                        transparent: true,
                        opacity: 0.6
                    });

                    const line = new THREE.Line(geometry, material);
                    scene.add(line);
                    fieldLinesRef.current.push(line);

                    // Add direction cones
                    const arrowInterval = Math.floor(points.length / 3);
                    for (let arrowIdx = arrowInterval; arrowIdx < points.length - 1; arrowIdx += arrowInterval) {
                        const p1 = points[arrowIdx];
                        const p2 = points[Math.min(arrowIdx + 2, points.length - 1)];
                        const direction = new THREE.Vector3(p2.x - p1.x, p2.y - p1.y, p2.z - p1.z).normalize();

                        const coneGeom = new THREE.ConeGeometry(2.5, 6, 6);
                        const coneMat = new THREE.MeshBasicMaterial({ color: 0xffaa44 });
                        const cone = new THREE.Mesh(coneGeom, coneMat);
                        cone.position.copy(p1);

                        const up = new THREE.Vector3(0, 1, 0);
                        const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);
                        cone.setRotationFromQuaternion(quaternion);

                        scene.add(cone);
                        fieldLinesRef.current.push(cone);
                    }
                }
            });
        });

        // Incoming field lines TO negative charges (traced backwards)
        negativeCharges.forEach(charge => {
            const linesPerCharge = Math.ceil(fieldLineDensity * Math.abs(charge.q));
            const spherePoints = generateSpherePoints(linesPerCharge);
            const startOffset = CHARGE_RADIUS * 1.5;

            spherePoints.forEach(sp => {
                const startPoint = {
                    x: charge.x + sp.x * startOffset,
                    y: charge.y + sp.y * startOffset,
                    z: charge.z + sp.z * startOffset
                };

                // Trace field line backwards toward negative charge
                const points = traceFieldLine(startPoint, -1, currentCharges, 'positive');

                if (points.length > 2) {
                    // Check redundancy
                    const lastPoint = points[points.length - 1];
                    const hitPositive = positiveCharges.some(p => {
                        const dx = lastPoint.x - p.x;
                        const dy = lastPoint.y - p.y;
                        const dz = lastPoint.z - p.z;
                        return (dx*dx + dy*dy + dz*dz) < (CHARGE_RADIUS * 2.5) ** 2;
                    });
                    if (hitPositive) return;

                    points.reverse();

                    const geometry = new THREE.BufferGeometry().setFromPoints(points);
                    const colors = [];
                    for (let j = 0; j < points.length; j++) {
                        const t = j / points.length;
                        colors.push(1, 0.4 + t * 0.4, t * 0.4);
                    }
                    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

                    const material = new THREE.LineBasicMaterial({
                        vertexColors: true,
                        transparent: true,
                        opacity: 0.6
                    });

                    const line = new THREE.Line(geometry, material);
                    scene.add(line);
                    fieldLinesRef.current.push(line);

                    // Direction cones
                    const arrowInterval = Math.floor(points.length / 3);
                    for (let arrowIdx = arrowInterval; arrowIdx < points.length - 1; arrowIdx += arrowInterval) {
                        const p1 = points[arrowIdx];
                        const p2 = points[Math.min(arrowIdx + 2, points.length - 1)];
                        const direction = new THREE.Vector3(p2.x - p1.x, p2.y - p1.y, p2.z - p1.z).normalize();

                        const coneGeom = new THREE.ConeGeometry(2.5, 6, 6);
                        const coneMat = new THREE.MeshBasicMaterial({ color: 0xffaa44 });
                        const cone = new THREE.Mesh(coneGeom, coneMat);
                        cone.position.copy(p1);

                        const up = new THREE.Vector3(0, 1, 0);
                        const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);
                        cone.setRotationFromQuaternion(quaternion);

                        scene.add(cone);
                        fieldLinesRef.current.push(cone);
                    }
                }
            });
        });

    }, [charges, showFieldLines, fieldLineDensity]);


    // Scene setup - runs once
    useEffect(() => {
        if (!mountRef.current) return;

        // Clean up any existing canvas (handles React StrictMode double-mount)
        const existingCanvas = mountRef.current.querySelector('canvas');
        if (existingCanvas) {
            mountRef.current.removeChild(existingCanvas);
        }

        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight;

        // Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0a1a);
        sceneRef.current = scene;

        // Camera
        const camera = new THREE.PerspectiveCamera(60, width / height, 1, 2000);
        camera.position.set(0, 0, 300);
        camera.lookAt(0, 0, 0);
        cameraRef.current = camera;

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        mountRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controlsRef.current = controls;

        // Lighting
        scene.add(new THREE.AmbientLight(0xffffff, 0.5));
        const pointLight = new THREE.PointLight(0xffffff, 1);
        pointLight.position.set(200, 200, 200);
        scene.add(pointLight);

        // Post-processing
        const composer = new EffectComposer(renderer);
        composer.addPass(new RenderPass(scene, camera));
        composer.addPass(new UnrealBloomPass(new THREE.Vector2(width, height), 0.5, 0.3, 0.8));
        composerRef.current = composer;

        // Grid
        const grid = new THREE.GridHelper(400, 20, 0x333355, 0x222244);
        grid.rotation.x = Math.PI / 2;
        grid.position.z = -20;
        scene.add(grid);
        gridRef.current = grid;

        // Handle resize
        const handleResize = () => {
            if (!mountRef.current) return;
            const w = mountRef.current.clientWidth;
            const h = mountRef.current.clientHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
            composer.setSize(w, h);
        };
        window.addEventListener('resize', handleResize);

        // Animation loop
        const animate = () => {
            frameIdRef.current = requestAnimationFrame(animate);
            controls.update();
            composer.render();
        };
        animate();

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSceneReady(true);
        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(frameIdRef.current);
            controls.dispose();
            renderer.dispose();
            if (mountRef.current && renderer.domElement.parentNode) {
                mountRef.current.removeChild(renderer.domElement);
            }
        };
    }, []);


    // Update charge meshes when charges change
    useEffect(() => {
        const scene = sceneRef.current;
        if (!scene || !sceneReady) return;

        // Remove old charge meshes
        chargeMeshesRef.current.forEach(mesh => {
            scene.remove(mesh);
            mesh.geometry?.dispose();
            mesh.material?.dispose();
        });
        chargeMeshesRef.current = [];

        // Create new charge meshes
        charges.forEach((charge, index) => {
            const radius = CHARGE_RADIUS * Math.pow(Math.abs(charge.q), 0.3);
            const geometry = new THREE.SphereGeometry(radius, 32, 32);
            const color = charge.q > 0 ? 0xff4444 : 0x4488ff;
            const material = new THREE.MeshStandardMaterial({
                color,
                emissive: color,
                emissiveIntensity: 0.6,
                roughness: 0.3,
                metalness: 0.2
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(charge.x, charge.y, charge.z);
            mesh.userData = { index, charge: charge.q };
            scene.add(mesh);
            chargeMeshesRef.current.push(mesh);
        });
    }, [charges, sceneReady]);


    useEffect(() => {
        updateFieldLines();
    }, [updateFieldLines]);


    // Update force vectors
    useEffect(() => {
        const scene = sceneRef.current;
        if (!scene || !sceneReady) return;

        // Remove old arrows
        forceArrowsRef.current.forEach(arrow => {
            scene.remove(arrow);
            if (arrow.dispose) arrow.dispose();
        });
        forceArrowsRef.current = [];

        if (!showForceVectors) return;

        // Get current positions from meshes if available, otherwise use charge state
        const positions = chargeMeshesRef.current.length > 0
            ? chargeMeshesRef.current.map(m => m ? { x: m.position.x, y: m.position.y, z: m.position.z } : null)
            : charges.map(c => ({ x: c.x, y: c.y, z: c.z }));

        // Create a clean array of charges for calculation
        const validCharges = positions.map((p, index) =>
            p ? { ...p, q: charges[index].q } : null
        ).filter(c => c !== null);

        charges.forEach((charge, i) => {
            if (!positions[i]) return;

            // Calculate field at this position from all other charges
            // Using minDistance = 1 to match original logic
            const field = calculateField(positions[i], validCharges, 1);

            // F = qE
            const fx = field.x * charge.q;
            const fy = field.y * charge.q;
            const fz = field.z * charge.q;

            const forceMag = Math.sqrt(fx * fx + fy * fy + fz * fz);
            if (forceMag < 0.005) return; // Lower threshold to show more arrows

            const dir = new THREE.Vector3(fx, fy, fz).normalize();
            const length = Math.min(100, Math.max(30, forceMag * 0.6)); // Increased size for visibility
            const color = charge.q > 0 ? 0xffaa00 : 0x00aaff;

            const arrow = new THREE.ArrowHelper(
                dir,
                new THREE.Vector3(positions[i].x, positions[i].y, positions[i].z),
                length, color, length * 0.3, length * 0.25 // Larger/wider head for visibility
            );
            scene.add(arrow);
            forceArrowsRef.current.push(arrow);
        });
    }, [charges, showForceVectors, sceneReady]);

    // Grid visibility
    useEffect(() => {
        if (gridRef.current) gridRef.current.visible = showGrid;
    }, [showGrid]);

    // Physics simulation - updates positions directly on meshes
    useEffect(() => {
        if (!isRunning) return;

        let frameCount = 0;
        let lastTime = performance.now();
        let animId;

        const simulate = () => {
            const now = performance.now();
            const dt = ((now - lastTime) / 1000) * simSpeed;
            lastTime = now;

            const meshes = chargeMeshesRef.current;

            // Snapshot of current charges for consistent force calculation
            const currentCharges = meshes
                .filter(m => m && m.visible !== false)
                .map(m => ({
                    x: m.position.x,
                    y: m.position.y,
                    z: m.position.z,
                    q: m.userData.charge
                }));

            // Update positions directly on the existing mesh positions
            meshes.forEach((mesh, i) => {
                if (!mesh) return;
                const chargeQ = mesh.userData.charge;
                if (chargeQ === undefined) return;

                // Calculate electric field at this position from all charges
                const field = calculateField(mesh.position, currentCharges, CHARGE_RADIUS * 2);

                // F = qE
                const fx = field.x * chargeQ;
                const fy = field.y * chargeQ;
                const fz = field.z * chargeQ;

                // Update velocity (stored in userData)
                // INCREASED FORCE FACTOR for visibility:
                mesh.userData.vx = (mesh.userData.vx || 0) + fx * dt * 50.0;
                mesh.userData.vy = (mesh.userData.vy || 0) + fy * dt * 50.0;
                mesh.userData.vz = (mesh.userData.vz || 0) + fz * dt * 50.0;

                const damping = 0.98; // Slightly more damping
                mesh.userData.vx *= damping;
                mesh.userData.vy *= damping;
                mesh.userData.vz *= damping;

                // Update position
                mesh.position.x += mesh.userData.vx * dt;
                mesh.position.y += mesh.userData.vy * dt;
                mesh.position.z += mesh.userData.vz * dt;
            });

            frameCount++;
            if (frameCount % 2 === 0) { // Update every 2nd frame
                updateFieldLines();
            }

            setStats(prev => {
                let energy = prev.totalEnergy;
                if (frameCount % 10 === 0) {
                    const currentCharges = meshes.map(m => ({
                        x: m.position.x,
                        y: m.position.y,
                        z: m.position.z,
                        q: m.userData.charge
                    }));
                    energy = calculateTotalEnergy(currentCharges);
                }
                return { ...prev, totalEnergy: energy, time: prev.time + dt };
            });
            animId = requestAnimationFrame(simulate);
        };

        simulate();
        return () => cancelAnimationFrame(animId);
    }, [isRunning, simSpeed, updateFieldLines]);

    // Actions
    const loadScenario = useCallback((key) => {
        setCurrentScenario(key);
        setIsRunning(false);
        setStats({ totalEnergy: 0, time: 0 });
        if (key === 'RANDOM') {
            setCharges(generateRandomCharges());
        } else {
            setCharges(SCENARIOS[key].charges.map(c => ({ ...c, vx: 0, vy: 0, vz: 0 })));
        }
    }, []);

    const handleCanvasClick = useCallback((event) => {
        if (!mountRef.current || !cameraRef.current || interactionMode === 'view') return;

        const rect = mountRef.current.getBoundingClientRect();
        mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

        if (interactionMode === 'add') {
            const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
            const intersection = new THREE.Vector3();
            raycasterRef.current.ray.intersectPlane(plane, intersection);
            if (intersection) {
                setCharges(prev => [...prev, {
                    x: intersection.x,
                    y: intersection.y,
                    z: 0,
                    q: event.shiftKey ? -1 : 1,
                    vx: 0, vy: 0, vz: 0
                }]);
            }
        } else if (interactionMode === 'remove') {
            const intersects = raycasterRef.current.intersectObjects(chargeMeshesRef.current);
            if (intersects.length > 0) {
                const index = intersects[0].object.userData.index;
                setCharges(prev => prev.filter((_, i) => i !== index));
            }
        }
    }, [interactionMode]);

    return (
        <div className="em-page">
            <div className="em-canvas" ref={mountRef} onClick={handleCanvasClick} />

            {/* Header */}
            <div className="em-header">
                <Link to="/three_body_problem" className="em-back-link">
                    <ChevronLeft size={18} />
                    <span>Home</span>
                </Link>
                <h1 className="em-title">
                    <Zap className="em-title-icon" />
                    Electromagnetic Fields
                </h1>
                <p className="em-subtitle">Interactive Electric Field Visualization</p>
            </div>

            {/* Stats */}
            <div className="em-stats">
                <div className="em-stat">
                    <span className="em-stat-label">Charges</span>
                    <span className="em-stat-value">{charges.length}</span>
                </div>
                <div className="em-stat">
                    <span className="em-stat-label">Energy</span>
                    <span className="em-stat-value">{stats.totalEnergy.toFixed(1)} J</span>
                </div>
                <div className="em-stat">
                    <span className="em-stat-label">Time</span>
                    <span className="em-stat-value">{stats.time.toFixed(2)} s</span>
                </div>
            </div>

            {/* Panel Toggle */}
            <button className="em-panel-toggle" onClick={() => setIsPanelOpen(!isPanelOpen)}>
                {isPanelOpen ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>

            {/* Side Panel */}
            <div className={`em-panel ${isPanelOpen ? 'open' : ''}`}>
                <div className="em-panel-section">
                    <h3 className="em-section-title">Scenarios</h3>
                    <div className="em-scenarios-grid">
                        {Object.entries(SCENARIOS).map(([key, scenario]) => (
                            <button
                                key={key}
                                className={`em-scenario-btn ${currentScenario === key ? 'active' : ''}`}
                                onClick={() => loadScenario(key)}
                            >
                                {scenario.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="em-panel-section">
                    <h3 className="em-section-title">Visualization</h3>
                    <div className="em-toggle-group">
                        <label className="em-toggle">
                            <input type="checkbox" checked={showFieldLines} onChange={(e) => setShowFieldLines(e.target.checked)} />
                            <span>Field Lines</span>
                        </label>
                        <label className="em-toggle">
                            <input type="checkbox" checked={showForceVectors} onChange={(e) => setShowForceVectors(e.target.checked)} />
                            <span>Force Vectors</span>
                        </label>
                        <label className="em-toggle">
                            <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
                            <span>Grid</span>
                        </label>
                    </div>
                    {showFieldLines && (
                        <div className="em-slider-group">
                            <label>Density</label>
                            <input type="range" min="16" max="64" value={fieldLineDensity} onChange={(e) => setFieldLineDensity(Number(e.target.value))} />
                            <span>{fieldLineDensity}</span>
                        </div>
                    )}
                </div>

                <div className="em-panel-section">
                    <h3 className="em-section-title">Interaction</h3>
                    <div className="em-mode-buttons">
                        <button className={`em-mode-btn ${interactionMode === 'view' ? 'active' : ''}`} onClick={() => setInteractionMode('view')}>
                            <Eye size={18} />View
                        </button>
                        <button className={`em-mode-btn ${interactionMode === 'add' ? 'active' : ''}`} onClick={() => setInteractionMode('add')}>
                            <Plus size={18} />Add
                        </button>
                        <button className={`em-mode-btn ${interactionMode === 'remove' ? 'active' : ''}`} onClick={() => setInteractionMode('remove')}>
                            <Minus size={18} />Remove
                        </button>
                    </div>
                    {interactionMode === 'add' && <p className="em-hint">Click to add +. Shift+click for -.</p>}
                </div>

                <div className="em-panel-section">
                    <h3 className="em-section-title">Actions</h3>
                    <button className="em-action-btn danger" onClick={() => setCharges([])}>
                        <Trash2 size={16} />Clear All
                    </button>
                </div>
            </div>

            {/* Controls */}
            <div className="em-controls">
                <button className="em-control-btn primary" onClick={() => setIsRunning(!isRunning)}>
                    {isRunning ? <Pause size={20} /> : <Play size={20} />}
                </button>
                <button className="em-control-btn" onClick={() => loadScenario(currentScenario)}>
                    <RotateCcw size={20} />
                </button>
                <div className="em-divider" />
                <div className="em-speed-control">
                    <span>Speed</span>
                    <input type="range" min="0.1" max="3" step="0.1" value={simSpeed} onChange={(e) => setSimSpeed(Number(e.target.value))} />
                    <span>{simSpeed.toFixed(1)}x</span>
                </div>
            </div>

            {/* Legend */}
            <div className="em-legend">
                <div className="em-legend-item">
                    <span className="em-legend-dot positive" />
                    <span>Positive (+)</span>
                </div>
                <div className="em-legend-item">
                    <span className="em-legend-dot negative" />
                    <span>Negative (-)</span>
                </div>
            </div>
        </div>
    );
}
