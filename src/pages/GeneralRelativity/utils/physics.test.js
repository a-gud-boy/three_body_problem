// src/pages/GeneralRelativity/utils/physics.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateSchwarzschildRadius, calculatePotential, calculateAcceleration, G } from './physics.js';

describe('General Relativity Physics Utils', () => {

    it('calculates Schwarzschild Radius correctly', () => {
        const mass = 1000;
        const c = 100;
        // Rs = 2GM/c^2 = 2*1*1000 / 10000 = 0.2
        const rs = calculateSchwarzschildRadius(mass, c);
        assert.strictEqual(rs, 0.2);
    });

    it('calculates Newtonian Potential correctly', () => {
        const mass = 1000;
        const r = 10;
        // V = -GM/r = -1*1000/10 = -100
        const v = calculatePotential(mass, r, 'newtonian');
        assert.strictEqual(v, -100);
    });

    it('calculates Paczynski-Wiita Potential correctly', () => {
        const mass = 1000;
        const c = 100;
        const r = 10;
        const rs = 0.2;
        // V = -GM/(r-rs) = -1000 / (9.8) = -102.04...
        const v = calculatePotential(mass, r, 'relativistic', c);
        const expected = -1000 / (10 - 0.2);
        assert.ok(Math.abs(v - expected) < 0.0001);
    });

    it('calculates Acceleration Vector correctly', () => {
        const px = 10, py = 0, pz = 0;
        const massPos = { x: 0, y: 0, z: 0 };
        const mass = 1000;
        const outVector = { x: 0, y: 0, z: 0 };

        // Newtonian Force = -GM/r^2 = -1000/100 = -10
        // Direction is (-1, 0, 0)
        // Accel = (-10, 0, 0)

        calculateAcceleration(px, py, pz, massPos, mass, outVector, 'newtonian');

        assert.ok(Math.abs(outVector.x - (-10)) < 0.0001);
        assert.ok(Math.abs(outVector.y - 0) < 0.0001);
        assert.ok(Math.abs(outVector.z - 0) < 0.0001);
    });
});
