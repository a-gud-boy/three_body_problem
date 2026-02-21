
// Imports for utils.test.js
import { generateSpherePoints, generateRandomCharges } from './utils.js';

describe('generateSpherePoints', () => {
    it('should return an array of points', () => {
        const points = generateSpherePoints(10);
        expect(Array.isArray(points)).toBe(true);
        expect(points.length).toBeGreaterThan(0);
    });

    it('should return points on a unit sphere', () => {
        const points = generateSpherePoints(20);
        points.forEach(point => {
            const magnitude = Math.sqrt(point.x ** 2 + point.y ** 2 + point.z ** 2);
            expect(Math.abs(magnitude - 1)).toBeLessThan(0.0001);
        });
    });

    it('should return approximately the requested number of points', () => {
        // The algorithm calculates bands and scales longitude points by cos(latitude),
        // effectively distributing points by surface area. The expected count is roughly 2/PI (~0.64) of the input count.
        const target = 100;
        const points = generateSpherePoints(target);
        // Relaxed check because the algorithm is approximate (0.64 is theoretical average)
        expect(points.length).toBeGreaterThanOrEqual(target * 0.5);
        expect(points.length).toBeLessThanOrEqual(target * 1.0);
    });
});

describe('generateRandomCharges', () => {
    it('should return exactly the requested number of charges', () => {
        const count = 5;
        const charges = generateRandomCharges(count);
        expect(charges.length).toBe(count);
    });

    it('should return default 15 charges if no count provided', () => {
        const charges = generateRandomCharges();
        expect(charges.length).toBe(15);
    });

    it('should return charges with valid properties', () => {
        const charges = generateRandomCharges(10);
        charges.forEach(charge => {
            expect(typeof charge.x).toBe('number');
            expect(typeof charge.y).toBe('number');
            expect(typeof charge.z).toBe('number');
            expect(charge.q === 1 || charge.q === -1).toBe(true);
        });
    });

    it('should return charges within bounds', () => {
        const charges = generateRandomCharges(50);
        charges.forEach(charge => {
            expect(Math.abs(charge.x)).toBeLessThanOrEqual(100);
            expect(Math.abs(charge.y)).toBeLessThanOrEqual(100);
            expect(Math.abs(charge.z)).toBeLessThanOrEqual(25);
        });
    });
});

