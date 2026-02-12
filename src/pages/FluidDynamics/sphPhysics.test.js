import { test } from 'node:test';
import assert from 'node:assert';
import { poly6, spikyGradient, viscosityLaplacian, SpatialHash } from './sphPhysics.js';

test('poly6: calculates correct value at r=0', () => {
    const h = 10;
    const h2 = h * h;
    const h9 = Math.pow(h, 9);
    const r2 = 0;

    // Expected: 315 / (64 * PI * h^3)
    const expected = 315 / (64 * Math.PI * Math.pow(h, 3));
    const result = poly6(r2, h2, h9);

    assert.ok(Math.abs(result - expected) < 1e-10, `Expected ${expected}, got ${result}`);
});

test('poly6: returns 0 when r > h', () => {
    const h = 10;
    const h2 = h * h;
    const h9 = Math.pow(h, 9);
    const r2 = 101; // r > 10

    const result = poly6(r2, h2, h9);
    assert.strictEqual(result, 0);
});

test('spikyGradient: calculates correct value', () => {
    const h = 10;
    const r = 5;

    // Expected: -(45 / (PI * h^6)) * (h-r)^2
    // diff = 5
    // -45 / (PI * 10^6) * 25
    const expected = -(45 / (Math.PI * Math.pow(h, 6))) * 25;
    const result = spikyGradient(r, h);

    assert.ok(Math.abs(result - expected) < 1e-10, `Expected ${expected}, got ${result}`);
});

test('spikyGradient: returns 0 when r > h', () => {
    const h = 10;
    const r = 11;
    assert.strictEqual(spikyGradient(r, h), 0);
});

test('viscosityLaplacian: calculates correct value', () => {
    const h = 10;
    const r = 5;

    // Expected: (45 / (PI * h^6)) * (h-r)
    // diff = 5
    // 45 / (PI * 10^6) * 5
    const expected = (45 / (Math.PI * Math.pow(h, 6))) * 5;
    const result = viscosityLaplacian(r, h);

    assert.ok(Math.abs(result - expected) < 1e-10, `Expected ${expected}, got ${result}`);
});

test('viscosityLaplacian: returns 0 when r > h', () => {
    const h = 10;
    const r = 11;
    assert.strictEqual(viscosityLaplacian(r, h), 0);
});

test('SpatialHash: inserts and queries particles correctly', () => {
    const spacing = 10;
    const maxParticles = 100;
    const hash = new SpatialHash(spacing, maxParticles);

    // Offset to avoid symmetry artifacts around (0,0) which cause hash collisions
    // in this specific implementation (due to Math.abs on single-axis values)
    const offsetX = 1000;
    const offsetY = 1000;

    // Insert particle 0 at (1005, 1005) - cell (100, 100)
    hash.insert(0, offsetX + 5, offsetY + 5);

    // Insert particle 1 at (1015, 1005) - cell (101, 100) - neighbor
    hash.insert(1, offsetX + 15, offsetY + 5);

    // Insert particle 2 at (1500, 1500) - far away
    hash.insert(2, offsetX + 500, offsetY + 500);

    // Query at (1005, 1005)
    const count = hash.query(offsetX + 5, offsetY + 5);

    const neighbors = Array.from(hash.neighbors.slice(0, count));

    assert.ok(neighbors.includes(0), 'Should include particle 0');
    assert.ok(neighbors.includes(1), 'Should include particle 1');
    assert.strictEqual(neighbors.includes(2), false, 'Should not include particle 2');

    // Note: This implementation might return duplicates if hash collisions occur,
    // but with these coordinates and table size, we expect unique neighbors.
    // However, let's just check unique entries to be robust,
    // or if we trust our offset, strict count.
    // With offset, we expect strict count 2.
    assert.strictEqual(count, 2, 'Should find exactly 2 neighbors');
});

test('SpatialHash: clears correctly', () => {
    const hash = new SpatialHash(10, 100);
    hash.insert(0, 5, 5);

    hash.clear();

    // table should be filled with -1
    for (let i = 0; i < hash.table.length; i++) {
        if (hash.table[i] !== -1) {
            assert.fail('Table not cleared');
        }
    }

    // Query should return 0 neighbors now (assuming insert mechanism relies on table)
    const count = hash.query(5, 5);
    assert.strictEqual(count, 0, 'Should find 0 neighbors after clear');
});
