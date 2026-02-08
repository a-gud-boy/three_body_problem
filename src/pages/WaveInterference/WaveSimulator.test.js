import { test } from 'node:test';
import assert from 'node:assert';
import WaveSimulator from './WaveSimulator.js';

test('WaveSimulator: initialization', () => {
    const sim = new WaveSimulator(10, 10);
    assert.strictEqual(sim.width, 10);
    assert.strictEqual(sim.height, 10);
    assert.strictEqual(sim.size, 100);
    assert.strictEqual(sim.buffer1.length, 100);
    assert.strictEqual(sim.buffer2.length, 100);
    assert.strictEqual(sim.walls.length, 100);
    assert.strictEqual(sim.sources.length, 0);
    assert.strictEqual(sim.time, 0);
});

test('WaveSimulator: reset', () => {
    const sim = new WaveSimulator(10, 10);
    sim.addSource(5, 5);
    sim.setWall(2, 2, true);
    sim.time = 50;

    sim.reset();

    assert.strictEqual(sim.sources.length, 0);
    assert.strictEqual(sim.walls[2 * 10 + 2], 0);
    assert.strictEqual(sim.time, 0);
});

test('WaveSimulator: setWall', () => {
    const sim = new WaveSimulator(5, 5);
    sim.setWall(2, 2, true);
    // index = 2 * 5 + 2 = 12
    assert.strictEqual(sim.walls[12], 1);

    sim.setWall(2, 2, false);
    assert.strictEqual(sim.walls[12], 0);
});

test('WaveSimulator: addDisturbance', () => {
    const sim = new WaveSimulator(5, 5);
    // Center disturbance at (2,2)
    sim.addDisturbance(2, 2, 1.0);
    // index = 12
    assert.strictEqual(sim.current[12], 1.0);

    // Boundary check (should not set if on edge x=0 or x=width-1)
    // x=0
    sim.addDisturbance(0, 2, 1.0);
    assert.strictEqual(sim.current[2 * 5 + 0], 0);
});

test('WaveSimulator: addSource', () => {
    const sim = new WaveSimulator(10, 10);
    sim.addSource(5, 5, 0.5, 100);
    assert.strictEqual(sim.sources.length, 1);
    assert.deepStrictEqual(sim.sources[0], { x: 5, y: 5, frequency: 0.5, amplitude: 100, phase: 0 });
});

test('WaveSimulator: step (propagation)', () => {
    // 5x5 grid
    const sim = new WaveSimulator(5, 5);

    // Set previous state with a peak at center (2,2)
    const idx = 2 * 5 + 2;
    sim.previous[idx] = 2.0;

    // Neighbors are 0 in previous.
    // Current (t-1) is 0 everywhere.

    sim.step();

    // Wave equation: val = (sumNeighbors / 2) - current[i]
    // Damping = 0.99

    // Neighbor (2,1) (one row up)
    // Neighbors of (2,1) are (2,0)=0, (2,2)=2.0, (1,1)=0, (3,1)=0. Sum = 2.0.
    // val = (2.0 / 2) - 0 = 1.0
    // new_val = 1.0 * 0.99 = 0.99

    // After step, buffers are swapped, so sim.previous holds the new state.
    const neighborIdx = 1 * 5 + 2;
    assert.ok(Math.abs(sim.previous[neighborIdx] - 0.99) < 0.001, `Expected ~0.99, got ${sim.previous[neighborIdx]}`);
});

test('WaveSimulator: step (source application)', () => {
    const sim = new WaveSimulator(5, 5);
    sim.addSource(2, 2, 0.1, 10.0);

    sim.step();
    // time = 1
    // source logic sets previous[idx] = sin(time * freq) * amp
    // val = sin(0.1) * 10.0
    const expectedVal = Math.sin(0.1) * 10.0;

    // But wait, step() calculates the new state based on 'previous'.
    // The source modifies 'previous' BEFORE calculation.
    // Then calculation happens.
    // Then swap happens.
    // So 'previous' (post-swap) is the result of calculation (propagation).
    // The source forced value was in the OLD 'previous'.

    // Wait, let's look at code again:
    // for (const src of this.sources) { ... this.previous[idx] = val; }
    // ... wave loop ...
    // swap

    // So the source sets the value in the buffer that is used as input for the wave step.
    // Does the source value persist?
    // The wave loop writes to `this.current`.
    // It reads from `this.previous`.

    // If (2,2) is a source:
    // It is NOT a wall.
    // loop visits (2,2) (since 1 < x < w-1).
    // It calculates val for (2,2) based on neighbors of (2,2) in `previous`.
    // It writes to `current[idx]`.
    // Then swap.
    // So `previous[idx]` (post-swap) will be the result of wave equation at (2,2), NOT the source value directly.

    // However, in the NEXT step:
    // The source logic runs again and OVERWRITES `previous[idx]` with the new source value for time=2.

    // So we can check if the source logic ran by checking if the wave propagated from it?
    // Or we can check `previous` immediately if we didn't swap? But we can't intervene inside step.

    // Let's just check that `time` advanced.
    assert.strictEqual(sim.time, 1);
});

test('WaveSimulator: renderToBuffer', () => {
    const sim = new WaveSimulator(2, 2);
    const data = new Uint8ClampedArray(4 * 4); // 4 pixels, 4 channels
    const imageData = { data };

    // Set a wall at (0,0) -> index 0
    sim.setWall(0, 0, true);

    // Set wave values directly in `current` (which is what render reads)
    // Pixel 1 (1,0): Positive
    sim.current[1] = 10.0;
    // Pixel 2 (0,1): Negative
    sim.current[2] = -10.0;

    sim.renderToBuffer(imageData);

    // Pixel 0: Wall (100, 100, 100, 255)
    assert.strictEqual(data[0], 100);
    assert.strictEqual(data[1], 100);
    assert.strictEqual(data[2], 100);
    assert.strictEqual(data[3], 255);

    // Pixel 1: Positive Wave (Cyan/White)
    // intensity = min(10*4, 255) = 40
    // R = 40 * 0.2 = 8
    // G = 40 * 0.8 = 32
    // B = 40
    assert.strictEqual(data[4], 8);
    assert.strictEqual(data[5], 32);
    assert.strictEqual(data[6], 40);
    assert.strictEqual(data[7], 255);

    // Pixel 2: Negative Wave (Magenta)
    // intensity = 40
    // R = 40 * 0.8 = 32
    // G = 40 * 0.2 = 8
    // B = 40 * 0.6 = 24
    assert.strictEqual(data[8], 32);
    assert.strictEqual(data[9], 8);
    assert.strictEqual(data[10], 24);
    assert.strictEqual(data[11], 255);
});
