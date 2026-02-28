// src/pages/GeneralRelativity/utils/initializers.test.js
import { describe, it, expect } from 'vitest';
import { createAccretionDisk, createGridData } from './initializers';
import { calculateSchwarzschildRadius, G } from './physics';

describe('General Relativity Initializers', () => {
    describe('createAccretionDisk', () => {
        it('creates the correct number of particles and array lengths', () => {
            const count = 100;
            const result = createAccretionDisk(count, 1000, 10, 50);
            expect(result.positions.length).toBe(count * 3);
            expect(result.velocities.length).toBe(count * 3);
            expect(result.colors.length).toBe(count * 3);

            // Verify they are Float32Arrays
            expect(result.positions).toBeInstanceOf(Float32Array);
            expect(result.velocities).toBeInstanceOf(Float32Array);
            expect(result.colors).toBeInstanceOf(Float32Array);
        });

        it('places particles within the radial range for newtonian type', () => {
            const count = 50;
            const centerMass = 100;
            const minR = 10;
            const maxR = 20;
            const speedOfLight = 100;

            // rs = 2 * 1 * 100 / 100^2 = 0.02
            // safeMinR = Math.max(10, 0.02 * 1.5) = 10
            // startR = 10
            const { positions } = createAccretionDisk(count, centerMass, minR, maxR, 'newtonian', speedOfLight);

            for (let i = 0; i < count; i++) {
                const x = positions[i * 3];
                const y = positions[i * 3 + 1];
                const z = positions[i * 3 + 2];
                const r = Math.sqrt(x * x + z * z);

                expect(r).toBeGreaterThanOrEqual(minR - 0.001);
                expect(r).toBeLessThanOrEqual(maxR + 0.001);

                // Thickness check: y should be within [-0.5 * thickness, 0.5 * thickness]
                // thickness = r * 0.02
                const thickness = r * 0.02;
                expect(Math.abs(y)).toBeLessThanOrEqual(thickness / 2 + 0.0001);
            }
        });

        it('respects ISCO (3 * Rs) for relativistic type', () => {
            const count = 50;
            const centerMass = 10000;
            const speedOfLight = 100;
            const minR = 1; // very small, should be overridden by ISCO
            const maxR = 20;

            const rs = calculateSchwarzschildRadius(centerMass, speedOfLight);
            // rs = 2 * 1 * 10000 / 100^2 = 2
            // ISCO = 3 * rs = 6
            // safeMinR = Math.max(1, 2 * 1.5) = 3
            // startR = Math.max(3, 2 * 3.0) = 6

            const { positions } = createAccretionDisk(count, centerMass, minR, maxR, 'relativistic', speedOfLight);

            for (let i = 0; i < count; i++) {
                const x = positions[i * 3];
                const z = positions[i * 3 + 2];
                const r = Math.sqrt(x * x + z * z);
                expect(r).toBeGreaterThanOrEqual(6 - 0.001);
                expect(r).toBeLessThanOrEqual(maxR + 0.001);
            }
        });

        it('calculates planar velocities with non-zero magnitude', () => {
            const count = 20;
            const centerMass = 1000;
            const { velocities } = createAccretionDisk(count, centerMass, 10, 50);

            for (let i = 0; i < count; i++) {
                const vx = velocities[i * 3];
                const vy = velocities[i * 3 + 1];
                const vz = velocities[i * 3 + 2];
                const vMag = Math.sqrt(vx * vx + vy * vy + vz * vz);

                expect(vMag).toBeGreaterThan(0);
                expect(vy).toBe(0);
            }
        });

        it('assigns colors for each particle', () => {
            const count = 10;
            const { colors } = createAccretionDisk(count, 1000, 10, 50);
            for (let i = 0; i < count * 3; i++) {
                expect(colors[i]).toBeGreaterThanOrEqual(0);
                expect(colors[i]).toBeLessThanOrEqual(1.0);
            }
        });

        it('handles zero count gracefully', () => {
            const result = createAccretionDisk(0, 1000, 10, 50);
            expect(result.positions.length).toBe(0);
            expect(result.velocities.length).toBe(0);
            expect(result.colors.length).toBe(0);
        });
    });

    describe('createGridData', () => {
        it('returns an object with size and segments', () => {
            const size = 100;
            const segments = 20;
            const result = createGridData(size, segments);
            expect(result).toEqual({ size, segments });
        });
    });
});
