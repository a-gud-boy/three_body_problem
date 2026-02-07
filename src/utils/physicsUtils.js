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
 * @returns {{x: number, y: number, z: number}} Field vector
 */
export function calculateField(point, charges) {
    const field = { x: 0, y: 0, z: 0 };
    for (const charge of charges) {
        const dx = point.x - charge.x;
        const dy = point.y - charge.y;
        const dz = point.z - charge.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        const dist = Math.sqrt(distSq);
        if (dist < 5) continue;
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

/**
 * Traces a field line from a starting point
 * @param {{x: number, y: number, z: number}} startPoint
 * @param {number} direction 1 for along field (from positive), -1 for against field (toward negative)
 * @param {Array<{x: number, y: number, z: number, q: number}>} charges
 * @param {Object} options Configuration options
 * @param {number} [options.maxSteps=3000] Maximum number of steps to trace
 * @param {number} [options.stepSize=6] Step size for each iteration
 * @param {string} [options.terminateAt='any'] Termination condition ('negative', 'positive', 'any')
 * @param {number} [options.chargeRadius=15] Radius of charges for termination checks
 * @param {number} [options.minFieldMag=0.001] Minimum field magnitude to continue tracing
 * @param {number} [options.bounds=1000] Maximum coordinate value for bounds check
 * @returns {Array<{x: number, y: number, z: number}>} Array of points along the field line
 */
export function traceFieldLine(startPoint, direction, charges, options = {}) {
    const {
        maxSteps = 3000,
        stepSize = 6,
        terminateAt = 'any',
        chargeRadius = 15,
        minFieldMag = 0.001,
        bounds = 1000
    } = options;

    const points = [];
    let current = { ...startPoint };

    for (let step = 0; step < maxSteps; step++) {
        points.push({ x: current.x, y: current.y, z: current.z });

        const field = calculateField(current, charges);
        const mag = Math.sqrt(field.x ** 2 + field.y ** 2 + field.z ** 2);

        if (mag < minFieldMag) break;

        // Check if near target charge type (for termination)
        if (step > 5) {
            const nearTarget = charges.some(c => {
                const d = Math.sqrt((current.x - c.x) ** 2 + (current.y - c.y) ** 2 + (current.z - c.z) ** 2);
                if (d > chargeRadius * 1.5) return false;
                if (terminateAt === 'negative') return c.q < 0;
                if (terminateAt === 'positive') return c.q > 0;
                return true; // 'any'
            });
            if (nearTarget) break;
        }

        current.x += direction * (field.x / mag) * stepSize;
        current.y += direction * (field.y / mag) * stepSize;
        current.z += direction * (field.z / mag) * stepSize;

        if (Math.abs(current.x) > bounds || Math.abs(current.y) > bounds || Math.abs(current.z) > bounds) break;
    }
    return points;
}
