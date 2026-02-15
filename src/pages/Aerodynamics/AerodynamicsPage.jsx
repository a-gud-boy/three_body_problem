import { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
    Fn, uniform, storage, float, int, vec4,
    instanceIndex, positionGeometry
} from 'three/tsl';
import { WebGPURenderer, StorageBufferAttribute, MeshBasicNodeMaterial } from 'three/webgpu';
import { Link } from 'react-router-dom';
import { ArrowLeft, Play, Pause, RotateCcw, AlertCircle, Paintbrush, Eraser } from 'lucide-react';
import './AerodynamicsPage.css';

// ─── D2Q9 lattice constants ───
// Directions: 0=rest, 1=E, 2=N, 3=W, 4=S, 5=NE, 6=NW, 7=SW, 8=SE
const W = [4 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 36, 1 / 36, 1 / 36, 1 / 36];
const CX = [0, 1, 0, -1, 0, 1, -1, -1, 1];
const CY = [0, 0, 1, 0, -1, 1, 1, -1, -1];

const GRID_OPTIONS = [
    { label: '256×256', value: 256 },
    { label: '512×512', value: 512 },
    { label: '768×768', value: 768 },
];

const VIZ_MODES = [
    { label: 'Vorticity', value: 'vorticity' },
    { label: 'Speed', value: 'speed' },
    { label: 'Pressure', value: 'pressure' },
];

const PRESET_SHAPES = [
    { label: '⬤ Circle', value: 'circle' },
    { label: '■ Square', value: 'square' },
    { label: '✈ Airfoil', value: 'airfoil' },
    { label: '| Plate', value: 'plate' },
];

// ════════════════════════════════════════════════════════════════════════
// Equilibrium helper (CPU side, for initialization)
// ════════════════════════════════════════════════════════════════════════
function feq(i, rho, ux, uy) {
    const cu = CX[i] * ux + CY[i] * uy;
    const usq = ux * ux + uy * uy;
    return W[i] * rho * (1.0 + 3.0 * cu + 4.5 * cu * cu - 1.5 * usq);
}

// ════════════════════════════════════════════════════════════════════════
// WebGPU LBM Wind Tunnel Engine
// ════════════════════════════════════════════════════════════════════════
//
// Buffer packing (to stay within the 8 storage-buffer-per-stage limit):
//   fPack0 = vec4(f0, f1, f2, f3)   – distributions 0-3
//   fPack1 = vec4(f4, f5, f6, f7)   – distributions 4-7
//   fPack2 = vec4(f8, ρ,  ux, uy)   – distribution 8 + macroscopic output
//
// Ping-pong: A (read) → B (write), then swap B→A.
//
// Max bindings per compute pass:
//   Inlet:  3 (fA0,fA1,fA2 r/w)
//   LBM:    7 (fA0-2 read, fB0-2 write, obstacle read)
//   Swap:   6 (fB0-2 read, fA0-2 write)
//   Brush:  1 (obstacle r/w)
//   Viz:    2 (fA2 read, obstacle read)   – fragment stage
// ════════════════════════════════════════════════════════════════════════
class WebGPUWindTunnel {
    constructor(canvas, params, gridSize, onReady) {
        this.canvas = canvas;
        this.params = { ...params };
        this.gridSize = gridSize;
        this.count = gridSize * gridSize;
        this.onReady = onReady;
        this.isRunning = true;
        this.animationId = null;
        this.initialized = false;
        this.disposed = false;

        this.drawMode = 0;
        this.brushGridPos = { x: -1000, y: -1000 };

        this.init();
    }

