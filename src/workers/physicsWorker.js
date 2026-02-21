/**
 * Physics Web Worker for Three-Body Simulation
 * Offloads physics calculations to a separate thread for better performance.
 *
 * Message Protocol:
 * - Input: { type: 'UPDATE', bodies, config }
 * - Output: { type: 'RESULT', bodies, stats }
 */

// Softening parameter to prevent singularities
const SOFTENING = 0.1;

// Reusable buffer for accelerations to avoid GC
let accelerationBuffer = new Float32Array(0);

// Reusable buffers for RK4 to avoid GC
const rk4Buffers = {
    size: 0,
    k1: null, k2: null, k3: null, k4: null,
    s1: null, s2: null, s3: null
};

function ensureRK4Buffers(n) {
    if (rk4Buffers.size < n) {
        const newSize = Math.max(n, rk4Buffers.size * 2 || 100);
        const stride = 6;
        rk4Buffers.k1 = new Float32Array(newSize * stride);
        rk4Buffers.k2 = new Float32Array(newSize * stride);
        rk4Buffers.k3 = new Float32Array(newSize * stride);
        rk4Buffers.k4 = new Float32Array(newSize * stride);
        rk4Buffers.s1 = new Float32Array(newSize * stride);
        rk4Buffers.s2 = new Float32Array(newSize * stride);
        rk4Buffers.s3 = new Float32Array(newSize * stride);
        rk4Buffers.size = newSize;
    }
}

/**
 * Calculate accelerations for all bodies (Euler integrator)
 */
function calculateAccelerations(bodies, G, coulombK, skipIndex) {
    const requiredSize = bodies.length * 3;
    if (accelerationBuffer.length < requiredSize) {
        accelerationBuffer = new Float32Array(requiredSize);
    }
    // Zero out buffer
    accelerationBuffer.fill(0, 0, requiredSize);

    for (let i = 0; i < bodies.length; i++) {
        const i3 = i * 3;
        const b_i = bodies[i];
        let ax_i = 0;
        let ay_i = 0;
        let az_i = 0;

        for (let j = i + 1; j < bodies.length; j++) {
            const b_j = bodies[j];
            const dx = b_j.x - b_i.x;
            const dy = b_j.y - b_i.y;
            const dz = b_j.z - b_i.z;
            const distSq = dx * dx + dy * dy + dz * dz + SOFTENING * SOFTENING;
            const dist = Math.sqrt(distSq);
            const invDist = 1.0 / dist;

            const commonFact = G / distSq * invDist;

            let coulombForce = 0;
            if (coulombK && b_i.charge && b_j.charge) {
                coulombForce = -1 * (coulombK * b_i.charge * b_j.charge) / distSq;
            }

            // Apply to i
            if (i !== skipIndex) {
                let termI = b_j.mass * commonFact;
                if (coulombForce !== 0) {
                    termI += (coulombForce / b_i.mass) * invDist;
                }
                ax_i += termI * dx;
                ay_i += termI * dy;
                az_i += termI * dz;
            }

            // Apply to j
            if (j !== skipIndex) {
                let termJ = b_i.mass * commonFact;
                if (coulombForce !== 0) {
                    termJ += (coulombForce / b_j.mass) * invDist;
                }
                const j3 = j * 3;
                accelerationBuffer[j3] -= termJ * dx;
                accelerationBuffer[j3 + 1] -= termJ * dy;
                accelerationBuffer[j3 + 2] -= termJ * dz;
            }
        }

        if (i !== skipIndex) {
            accelerationBuffer[i3] += ax_i;
            accelerationBuffer[i3 + 1] += ay_i;
            accelerationBuffer[i3 + 2] += az_i;
        }
    }
}

/**
 * Symplectic Euler Integration (velocity then position)
 */
