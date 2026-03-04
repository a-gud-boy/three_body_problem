import { describe, it, expect } from 'vitest';
import Complex from './Complex.js';

describe('Complex', () => {
    it('constructs with real and imaginary parts', () => {
        const c = new Complex(3, 4);
        expect(c.re).toBe(3);
        expect(c.im).toBe(4);
    });

    it('defaults imaginary part to 0', () => {
        const c = new Complex(5);
        expect(c.re).toBe(5);
        expect(c.im).toBe(0);
    });

    describe('add', () => {
        it('adds two complex numbers', () => {
            const a = new Complex(1, 2);
            const b = new Complex(3, 4);
            const r = a.add(b);
            expect(r.re).toBe(4);
            expect(r.im).toBe(6);
        });
    });

    describe('sub', () => {
        it('subtracts two complex numbers', () => {
            const a = new Complex(5, 3);
            const b = new Complex(2, 1);
            const r = a.sub(b);
            expect(r.re).toBe(3);
            expect(r.im).toBe(2);
        });
    });

    describe('mul', () => {
        it('multiplies two complex numbers', () => {
            // (1+2i)(3+4i) = 3+4i+6i+8i² = 3+10i-8 = -5+10i
            const a = new Complex(1, 2);
            const b = new Complex(3, 4);
            const r = a.mul(b);
            expect(r.re).toBe(-5);
            expect(r.im).toBe(10);
        });
    });

    describe('div', () => {
        it('divides two complex numbers', () => {
            // (10+0i) / (2+0i) = 5
            const a = new Complex(10, 0);
            const b = new Complex(2, 0);
            const r = a.div(b);
            expect(r.re).toBeCloseTo(5);
            expect(r.im).toBeCloseTo(0);
        });

        it('divides complex by complex', () => {
            // (1+2i) / (3+4i) = (3+8+i(6-4)) / (9+16) = 11/25 + 2i/25
            const a = new Complex(1, 2);
            const b = new Complex(3, 4);
            const r = a.div(b);
            expect(r.re).toBeCloseTo(11 / 25);
            expect(r.im).toBeCloseTo(2 / 25);
        });

        it('throws on division by zero', () => {
            const a = new Complex(1, 0);
            const b = new Complex(0, 0);
            expect(() => a.div(b)).toThrow('near-zero');
        });

        it('throws on division by near-zero', () => {
            const a = new Complex(1, 0);
            const b = new Complex(1e-16, 1e-16);
            expect(() => a.div(b)).toThrow('near-zero');
        });
    });

    describe('mag', () => {
        it('computes magnitude', () => {
            const c = new Complex(3, 4);
            expect(c.mag()).toBeCloseTo(5);
        });

        it('returns 0 for zero complex', () => {
            expect(new Complex(0, 0).mag()).toBe(0);
        });
    });

    describe('phase', () => {
        it('computes phase angle', () => {
            const c = new Complex(1, 1);
            expect(c.phase()).toBeCloseTo(Math.PI / 4);
        });

        it('returns 0 for purely real positive', () => {
            expect(new Complex(5, 0).phase()).toBe(0);
        });

        it('returns pi for purely real negative', () => {
            expect(new Complex(-5, 0).phase()).toBeCloseTo(Math.PI);
        });
    });

    describe('fromPolar', () => {
        it('converts from polar to rectangular', () => {
            const c = Complex.fromPolar(5, Math.PI / 2);
            expect(c.re).toBeCloseTo(0);
            expect(c.im).toBeCloseTo(5);
        });

        it('roundtrips through mag and phase', () => {
            const original = new Complex(3, 4);
            const reconstructed = Complex.fromPolar(original.mag(), original.phase());
            expect(reconstructed.re).toBeCloseTo(3);
            expect(reconstructed.im).toBeCloseTo(4);
        });
    });
});