    async init() {
        try {
            if (this.disposed) return;
            if (!navigator.gpu) throw new Error('WebGPU is not supported in this browser.');

            this.renderer = new WebGPURenderer({ canvas: this.canvas, antialias: false });
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.resize(this.canvas.clientWidth, this.canvas.clientHeight);
            await this.renderer.init();

            if (!this.renderer.backend.isWebGPUBackend) {
                throw new Error('WebGPU backend did not initialize.');
            }
            if (this.disposed) return;

            this.scene = new THREE.Scene();
            this.camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.01, 10);
            this.camera.position.z = 1;

            this.setupBuffers();
            this.setupInletCompute();
            this.setupLBMCompute();
            this.setupSwapCompute();
            this.setupBrushCompute();
            this.setupVisualization();
            this.initEquilibrium();

            this.initialized = true;
            if (this.onReady) this.onReady(null);
            this.animate();
        } catch (error) {
            console.error('Wind Tunnel Init Error:', error);
            if (this.onReady) this.onReady(error);
        }
    }

    // ── Buffers ──
    setupBuffers() {
        const n = this.count;

        // Distribution buffers: 3 vec4 × 2 (ping-pong)
        this.packA0Buf = new StorageBufferAttribute(new Float32Array(n * 4), 4);
        this.packA1Buf = new StorageBufferAttribute(new Float32Array(n * 4), 4);
        this.packA2Buf = new StorageBufferAttribute(new Float32Array(n * 4), 4);

        this.packB0Buf = new StorageBufferAttribute(new Float32Array(n * 4), 4);
        this.packB1Buf = new StorageBufferAttribute(new Float32Array(n * 4), 4);
        this.packB2Buf = new StorageBufferAttribute(new Float32Array(n * 4), 4);

        this.sA0 = storage(this.packA0Buf, 'vec4', n);
        this.sA1 = storage(this.packA1Buf, 'vec4', n);
        this.sA2 = storage(this.packA2Buf, 'vec4', n);

        this.sB0 = storage(this.packB0Buf, 'vec4', n);
        this.sB1 = storage(this.packB1Buf, 'vec4', n);
        this.sB2 = storage(this.packB2Buf, 'vec4', n);

        // Obstacle field: 1 = wall, 0 = fluid
        this.obsBuf = new StorageBufferAttribute(new Float32Array(n), 1);
        this.sObs = storage(this.obsBuf, 'float', n);

        // Uniforms
        this.uInletVel = uniform(this.params.inletVelocity);
        this.uTau = uniform(this.params.tau);
        this.uBrushPos = uniform(new THREE.Vector2(-1000, -1000));
        this.uBrushSize = uniform(this.params.brushSize);
        this.uDrawMode = uniform(0.0);
        this.uVizMode = uniform(0.0); // 0=vorticity, 1=speed, 2=pressure
    }

    // ── Pass 1: Inlet Injection (3 bindings: sA0, sA1, sA2) ──
    setupInletCompute() {
        const gs = this.gridSize;
        const n = this.count;
        const sA0 = this.sA0, sA1 = this.sA1, sA2 = this.sA2;
        const uVel = this.uInletVel;

        const inletFn = Fn(() => {
            const idx = instanceIndex.toUint();
            const x = int(idx.mod(gs));

            // Only leftmost 2 columns
            const isInlet = x.lessThan(2);

            const ux = uVel;
            const usq = ux.mul(ux).mul(1.5);

            // Equilibrium f_eq_i = w_i * rho * (1 + 3*cu + 4.5*cu^2 - 1.5*|u|^2)
            // rho=1, uy=0, so cu = cx_i * ux
            const eq = (wi, cxi) => {
                const cu = float(cxi).mul(ux);
                return float(wi).mul(float(1.0).add(cu.mul(3.0)).add(cu.mul(cu).mul(4.5)).sub(usq));
            };

            const newP0 = vec4(eq(W[0], CX[0]), eq(W[1], CX[1]), eq(W[2], CX[2]), eq(W[3], CX[3]));
            const newP1 = vec4(eq(W[4], CX[4]), eq(W[5], CX[5]), eq(W[6], CX[6]), eq(W[7], CX[7]));
            const newP2 = vec4(eq(W[8], CX[8]), float(1.0), ux, float(0.0));

            sA0.element(idx).assign(isInlet.select(newP0, sA0.element(idx)));
            sA1.element(idx).assign(isInlet.select(newP1, sA1.element(idx)));
            sA2.element(idx).assign(isInlet.select(newP2, sA2.element(idx)));
        });

        this.computeInlet = inletFn().compute(n);
    }

    // ── Pass 2: LBM Collision + Streaming  (7 bindings: sA0-2 read, sB0-2 write, sObs read) ──
    setupLBMCompute() {
        const gs = this.gridSize;
        const n = this.count;
        const sA0 = this.sA0, sA1 = this.sA1, sA2 = this.sA2;
        const sB0 = this.sB0, sB1 = this.sB1, sB2 = this.sB2;
        const sObs = this.sObs;
        const uTau = this.uTau;

        const lbmFn = Fn(() => {
            const idx = instanceIndex.toUint();
            const x = int(idx.mod(gs));
            const y = int(idx.div(gs));
            const isWall = sObs.element(idx).greaterThan(0.5);

            // Helper: clamped index
            const gIdx = (ix, iy) => iy.clamp(0, gs - 1).mul(gs).add(ix.clamp(0, gs - 1));

            // ── Streaming (pull scheme) ──
            // f_i at current cell = read from cell where particle came from
            // Source cell for direction i: (x - cx_i, y - cy_i)

            // Dir 0 (rest 0,0) → pack0.x from (x, y)
            const s0 = sA0.element(idx).x;
            // Dir 1 (E 1,0) → pack0.y from (x-1, y)
            const s1 = sA0.element(gIdx(x.sub(1), y)).y;
            // Dir 2 (N 0,1) → pack0.z from (x, y-1)
            const s2 = sA0.element(gIdx(x, y.sub(1))).z;
            // Dir 3 (W -1,0) → pack0.w from (x+1, y)
            const s3 = sA0.element(gIdx(x.add(1), y)).w;
            // Dir 4 (S 0,-1) → pack1.x from (x, y+1)
            const s4 = sA1.element(gIdx(x, y.add(1))).x;
            // Dir 5 (NE 1,1) → pack1.y from (x-1, y-1)
            const s5 = sA1.element(gIdx(x.sub(1), y.sub(1))).y;
            // Dir 6 (NW -1,1) → pack1.z from (x+1, y-1)
            const s6 = sA1.element(gIdx(x.add(1), y.sub(1))).z;
            // Dir 7 (SW -1,-1) → pack1.w from (x+1, y+1)
            const s7 = sA1.element(gIdx(x.add(1), y.add(1))).w;
            // Dir 8 (SE 1,-1) → pack2.x from (x-1, y+1)
            const s8 = sA2.element(gIdx(x.sub(1), y.add(1))).x;

            // ── Macroscopic quantities ──
            const rho = s0.add(s1).add(s2).add(s3).add(s4).add(s5).add(s6).add(s7).add(s8);
            const safeRho = rho.max(0.001);

            // ux = Σ cx_i * f_i / rho
            const ux = s1.sub(s3).add(s5).sub(s6).sub(s7).add(s8).div(safeRho);
            // uy = Σ cy_i * f_i / rho
            const uy = s2.sub(s4).add(s5).add(s6).sub(s7).sub(s8).div(safeRho);

            // ── BGK collision ──
            const usq = ux.mul(ux).add(uy.mul(uy)).mul(1.5);

            const collide = (fi, wi, cxi, cyi) => {
                const cu = float(cxi).mul(ux).add(float(cyi).mul(uy));
                const feqi = float(wi).mul(safeRho).mul(
                    float(1.0).add(cu.mul(3.0)).add(cu.mul(cu).mul(4.5)).sub(usq)
                );
                return fi.sub(fi.sub(feqi).div(uTau));
            };

            const c0 = collide(s0, W[0], CX[0], CY[0]);
            const c1 = collide(s1, W[1], CX[1], CY[1]);
            const c2 = collide(s2, W[2], CX[2], CY[2]);
            const c3 = collide(s3, W[3], CX[3], CY[3]);
            const c4 = collide(s4, W[4], CX[4], CY[4]);
            const c5 = collide(s5, W[5], CX[5], CY[5]);
            const c6 = collide(s6, W[6], CX[6], CY[6]);
            const c7 = collide(s7, W[7], CX[7], CY[7]);
            const c8 = collide(s8, W[8], CX[8], CY[8]);

            // ── Bounce-back for walls (swap opposite directions) ──
            // opp: 0↔0, 1↔3, 2↔4, 5↔7, 6↔8
            const r0 = isWall.select(s0, c0);
            const r1 = isWall.select(s3, c1);
            const r2 = isWall.select(s4, c2);
            const r3 = isWall.select(s1, c3);
            const r4 = isWall.select(s2, c4);
            const r5 = isWall.select(s7, c5);
            const r6 = isWall.select(s8, c6);
            const r7 = isWall.select(s5, c7);
            const r8 = isWall.select(s6, c8);

            // ── Write to B buffers ──
            sB0.element(idx).assign(vec4(r0, r1, r2, r3));
            sB1.element(idx).assign(vec4(r4, r5, r6, r7));
            // Pack f8 + macroscopic into pack2
            sB2.element(idx).assign(vec4(r8, safeRho, ux, uy));
        });

        this.computeLBM = lbmFn().compute(n);
    }

    // ── Pass 3: Swap B → A  (6 bindings) ──
    setupSwapCompute() {
        const n = this.count;
        const sA0 = this.sA0, sA1 = this.sA1, sA2 = this.sA2;
        const sB0 = this.sB0, sB1 = this.sB1, sB2 = this.sB2;

        const swapFn = Fn(() => {
            const idx = instanceIndex.toUint();
            sA0.element(idx).assign(sB0.element(idx));
            sA1.element(idx).assign(sB1.element(idx));
            sA2.element(idx).assign(sB2.element(idx));
        });

        this.computeSwap = swapFn().compute(n);
    }

    // ── Pass 4: Brush draw/erase (1 binding: sObs) ──
    setupBrushCompute() {
        const gs = this.gridSize;
        const n = this.count;
        const sObs = this.sObs;

        const brushFn = Fn(() => {
            const idx = instanceIndex.toUint();
            const x = float(int(idx.mod(gs)));
            const y = float(int(idx.div(gs)));

            const dx = x.sub(this.uBrushPos.x);
            const dy = y.sub(this.uBrushPos.y);
            const dist = dx.mul(dx).add(dy.mul(dy)).sqrt();
            const inBrush = dist.lessThan(this.uBrushSize);

            const mode = this.uDrawMode;
            const current = sObs.element(idx);

            const isActive = mode.abs().step(0.5);           // 1 if drawing or erasing
            const isDraw = mode.step(0.5);                  // 1 if mode >= 0.5 (draw)
            const newVal = isDraw.mul(float(1.0));           // 1 for draw, 0 for erase

            // Only modify cells inside the brush when a tool is active
            const brushed = isActive.mul(inBrush.select(newVal, current)).add(
                float(1.0).sub(isActive).mul(current)
            );

            sObs.element(idx).assign(brushed);
        });

        this.computeBrush = brushFn().compute(n);
    }

    // ── Visualization (2 bindings: sA2, sObs) ──
    setupVisualization() {
        const gs = this.gridSize;
        const sA2 = this.sA2;
        const sObs = this.sObs;

        const geo = new THREE.PlaneGeometry(1, 1);
        const mat = new MeshBasicNodeMaterial({ side: THREE.DoubleSide });

        mat.colorNode = Fn(() => {
            const uvx = positionGeometry.x.add(0.5);
            const uvy = positionGeometry.y.add(0.5);

            const ix = uvx.mul(float(gs)).floor().clamp(0, gs - 1).toInt();
            const iy = float(1.0).sub(uvy).mul(float(gs)).floor().clamp(0, gs - 1).toInt();
            const idx = iy.mul(gs).add(ix);

            // Read macroscopic data from pack2: (f8, rho, ux, uy)
            const p2 = sA2.element(idx);
            const rho = p2.y;
            const ux = p2.z;
            const uy = p2.w;
            const obs = sObs.element(idx);
            const isWall = obs.greaterThan(0.5);

            const speed = ux.mul(ux).add(uy.mul(uy)).sqrt();

            // ── Vorticity via finite differences of velocity ──
            const ixL = ix.sub(1).clamp(0, gs - 1);
            const ixR = ix.add(1).clamp(0, gs - 1);
            const iyU = iy.sub(1).clamp(0, gs - 1);
            const iyD = iy.add(1).clamp(0, gs - 1);

            const uyR = sA2.element(iy.mul(gs).add(ixR)).w;
            const uyL = sA2.element(iy.mul(gs).add(ixL)).w;
            const uxD = sA2.element(iyD.mul(gs).add(ix)).z;
            const uxU = sA2.element(iyU.mul(gs).add(ix)).z;

            const curl = uyR.sub(uyL).sub(uxD.sub(uxU)).mul(0.5);

            const vizMode = this.uVizMode;

            // === Vorticity (mode 0) ===
            const cm = curl.abs().mul(50.0).clamp(0.0, 1.0);
            const vR = curl.max(0.0).mul(50.0).clamp(0.0, 1.0);
            const vB = curl.negate().max(0.0).mul(50.0).clamp(0.0, 1.0);
            const vG = cm.mul(0.12);

            // === Speed (mode 1) – plasma heatmap ===
            const s = speed.mul(14.0).clamp(0.0, 1.0);
            const spR = s.mul(3.0).clamp(0.0, 1.0);
            const spG = s.sub(0.33).mul(3.0).clamp(0.0, 1.0);
            const spB = s.mul(2.0).clamp(0.0, 1.0).sub(s.sub(0.5).mul(2.0).clamp(0.0, 1.0));

            // === Pressure (mode 2) ===
            const p = rho.sub(0.95).mul(10.0).clamp(0.0, 1.0);
            const prR = p.mul(p).mul(0.9).add(p.mul(0.1));
            const prG = p.mul(0.85).add(0.1);
            const prB = float(0.4).sub(p.mul(0.35)).clamp(0.05, 0.45);

            // Select by viz mode
            const isVort = vizMode.lessThan(0.5);
            const isSpeed = vizMode.greaterThan(0.5).and(vizMode.lessThan(1.5));

            const r = isVort.select(vR, isSpeed.select(spR, prR));
            const g = isVort.select(vG, isSpeed.select(spG, prG));
            const b = isVort.select(vB, isSpeed.select(spB, prB));

            // Dim background where there's barely any motion (vorticity mode only)
            const bgDim = speed.mul(20.0).clamp(0.0, 1.0);
            const dimFactor = isVort.select(bgDim, float(1.0));

            // Wall rendering
            const finalR = isWall.select(float(0.35), r.mul(dimFactor).add(0.02).clamp(0.0, 1.0));
            const finalG = isWall.select(float(0.35), g.mul(dimFactor).add(0.015).clamp(0.0, 1.0));
            const finalB = isWall.select(float(0.4), b.mul(dimFactor).add(0.035).clamp(0.0, 1.0));

            return vec4(finalR, finalG, finalB, float(1.0));
        })();

        this.vizMesh = new THREE.Mesh(geo, mat);
        this.vizMesh.frustumCulled = false;
        this.scene.add(this.vizMesh);
    }

    // ── CPU: initialize all distributions to equilibrium ──
    initEquilibrium() {
        const gs = this.gridSize;
        const u0 = this.params.inletVelocity;

        const a0 = this.packA0Buf.array;
        const a1 = this.packA1Buf.array;
        const a2 = this.packA2Buf.array;
        const b0 = this.packB0Buf.array;
        const b1 = this.packB1Buf.array;
        const b2 = this.packB2Buf.array;

        for (let j = 0; j < gs; j++) {
            for (let i = 0; i < gs; i++) {
                const idx = j * gs + i;
                const rho = 1.0, ux = u0, uy = 0.0;
                const off = idx * 4;

                a0[off] = feq(0, rho, ux, uy);
                a0[off + 1] = feq(1, rho, ux, uy);
                a0[off + 2] = feq(2, rho, ux, uy);
                a0[off + 3] = feq(3, rho, ux, uy);

                a1[off] = feq(4, rho, ux, uy);
                a1[off + 1] = feq(5, rho, ux, uy);
                a1[off + 2] = feq(6, rho, ux, uy);
                a1[off + 3] = feq(7, rho, ux, uy);

                a2[off] = feq(8, rho, ux, uy);
                a2[off + 1] = rho;
                a2[off + 2] = ux;
                a2[off + 3] = uy;

                // Zero out B buffers
                b0[off] = b0[off + 1] = b0[off + 2] = b0[off + 3] = 0;
                b1[off] = b1[off + 1] = b1[off + 2] = b1[off + 3] = 0;
                b2[off] = b2[off + 1] = b2[off + 2] = b2[off + 3] = 0;
            }
        }

        this.packA0Buf.needsUpdate = true;
        this.packA1Buf.needsUpdate = true;
        this.packA2Buf.needsUpdate = true;
        this.packB0Buf.needsUpdate = true;
        this.packB1Buf.needsUpdate = true;
        this.packB2Buf.needsUpdate = true;
    }

    // ── Preset obstacle shapes ──
    stampPreset(preset) {
        const gs = this.gridSize;
        const obs = this.obsBuf.array;
        const cx = gs * 0.35;
        const cy = gs * 0.5;

        if (preset === 'circle') {
            const r = gs * 0.06;
            for (let y = 0; y < gs; y++)
                for (let x = 0; x < gs; x++)
                    if ((x - cx) ** 2 + (y - cy) ** 2 < r * r) obs[y * gs + x] = 1.0;
        } else if (preset === 'square') {
            const half = gs * 0.05;
            for (let y = 0; y < gs; y++)
                for (let x = 0; x < gs; x++)
                    if (Math.abs(x - cx) < half && Math.abs(y - cy) < half) obs[y * gs + x] = 1.0;
        } else if (preset === 'airfoil') {
            const chord = gs * 0.15;
            const thickness = gs * 0.025;
            for (let y = 0; y < gs; y++) {
                for (let x = 0; x < gs; x++) {
                    const lx = (x - (cx - chord / 2)) / chord;
                    if (lx >= 0 && lx <= 1) {
                        const t = thickness * (0.2969 * Math.sqrt(lx) - 0.126 * lx
                            - 0.3516 * lx * lx + 0.2843 * lx ** 3 - 0.1015 * lx ** 4);
                        if (Math.abs(y - cy) < Math.max(t * chord * 0.5, 1))
                            obs[y * gs + x] = 1.0;
                    }
                }
            }
        } else if (preset === 'plate') {
            const halfLen = gs * 0.08;
            for (let y = 0; y < gs; y++)
                for (let x = 0; x < gs; x++)
                    if (Math.abs(x - cx) <= 2 && Math.abs(y - cy) < halfLen) obs[y * gs + x] = 1.0;
        }

        this.obsBuf.needsUpdate = true;
    }

    // ── Animation loop ──
    animate() {
        if (this.disposed || !this.initialized) return;
        this.animationId = requestAnimationFrame(() => this.animate());

        if (this.isRunning) {
            const steps = this.params.stepsPerFrame || 4;
            for (let i = 0; i < steps; i++) {
                this.renderer.compute(this.computeInlet);
                this.renderer.compute(this.computeLBM);
                this.renderer.compute(this.computeSwap);
            }
        }

        // Brush
        if (this.drawMode !== 0) {
            this.uDrawMode.value = this.drawMode;
            this.uBrushPos.value.set(this.brushGridPos.x, this.brushGridPos.y);
            this.renderer.compute(this.computeBrush);
        } else {
            this.uDrawMode.value = 0.0;
        }

        this.renderer.render(this.scene, this.camera);
    }

    // ── Mouse mapping ──
    screenToGrid(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: Math.floor(((clientX - rect.left) / rect.width) * this.gridSize),
            y: Math.floor(((clientY - rect.top) / rect.height) * this.gridSize),
        };
    }

    setMousePosition(clientX, clientY) { this.brushGridPos = this.screenToGrid(clientX, clientY); }
    setDrawMode(mode) { this.drawMode = mode; }
    setPlaying(p) { this.isRunning = p; }

    updateParams(params) {
        this.params = { ...params };
        if (this.uInletVel) this.uInletVel.value = params.inletVelocity;
        if (this.uTau) this.uTau.value = params.tau;
        if (this.uBrushSize) this.uBrushSize.value = params.brushSize;
    }

    setVizMode(mode) {
        if (!this.uVizMode) return;
        const map = { vorticity: 0, speed: 1, pressure: 2 };
        this.uVizMode.value = map[mode] ?? 0;
    }

    reset() {
        this.obsBuf.array.fill(0);
        this.obsBuf.needsUpdate = true;
        this.initEquilibrium();
    }

    resize(w, h) {
        if (this.disposed || !this.renderer) return;
        this.renderer.setSize(w, h, false);
    }

    dispose() {
        this.disposed = true;
        if (this.animationId) cancelAnimationFrame(this.animationId);
        const renderer = this.renderer;
        this.renderer = null;
        if (renderer) {
            setTimeout(() => {
                try {
                    if (this.scene) {
                        this.scene.traverse((o) => {
                            if (o.geometry) o.geometry.dispose();
                            if (o.material) {
                                if (Array.isArray(o.material)) o.material.forEach(m => m.dispose());
                                else o.material.dispose();
                            }
                        });
                    }
                    renderer.dispose();
                } catch (e) { console.error('Error disposing wind tunnel:', e); }
            }, 100);
        }
    }
}

