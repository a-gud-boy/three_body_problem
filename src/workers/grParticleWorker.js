/**
 * Web Worker for General Relativity CPU Particle Simulation
 *
 * Offloads the Velocity Verlet physics loop (5000 particles) to a background thread.
 *
 * Message Protocol:
 * - Input:  { type: 'INIT', positions, velocities, count }
 * - Input:  { type: 'UPDATE', params }
 * - Output: { type: 'READY' }
 * - Output: { type: 'RESULT', positions, velocities }
 */

// --- Physics constants (must match physics.js) ---
const G = 1.0;

function calculateSchwarzschildRadius(mass, speedOfLight) {
    return (2 * G * mass) / (speedOfLight * speedOfLight);
}

function calculateOrbitalVelocity(mass, r, type, speedOfLight) {
    if (type === 'newtonian') {
        return Math.sqrt((G * mass) / r);
    } else {
        const rs = calculateSchwarzschildRadius(mass, speedOfLight);
        const denom = r - rs;
        if (denom <= 0) return 0;
        return Math.sqrt((r * G * mass) / (denom * denom));
    }
}

// Acceleration: Newtonian or Paczyński-Wiita
function calculateAcceleration(px, py, pz, mass, type, speedOfLight, out) {
    const rSq = px * px + py * py + pz * pz;
    const r = Math.sqrt(rSq);
    if (r < 0.1) {
        out.ax = 0; out.ay = 0; out.az = 0;
        return;
    }

    let forceMag;
    if (type === 'newtonian') {
        forceMag = -(G * mass) / rSq;
    } else {
        const rs = calculateSchwarzschildRadius(mass, speedOfLight);
        const denom = r - rs;
        if (denom <= 0.01) {
            forceMag = -10000;
        } else {
            forceMag = -(G * mass) / (denom * denom);
        }
    }

    const factor = forceMag / r;
    out.ax = px * factor;
    out.ay = py * factor;
    out.az = pz * factor;
}

// Buffers
let positions = null;
let velocities = null;
let count = 0;

self.onmessage = function (e) {
    const { type } = e.data;

    if (type === 'INIT') {
        count = e.data.count;
        positions = new Float32Array(e.data.positions);
        velocities = new Float32Array(e.data.velocities);
        self.postMessage({ type: 'READY' });
        return;
    }

    if (type === 'UPDATE') {
        const { dt, mass, physicsModel, speedOfLight, spin, bounds, iscoR, maxSpawnR } = e.data.params;

        // Receive fresh buffers from main thread (transferable, zero-copy)
        positions = new Float32Array(e.data.positions);
        velocities = new Float32Array(e.data.velocities);
        count = positions.length / 3;

        const halfDt = dt * 0.5;
        const halfDtSq = 0.5 * dt * dt;
        const rs = calculateSchwarzschildRadius(mass, speedOfLight);
        const p = positions;
        const v = velocities;
        const acc = { ax: 0, ay: 0, az: 0 };

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;

            // --- Step 1: Acceleration at current position ---
            calculateAcceleration(p[i3], p[i3 + 1], p[i3 + 2], mass, physicsModel, speedOfLight, acc);
            let aox = acc.ax, aoy = acc.ay, aoz = acc.az;

            // Frame dragging
            if (spin > 0) {
                const rx = p[i3], ry = p[i3 + 1], rz = p[i3 + 2];
                const r = Math.sqrt(rx * rx + ry * ry + rz * rz);
                if (r > 0.1) {
                    const invR = 1.0 / r;
                    const dragMag = spin * rs * rs / (r * r * r) * mass;
                    aox += rz * invR * dragMag;
                    // aoy += 0
                    aoz += -rx * invR * dragMag;
                }
            }

            // --- Step 2: Velocity Verlet drift ---
            p[i3] += v[i3] * dt + aox * halfDtSq;
            p[i3 + 1] += v[i3 + 1] * dt + aoy * halfDtSq;
            p[i3 + 2] += v[i3 + 2] * dt + aoz * halfDtSq;

            // --- Step 3: Acceleration at new position ---
            calculateAcceleration(p[i3], p[i3 + 1], p[i3 + 2], mass, physicsModel, speedOfLight, acc);
            let anx = acc.ax, any = acc.ay, anz = acc.az;

            // Frame dragging at new position
            if (spin > 0) {
                const rx = p[i3], ry = p[i3 + 1], rz = p[i3 + 2];
                const r = Math.sqrt(rx * rx + ry * ry + rz * rz);
                if (r > 0.1) {
                    const invR = 1.0 / r;
                    const dragMag = spin * rs * rs / (r * r * r) * mass;
                    anx += rz * invR * dragMag;
                    anz += -rx * invR * dragMag;
                }
            }

            // --- Step 4: Velocity Verlet kick ---
            v[i3] += (aox + anx) * halfDt;
            v[i3 + 1] += (aoy + any) * halfDt;
            v[i3 + 2] += (aoz + anz) * halfDt;

            // --- Respawn check ---
            const rSq = p[i3] * p[i3] + p[i3 + 1] * p[i3 + 1] + p[i3 + 2] * p[i3 + 2];

            if (rSq < rs * rs * 1.1 || rSq > bounds * bounds) {
                const angle = Math.random() * Math.PI * 2;
                const r = iscoR + Math.random() * (maxSpawnR - iscoR);
                p[i3] = Math.cos(angle) * r;
                p[i3 + 1] = (Math.random() - 0.5) * 2;
                p[i3 + 2] = Math.sin(angle) * r;

                const vMag = calculateOrbitalVelocity(mass, r, physicsModel, speedOfLight);
                v[i3] = -Math.sin(angle) * vMag;
                v[i3 + 1] = 0;
                v[i3 + 2] = Math.cos(angle) * vMag;
            }
        }

        // Transfer buffers back (zero-copy)
        const posBuf = positions.buffer;
        const velBuf = velocities.buffer;
        self.postMessage({ type: 'RESULT', positions: posBuf, velocities: velBuf }, [posBuf, velBuf]);

        // Buffers are now neutered; we'll get new ones on the next INIT/UPDATE
        positions = null;
        velocities = null;
    }
};

self.postMessage({ type: 'READY' });
