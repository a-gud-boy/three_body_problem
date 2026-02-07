
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { generateSpherePoints, generateRandomCharges } from './utils.js';

describe('Electromagnetic Utils', () => {
    describe('generateSpherePoints', () => {
        it('should return an array of points', () => {
            const points = generateSpherePoints(10);
            assert(Array.isArray(points));
            assert(points.length > 0);
        });

        it('should return points on a unit sphere', () => {
            const points = generateSpherePoints(20);
            points.forEach(point => {
                const magnitude = Math.sqrt(point.x ** 2 + point.y ** 2 + point.z ** 2);
                assert(Math.abs(magnitude - 1) < 0.0001, `Point ${JSON.stringify(point)} is not on unit sphere`);
            });
        });

        it('should return approximately the requested number of points', () => {
            // The algorithm calculates bands and scales longitude points by cos(latitude),
            // effectively distributing points by surface area. The expected count is roughly 2/PI (~0.64) of the input count.
            const target = 100;
            const points = generateSpherePoints(target);
            // Relaxed check because the algorithm is approximate (0.64 is theoretical average)
            assert(points.length >= target * 0.5 && points.length <= target * 1.0);
        });
    });

    describe('generateRandomCharges', () => {
        it('should return exactly the requested number of charges', () => {
            const count = 5;
            const charges = generateRandomCharges(count);
            assert.strictEqual(charges.length, count);
        });

        it('should return default 15 charges if no count provided', () => {
            const charges = generateRandomCharges();
            assert.strictEqual(charges.length, 15);
        });

        it('should return charges with valid properties', () => {
            const charges = generateRandomCharges(10);
            charges.forEach(charge => {
                assert(typeof charge.x === 'number');
                assert(typeof charge.y === 'number');
                assert(typeof charge.z === 'number');
                assert(charge.q === 1 || charge.q === -1);
            });
        });

        it('should return charges within bounds', () => {
            const charges = generateRandomCharges(50);
            charges.forEach(charge => {
                assert(Math.abs(charge.x) <= 100); // 200 width centered
                assert(Math.abs(charge.y) <= 100);
                assert(Math.abs(charge.z) <= 25);  // 50 depth centered
            });
        });
    });
});
