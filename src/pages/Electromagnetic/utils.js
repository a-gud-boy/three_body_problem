
/**
 * Generates a symmetric 3D spherical distribution of points using a regular latitude-longitude pattern.
 * @param {number} count - The approximate number of points to generate.
 * @returns {Array<{x: number, y: number, z: number}>} An array of point objects with x, y, z coordinates on a unit sphere.
 */
export function generateSpherePoints(count) {
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

/**
 * Generates random charge configurations.
 * @param {number} [count=15] - The number of charges to generate.
 * @returns {Array<{x: number, y: number, z: number, q: number}>} An array of charge objects.
 */
export function generateRandomCharges(count = 15) {
    return Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * 200,
        y: (Math.random() - 0.5) * 200,
        z: (Math.random() - 0.5) * 50,
        q: Math.random() > 0.5 ? 1 : -1
    }));
}
