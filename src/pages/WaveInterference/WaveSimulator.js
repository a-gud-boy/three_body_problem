export default class WaveSimulator {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.size = width * height;

        // Two buffers for the wave state (Current and Previous)
        // We swap them every frame.
        this.buffer1 = new Float32Array(this.size);
        this.buffer2 = new Float32Array(this.size);

        this.current = this.buffer1;
        this.previous = this.buffer2;

        // Wall grid (1 = wall, 0 = empty)
        this.walls = new Uint8Array(this.size);

        // Active oscillators
        this.sources = []; // {x, y, frequency, phase, amplitude}

        // Parameters
        this.damping = 0.99;
        this.time = 0;
    }

    reset() {
        this.buffer1.fill(0);
        this.buffer2.fill(0);
        this.walls.fill(0);
        this.sources = [];
        this.time = 0;
    }

    addSource(x, y, frequency = 0.2, amplitude = 50) {
        this.sources.push({ x, y, frequency, amplitude, phase: 0 });
    }

    setWall(x, y, isWall) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            this.walls[y * this.width + x] = isWall ? 1 : 0;
        }
    }

    addDisturbance(x, y, strength) {
        if (x >= 1 && x < this.width - 1 && y >= 1 && y < this.height - 1) {
            const idx = y * this.width + x;
            this.current[idx] = strength;
        }
    }

    step() {
        this.time += 1;

        // Apply Sources
        for (const src of this.sources) {
            if (src.x >= 0 && src.x < this.width && src.y >= 0 && src.y < this.height) {
                const idx = Math.floor(src.y) * this.width + Math.floor(src.x);
                const val = Math.sin(this.time * src.frequency) * src.amplitude;
                this.previous[idx] = val; // Force the previous buffer to drive the wave
            }
        }

        const w = this.width;
        const h = this.height;

        // Wave Equation Loop
        // We iterate inner pixels only to avoid boundary checks
        for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
                const i = y * w + x;

                if (this.walls[i] === 1) {
                    this.current[i] = 0;
                    continue;
                }

                // Standard Wave Equation Discretization
                // New = (SumNeighbors / 2) - Prev
                const val = (
                    this.previous[i - 1] +
                    this.previous[i + 1] +
                    this.previous[i - w] +
                    this.previous[i + w]
                ) / 2 - this.current[i];

                // Apply Damping
                this.current[i] = val * this.damping;
            }
        }

        // Swap buffers
        const temp = this.previous;
        this.previous = this.current;
        this.current = temp;
    }

    // Helper for rendering
    // Writes directly to an ImageData's data array (Uint8ClampedArray)
    renderToBuffer(imageData) {
        const data = imageData.data;
        const len = this.size;

        for (let i = 0; i < len; i++) {
            if (this.walls[i] === 1) {
                // Draw Wall (Gray)
                const ptr = i * 4;
                data[ptr] = 100;
                data[ptr + 1] = 100;
                data[ptr + 2] = 100;
                data[ptr + 3] = 255;
            } else {
                // Draw Wave
                const val = this.current[i];
                const ptr = i * 4;

                // Color mapping:
                // Positive (Crest) -> Blue/Cyan
                // Negative (Trough) -> Purple/Red
                // Zero -> Black/Dark Blue

                // Intensity scaling
                let intensity = Math.min(Math.abs(val) * 4, 255);

                if (val > 0) {
                    // Crest (Cyan/White)
                    data[ptr] = intensity * 0.2;     // R
                    data[ptr + 1] = intensity * 0.8; // G
                    data[ptr + 2] = intensity;       // B
                } else {
                    // Trough (Magenta)
                    data[ptr] = intensity * 0.8;     // R
                    data[ptr + 1] = intensity * 0.2; // G
                    data[ptr + 2] = intensity * 0.6; // B
                }
                data[ptr + 3] = 255; // Alpha
            }
        }
    }
}
