// Smoothing Kernels
// Poly6 Kernel for Density Calculation
export const poly6 = (r2, h2, h9) => {
    if (r2 > h2) return 0;
    const diff = h2 - r2;
    return (315 / (64 * Math.PI * h9)) * diff * diff * diff;
};

// Spiky Gradient Kernel for Pressure Force (returns magnitude scaling factor)
export const spikyGradient = (r, h) => {
    if (r > h || r <= 0) return 0;
    const diff = h - r;
    return -(45 / (Math.PI * Math.pow(h, 6))) * diff * diff;
};

// Viscosity Laplacian Kernel
export const viscosityLaplacian = (r, h) => {
    if (r > h) return 0;
    const diff = h - r;
    // Standard Laplacian approximation
    return (45 / (Math.PI * Math.pow(h, 6))) * diff;
};

// --- Spatial Hash for O(1) Neighbor Search ---
export class SpatialHash {
    constructor(spacing, maxParticles) {
        this.spacing = spacing;
        this.tableSize = 2 * maxParticles;
        this.table = new Int32Array(this.tableSize).fill(-1);
        this.next = new Int32Array(maxParticles).fill(-1);
        // Pre-allocate neighborhood buffer to avoid GC
        this.neighbors = new Int32Array(500); // Max neighbors per particle
        this.neighborCount = 0;
    }

    hash(x, y) {
        const h = (Math.floor(x / this.spacing) * 92837111) ^ (Math.floor(y / this.spacing) * 689287499);
        return Math.abs(h) % this.tableSize;
    }

    insert(particleIndex, x, y) {
        const h = this.hash(x, y);
        this.next[particleIndex] = this.table[h];
        this.table[h] = particleIndex;
    }

    clear() {
        this.table.fill(-1);
        this.next.fill(-1);
    }

    // Returns count of found neighbors
    query(x, y) {
        this.neighborCount = 0;
        const cellX = Math.floor(x / this.spacing);
        const cellY = Math.floor(y / this.spacing);

        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                const h = (Math.abs((cellX + i) * 92837111 ^ (cellY + j) * 689287499)) % this.tableSize;
                let particleIdx = this.table[h];
                while (particleIdx !== -1) {
                    if (this.neighborCount < this.neighbors.length) {
                        this.neighbors[this.neighborCount++] = particleIdx;
                    }
                    particleIdx = this.next[particleIdx];
                }
            }
        }
        return this.neighborCount;
    }
}
