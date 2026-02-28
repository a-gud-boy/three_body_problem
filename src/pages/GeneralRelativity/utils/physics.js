// src/pages/GeneralRelativity/utils/physics.js

// Constants
export const G = 1.0; // Normalized Gravitational Constant for simulation
export const C = 100.0; // Speed of light (adjustable, but default high)
export const C_SQ = C * C;

/**
 * Calculates the Schwarzschild Radius (Event Horizon radius) for a given mass.
 * Rs = 2GM / c^2
 */
export const calculateSchwarzschildRadius = (mass, speedOfLight = C) => {
    return (2 * G * mass) / (speedOfLight * speedOfLight);
};

/**
 * Calculates the Gravitational Potential at a distance r.
 * Supports Newtonian and Paczyński-Wiita (Pseudo-Newtonian for GR).
 *
 * Newtonian: V = -GM / r
 * Paczyński-Wiita: V = -GM / (r - Rs)
 */
export const calculatePotential = (mass, r, type = 'newtonian', speedOfLight = C, rs = null) => {
    if (r <= 0.1) return -Infinity; // Singularity guard

    if (type === 'newtonian') {
        return -(G * mass) / r;
    } else if (type === 'relativistic') {
        const actualRs = rs !== null ? rs : calculateSchwarzschildRadius(mass, speedOfLight);
        if (r <= actualRs) return -Infinity; // Inside event horizon
        return -(G * mass) / (r - actualRs);
    }
    return 0;
};

/**
 * Calculates the Acceleration vector for a test particle at `pos` due to `massObject`.
 * F = -dV/dr
 *
 * Newtonian Force: F = -GM/r^2
 * Paczyński-Wiita Force: F = -GM / (r - Rs)^2
 *
 * Returns result in `outVector` (THREE.Vector3-like object {x,y,z})
 */
export const calculateAcceleration = (pos, massPos, mass, outVector, type = 'newtonian', speedOfLight = C, rs = null) => {
    const dx = pos.x - massPos.x;
    const dy = pos.y - massPos.y;
    const dz = pos.z - massPos.z;
    const rSq = dx*dx + dy*dy + dz*dz;
    const r = Math.sqrt(rSq);

    // Softening to prevent infinity
    if (r < 0.1) {
        outVector.x = 0;
        outVector.y = 0;
        outVector.z = 0;
        return;
    }

    let forceMag = 0;

    if (type === 'newtonian') {
        forceMag = -(G * mass) / rSq;
    } else if (type === 'relativistic') {
        const actualRs = rs !== null ? rs : calculateSchwarzschildRadius(mass, speedOfLight);
        const denom = r - actualRs;
        if (denom <= 0.01) {
             // Extremely high force near event horizon, but cap it to prevent numerical explosion
             forceMag = -10000;
        } else {
             forceMag = -(G * mass) / (denom * denom);
        }
    }

    // F = ma -> a = F/m_test. Here forceMag is actually acceleration magnitude (GM/r^2)

    // Decompose to components: a_x = a_total * (dx/r)
    const factor = forceMag / r;

    outVector.x += dx * factor;
    outVector.y += dy * factor;
    outVector.z += dz * factor;
};

/**
 * Calculates orbital velocity for a circular orbit at radius r
 * v = sqrt(r * a)
 */
export const calculateOrbitalVelocity = (mass, r, type = 'newtonian', speedOfLight = C, rs = null) => {
    if (type === 'newtonian') {
        return Math.sqrt((G * mass) / r);
    } else {
        // Pseudo-Newtonian orbital velocity
        // F = mv^2/r  => v = sqrt(r * F_mag)
        // F_pw = GM / (r - rs)^2
        // v = sqrt( r * GM / (r - rs)^2 )
        const actualRs = rs !== null ? rs : calculateSchwarzschildRadius(mass, speedOfLight);
        const denom = r - actualRs;
        if (denom <= 0) return 0;
        return Math.sqrt((r * G * mass) / (denom * denom));
    }
};
