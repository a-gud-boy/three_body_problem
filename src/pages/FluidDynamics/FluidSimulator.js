import { poly6, spikyGradient, SpatialHash } from './sphPhysics';

export default class FluidSimulator {
    constructor(canvasWidth, canvasHeight, maxParticles = 2000) {
        this.width = canvasWidth;
        this.height = canvasHeight;
        this.maxParticles = maxParticles;
        this.numParticles = 0;

        // Physics Constants
        this.h = 22; // Increased Smoothing Radius for better connectivity
        this.h2 = this.h * this.h;
        this.h9 = Math.pow(this.h, 9);

        // Tunable Parameters
        this.restDensity = 0.0002; // Adjusted for new H
        this.stiffness = 3000;
        this.viscosity = 200;
        this.gravity = 0.5;
        this.dt = 0.016;
        this.timeScale = 1.0;

        // Particle Arrays (Struct of Arrays)
        this.x = new Float32Array(maxParticles);
        this.y = new Float32Array(maxParticles);
        this.vx = new Float32Array(maxParticles);
        this.vy = new Float32Array(maxParticles);
        this.density = new Float32Array(maxParticles);
        this.pressure = new Float32Array(maxParticles);

        // Forces
        this.fx = new Float32Array(maxParticles);
        this.fy = new Float32Array(maxParticles);

        // Spatial Hash
        this.grid = new SpatialHash(this.h, maxParticles);

        // Obstacles [{x, y, radius}]
        this.obstacles = [];
    }

    addParticles(startX, startY, count, spread = 20) {
        for (let k = 0; k < count; k++) {
            if (this.numParticles >= this.maxParticles) break;
            const i = this.numParticles;
            this.x[i] = startX + (Math.random() - 0.5) * spread;
            this.y[i] = startY + (Math.random() - 0.5) * spread;
            this.vx[i] = (Math.random() - 0.5) * 2;
            this.vy[i] = (Math.random() - 0.5) * 2;
            this.numParticles++;
        }
    }

