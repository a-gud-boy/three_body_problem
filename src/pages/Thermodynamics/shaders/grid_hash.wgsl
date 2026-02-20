// grid_hash.wgsl

struct Particle {
    pos: vec2<f32>,
    vel: vec2<f32>,
    radius: f32,
    color: u32,
}

struct GridParams {
    width: f32,
    height: f32,
    cellSize: f32,
    cols: u32,
    rows: u32,
    maxParticlesPerCell: u32,
}

@group(0) @binding(0) var<storage, read> particles: array<Particle>;
@group(0) @binding(1) var<storage, read_write> gridCounters: array<atomic<u32>>;
@group(0) @binding(2) var<storage, read_write> gridCells: array<u32>; // Flattened: cellIndex * maxParticlesPerCell + offset
@group(0) @binding(3) var<uniform> params: GridParams;

const WORKGROUP_SIZE = 256;

@compute @workgroup_size(WORKGROUP_SIZE)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let index = global_id.x;
    if (index >= arrayLength(&particles)) {
        return;
    }

    let p = particles[index];
    
    // Calculate grid cell coordinates
    let cellX = u32(clamp(p.pos.x / params.cellSize, 0.0, f32(params.cols - 1u)));
    let cellY = u32(clamp(p.pos.y / params.cellSize, 0.0, f32(params.rows - 1u)));
    let cellIndex = cellY * params.cols + cellX;

    // Atomic increment to get slot in the cell
    let slot = atomicAdd(&gridCounters[cellIndex], 1u);

    // If cell is not full, store particle index
    if (slot < params.maxParticlesPerCell) {
        let flatIndex = cellIndex * params.maxParticlesPerCell + slot;
        gridCells[flatIndex] = index;
    }
}
