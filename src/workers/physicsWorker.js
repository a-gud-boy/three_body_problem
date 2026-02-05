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

/**
 * Calculate accelerations for all bodies (Euler integrator)
 */
function calculateAccelerations(bodies, G, coulombK, skipIndex) {
    const accelerations = new Array(bodies.length);
    for(let i=0; i<bodies.length; i++) {
        accelerations[i] = { ax: 0, ay: 0, az: 0 };
    }

    for (let i = 0; i < bodies.length; i++) {
        for (let j = i + 1; j < bodies.length; j++) {
            const dx = bodies[j].x - bodies[i].x;
            const dy = bodies[j].y - bodies[i].y;
            const dz = bodies[j].z - bodies[i].z;
            const distSq = dx * dx + dy * dy + dz * dz + SOFTENING * SOFTENING;
            const dist = Math.sqrt(distSq);
            const invDist = 1.0 / dist;

            const commonFact = G / distSq * invDist;

            let coulombForce = 0;
            if (coulombK && bodies[i].charge && bodies[j].charge) {
                 coulombForce = -1 * (coulombK * bodies[i].charge * bodies[j].charge) / distSq;
            }

            // Apply to i
            if (i !== skipIndex) {
                let termI = bodies[j].mass * commonFact;
                if (coulombForce !== 0) {
                    termI += (coulombForce / bodies[i].mass) * invDist;
                }
                accelerations[i].ax += termI * dx;
                accelerations[i].ay += termI * dy;
                accelerations[i].az += termI * dz;
            }

            // Apply to j
            if (j !== skipIndex) {
                let termJ = bodies[i].mass * commonFact;
                if (coulombForce !== 0) {
                    termJ += (coulombForce / bodies[j].mass) * invDist;
                }
                accelerations[j].ax -= termJ * dx;
                accelerations[j].ay -= termJ * dy;
                accelerations[j].az -= termJ * dz;
            }
        }
    }

    return accelerations;
}

/**
 * Symplectic Euler Integration (velocity then position)
 */
function integrateEuler(bodies, dt, G, coulombK, skipIndex) {
    const accelerations = calculateAccelerations(bodies, G, coulombK, skipIndex);

    for (let i = 0; i < bodies.length; i++) {
        if (i === skipIndex) continue;

        // Update velocity
        bodies[i].vx += accelerations[i].ax * dt;
        bodies[i].vy += accelerations[i].ay * dt;
        bodies[i].vz += accelerations[i].az * dt;

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
    const soft = SOFTENING;

    // Helper to calculate derivatives into a buffer
    const calcDerivatives = (state, out) => {
        // Initialize output
        for (let i = 0; i < n; i++) {
            out[i] = {
                dx: state[i].vx,
                dy: state[i].vy,
                dz: state[i].vz,
                dvx: 0,
                dvy: 0,
                dvz: 0
            };
        }

        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const dx = state[j].x - state[i].x;
                const dy = state[j].y - state[i].y;
                const dz = state[j].z - state[i].z;
                const distSq = dx * dx + dy * dy + dz * dz + soft * soft;
                const dist = Math.sqrt(distSq);
                const invDist = 1.0 / dist;

                const commonFact = G / distSq * invDist;

                let coulombForce = 0;
                if (coulombK && state[i].charge && state[j].charge) {
                    coulombForce = -1 * (coulombK * state[i].charge * state[j].charge) / distSq;
                }

                // Apply to i
                let termI = state[j].mass * commonFact;
                if (coulombForce !== 0) {
                    termI += (coulombForce / state[i].mass) * invDist;
                }
                out[i].dvx += termI * dx;
                out[i].dvy += termI * dy;
                out[i].dvz += termI * dz;

                // Apply to j
                let termJ = state[i].mass * commonFact;
                if (coulombForce !== 0) {
                    termJ += (coulombForce / state[j].mass) * invDist;
                }
                out[j].dvx -= termJ * dx;
                out[j].dvy -= termJ * dy;
                out[j].dvz -= termJ * dz;
            }
        }
    };

    // Buffer arrays
    const k1 = new Array(n);
    const k2 = new Array(n);
    const k3 = new Array(n);
    const k4 = new Array(n);
    const s1 = new Array(n);
    const s2 = new Array(n);
    const s3 = new Array(n);

    // K1
    calcDerivatives(bodies, k1);

    // K2 state
    for (let i = 0; i < n; i++) {
        s1[i] = {
            x: bodies[i].x + k1[i].dx * dt * 0.5,
            y: bodies[i].y + k1[i].dy * dt * 0.5,
            z: bodies[i].z + k1[i].dz * dt * 0.5,
            vx: bodies[i].vx + k1[i].dvx * dt * 0.5,
            vy: bodies[i].vy + k1[i].dvy * dt * 0.5,
            vz: bodies[i].vz + k1[i].dvz * dt * 0.5,
            mass: bodies[i].mass
        };
    }
    calcDerivatives(s1, k2);

    // K3 state
    for (let i = 0; i < n; i++) {
        s2[i] = {
            x: bodies[i].x + k2[i].dx * dt * 0.5,
            y: bodies[i].y + k2[i].dy * dt * 0.5,
            z: bodies[i].z + k2[i].dz * dt * 0.5,
            vx: bodies[i].vx + k2[i].dvx * dt * 0.5,
            vy: bodies[i].vy + k2[i].dvy * dt * 0.5,
            vz: bodies[i].vz + k2[i].dvz * dt * 0.5,
            mass: bodies[i].mass
        };
    }
    calcDerivatives(s2, k3);

    // K4 state
    for (let i = 0; i < n; i++) {
        s3[i] = {
            x: bodies[i].x + k3[i].dx * dt,
            y: bodies[i].y + k3[i].dy * dt,
            z: bodies[i].z + k3[i].dz * dt,
            vx: bodies[i].vx + k3[i].dvx * dt,
            vy: bodies[i].vy + k3[i].dvy * dt,
            vz: bodies[i].vz + k3[i].dvz * dt,
            mass: bodies[i].mass
        };
    }
    calcDerivatives(s3, k4);

    // Final integration
    for (let i = 0; i < n; i++) {
        if (i === skipIndex) continue;

        bodies[i].x += (k1[i].dx + 2 * k2[i].dx + 2 * k3[i].dx + k4[i].dx) * dt / 6;
        bodies[i].y += (k1[i].dy + 2 * k2[i].dy + 2 * k3[i].dy + k4[i].dy) * dt / 6;
        bodies[i].z += (k1[i].dz + 2 * k2[i].dz + 2 * k3[i].dz + k4[i].dz) * dt / 6;
        bodies[i].vx += (k1[i].dvx + 2 * k2[i].dvx + 2 * k3[i].dvx + k4[i].dvx) * dt / 6;
        bodies[i].vy += (k1[i].dvy + 2 * k2[i].dvy + 2 * k3[i].dvy + k4[i].dvy) * dt / 6;
        bodies[i].vz += (k1[i].dvz + 2 * k2[i].dvz + 2 * k3[i].dvz + k4[i].dvz) * dt / 6;
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

        // Calculate energy stats
        const energy = calculateEnergy(updatedBodies, gravityG, coulombK);

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