    reset(scenario = 'DAM_BREAK') {
        this.numParticles = 0;
        this.obstacles = [];
        const spacing = this.h * 0.6;

        if (scenario === 'DAM_BREAK') {
            const cols = 30;
            const rows = 40;
            for (let i = 0; i < cols; i++) {
                for (let j = 0; j < rows; j++) {
                    if (this.numParticles >= this.maxParticles) break;
                    this.x[this.numParticles] = 50 + i * spacing + Math.random();
                    this.y[this.numParticles] = this.height - 50 - j * spacing + Math.random();
                    this.vx[this.numParticles] = 0;
                    this.vy[this.numParticles] = 0;
                    this.numParticles++;
                }
            }
        } else if (scenario === 'DOUBLE_DAM') {
            const cols = 20;
            const rows = 40;
            // Left block
            for (let i = 0; i < cols; i++) {
                for (let j = 0; j < rows; j++) {
                    if (this.numParticles >= this.maxParticles) break;
                    this.x[this.numParticles] = 50 + i * spacing;
                    this.y[this.numParticles] = this.height - 50 - j * spacing;
                    this.vx[this.numParticles] = 5;
                    this.vy[this.numParticles] = 0;
                    this.numParticles++;
                }
            }
            // Right block
            for (let i = 0; i < cols; i++) {
                for (let j = 0; j < rows; j++) {
                    if (this.numParticles >= this.maxParticles) break;
                    this.x[this.numParticles] = this.width - 50 - i * spacing;
                    this.y[this.numParticles] = this.height - 50 - j * spacing;
                    this.vx[this.numParticles] = -5;
                    this.vy[this.numParticles] = 0;
                    this.numParticles++;
                }
            }
        } else if (scenario === 'ZERO_G') {
            this.gravity = 0;
            // Blob in middle
            const count = 800;
            const cx = this.width / 2;
            const cy = this.height / 2;
            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const r = Math.sqrt(Math.random()) * 100;
                this.x[this.numParticles] = cx + Math.cos(angle) * r;
                this.y[this.numParticles] = cy + Math.sin(angle) * r;
                this.vx[this.numParticles] = (Math.random() - 0.5);
                this.vy[this.numParticles] = (Math.random() - 0.5);
                this.numParticles++;
            }
        } else if (scenario === 'GALAXY') {
            this.gravity = 0;
            const count = 1000;
            const cx = this.width / 2;
            const cy = this.height / 2;
            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const r = 20 + Math.sqrt(Math.random()) * 150;
                this.x[this.numParticles] = cx + Math.cos(angle) * r;
                this.y[this.numParticles] = cy + Math.sin(angle) * r;

                // Orbital velocity
                const speed = 800 / r;
                this.vx[this.numParticles] = Math.sin(angle) * speed; // Tangential
                this.vy[this.numParticles] = -Math.cos(angle) * speed;
                this.numParticles++;
            }
        }
    }

    step(mouse) {
        const dt = this.dt * this.timeScale;

        // 1. Build Spatial Hash
        this.grid.clear();
        for (let i = 0; i < this.numParticles; i++) {
            this.grid.insert(i, this.x[i], this.y[i]);
        }

        // 2. Compute Density & Pressure
        for (let i = 0; i < this.numParticles; i++) {
            let rho = 0;
            const neighborCount = this.grid.query(this.x[i], this.y[i]);

            for (let k = 0; k < neighborCount; k++) {
                const j = this.grid.neighbors[k];
                const dx = this.x[j] - this.x[i];
                const dy = this.y[j] - this.y[i];
                const r2 = dx * dx + dy * dy;

                if (r2 < this.h2) {
                    rho += poly6(r2, this.h2, this.h9);
                }
            }

            this.density[i] = Math.max(rho, this.restDensity);
            this.pressure[i] = this.stiffness * (this.density[i] - this.restDensity);
        }

        // 3. Compute Forces
        for (let i = 0; i < this.numParticles; i++) {
            this.fx[i] = 0;
            this.fy[i] = this.gravity * this.density[i];

            const neighborCount = this.grid.query(this.x[i], this.y[i]);

            for (let k = 0; k < neighborCount; k++) {
                const j = this.grid.neighbors[k];
                if (i === j) continue;

                const dx = this.x[j] - this.x[i];
                const dy = this.y[j] - this.y[i];
                const r2 = dx * dx + dy * dy;

                if (r2 < this.h2 && r2 > 0.0001) {
                    const r = Math.sqrt(r2);

                    // Pressure Force
                    const pressureForce = (this.pressure[i] + this.pressure[j]) / (2 * this.density[j]);
                    const gradW = spikyGradient(r, this.h);
                    const fPress = -pressureForce * gradW;

                    const normX = dx / r;
                    const normY = dy / r;

                    this.fx[i] += fPress * normX;
                    this.fy[i] += fPress * normY;

                    // Viscosity Force
                    const viscKernel = (this.h - r);
                    const dvx = this.vx[j] - this.vx[i];
                    const dvy = this.vy[j] - this.vy[i];
                    const viscTerm = (this.viscosity * viscKernel) / this.density[j];

                    this.fx[i] += dvx * viscTerm * 0.01;
                    this.fy[i] += dvy * viscTerm * 0.01;
                }
            }

            // Mouse Interaction (Force)
            if (mouse.isPressed && !mouse.isPouring) {
                const dx = mouse.x - this.x[i];
                const dy = mouse.y - this.y[i];
                const distSq = dx * dx + dy * dy;
                const radiusSq = 150 * 150;

                if (distSq < radiusSq) {
                    const dist = Math.sqrt(distSq);
                    const force = (150 - dist) / 150;

                    // F = ma -> we are adding to Force directly
                    // Scale factor 2000 for noticeable effect
                    const strength = 2000 * this.density[i];

                    if (mouse.button === 0) { // Left: Repel
                        this.fx[i] -= (dx / dist) * force * strength;
                        this.fy[i] -= (dy / dist) * force * strength;
                    } else if (mouse.button === 2) { // Right: Attract
                        this.fx[i] += (dx / dist) * force * strength;
                        this.fy[i] += (dy / dist) * force * strength;
                    }
                }
            }
        }

        // 4. Integration & Boundary
        const damping = 0.5;
        const boundX = 0;
        const boundY = 0;
        const boundW = this.width;
        const boundH = this.height;

        for (let i = 0; i < this.numParticles; i++) {
            const ax = this.fx[i] / this.density[i];
            const ay = this.fy[i] / this.density[i];

            this.vx[i] += ax * dt;
            this.vy[i] += ay * dt;

            this.x[i] += this.vx[i] * dt * 10;
            this.y[i] += this.vy[i] * dt * 10;

            // Box Boundary
            if (this.x[i] < boundX + this.h) {
                this.vx[i] *= -damping;
                this.x[i] = boundX + this.h;
            } else if (this.x[i] > boundW - this.h) {
                this.vx[i] *= -damping;
                this.x[i] = boundW - this.h;
            }

            if (this.y[i] < boundY + this.h) {
                this.vy[i] *= -damping;
                this.y[i] = boundY + this.h;
            } else if (this.y[i] > boundH - this.h) {
                this.vy[i] *= -damping;
                this.y[i] = boundH - this.h;
            }

            // Obstacle Collision
            for (const obs of this.obstacles) {
                const dx = this.x[i] - obs.x;
                const dy = this.y[i] - obs.y;
                const distSq = dx * dx + dy * dy;
                const minDist = obs.radius + this.h * 0.5; // Particle radius approx h/2

                if (distSq < minDist * minDist) {
                    const dist = Math.sqrt(distSq);
                    const nx = dx / dist;
                    const ny = dy / dist;

                    // Penetration depth
                    const pen = minDist - dist;

                    // Resolve position
                    this.x[i] += nx * pen;
                    this.y[i] += ny * pen;

                    // Reflect velocity
                    // v_new = v - 2*(v.n)*n
                    const dot = this.vx[i] * nx + this.vy[i] * ny;
                    this.vx[i] -= 2 * dot * nx;
                    this.vy[i] -= 2 * dot * ny;

                    // Damping
                    this.vx[i] *= 0.8;
                    this.vy[i] *= 0.8;
                }
            }
        }
    }
}