// ════════════════════════════════════════════════════════════════════════
// React Component
// ════════════════════════════════════════════════════════════════════════
export default function AerodynamicsPage() {
    const [params, setParams] = useState({
        inletVelocity: 0.06,
        tau: 0.56,
        brushSize: 8,
        stepsPerFrame: 4,
    });
    const [gridSize, setGridSize] = useState(512);
    const [vizMode, setVizMode] = useState('vorticity');
    const [drawTool, setDrawTool] = useState('brush');
    const [isPlaying, setIsPlaying] = useState(true);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const simRef = useRef(null);

    // ── Init / Teardown ──
    useEffect(() => {
        if (!canvasRef.current) return;
        if (simRef.current) { simRef.current.dispose(); simRef.current = null; }
        setIsLoading(true); setError(null);

        const timeout = setTimeout(() => {
            simRef.current = new WebGPUWindTunnel(
                canvasRef.current, { ...params }, gridSize,
                (err) => { setIsLoading(false); if (err) setError(err.message || 'WebGPU init failed'); },
            );
        }, 100);

        return () => { clearTimeout(timeout); simRef.current?.dispose(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gridSize]);

    useEffect(() => { simRef.current?.updateParams(params); }, [params]);
    useEffect(() => { simRef.current?.setPlaying(isPlaying); }, [isPlaying]);
    useEffect(() => { simRef.current?.setVizMode(vizMode); }, [vizMode]);

    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current && simRef.current) {
                simRef.current.resize(containerRef.current.clientWidth, containerRef.current.clientHeight);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const onPointerDown = useCallback((e) => {
        if (!simRef.current) return;
        e.preventDefault();
        simRef.current.setDrawMode(e.button === 2 ? -1 : (drawTool === 'eraser' ? -1 : 1));
        simRef.current.setMousePosition(e.clientX, e.clientY);
    }, [drawTool]);

    const onPointerMove = useCallback((e) => { simRef.current?.setMousePosition(e.clientX, e.clientY); }, []);
    const onPointerUp = useCallback(() => { simRef.current?.setDrawMode(0); }, []);
    const onContextMenu = useCallback((e) => e.preventDefault(), []);

    const updateParam = (key, value) => setParams(p => ({ ...p, [key]: value }));

    return (
        <div className="wind-tunnel" ref={containerRef}>
            <canvas
                ref={canvasRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
                onContextMenu={onContextMenu}
            />

            {isLoading && !error && (
                <div className="wt-loading-overlay">
                    <div className="wt-loading-spinner" />
                    <div className="wt-loading-text">Initialising WebGPU Wind Tunnel…</div>
                </div>
            )}

            {error && (
                <div className="wt-error-overlay">
                    <AlertCircle size={40} className="wt-error-icon" />
                    <p className="wt-error-text">{error}</p>
                </div>
            )}

            {!error && (
                <div className="wt-top-bar">
                    <Link to="/" className="wt-back-link"><ArrowLeft size={14} /> Home</Link>
                    <div className="wt-title-block">
                        <h1 className="wt-title">Virtual Wind Tunnel</h1>
                        <p className="wt-subtitle">Lattice Boltzmann Method (D2Q9) · WebGPU</p>
                    </div>
                    <div className="wt-top-spacer" />
                </div>
            )}

            {!isLoading && !error && (
                <div className="wt-hint">
                    Left-click to draw walls · Right-click to erase · Place shapes from the toolbar below
                </div>
            )}

            {!error && (
                <div className="wt-controls">
                    <button className="wt-btn" onClick={() => setIsPlaying(p => !p)} title={isPlaying ? 'Pause' : 'Play'}>
                        {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    <button className="wt-btn" onClick={() => simRef.current?.reset()} title="Reset">
                        <RotateCcw size={14} />
                    </button>

                    <div className="wt-controls-divider" />

                    <button className={`wt-btn ${drawTool === 'brush' ? 'active' : ''}`}
                        onClick={() => setDrawTool('brush')} title="Brush">
                        <Paintbrush size={14} />
                    </button>
                    <button className={`wt-btn ${drawTool === 'eraser' ? 'active' : ''}`}
                        onClick={() => setDrawTool('eraser')} title="Eraser">
                        <Eraser size={14} />
                    </button>

                    {PRESET_SHAPES.map(ps => (
                        <button key={ps.value} className="wt-btn"
                            onClick={() => simRef.current?.stampPreset(ps.value)}
                            title={`Place ${ps.label}`}>
                            {ps.label}
                        </button>
                    ))}

                    <div className="wt-controls-divider" />

                    <div className="wt-slider-group">
                        <span className="wt-slider-label">Wind Speed</span>
                        <div className="wt-slider-row">
                            <input type="range" className="wt-slider" min={0.01} max={0.1} step={0.005}
                                value={params.inletVelocity}
                                onChange={(e) => updateParam('inletVelocity', parseFloat(e.target.value))} />
                            <span className="wt-slider-value">{params.inletVelocity.toFixed(3)}</span>
                        </div>
                    </div>

                    <div className="wt-slider-group">
                        <span className="wt-slider-label">Viscosity (τ)</span>
                        <div className="wt-slider-row">
                            <input type="range" className="wt-slider" min={0.51} max={1.5} step={0.01}
                                value={params.tau}
                                onChange={(e) => updateParam('tau', parseFloat(e.target.value))} />
                            <span className="wt-slider-value">{params.tau.toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="wt-slider-group">
                        <span className="wt-slider-label">Steps/Frame</span>
                        <div className="wt-slider-row">
                            <input type="range" className="wt-slider" min={1} max={16} step={1}
                                value={params.stepsPerFrame}
                                onChange={(e) => updateParam('stepsPerFrame', parseInt(e.target.value))} />
                            <span className="wt-slider-value">{params.stepsPerFrame}</span>
                        </div>
                    </div>

                    <div className="wt-controls-divider" />

                    <select className="wt-select" value={vizMode}
                        onChange={(e) => setVizMode(e.target.value)}>
                        {VIZ_MODES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>

                    <div className="wt-slider-group">
                        <span className="wt-slider-label">Brush</span>
                        <div className="wt-slider-row">
                            <input type="range" className="wt-slider" min={2} max={30} step={1}
                                value={params.brushSize}
                                onChange={(e) => updateParam('brushSize', parseInt(e.target.value))} />
                            <span className="wt-slider-value">{params.brushSize}</span>
                        </div>
                    </div>

                    <div className="wt-controls-divider" />

                    <select className="wt-select" value={gridSize}
                        onChange={(e) => setGridSize(parseInt(e.target.value))}>
                        {GRID_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
            )}
        </div>
    );
}
