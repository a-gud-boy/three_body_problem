import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import {
    Fn, storage, float, vec3, instanceIndex,
    positionLocal
} from 'three/tsl';
import { WebGPURenderer, StorageBufferAttribute, MeshStandardNodeMaterial } from 'three/webgpu';

// ── Simulation Constants ──
const PARTICLE_COUNT = 5000;
const RADIUS = 2.5;
const CELL_SIZE = RADIUS * 2.5;
const SIM_WIDTH = 600;
const SIM_HEIGHT = 400;
const GRID_COLS = Math.ceil(SIM_WIDTH / CELL_SIZE);
const GRID_ROWS = Math.ceil(SIM_HEIGHT / CELL_SIZE);
const MAX_PER_CELL = 8;
const DT = 0.002;
const SUBSTEPS = 6;

export default React.memo(function GasContainer({ paused, demonMode, pistonPosition, onStatsUpdate }) {
    const canvasRef = useRef(null);
    const rendererRef = useRef(null);
    const propsRef = useRef({ paused, demonMode, pistonPosition, onStatsUpdate });

    useEffect(() => {
        propsRef.current = { paused, demonMode, pistonPosition, onStatsUpdate };
    }, [paused, demonMode, pistonPosition, onStatsUpdate]);

    useEffect(() => {
        if (!canvasRef.current) return;
        let disposed = false;

        // ── CPU-side data ──
        const px = new Float32Array(PARTICLE_COUNT);
        const py = new Float32Array(PARTICLE_COUNT);
        const vx = new Float32Array(PARTICLE_COUNT);
        const vy = new Float32Array(PARTICLE_COUNT);
        const gpuPos = new Float32Array(PARTICLE_COUNT * 4);  // vec4: x, y, 0, 0
        const gpuCol = new Float32Array(PARTICLE_COUNT * 4);  // vec4: r, g, b, a
        const gridCount = new Uint32Array(GRID_COLS * GRID_ROWS);
        const gridCells = new Uint32Array(GRID_COLS * GRID_ROWS * MAX_PER_CELL);

        // Init
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            px[i] = RADIUS + Math.random() * (SIM_WIDTH - 2 * RADIUS);
            py[i] = RADIUS + Math.random() * (SIM_HEIGHT - 2 * RADIUS);
            const angle = Math.random() * Math.PI * 2;
            const speed = 40 + Math.random() * 120;
            vx[i] = Math.cos(angle) * speed;
            vy[i] = Math.sin(angle) * speed;
        }

        // ── Scene ──
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x020617);

        const PADDING = 20;
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
        camera.position.set(SIM_WIDTH / 2, SIM_HEIGHT / 2, 100);
        camera.lookAt(SIM_WIDTH / 2, SIM_HEIGHT / 2, 0);

        function updateCamera(w, h) {
            const canvasAspect = w / h;
            const simAspect = SIM_WIDTH / SIM_HEIGHT;
            let halfW, halfH;
            if (canvasAspect > simAspect) {
                // Canvas is wider — fit height, expand width
                halfH = SIM_HEIGHT / 2 + PADDING;
                halfW = halfH * canvasAspect;
            } else {
                // Canvas is taller — fit width, expand height
                halfW = SIM_WIDTH / 2 + PADDING;
                halfH = halfW / canvasAspect;
            }
            camera.left = -halfW;
            camera.right = halfW;
            camera.top = halfH;
            camera.bottom = -halfH;
            camera.updateProjectionMatrix();
        }

        const renderer = new WebGPURenderer({ canvas: canvasRef.current, antialias: true });
        const initW = canvasRef.current.clientWidth;
        const initH = canvasRef.current.clientHeight;
        renderer.setSize(initW, initH);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        updateCamera(initW, initH);
        rendererRef.current = renderer;

        // ── GPU Buffers (for rendering only) ──
        const posAttr = new StorageBufferAttribute(gpuPos, 4);
        const colAttr = new StorageBufferAttribute(gpuCol, 4);
        const posStorage = storage(posAttr, 'vec4', PARTICLE_COUNT);
        const colStorage = storage(colAttr, 'vec4', PARTICLE_COUNT);

        // ── Instanced Mesh ──
        const geometry = new THREE.CircleGeometry(RADIUS, 8);
        const material = new MeshStandardNodeMaterial();
        material.emissiveNode = Fn(() => {
            const idx = instanceIndex.toUint();
            const c = colStorage.element(idx);
            return vec3(c.x, c.y, c.z);
        })();
        material.colorNode = Fn(() => {
            const idx = instanceIndex.toUint();
            const c = colStorage.element(idx);
            return vec3(c.x, c.y, c.z);
        })();
        material.positionNode = Fn(() => {
            const idx = instanceIndex.toUint();
            const p = posStorage.element(idx);
            return positionLocal.add(vec3(p.x, p.y, float(0)));
        })();

        const mesh = new THREE.InstancedMesh(geometry, material, PARTICLE_COUNT);
        mesh.frustumCulled = false;
        scene.add(mesh);

        // Wall outline
        const wallMat = new THREE.LineBasicMaterial({ color: 0x475569 });
        const wallPts = [
            new THREE.Vector3(0, 0, 0), new THREE.Vector3(SIM_WIDTH, 0, 0),
            new THREE.Vector3(SIM_WIDTH, SIM_HEIGHT, 0), new THREE.Vector3(0, SIM_HEIGHT, 0),
            new THREE.Vector3(0, 0, 0),
        ];
        const wallGeo = new THREE.BufferGeometry().setFromPoints(wallPts);
        scene.add(new THREE.Line(wallGeo, wallMat));

        scene.add(new THREE.AmbientLight(0xffffff, 2.0));

        // ── CPU Physics ──
        function buildGrid() {
            gridCount.fill(0);
            for (let i = 0; i < PARTICLE_COUNT; i++) {
                const cx = Math.min(Math.max(Math.floor(px[i] / CELL_SIZE), 0), GRID_COLS - 1);
                const cy = Math.min(Math.max(Math.floor(py[i] / CELL_SIZE), 0), GRID_ROWS - 1);
                const cellIdx = cy * GRID_COLS + cx;
                const s = gridCount[cellIdx];
                if (s < MAX_PER_CELL) {
                    gridCells[cellIdx * MAX_PER_CELL + s] = i;
                    gridCount[cellIdx] = s + 1;
                }
            }
        }

        function stepPhysics(pistonX, isDemon) {
            const minDist = RADIUS * 2;
            const minDist2 = minDist * minDist;
            const midX = SIM_WIDTH * 0.5;
            const gateY0 = SIM_HEIGHT * 0.35;
            const gateY1 = SIM_HEIGHT * 0.65;

            for (let i = 0; i < PARTICLE_COUNT; i++) {
                // Integrate
                px[i] += vx[i] * DT;
                py[i] += vy[i] * DT;

                // Wall collisions
                if (px[i] < RADIUS) { px[i] = RADIUS; vx[i] = Math.abs(vx[i]); }
                if (px[i] > pistonX - RADIUS) { px[i] = pistonX - RADIUS; vx[i] = -Math.abs(vx[i]); }
                if (py[i] < RADIUS) { py[i] = RADIUS; vy[i] = Math.abs(vy[i]); }
                if (py[i] > SIM_HEIGHT - RADIUS) { py[i] = SIM_HEIGHT - RADIUS; vy[i] = -Math.abs(vy[i]); }

                // Demon gate
                if (isDemon) {
                    const nearMid = Math.abs(px[i] - midX) < RADIUS * 3;
                    if (nearMid) {
                        const speed2 = vx[i] * vx[i] + vy[i] * vy[i];
                        const isHot = speed2 > 12000;
                        const inGate = py[i] > gateY0 && py[i] < gateY1;
                        if (inGate) {
                            const goingRight = vx[i] > 0;
                            const goingLeft = vx[i] < 0;
                            const canPass = (goingRight && isHot) || (goingLeft && !isHot);
                            if (!canPass) { vx[i] = -vx[i]; }
                        } else {
                            // Wall blocks passage outside gate
                            if (px[i] < midX && vx[i] > 0) { px[i] = midX - RADIUS * 3; vx[i] = -Math.abs(vx[i]); }
                            if (px[i] > midX && vx[i] < 0) { px[i] = midX + RADIUS * 3; vx[i] = Math.abs(vx[i]); }
                        }
                    }
                }
            }

            // Grid-based collisions
            buildGrid();

            for (let i = 0; i < PARTICLE_COUNT; i++) {
                const cx = Math.min(Math.max(Math.floor(px[i] / CELL_SIZE) | 0, 0), GRID_COLS - 1);
                const cy = Math.min(Math.max(Math.floor(py[i] / CELL_SIZE) | 0, 0), GRID_ROWS - 1);

                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const nx = cx + dx;
                        const ny = cy + dy;
                        if (nx < 0 || nx >= GRID_COLS || ny < 0 || ny >= GRID_ROWS) continue;
                        const cellIdx = ny * GRID_COLS + nx;
                        const cnt = gridCount[cellIdx];
                        for (let k = 0; k < cnt; k++) {
                            const j = gridCells[cellIdx * MAX_PER_CELL + k];
                            if (j <= i) continue; // Avoid duplicates

                            const ddx = px[i] - px[j];
                            const ddy = py[i] - py[j];
                            const d2 = ddx * ddx + ddy * ddy;
                            if (d2 < minDist2 && d2 > 0.0001) {
                                const d = Math.sqrt(d2);
                                const nx_ = ddx / d;
                                const ny_ = ddy / d;

                                // Relative velocity along collision normal
                                const dvx = vx[i] - vx[j];
                                const dvy = vy[i] - vy[j];
                                const vn = dvx * nx_ + dvy * ny_;

                                if (vn < 0) {
                                    // Elastic collision (equal mass)
                                    vx[i] -= vn * nx_;
                                    vy[i] -= vn * ny_;
                                    vx[j] += vn * nx_;
                                    vy[j] += vn * ny_;

                                    // Separate overlapping particles
                                    const overlap = (minDist - d) * 0.5;
                                    px[i] += nx_ * overlap;
                                    py[i] += ny_ * overlap;
                                    px[j] -= nx_ * overlap;
                                    py[j] -= ny_ * overlap;
                                }
                            }
                        }
                    }
                }
            }
        }

        // Upload positions/colors to GPU
        function uploadToGPU() {
            for (let i = 0; i < PARTICLE_COUNT; i++) {
                const i4 = i * 4;
                gpuPos[i4] = px[i];
                gpuPos[i4 + 1] = py[i];
                gpuPos[i4 + 2] = 0;
                gpuPos[i4 + 3] = 0;

                const speed = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i]);
                const t = Math.min(speed / 300, 1);
                gpuCol[i4] = 0.1 + 0.9 * t;       // R
                gpuCol[i4 + 1] = 0.3 - 0.15 * t;  // G
                gpuCol[i4 + 2] = 1.0 - 0.9 * t;   // B
                gpuCol[i4 + 3] = 1.0;              // A
            }
            posAttr.array.set(gpuPos);
            posAttr.needsUpdate = true;
            colAttr.array.set(gpuCol);
            colAttr.needsUpdate = true;
        }

        // ── Stats ──
        function computeStats(pistonX) {
            let totalKE = 0;
            let totalImpulse = 0;
            const speedBins = new Array(20).fill(0);

            for (let i = 0; i < PARTICLE_COUNT; i++) {
                const s = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i]);
                totalKE += 0.5 * s * s;
                const bin = Math.min(Math.floor(s / 25), 19);
                speedBins[bin]++;
                if (px[i] < RADIUS * 3 || px[i] > pistonX - RADIUS * 3) {
                    totalImpulse += Math.abs(vx[i]);
                }
            }

            const temperature = totalKE / PARTICLE_COUNT * 0.01;
            const volume = propsRef.current.pistonPosition;
            const perimeter = 2 * (pistonX + SIM_HEIGHT);
            const pressure = totalImpulse / perimeter * 0.1;
            const speedDistribution = speedBins.map((count, i) => ({ speed: i * 25, count }));

            return { temperature, pressure, volume, speedDistribution };
        }

        // ── Main Loop ──
        let frameId;
        let statsCounter = 0;

        const animate = () => {
            if (disposed) return;
            const { paused: isPaused, pistonPosition: piston, demonMode: demon } = propsRef.current;

            if (!isPaused) {
                const pistonX = (piston / 100) * SIM_WIDTH;
                for (let s = 0; s < SUBSTEPS; s++) {
                    stepPhysics(pistonX, demon);
                }

                uploadToGPU();

                statsCounter++;
                if (statsCounter >= 6) {
                    statsCounter = 0;
                    propsRef.current.onStatsUpdate(computeStats(pistonX));
                }
            }

            renderer.render(scene, camera);
            frameId = requestAnimationFrame(animate);
        };

        renderer.init().then(() => {
            if (!disposed) {
                uploadToGPU();
                animate();
            }
        });

        // ── Resize ──
        const handleResize = () => {
            if (rendererRef.current && canvasRef.current) {
                const w = canvasRef.current.clientWidth;
                const h = canvasRef.current.clientHeight;
                rendererRef.current.setSize(w, h);
                updateCamera(w, h);
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            disposed = true;
            cancelAnimationFrame(frameId);
            window.removeEventListener('resize', handleResize);
            renderer.dispose();
            geometry.dispose();
            material.dispose();
            wallGeo.dispose();
            wallMat.dispose();
            rendererRef.current = null;
        };
    }, []);

    return <canvas ref={canvasRef} className="w-full h-full block" />;
});
