import { test } from 'node:test';
import assert from 'node:assert';
import { getDerivatives } from './physicsUtils.js';

test('getDerivatives: returns correct structure', () => {
    const state = { theta1: 0.1, theta2: 0.1, omega1: 0, omega2: 0 };
    const params = { m1: 1, m2: 1, l1: 1, l2: 1, g: 9.81 };

    const result = getDerivatives(state, params);

    assert.ok(typeof result.dTheta1 === 'number');
    assert.ok(typeof result.dTheta2 === 'number');
    assert.ok(typeof result.dOmega1 === 'number');
    assert.ok(typeof result.dOmega2 === 'number');
});

test('getDerivatives: static equilibrium (hanging down)', () => {
    const state = { theta1: 0, theta2: 0, omega1: 0, omega2: 0 };
    const params = { m1: 1, m2: 1, l1: 1, l2: 1, g: 9.81 };

    const result = getDerivatives(state, params);

    assert.strictEqual(result.dTheta1, 0);
    assert.strictEqual(result.dTheta2, 0);
    assert.ok(Math.abs(result.dOmega1) < 1e-10, `Expected dOmega1 ~0, got ${result.dOmega1}`);
    assert.ok(Math.abs(result.dOmega2) < 1e-10, `Expected dOmega2 ~0, got ${result.dOmega2}`);
});

test('getDerivatives: gravity pulls down (both horizontal)', () => {
    // Both horizontal (PI/2)
    const state = { theta1: Math.PI / 2, theta2: Math.PI / 2, omega1: 0, omega2: 0 };
    const params = { m1: 1, m2: 1, l1: 1, l2: 1, g: 9.81 };

    const result = getDerivatives(state, params);

    // m1 falls at g initially, creating a "weightless" frame for m2, so dOmega2 is 0 initially.
    assert.ok(result.dOmega1 < 0, `Expected negative dOmega1 (restoring force), got ${result.dOmega1}`);
    assert.ok(Math.abs(result.dOmega2) < 1e-10, `Expected dOmega2 ~0 due to freefall frame, got ${result.dOmega2}`);
});

test('getDerivatives: gravity pulls outer pendulum (L-shape)', () => {
    // Inner hanging (0), Outer horizontal (PI/2)
    const state = { theta1: 0, theta2: Math.PI / 2, omega1: 0, omega2: 0 };
    const params = { m1: 1, m2: 1, l1: 1, l2: 1, g: 9.81 };

    const result = getDerivatives(state, params);

    // Outer pendulum should definitely fall
    assert.ok(result.dOmega2 < 0, `Expected negative dOmega2, got ${result.dOmega2}`);
    // Reaction force might push inner pendulum?
    // If m2 falls, it pulls m1 to the right (positive theta).
    // So dOmega1 might be positive?
    // Let's check physics: Torque on m1 from tension in l2.
    // Tension pulls right. m1 rotates positive.
    assert.ok(result.dOmega1 > 0, `Expected positive dOmega1 (reaction), got ${result.dOmega1}`);
});

test('getDerivatives: chaotic sensitivity (small change in input -> change in output)', () => {
    const params = { m1: 1, m2: 1, l1: 1, l2: 1, g: 9.81 };
    const state1 = { theta1: 1, theta2: 1, omega1: 0, omega2: 0 };
    const state2 = { theta1: 1.01, theta2: 1, omega1: 0, omega2: 0 };

    const res1 = getDerivatives(state1, params);
    const res2 = getDerivatives(state2, params);

    assert.notStrictEqual(res1.dOmega1, res2.dOmega1);
    assert.notStrictEqual(res1.dOmega2, res2.dOmega2);
});

test('getDerivatives: handles edge cases (zero mass)', () => {
    const state = { theta1: 0, theta2: 0, omega1: 0, omega2: 0 };
    const params = { m1: 0, m2: 1, l1: 1, l2: 1, g: 9.81 };

    const result = getDerivatives(state, params);

    assert.ok(Number.isNaN(result.dOmega1) || !Number.isFinite(result.dOmega1));
});

