// src/pages/GeneralRelativity/utils/physics.test.js
import { describe, it, expect } from 'vitest';
import { calculateSchwarzschildRadius, calculatePotential, calculateAcceleration } from './physics.js';

describe('General Relativity Physics Utils', () => {

    it('calculates Schwarzschild Radius correctly', () => {
        const mass = 1000;
        const c = 100;
        // Rs = 2GM/c^2 = 2*1*1000 / 10000 = 0.2
        const rs = calculateSchwarzschildRadius(mass, c);
        expect(rs).toBe(0.2);
    });

    it('calculates Newtonian Potential correctly', () => {
        const mass = 1000;
        const r = 10;
        // V = -GM/r = -1*1000/10 = -100
        const v = calculatePotential(mass, r, 'newtonian');
        expect(v).toBe(-100);
    });

    it('calculates Paczynski-Wiita Potential correctly', () => {
        const mass = 1000;
        const c = 100;
        const r = 10;
        // V = -GM/(r-rs) = -1000 / (9.8) = -102.04...
        const v = calculatePotential(mass, r, 'relativistic', c);
        const expected = -1000 / (10 - 0.2);
        expect(Math.abs(v - expected) < 0.0001).toBeTruthy();
    });

    it('calculates Potential correctly using pre-calculated rs', () => {
        const mass = 1000;
        const r = 10;
        const rs = 0.2;
        const v = calculatePotential(mass, r, 'relativistic', 100, rs);
        const expected = -1000 / (10 - 0.2);
        expect(v).toBe(expected);
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

        expect(Math.abs(outVector.x - (-10)) < 0.0001).toBeTruthy();
        expect(Math.abs(outVector.y - 0) < 0.0001).toBeTruthy();
        expect(Math.abs(outVector.z - 0) < 0.0001).toBeTruthy();
    });
});
