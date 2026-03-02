import { test, expect } from 'bun:test';

// Mock MAX_BODIES for validation test
const MAX_BODIES = 100;

// Re-implementing the safeNum and sanitization logic from ThreeBodyPage.jsx for verification
const safeNum = (val, def, min = -1e6, max = 1e6) => {
    const n = parseFloat(val);
    return (Number.isFinite(n)) ? Math.max(min, Math.min(max, n)) : def;
};

const sanitizeState = (rawState) => {
    if (!rawState || typeof rawState !== 'object') {
        throw new Error('Invalid JSON structure');
    }

    if (!rawState.bodies || !Array.isArray(rawState.bodies)) {
        throw new Error('Invalid file: missing bodies array');
    }

    if (rawState.bodies.length > MAX_BODIES) {
        throw new Error(`Too many bodies in file (max ${MAX_BODIES})`);
    }

    const sanitizedBodies = rawState.bodies.map(b => {
        return {
            x: safeNum(b.x, 0),
            y: safeNum(b.y, 0),
            z: safeNum(b.z, 0),
            vx: safeNum(b.vx, 0, -1e4, 1e4),
            vy: safeNum(b.vy, 0, -1e4, 1e4),
            vz: safeNum(b.vz, 0, -1e4, 1e4),
            mass: safeNum(b.mass, 1, 0.001, 1e10),
            color: (typeof b.color === 'number' && b.color >= 0 && b.color <= 0xffffff)
                ? Math.floor(b.color)
                : 0x3b82f6
        };
    });

    const settings = {};
    if (rawState.settings && typeof rawState.settings === 'object') {
        const s = rawState.settings;
        if (['EULER', 'RK4'].includes(s.physicsMode)) {
            settings.physicsMode = s.physicsMode;
        }
        if ('simSpeed' in s) {
            settings.simSpeed = safeNum(s.simSpeed, 1, 0.01, 20);
        }
        if (['off', 'elastic', 'inelastic'].includes(s.collisionMode)) {
            settings.collisionMode = s.collisionMode;
        }
    }

    return {
        bodies: sanitizedBodies,
        gravityG: 'gravityG' in rawState ? safeNum(rawState.gravityG, 1, 0.01, 100) : undefined,
        time: 'time' in rawState ? safeNum(rawState.time, 0, 0, 1e12) : undefined,
        settings
    };
};

test('Sanitization: extracts only known properties and prevents prototype pollution', () => {
    const maliciousInput = {
        bodies: [
            { x: 1, y: 2, z: 3, vx: 0, vy: 0, vz: 0, mass: 1, color: 0xff0000, malicious: 'property' }
        ],
        __proto__: { poll: 'poll' }
    };

    const result = sanitizeState(maliciousInput);

    expect(result.bodies[0]).not.toHaveProperty('malicious');
    expect(result).not.toHaveProperty('poll');
    expect(Object.prototype).not.toHaveProperty('poll');
});

test('Sanitization: validates numeric ranges and handles NaN/Infinity', () => {
    const input = {
        bodies: [
            { x: Infinity, y: -Infinity, z: NaN, vx: 1e10, vy: -1e10, vz: 0, mass: 0, color: -1 }
        ],
        gravityG: 1000,
        time: -1
    };

    const result = sanitizeState(input);
    const b = result.bodies[0];

    expect(b.x).toBe(0); // Default for non-finite
    expect(b.y).toBe(0); // Default for non-finite
    expect(b.z).toBe(0); // Default for NaN
    expect(b.vx).toBe(1e4); // Clamped to max
    expect(b.vy).toBe(-1e4); // Clamped to min
    expect(b.mass).toBe(0.001); // Clamped to min
    expect(b.color).toBe(0x3b82f6); // Default for invalid range

    expect(result.gravityG).toBe(100); // Clamped to max
    expect(result.time).toBe(0); // Clamped to min
});

test('Sanitization: validates settings strings', () => {
    const input = {
        bodies: [],
        settings: {
            physicsMode: 'MALICIOUS',
            collisionMode: 'DROP_TABLE'
        }
    };

    // Should not throw, but ignore invalid options
    const result = sanitizeState(input);
    expect(result.settings.physicsMode).toBeUndefined();
    expect(result.settings.collisionMode).toBeUndefined();
});

test('Sanitization: enforces MAX_BODIES', () => {
    const manyBodies = {
        bodies: Array(MAX_BODIES + 1).fill({ x: 0, y: 0, z: 0, mass: 1 })
    };

    expect(() => sanitizeState(manyBodies)).toThrow(/Too many bodies/);
});
