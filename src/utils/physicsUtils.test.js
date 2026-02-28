import { test } from 'node:test';
import assert from 'node:assert';
import {
    COULOMB_K,
    calculateTotalEnergy,
    calculateField,
    calculateElectrostaticForce,
    traceFieldLine
} from './physicsUtils.js';

test('calculateTotalEnergy: calculates correct energy for a dipole', () => {
    const charges = [
        { x: 0, y: 0, z: 0, q: 1 },
        { x: 10, y: 0, z: 0, q: -1 }
    ];
    // Distance = 10
    // Energy = k * q1 * q2 / r = 8.99e3 * 1 * -1 / 10 = -899
    const energy = calculateTotalEnergy(charges);
    assert.ok(Math.abs(energy - (-899)) < 0.01, `Expected -899, got ${energy}`);
});

test('calculateTotalEnergy: returns 0 for single charge', () => {
    const charges = [{ x: 0, y: 0, z: 0, q: 1 }];
    const energy = calculateTotalEnergy(charges);
    assert.strictEqual(energy, 0);
});

test('calculateTotalEnergy: returns 0 for empty charges', () => {
    const charges = [];
    const energy = calculateTotalEnergy(charges);
    assert.strictEqual(energy, 0);
});

test('calculateTotalEnergy: handles singularity (dist <= 1)', () => {
    const charges = [
        { x: 0, y: 0, z: 0, q: 1 },
        { x: 0.5, y: 0, z: 0, q: -1 } // dist = 0.5 <= 1
    ];
    const energy = calculateTotalEnergy(charges);
    assert.strictEqual(energy, 0);
});

test('calculateField: calculates field from single positive charge', () => {
    const charges = [{ x: 0, y: 0, z: 0, q: 1 }];
    const point = { x: 10, y: 0, z: 0 };
    // Field = k * |q| / r^2 * direction
    // r = 10, r^2 = 100
    // Mag = 8.99e3 / 100 = 89.9
    // Direction = (1, 0, 0)
    // Sign = 1 (positive charge repels positive test charge) -> vector points away from charge
    // Expected: (89.9, 0, 0)

    const field = calculateField(point, charges);
    assert.ok(Math.abs(field.x - 89.9) < 0.01, `Expected x ~89.9, got ${field.x}`);
    assert.ok(Math.abs(field.y) < 0.001, `Expected y ~0, got ${field.y}`);
    assert.ok(Math.abs(field.z) < 0.001, `Expected z ~0, got ${field.z}`);
});

test('calculateField: calculates field from single negative charge', () => {
    const charges = [{ x: 0, y: 0, z: 0, q: -1 }];
    const point = { x: 10, y: 0, z: 0 };
    // Mag = 89.9
    // Sign = -1 (negative charge attracts) -> vector points towards charge
    // Direction vector (dx, dy, dz) / dist = (10, 0, 0) / 10 = (1, 0, 0)
    // Field = -1 * 89.9 * (1, 0, 0) = (-89.9, 0, 0)

    const field = calculateField(point, charges);
    assert.ok(Math.abs(field.x - (-89.9)) < 0.01, `Expected x ~-89.9, got ${field.x}`);
});

test('calculateField: ignores points too close to charge', () => {
    const charges = [{ x: 0, y: 0, z: 0, q: 1 }];
    const point = { x: 4, y: 0, z: 0 }; // dist = 4 < 5
    const field = calculateField(point, charges);
    assert.strictEqual(field.x, 0);
    assert.strictEqual(field.y, 0);
    assert.strictEqual(field.z, 0);
});

test('calculateElectrostaticForce: calculates force correctly', () => {
    const f = calculateElectrostaticForce(1, -1, 100);
    // k * 1 * -1 / 100 = -89.9
    assert.ok(Math.abs(f - (-89.9)) < 0.01, `Expected -89.9, got ${f}`);
});

test('calculateField: respects custom minDistance', () => {
    const charges = [{ x: 0, y: 0, z: 0, q: 1 }];
    const point = { x: 4, y: 0, z: 0 }; // dist = 4

    // Default minDistance is 5, so it should be skipped (0 field)
    let field = calculateField(point, charges);
    assert.strictEqual(field.x, 0);

    // With minDistance = 3, it should be calculated
    field = calculateField(point, charges, 3);
    assert.notStrictEqual(field.x, 0);
    // Mag = 8.99e3 / 16 = 561.875
    assert.ok(Math.abs(field.x - 561.875) < 0.1, `Expected ~561.875, got ${field.x}`);
});