function integrateEuler(bodies, dt, G, coulombK, skipIndex) {
    calculateAccelerations(bodies, G, coulombK, skipIndex);

    for (let i = 0; i < bodies.length; i++) {
        if (i === skipIndex) continue;

        const i3 = i * 3;
        // Update velocity
        bodies[i].vx += accelerationBuffer[i3] * dt;
        bodies[i].vy += accelerationBuffer[i3 + 1] * dt;
        bodies[i].vz += accelerationBuffer[i3 + 2] * dt;

        // Update position
        bodies[i].x += bodies[i].vx * dt;
        bodies[i].y += bodies[i].vy * dt;
        bodies[i].z += bodies[i].vz * dt;
    }

    return bodies;
}

/**
 * Runge-Kutta 4th Order Integration
 */
function integrateRK4(bodies, dt, G, coulombK, skipIndex) {
    const n = bodies.length;
    ensureRK4Buffers(n);
    const { k1, k2, k3, k4, s1, s2, s3 } = rk4Buffers;
    const soft = SOFTENING;

    // Helper: compute derivatives
    // inputType: 0 for bodies array, 1 for flat buffer
    const calcDerivatives = (input, inputType, outBuffer) => {
        // Initialize output buffer elements
        for (let i = 0; i < n; i++) {
            const i6 = i * 6;
            // Set dx/dt = vx
            if (inputType === 0) {
                outBuffer[i6] = input[i].vx;
                outBuffer[i6 + 1] = input[i].vy;
                outBuffer[i6 + 2] = input[i].vz;
            } else {
                outBuffer[i6] = input[i6 + 3]; // vx is at index 3 in state buffer (x,y,z,vx,vy,vz)
                outBuffer[i6 + 1] = input[i6 + 4];
                outBuffer[i6 + 2] = input[i6 + 5];
            }
            // Set dv/dt = 0 (accumulator)
            outBuffer[i6 + 3] = 0;
            outBuffer[i6 + 4] = 0;
            outBuffer[i6 + 5] = 0;
        }

        for (let i = 0; i < n; i++) {
            let ix, iy, iz, imass, icharge;
            if (inputType === 0) {
                const b = input[i];
                ix = b.x; iy = b.y; iz = b.z;
                imass = b.mass;
                icharge = b.charge;
            } else {
                const i6 = i * 6;
                ix = input[i6]; iy = input[i6 + 1]; iz = input[i6 + 2];
                imass = bodies[i].mass;
                icharge = bodies[i].charge;
            }

            // Optimization: Cache i-th output indices
            const iOut = i * 6;

            for (let j = i + 1; j < n; j++) {
                let jx, jy, jz, jmass, jcharge;
                if (inputType === 0) {
                    const b = input[j];
                    jx = b.x; jy = b.y; jz = b.z;
                    jmass = b.mass;
                    jcharge = b.charge;
                } else {
                    const j6 = j * 6;
                    jx = input[j6]; jy = input[j6 + 1]; jz = input[j6 + 2];
                    jmass = bodies[j].mass;
                    jcharge = bodies[j].charge;
                }

                const dx = jx - ix;
                const dy = jy - iy;
                const dz = jz - iz;
                const distSq = dx * dx + dy * dy + dz * dz + soft * soft;
                const invDist = 1.0 / Math.sqrt(distSq);
                const commonFact = G / distSq * invDist;

                let coulombForce = 0;
                if (coulombK && icharge && jcharge) {
                    coulombForce = -1 * (coulombK * icharge * jcharge) / distSq;
                }

                // Force on i
                let termI = jmass * commonFact;
                if (coulombForce !== 0) termI += (coulombForce / imass) * invDist;
                outBuffer[iOut + 3] += termI * dx;
                outBuffer[iOut + 4] += termI * dy;
                outBuffer[iOut + 5] += termI * dz;

                // Force on j
                let termJ = imass * commonFact;
                if (coulombForce !== 0) termJ += (coulombForce / jmass) * invDist;
                const jOut = j * 6;
                outBuffer[jOut + 3] -= termJ * dx;
                outBuffer[jOut + 4] -= termJ * dy;
                outBuffer[jOut + 5] -= termJ * dz;
            }
        }
    };

    // K1 = f(y0)
    calcDerivatives(bodies, 0, k1);

    // S1 = y0 + K1 * dt/2
    const dt2 = dt * 0.5;
    for (let i = 0; i < n; i++) {
        const i6 = i * 6;
        s1[i6] = bodies[i].x + k1[i6] * dt2;
        s1[i6 + 1] = bodies[i].y + k1[i6 + 1] * dt2;
        s1[i6 + 2] = bodies[i].z + k1[i6 + 2] * dt2;
        s1[i6 + 3] = bodies[i].vx + k1[i6 + 3] * dt2;
        s1[i6 + 4] = bodies[i].vy + k1[i6 + 4] * dt2;
        s1[i6 + 5] = bodies[i].vz + k1[i6 + 5] * dt2;
    }

    // K2 = f(S1)
    calcDerivatives(s1, 1, k2);

    // S2 = y0 + K2 * dt/2
    for (let i = 0; i < n; i++) {
        const i6 = i * 6;
        s2[i6] = bodies[i].x + k2[i6] * dt2;
        s2[i6 + 1] = bodies[i].y + k2[i6 + 1] * dt2;
        s2[i6 + 2] = bodies[i].z + k2[i6 + 2] * dt2;
        s2[i6 + 3] = bodies[i].vx + k2[i6 + 3] * dt2;
        s2[i6 + 4] = bodies[i].vy + k2[i6 + 4] * dt2;
        s2[i6 + 5] = bodies[i].vz + k2[i6 + 5] * dt2;
    }

    // K3 = f(S2)
    calcDerivatives(s2, 1, k3);

    // S3 = y0 + K3 * dt
    for (let i = 0; i < n; i++) {
        const i6 = i * 6;
        s3[i6] = bodies[i].x + k3[i6] * dt;
        s3[i6 + 1] = bodies[i].y + k3[i6 + 1] * dt;
        s3[i6 + 2] = bodies[i].z + k3[i6 + 2] * dt;
        s3[i6 + 3] = bodies[i].vx + k3[i6 + 3] * dt;
        s3[i6 + 4] = bodies[i].vy + k3[i6 + 4] * dt;
        s3[i6 + 5] = bodies[i].vz + k3[i6 + 5] * dt;
    }

    // K4 = f(S3)
    calcDerivatives(s3, 1, k4);

    // Final Integration
    const dt6 = dt / 6;
    for (let i = 0; i < n; i++) {
        if (i === skipIndex) continue;
        const i6 = i * 6;
        bodies[i].x += (k1[i6] + 2 * k2[i6] + 2 * k3[i6] + k4[i6]) * dt6;
        bodies[i].y += (k1[i6 + 1] + 2 * k2[i6 + 1] + 2 * k3[i6 + 1] + k4[i6 + 1]) * dt6;
        bodies[i].z += (k1[i6 + 2] + 2 * k2[i6 + 2] + 2 * k3[i6 + 2] + k4[i6 + 2]) * dt6;
        bodies[i].vx += (k1[i6 + 3] + 2 * k2[i6 + 3] + 2 * k3[i6 + 3] + k4[i6 + 3]) * dt6;
        bodies[i].vy += (k1[i6 + 4] + 2 * k2[i6 + 4] + 2 * k3[i6 + 4] + k4[i6 + 4]) * dt6;
        bodies[i].vz += (k1[i6 + 5] + 2 * k2[i6 + 5] + 2 * k3[i6 + 5] + k4[i6 + 5]) * dt6;
    }

    return bodies;
}

