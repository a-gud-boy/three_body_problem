/**
 * Physics utilities for electromagnetic simulations
 */

export const COULOMB_K = 8.99e3;

/**
 * Calculates the total potential energy of a system of charges
 * @param {Array<{x: number, y: number, z: number, q: number}>} charges
 * @returns {number} The total energy in Joules (assuming SI units)
 */
export function calculateTotalEnergy(charges) {
    let energy = 0;
    for (let i = 0; i < charges.length; i++) {
        for (let j = i + 1; j < charges.length; j++) {
            const c1 = charges[i];
            const c2 = charges[j];
            const dx = c1.x - c2.x;
            const dy = c1.y - c2.y;
            const dz = c1.z - c2.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (dist > 1) { // Avoid singularity
                energy += (COULOMB_K * c1.q * c2.q) / dist;
            }
        }
    }
    return energy;
}

/**
 * Calculates the electric field vector at a given point
 * @param {{x: number, y: number, z: number}} point
 * @param {Array<{x: number, y: number, z: number, q: number}>} charges
 * @param {number} [minDistance=5] Minimum distance to avoid singularities
 * @returns {{x: number, y: number, z: number}} Field vector
 */
export function calculateField(point, charges, minDistance = 5) {
    const field = { x: 0, y: 0, z: 0 };
    for (const charge of charges) {
        const dx = point.x - charge.x;
        const dy = point.y - charge.y;
        const dz = point.z - charge.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        const dist = Math.sqrt(distSq);
        if (dist < minDistance) continue;
        const magnitude = (COULOMB_K * Math.abs(charge.q)) / distSq;
        const sign = charge.q > 0 ? 1 : -1;
        field.x += sign * magnitude * (dx / dist);
        field.y += sign * magnitude * (dy / dist);
        field.z += sign * magnitude * (dz / dist);
    }
    return field;
}

/**
 * Calculates the electrostatic force magnitude between two charges
 * @param {number} q1 Charge 1
 * @param {number} q2 Charge 2
 * @param {number} distSq Squared distance between charges
 * @returns {number} Force magnitude
 */
export function calculateElectrostaticForce(q1, q2, distSq) {
    return (COULOMB_K * q1 * q2) / distSq;
}
