export default class SoftBodyPhysics {
    constructor(width, height) {
        this.width = width;
        this.height = height;

        this.particles = []; // {x, y, vx, vy, mass, locked, radius}
        this.springs = [];   // {p1, p2, restLength, stiffness, damping}

        // Params
        this.gravity = 0.5;
        this.friction = 0.99;
        this.groundFriction = 0.8;
        this.mouseStiffness = 0.2;
    }

    reset() {
        this.particles = [];
        this.springs = [];
    }

    addParticle(x, y, mass = 1, locked = false) {
        const p = {
            x, y,
            vx: 0, vy: 0,
            mass,
            invMass: locked ? 0 : 1 / mass,
            locked,
            radius: 4,
            fx: 0, fy: 0
        };
        this.particles.push(p);
        return p;
    }

    addSpring(p1, p2, stiffness = 0.1, damping = 0.5, length = null) {
        if (!length) {
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            length = Math.sqrt(dx * dx + dy * dy);
        }
        this.springs.push({
            p1, p2,
            restLength: length,
            stiffness,
            damping
        });
    }

    createBox(x, y, cols, rows, spacing, stiffness, damping) {
        const startIdx = this.particles.length;

        // Create Grid
        for(let j=0; j<rows; j++) {
            for(let i=0; i<cols; i++) {
                this.addParticle(x + i*spacing, y + j*spacing);
            }
        }

        // Connect Grid
        for(let j=0; j<rows; j++) {
            for(let i=0; i<cols; i++) {
                const idx = startIdx + j*cols + i;
                const p = this.particles[idx];

                // Right
                if (i < cols - 1) {
                    this.addSpring(p, this.particles[idx + 1], stiffness, damping);
                }
                // Down
                if (j < rows - 1) {
                    this.addSpring(p, this.particles[idx + cols], stiffness, damping);
                }
                // Diagonal (Shear stability)
                if (i < cols - 1 && j < rows - 1) {
                    this.addSpring(p, this.particles[idx + cols + 1], stiffness, damping);
                    this.addSpring(this.particles[idx + 1], this.particles[idx + cols], stiffness, damping);
                }
            }
        }
    }

    createRope(x, y, segments, length, stiffness) {
        let prev = this.addParticle(x, y, 1, true); // Locked start
        for(let i=0; i<segments; i++) {
            const next = this.addParticle(x + (i+1)*length/segments, y + i*2);
            this.addSpring(prev, next, stiffness, 0.1);
            prev = next;
        }
    }

    createJelly(centerX, centerY, radius, segments, stiffness) {
        const center = this.addParticle(centerX, centerY, 1);
        const rim = [];

        for(let i=0; i<segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const px = centerX + Math.cos(angle) * radius;
            const py = centerY + Math.sin(angle) * radius;
            const p = this.addParticle(px, py, 1);
            rim.push(p);

            // Spoke
            this.addSpring(center, p, stiffness, 0.5);
        }

        // Connect Rim
        for(let i=0; i<segments; i++) {
            const p1 = rim[i];
            const p2 = rim[(i + 1) % segments];
            this.addSpring(p1, p2, stiffness, 0.5);
            // Cross springs for stability
            const p3 = rim[(i + 2) % segments];
             this.addSpring(p1, p3, stiffness, 0.5);
        }
    }

    update(mouse) {
        // 1. Accumulate Forces
        for (const p of this.particles) {
            p.fx = 0;
            p.fy = this.gravity; // Gravity
        }

        // Mouse Drag Force
        if (mouse.isPressed && mouse.draggedParticle) {
            const p = mouse.draggedParticle;
            const dx = mouse.x - p.x;
            const dy = mouse.y - p.y;
            p.fx += dx * this.mouseStiffness;
            p.fy += dy * this.mouseStiffness;
            p.vx *= 0.9; // Extra damping when dragging
            p.vy *= 0.9;
        }

        // Spring Forces
        for (const s of this.springs) {
            const dx = s.p2.x - s.p1.x;
            const dy = s.p2.y - s.p1.y;
            const dist = Math.sqrt(dx*dx + dy*dy);

            if (dist === 0) continue;

            const forceVal = (dist - s.restLength) * s.stiffness;
            const nx = dx / dist;
            const ny = dy / dist;

            // Damping (relative velocity)
            const dvx = s.p2.vx - s.p1.vx;
            const dvy = s.p2.vy - s.p1.vy;
            const damper = (dvx * nx + dvy * ny) * s.damping;

            const totalForce = forceVal + damper;

            const fx = nx * totalForce;
            const fy = ny * totalForce;

            if (!s.p1.locked) {
                s.p1.fx += fx;
                s.p1.fy += fy;
            }
            if (!s.p2.locked) {
                s.p2.fx -= fx;
                s.p2.fy -= fy;
            }
        }

        // 2. Integration (Semi-Implicit Euler)
        for (const p of this.particles) {
            if (p.locked) continue;

            const ax = p.fx * p.invMass;
            const ay = p.fy * p.invMass;

            p.vx += ax;
            p.vy += ay;

            p.vx *= this.friction;
            p.vy *= this.friction;

            p.x += p.vx;
            p.y += p.vy;

            // 3. Boundaries
            if (p.y > this.height - p.radius) {
                p.y = this.height - p.radius;
                p.vy *= -this.groundFriction;
                p.vx *= this.groundFriction;
            } else if (p.y < p.radius) {
                p.y = p.radius;
                p.vy *= -this.groundFriction;
            }

            if (p.x > this.width - p.radius) {
                p.x = this.width - p.radius;
                p.vx *= -this.groundFriction;
            } else if (p.x < p.radius) {
                p.x = p.radius;
                p.vx *= -this.groundFriction;
            }
        }
    }

    findNearestParticle(x, y, radius = 50) {
        let nearest = null;
        let minDist = radius * radius;
        for (const p of this.particles) {
            const dx = x - p.x;
            const dy = y - p.y;
            const d2 = dx*dx + dy*dy;
            if (d2 < minDist) {
                minDist = d2;
                nearest = p;
            }
        }
        return nearest;
    }
}
