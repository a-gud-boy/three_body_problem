export default class SoftBodyPhysics {
    constructor(width, height) {
        this.width = width;
        this.height = height;

        this.particles = []; // {x, y, oldx, oldy, mass, invMass, locked, radius, fx, fy}
        this.springs = [];   // {p1, p2, restLength, stiffness}

        // Params
        this.gravity = 0.5;
        this.friction = 0.99;
        this.groundFriction = 0.9;
        this.mouseStiffness = 1.0;

        this.numIterations = 5; // Sub-steps for constraint solving
    }

    reset() {
        this.particles = [];
        this.springs = [];
    }

    addParticle(x, y, mass = 1, locked = false) {
        const p = {
            x, y,
            oldx: x, oldy: y, // Verlet history
            mass,
            invMass: locked ? 0 : 1 / mass,
            locked,
            radius: 4,
            fx: 0, fy: 0
        };
        this.particles.push(p);
        return p;
    }

    addSpring(p1, p2, stiffness = 1.0, damping = 0.0, length = null) {
        if (!length) {
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            length = Math.sqrt(dx * dx + dy * dy);
        }
        // Stiffness in PBD is 0..1 (1 = rigid)
        this.springs.push({
            p1, p2,
            restLength: length,
            stiffness: Math.min(Math.max(stiffness, 0.01), 1.0)
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
                    this.addSpring(p, this.particles[idx + 1], stiffness);
                }
                // Down
                if (j < rows - 1) {
                    this.addSpring(p, this.particles[idx + cols], stiffness);
                }
                // Diagonal (Shear stability)
                if (i < cols - 1 && j < rows - 1) {
                    this.addSpring(p, this.particles[idx + cols + 1], stiffness);
                    this.addSpring(this.particles[idx + 1], this.particles[idx + cols], stiffness);
                }
            }
        }
    }

    createRope(x, y, segments, length, stiffness) {
        let prev = this.addParticle(x, y, 1, true); // Locked start
        for(let i=0; i<segments; i++) {
            const next = this.addParticle(x + (i+1)*length/segments, y + i*2);
            this.addSpring(prev, next, stiffness);
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
            this.addSpring(center, p, stiffness);
        }

        // Connect Rim
        for(let i=0; i<segments; i++) {
            const p1 = rim[i];
            const p2 = rim[(i + 1) % segments];
            this.addSpring(p1, p2, stiffness);
            // Cross springs for stability
            const p3 = rim[(i + 2) % segments];
             this.addSpring(p1, p3, stiffness);
        }
    }

    update(mouse) {
        // Verlet Integration (Time Corrected is usually better, but fixed dt assumption is fine for this demo)
        // We assume approx 60fps, so dt is constant-ish.

        // 1. Accumulate Forces (Gravity + Mouse)
        for (const p of this.particles) {
            if (p.locked) continue;

            // Gravity
            p.fx = 0;
            p.fy = this.gravity * 0.5; // Scale gravity for Verlet
        }

        // Mouse Drag (Simple position override or force)
        // For stability, let's just pull it strongly
        if (mouse.isPressed && mouse.draggedParticle) {
            const p = mouse.draggedParticle;
            // Move particle towards mouse slowly? Or just set velocity?
            // Let's add a strong force
            const dx = mouse.x - p.x;
            const dy = mouse.y - p.y;
            p.fx += dx * 0.1;
            p.fy += dy * 0.1;
        }

        // 2. Verlet Step
        for (const p of this.particles) {
            if (p.locked) continue;

            const vx = (p.x - p.oldx) * this.friction;
            const vy = (p.y - p.oldy) * this.friction;

            p.oldx = p.x;
            p.oldy = p.y;

            p.x += vx + p.fx;
            p.y += vy + p.fy;
        }

        // 3. Constraints (Relaxation)
        // Iterate multiple times for stiffness
        const subSteps = 5;
        for (let i = 0; i < subSteps; i++) {
            this.solveConstraints();
            this.solveBoundaries();
        }
    }

    solveConstraints() {
        for (const s of this.springs) {
            const dx = s.p1.x - s.p2.x;
            const dy = s.p1.y - s.p2.y;
            const dist = Math.sqrt(dx*dx + dy*dy);

            if (dist === 0) continue;

            // Ratio of how much to move
            const diff = (dist - s.restLength) / dist;

            // If one is locked, the other takes full displacement
            let w1 = s.p1.invMass;
            let w2 = s.p2.invMass;
            const wTotal = w1 + w2;

            if (wTotal === 0) continue; // Both locked

            const correction = diff * s.stiffness;

            // Move proportional to inverse mass (locked = 0 invMass)
            const move1 = correction * (w1 / wTotal);
            const move2 = correction * (w2 / wTotal);

            const offsetX = dx;
            const offsetY = dy;

            if (!s.p1.locked) {
                s.p1.x -= offsetX * move1;
                s.p1.y -= offsetY * move1;
            }
            if (!s.p2.locked) {
                s.p2.x += offsetX * move2;
                s.p2.y += offsetY * move2;
            }
        }
    }

    solveBoundaries() {
        for (const p of this.particles) {
            if (p.locked) continue;

            const vx = p.x - p.oldx;
            const vy = p.y - p.oldy;

            if (p.y > this.height - p.radius) {
                p.y = this.height - p.radius;
                // Friction on ground: Reduce horizontal velocity
                const newVx = vx * this.groundFriction;
                // p.oldx should be set so (p.x - p.oldx) equals new velocity
                p.oldx = p.x - newVx;
            } else if (p.y < p.radius) {
                p.y = p.radius;
                // Simple bounce off ceiling
                const newVy = vy * -0.5;
                p.oldy = p.y - newVy;
            }

            if (p.x > this.width - p.radius) {
                p.x = this.width - p.radius;
                const newVx = vx * -0.5; // Bounce
                p.oldx = p.x - newVx;
            } else if (p.x < p.radius) {
                p.x = p.radius;
                const newVx = vx * -0.5;
                p.oldx = p.x - newVx;
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