/**
 * Handle collisions between bodies
 * Returns { bodies, removedIndices }
 */
function handleCollisions(bodies, skipIndex) {
    const indicesToRemove = new Set();
    const mergeThreshold = 0.3;

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
            const collisionDist = r1 + r2;

            if (dist < collisionDist) {
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
                    // Elastic collision
                    const nx = dx / dist;
                    const ny = dy / dist;
                    const nz = dz / dist;

                    const dvx = bodies[i].vx - bodies[j].vx;
                    const dvy = bodies[i].vy - bodies[j].vy;
                    const dvz = bodies[i].vz - bodies[j].vz;

                    const dvn = dvx * nx + dvy * ny + dvz * nz;

                    if (dvn > 0) {
                        const m1 = bodies[i].mass;
                        const m2 = bodies[j].mass;
                        const restitution = 0.95;
                        const impulse = (-(1 + restitution) * dvn) / (1 / m1 + 1 / m2);

                        bodies[i].vx += (impulse / m1) * nx;
                        bodies[i].vy += (impulse / m1) * ny;
                        bodies[i].vz += (impulse / m1) * nz;

                        bodies[j].vx -= (impulse / m2) * nx;
                        bodies[j].vy -= (impulse / m2) * ny;
                        bodies[j].vz -= (impulse / m2) * nz;

                        // Separate bodies
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

    // Remove merged bodies
    const removedIndices = Array.from(indicesToRemove).sort((a, b) => b - a);
    removedIndices.forEach(index => {
        bodies.splice(index, 1);
    });

    return { bodies, removedIndices };
}

/**
 * Calculate energy for stats
 */
function calculateEnergy(bodies, G, coulombK) {
    let totalKE = 0;
    let totalPE = 0;

    // Kinetic energy
    for (const b of bodies) {
        totalKE += 0.5 * b.mass * (b.vx * b.vx + b.vy * b.vy + b.vz * b.vz);
    }

    // Potential energy
    for (let i = 0; i < bodies.length; i++) {
        for (let j = i + 1; j < bodies.length; j++) {
            const dx = bodies[i].x - bodies[j].x;
            const dy = bodies[i].y - bodies[j].y;
            const dz = bodies[i].z - bodies[j].z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (dist > 0.1) {
                totalPE -= (G * bodies[i].mass * bodies[j].mass) / dist;

                // Electric Potential Energy: U = k q1 q2 / r
                if (coulombK && bodies[i].charge && bodies[j].charge) {
                    totalPE += (coulombK * bodies[i].charge * bodies[j].charge) / dist;
                }
            }
        }
    }

    return { ke: totalKE, pe: totalPE, total: totalKE + totalPE };
}

/**
 * Main message handler
 */
self.onmessage = function (e) {
    const { type, bodies, config } = e.data;

    if (type === 'UPDATE') {
        const {
            simSpeed = 1,
            timeDirection = 1,
            gravityG = 1,
            physicsMode = 'EULER',
            enableCollisions = false,
            skipIndex = null,
            currentTime = 0,
            coulombK = 0
        } = config;

        const dt = 0.01 * simSpeed * timeDirection;

        // Clone bodies to avoid mutation issues
        let updatedBodies = bodies.map(b => ({ ...b }));

        // Integration
        if (physicsMode === 'EULER') {
            updatedBodies = integrateEuler(updatedBodies, dt, gravityG, coulombK, skipIndex);
        } else {
            updatedBodies = integrateRK4(updatedBodies, dt, gravityG, coulombK, skipIndex);
        }

        // Collision handling
        let removedIndices = [];
        if (enableCollisions) {
            const result = handleCollisions(updatedBodies, skipIndex);
            updatedBodies = result.bodies;
            removedIndices = result.removedIndices;
        }

        // Calculate energy stats (Throttled via config)
        let energy = {};
        if (config.shouldCalculateEnergy) {
            energy = calculateEnergy(updatedBodies, gravityG, coulombK);
        }

        // Send results back
        self.postMessage({
            type: 'RESULT',
            bodies: updatedBodies,
            stats: {
                time: currentTime + dt,
                ...energy,
                bodyCount: updatedBodies.length
            },
            removedIndices
        });
    }
};

// Signal that worker is ready
self.postMessage({ type: 'READY' });