test('getDerivatives: centripetal force affects outer pendulum', () => {
    // Inner hanging (0), Outer horizontal (PI/2)
    // Inner pendulum has high velocity, creating upward centripetal acceleration on the pivot of m2
    const params = { m1: 1, m2: 1, l1: 1, l2: 1, g: 10 };

    // Case A: omega1 = 0. Gravity dominates. dOmega2 should be negative (down).
    const stateA = { theta1: 0, theta2: Math.PI / 2, omega1: 0, omega2: 0 };
    const resA = getDerivatives(stateA, params);
    assert.ok(resA.dOmega2 < 0, 'Static: outer pendulum should fall');

    // Case B: omega1 is large. Centripetal acceleration (l1 * omega1^2) > g.
    // l1=1, g=10. Need omega1 > sqrt(10) ~ 3.16. Let's use 10.
    // Acceleration of pivot is up. Effective gravity on m2 is (g + a_pivot_down).
    // Pivot accelerates UP (towards center). So effective gravity is g + a_up?
    // Wait. Pivot is m1. m1 is at (0, -l1).
    // Velocity is horizontal. Centripetal acceleration is UP (towards 0,0).
    // If pivot accelerates UP, "fictitious force" on m2 is DOWN.
    // So effective gravity should be larger?

    // Let's re-read the formula derived earlier:
    // num2 = (m1+m2) * (l1 * omega1^2 - g)
    // If omega1 is large, num2 is positive!
    // dOmega2 = num2 / den2.
    // den1 = (m1+m2)*l1 - ... (positive). den2 > 0.
    // So dOmega2 > 0.

    // Wait, if dOmega2 > 0, theta2 increases (goes towards PI).
    // If theta2 is PI/2 (horizontal right) and increases, it goes DOWN (towards PI).
    // Wait, PI is straight UP? 0 is straight DOWN?
    // In this code, usually 0 is down.
    // If 0 is down, PI/2 is right.
    // Increasing theta means going towards PI (Up?).
    // No, PI is Up.
    // 0 = Down.
    // PI/2 = Right.
    // -PI/2 = Left.
    // PI = Up.

    // So if dOmega2 > 0, it accelerates towards PI (Up).
    // So if centripetal force is large, it should lift the outer pendulum?

    // Logic: m1 is at bottom (0). Omega1 is large.
    // m1 accelerates UP (centripetal).
    // m2 is attached to m1.
    // m2 feels a support accelerating UP.
    // So m2 feels a fictitious force DOWN (added to gravity).
    // So m2 should fall FASTER?

    // Let's re-check the coordinate system assumption.
    // If 0 is down, and PI/2 is right.
    // Falling means theta increases from PI/2 to PI? No, PI is Up.
    // Falling means theta decreases towards 0? No, 0 is Down.
    // If it's at PI/2, falling means going towards 0. So theta decreases.
    // So Gravity makes dOmega2 negative. This matches previous test.

    // So if Centripetal force makes num2 positive, dOmega2 is positive.
    // Positive means going away from 0 (Up towards PI).
    // So yes, it lifts!

    // Why? Pivot accelerates UP.
    // Inertia of m2 resists, so relative to pivot, m2 pushes down?
    // No, think about torque.
    // Actually, rely on the math: num2 = (m1+m2)*(l1*omega1^2 - g).
    // If l1*omega1^2 > g, num2 > 0 -> dOmega2 > 0 (Up).
    // So the math says it rises.

    const stateB = { theta1: 0, theta2: Math.PI / 2, omega1: 10, omega2: 0 };
    const resB = getDerivatives(stateB, params);

    assert.ok(resB.dOmega2 > 0, 'High velocity: outer pendulum should rise due to centripetal force');
});
