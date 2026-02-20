// stat_reduction.wgsl

struct Particle {
    pos: vec2<f32>,
    vel: vec2<f32>, // ... inputs
    radius: f32, // ...
    color: u32,
}

struct GlobalStats {
    totalKineticEnergy: atomic<u32>, // Scaled by 1000 to keep precision in u32? Or just f32 with atomicAdd feature (requires extension).
                                    // WebGPU doesn't standardly support atomic<f32> yet. 
                                    // efficient way: float to int scaled.
    totalMomentum: atomic<u32>,
    padding1: u32,
    padding2: u32,
}

@group(0) @binding(0) var<storage, read> particles: array<Particle>;
@group(0) @binding(1) var<storage, read_write> stats: GlobalStats;
@group(0) @binding(2) var<storage, read_write> histogram: array<atomic<u32>>; // 50 buckets

const WORKGROUP_SIZE = 256;
const SCALE_FACTOR = 1000.0;
const MAX_SPEED = 1000.0;
const HISTOGRAM_BUCKETS = 50u;

var<workgroup> wg_energy: atomic<u32>;

@compute @workgroup_size(WORKGROUP_SIZE)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>, @builtin(local_invocation_id) local_id: vec3<u32>) {
    // Initialize workgroup accumulators
    if (local_id.x == 0u) {
        atomicStore(&wg_energy, 0u);
    }
    workgroupBarrier();

    let index = global_id.x;
    if (index < arrayLength(&particles)) {
        let p = particles[index];
        let v_sq = dot(p.vel, p.vel);
        let energy = 0.5 * 1.0 * v_sq; // mass = 1.0
        
        // Accumulate energy (scaled)
        atomicAdd(&wg_energy, u32(energy * SCALE_FACTOR));
        
        // Update Histogram
        let speed = sqrt(v_sq);
        let bucket = u32((speed / MAX_SPEED) * f32(HISTOGRAM_BUCKETS));
        if (bucket < HISTOGRAM_BUCKETS) {
            atomicAdd(&histogram[bucket], 1u);
        }
    }
    
    workgroupBarrier();

    // Flush to global
    if (local_id.x == 0u) {
        let e = atomicLoad(&wg_energy);
        atomicAdd(&stats.totalKineticEnergy, e);
    }
}
