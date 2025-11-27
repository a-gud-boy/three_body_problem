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
function calculateAccelerations(bodies, G, skipIndex) {
    const accelerations = bodies.map(() => ({ ax: 0, ay: 0, az: 0 }));
    
    for (let i = 0; i < bodies.length; i++) {
        if (i === skipIndex) continue;
        
        for (let j = 0; j < bodies.length; j++) {
            if (i === j) continue;
            
            const dx = bodies[j].x - bodies[i].x;
            const dy = bodies[j].y - bodies[i].y;
            const dz = bodies[j].z - bodies[i].z;
            const distSq = dx * dx + dy * dy + dz * dz + SOFTENING * SOFTENING;
            const dist = Math.sqrt(distSq);
            const f = (G * bodies[j].mass) / distSq;
            
            accelerations[i].ax += f * (dx / dist);
            accelerations[i].ay += f * (dy / dist);
            accelerations[i].az += f * (dz / dist);
        }
    }
    
    return accelerations;
}

/**
 * Symplectic Euler Integration (velocity then position)
 */
function integrateEuler(bodies, dt, G, skipIndex) {
    const accelerations = calculateAccelerations(bodies, G, skipIndex);
    
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
 * RK4 Integration (4th order Runge-Kutta)
 */
function integrateRK4(bodies, dt, G, skipIndex) {
    const n = bodies.length;
    const soft = SOFTENING;
    
    // Calculate derivatives for a given state
    const calcDerivatives = (state) => {
        const derivs = new Array(n);
        
        for (let i = 0; i < n; i++) {
            let ax = 0, ay = 0, az = 0;
            
            for (let j = 0; j < n; j++) {
                if (i === j) continue;
                
                const dx = state[j].x - state[i].x;
                const dy = state[j].y - state[i].y;
                const dz = state[j].z - state[i].z;
                const distSq = dx * dx + dy * dy + dz * dz + soft * soft;
                const dist = Math.sqrt(distSq);
                const f = (G * state[j].mass) / distSq;
                
                ax += f * (dx / dist);
                ay += f * (dy / dist);
                az += f * (dz / dist);
            }
            
            derivs[i] = {
                dx: state[i].vx,
                dy: state[i].vy,
                dz: state[i].vz,
                dvx: ax,
                dvy: ay,
                dvz: az
            };
        }
        
        return derivs;
    };
    
    // K1
    const k1 = calcDerivatives(bodies);
    
    // K2 state
    const s1 = bodies.map((b, i) => ({
        x: b.x + k1[i].dx * dt * 0.5,
        y: b.y + k1[i].dy * dt * 0.5,
        z: b.z + k1[i].dz * dt * 0.5,
        vx: b.vx + k1[i].dvx * dt * 0.5,
        vy: b.vy + k1[i].dvy * dt * 0.5,
        vz: b.vz + k1[i].dvz * dt * 0.5,
        mass: b.mass
    }));
    const k2 = calcDerivatives(s1);
    
    // K3 state
    const s2 = bodies.map((b, i) => ({
        x: b.x + k2[i].dx * dt * 0.5,
        y: b.y + k2[i].dy * dt * 0.5,
        z: b.z + k2[i].dz * dt * 0.5,
        vx: b.vx + k2[i].dvx * dt * 0.5,
        vy: b.vy + k2[i].dvy * dt * 0.5,
        vz: b.vz + k2[i].dvz * dt * 0.5,
        mass: b.mass
    }));
    const k3 = calcDerivatives(s2);
    
    // K4 state
    const s3 = bodies.map((b, i) => ({
        x: b.x + k3[i].dx * dt,
        y: b.y + k3[i].dy * dt,
        z: b.z + k3[i].dz * dt,
        vx: b.vx + k3[i].dvx * dt,
        vy: b.vy + k3[i].dvy * dt,
        vz: b.vz + k3[i].dvz * dt,
        mass: b.mass
    }));
    const k4 = calcDerivatives(s3);
    
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
function calculateEnergy(bodies, G) {
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
            }
        }
    }
    
    return { ke: totalKE, pe: totalPE, total: totalKE + totalPE };
}

/**
 * Main message handler
 */
self.onmessage = function(e) {
    const { type, bodies, config } = e.data;
    
    if (type === 'UPDATE') {
        const {
            simSpeed = 1,
            timeDirection = 1,
            gravityG = 1,
            physicsMode = 'EULER',
            enableCollisions = false,
            skipIndex = null,
            currentTime = 0
        } = config;
        
        const dt = 0.01 * simSpeed * timeDirection;
        
        // Clone bodies to avoid mutation issues
        let updatedBodies = bodies.map(b => ({ ...b }));
        
        // Integration
        if (physicsMode === 'EULER') {
            updatedBodies = integrateEuler(updatedBodies, dt, gravityG, skipIndex);
        } else {
            updatedBodies = integrateRK4(updatedBodies, dt, gravityG, skipIndex);
        }
        
        // Collision handling
        let removedIndices = [];
        if (enableCollisions) {
            const result = handleCollisions(updatedBodies, skipIndex);
            updatedBodies = result.bodies;
            removedIndices = result.removedIndices;
        }
        
        // Calculate energy stats
        const energy = calculateEnergy(updatedBodies, gravityG);
        
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