test('traceFieldLine: traces away from positive charge', () => {
    const charges = [{ x: 0, y: 0, z: 0, q: 1 }];
    const startPoint = { x: 10, y: 0, z: 0 };
    const points = traceFieldLine(startPoint, 1, charges, { maxSteps: 5, stepSize: 1 });

    // Should move further away in +x direction
    assert.strictEqual(points.length, 5);
    // Initial point
    assert.strictEqual(points[0].x, 10);
    // Next points should increase x
    assert.ok(points[1].x > 10);
    assert.ok(points[4].x > points[1].x);
});

test('traceFieldLine: terminates when close to charge', () => {
    // Start at -20, charge at 0. Trace towards charge.
    const charges = [{ x: 0, y: 0, z: 0, q: -1 }];
    const startPoint = { x: -40, y: 0, z: 0 };

    const points = traceFieldLine(startPoint, 1, charges, {
        maxSteps: 100,
        stepSize: 2,
        terminateAt: 'negative',
        chargeRadius: 10
    });

    // It should stop before 100 steps if it hits the charge
    assert.ok(points.length < 100, `Expected trace to stop before 100 steps, took ${points.length}`);
    const last = points[points.length - 1];
    // Should be close to 0 (within radius * 1.5 = 15)
    // We started at -40.
    assert.ok(Math.abs(last.x) <= 15, `Ended at ${last.x}, expected <= 15`);
});

test('traceFieldLine: stops at max steps', () => {
    const charges = [{ x: 0, y: 0, z: 0, q: 1 }];
    const startPoint = { x: 10, y: 0, z: 0 };
    const points = traceFieldLine(startPoint, 1, charges, { maxSteps: 10 });
    assert.strictEqual(points.length, 10);
});

test('traceFieldLine: terminates when exceeding bounds', () => {
    const charges = [{ x: 0, y: 0, z: 0, q: 1 }];
    const startPoint = { x: 10, y: 0, z: 0 };

    // Test positive bounds
    // With stepSize 6, first step goes from 10 to 16.
    // If bounds is 15, it should stop after 1st point is added.
    const pointsPos = traceFieldLine(startPoint, 1, charges, {
        maxSteps: 100,
        stepSize: 6,
        bounds: 15
    });
    assert.strictEqual(pointsPos.length, 1, 'Should stop after first point when exceeding positive bounds');
    assert.strictEqual(pointsPos[0].x, 10);

    // Test negative bounds
    // Trace away from positive charge in -x direction
    const startPointNeg = { x: -10, y: 0, z: 0 };
    // First step goes from -10 to -16 (mag = 16 > 15)
    const pointsNeg = traceFieldLine(startPointNeg, 1, charges, {
        maxSteps: 100,
        stepSize: 6,
        bounds: 15
    });
    assert.strictEqual(pointsNeg.length, 1, 'Should stop after first point when exceeding negative bounds');
    assert.strictEqual(pointsNeg[0].x, -10);
});

test('traceFieldLine: terminates when field magnitude drops below minFieldMag', () => {
    const charges = [{ x: 0, y: 0, z: 0, q: 1 }];
    const startPoint = { x: 10, y: 0, z: 0 };
    // Field at x=10 is 89.9.
    // We set minFieldMag to 1.0.
    // r^2 = 8990 / 1.0 = 8990 => r ~= 94.8.
    // Step size 10.
    // Start at 10.
    // Steps: 20, 30, 40, 50, 60, 70, 80, 90 (still > 1.0), 100 (< 1.0).
    // Should take around 9-10 steps.
    const points = traceFieldLine(startPoint, 1, charges, {
        maxSteps: 100,
        stepSize: 10,
        minFieldMag: 1.0
    });

    assert.ok(points.length < 100, `Expected trace to stop before maxSteps (100), took ${points.length}`);
    assert.ok(points.length > 1, `Expected at least one step, got ${points.length}`);

    const lastPoint = points[points.length - 1];
    const fieldAtLast = calculateField(lastPoint, charges);
    const magAtLast = Math.sqrt(fieldAtLast.x ** 2 + fieldAtLast.y ** 2 + fieldAtLast.z ** 2);

    // The loop breaks IF mag < minFieldMag.
    // The point is added BEFORE the check.
    // So the last point added MUST satisfy mag < minFieldMag.
    assert.ok(magAtLast < 1.0, `Last point magnitude ${magAtLast} should be < 1.0`);

    // The point before the last one must have been >= minFieldMag
    if (points.length > 1) {
        const prevPoint = points[points.length - 2];
        const fieldAtPrev = calculateField(prevPoint, charges);
        const magAtPrev = Math.sqrt(fieldAtPrev.x ** 2 + fieldAtPrev.y ** 2 + fieldAtPrev.z ** 2);
        assert.ok(magAtPrev >= 1.0, `Previous point magnitude ${magAtPrev} should be >= 1.0`);
    }
});
