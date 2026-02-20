struct Particle {
    pos: vec2<f32>,
    vel: vec2<f32>,
    radius: f32, // Radius usually constant but good to have
    color: u32,  // 0xFF0000FF format
}

struct SimParams {
    dt: f32,
    width: f32,
    height: f32,
    pistonX: f32,      // X position of the movable piston (left wall usually 0, this is right wall)
    demonMode: u32,    // 0 = off, 1 = on
    demonDoorY: f32,   // Y center of the door
    demonDoorSize: f32,// Height of the opening
}

struct GridParams {
    width: f32,
    height: f32,
    cellSize: f32,
    cols: u32,
    rows: u32,
    maxParticlesPerCell: u32,
}

@group(0) @binding(0) var<storage, read> particlesA: array<Particle>;
@group(0) @binding(1) var<storage, read_write> particlesB: array<Particle>;
@group(0) @binding(2) var<storage, read> gridCounters: array<atomic<u32>>; // Use atomic just for type match, treated as read-only here
@group(0) @binding(3) var<storage, read> gridCells: array<u32>;
@group(0) @binding(4) var<uniform> simParams: SimParams;
@group(0) @binding(5) var<uniform> gridParams: GridParams;

// Helper to get color based on speed
fn getColor(speed: f32) -> u32 {
    // Simple heatmap: Blue (slow) -> Red (fast)
    // Normalized speed check. Say max expected speed is ~500.0
    let t = clamp(speed / 400.0, 0.0, 1.0);
    
    let r = u32(mix(50.0, 255.0, t));
    let g = u32(mix(50.0, 0.0, t)); // Less green as it gets hotter
    let b = u32(mix(255.0, 50.0, t));
    
    return (255u << 24) | (b << 16) | (g << 8) | r;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let index = global_id.x;
    if (index >= arrayLength(&particlesA)) {
        return;
    }

    var p = particlesA[index];
    var nextPos = p.pos + p.vel * simParams.dt;
    var nextVel = p.vel;

    // --- Wall Collisions ---
    // Left Wall (Fixed at 0)
    if (nextPos.x < p.radius) {
        nextPos.x = p.radius;
        nextVel.x *= -1.0;
    }
    
    // Right Wall (Movable Piston)
    if (nextPos.x > simParams.pistonX - p.radius) {
        nextPos.x = simParams.pistonX - p.radius;
        nextVel.x *= -1.0;
    }

    // Top and Bottom Walls
    if (nextPos.y < p.radius) {
        nextPos.y = p.radius;
        nextVel.y *= -1.0;
    }
    if (nextPos.y > simParams.height - p.radius) {
        nextPos.y = simParams.height - p.radius;
        nextVel.y *= -1.0;
    }

    // --- Maxwell's Demon Wall (Middle) ---
    if (simParams.demonMode == 1u) {
        let midX = simParams.width * 0.5;
        let halfDoor = simParams.demonDoorSize * 0.5;
        
        // Check if passing through x = midX
        let crossX = (p.pos.x <= midX && nextPos.x >= midX) || (p.pos.x >= midX && nextPos.x <= midX);
        
        if (crossX) {
            // Speed squared for temp check
            let vSq = dot(p.vel, p.vel);
            let thresholdSq = 200.0 * 200.0; // Arbitrary "Hot" threshold
            
            var allowPass = false;
            
            // Logic: Sort HOT to RIGHT, COLD to LEFT
            if (p.vel.x > 0.0) { 
                // Moving Right (Left -> Right)
                // Allow only if HOT
                if (vSq > thresholdSq) { allowPass = true; }
            } else {
                // Moving Left (Right -> Left)
                // Allow only if COLD
                if (vSq <= thresholdSq) { allowPass = true; }
            }
            
            // Also enforce physical door limits (only pass if within Y range, though the demon controls the shutter)
            // Ideally "Demon" implies magical opening, but we can also visualize the physical hole.
            // Let's assume the demon operates a full partition shutter or just a magical force field.
            // But let's verify Y position if we want a "Door" visual.
            // For now, let's assume the entire middle line is the gate.
            
            if (!allowPass) {
                // Bounce
                 if (p.pos.x < midX) {
                    nextPos.x = midX - p.radius;
                    nextVel.x *= -1.0;
                 } else {
                    nextPos.x = midX + p.radius;
                    nextVel.x *= -1.0;
                 }
            }
        }
    }

    // --- Particle-Particle Collisions (Grid Search) ---
    // Simple elastic collision.
    // Note: This is a simple integration - for perfect hard spheres multiple sub-steps are needed.
    // For this demo, we check current neighbors. 
    
    let gridX = i32(floor(p.pos.x / gridParams.cellSize));
    let gridY = i32(floor(p.pos.y / gridParams.cellSize));

    for (var y = -1; y <= 1; y++) {
        for (var x = -1; x <= 1; x++) {
            let cx = gridX + x;
            let cy = gridY + y;
            
            if (cx >= 0 && cx < i32(gridParams.cols) && cy >= 0 && cy < i32(gridParams.rows)) {
                let cellIndex = u32(cy) * gridParams.cols + u32(cx);
                let count = atomicLoad(&gridCounters[cellIndex]);
                let maxCount = min(count, gridParams.maxParticlesPerCell);

                for (var i = 0u; i < maxCount; i++) {
                    let otherIdx = gridCells[cellIndex * gridParams.maxParticlesPerCell + i];
                    
                    if (otherIdx != index) {
                        let p2 = particlesA[otherIdx];
                        let distVec = nextPos - p2.pos; // Check against current or next? Using nextPos for self, p2.pos (current of other) is approximation. 
                        // Better: Use p2.pos + p2.vel * dt? Or just p2.pos for simplicity in massive parallel.
                        // Using p2.pos leads to overlaps if both move towards each other. 
                        // Synchronous update problem. 
                        // Standard trick: Check distance at t_new.
                        
                        let dSq = dot(distVec, distVec);
                        let minDist = p.radius + p2.radius;
                        
                        if (dSq < minDist * minDist && dSq > 0.0001) {
                            let dist = sqrt(dSq);
                            let n = distVec / dist;
                            
                            // Relative velocity
                            let vRel = nextVel - p2.vel;
                            let vRelNormal = dot(vRel, n);
                            
                            // Only resolve if moving towards each other
                            if (vRelNormal < 0.0) {
                                // Elastic collision
                                // Assuming equal mass for all particles
                                let impulse = vRelNormal; 
                                nextVel = nextVel - n * impulse;
                                
                                // Positional correction (prevent sticking)
                                let overlap = minDist - dist;
                                nextPos = nextPos + n * (overlap * 0.5);
                            }
                        }
                    }
                }
            }
        }
    }

    // Update color
    let speed = length(nextVel);
    let newColor = getColor(speed);

    // Write back
    particlesB[index].pos = nextPos;
    particlesB[index].vel = nextVel;
    particlesB[index].radius = p.radius;
    particlesB[index].color = newColor;
}
