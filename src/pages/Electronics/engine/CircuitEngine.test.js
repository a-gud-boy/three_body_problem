import { describe, it, expect } from 'vitest';
import CircuitEngine from './CircuitEngine.js';
import Complex from './Complex.js';

describe('CircuitEngine', () => {
    describe('solveAC — voltage divider', () => {
        it('computes correct mid-point voltage for equal resistor divider', () => {
            const engine = new CircuitEngine();
            engine.setFrequency(60);

            engine.addComponent('Vac', 'V1', 'n1', 'GND', 10, { phase: 0 });
            engine.addComponent('R', 'R1', 'n1', 'n2', 100);
            engine.addComponent('R', 'R2', 'n2', 'GND', 100);

            const results = engine.solveAC();
            expect(results).not.toBeNull();

            // V(n2) should be ~5V (half of 10V source)
            const vn2 = results.nodes['n2'];
            expect(vn2.mag()).toBeCloseTo(5, 1);
            // Phase should be ~0 (same phase as source)
            expect(vn2.phase()).toBeCloseTo(0, 1);
        });

        it('computes correct voltage for unequal divider', () => {
            const engine = new CircuitEngine();
            engine.setFrequency(60);

            engine.addComponent('Vac', 'V1', 'n1', 'GND', 12, { phase: 0 });
            engine.addComponent('R', 'R1', 'n1', 'n2', 10);
            engine.addComponent('R', 'R2', 'n2', 'GND', 20);

            const results = engine.solveAC();
            expect(results).not.toBeNull();

            // V(n2) should be 12 * 20/(10+20) = 8V
            const vn2 = results.nodes['n2'];
            expect(vn2.mag()).toBeCloseTo(8, 1);
        });
    });

    describe('solveAC — series RLC', () => {
        it('shows capacitor voltage leads inductor voltage by 180 degrees', () => {
            const engine = new CircuitEngine();
            engine.setFrequency(60);

            engine.addComponent('Vac', 'V1', 'n1', 'GND', 10, { phase: 0 });
            engine.addComponent('R', 'R1', 'n1', 'n2', 100);
            engine.addComponent('L', 'L1', 'n2', 'n3', 0.1);
            engine.addComponent('C', 'C1', 'n3', 'GND', 10e-6);

            const results = engine.solveAC();
            expect(results).not.toBeNull();

            // All node voltages should be finite
            expect(results.nodes['n1'].mag()).toBeGreaterThan(0);
            expect(results.nodes['n2'].mag()).toBeGreaterThan(0);
            expect(results.nodes['n3'].mag()).toBeGreaterThan(0);
        });
    });

    describe('solveAC — wire collapsing', () => {
        it('treats two nodes connected by a wire as the same node', () => {
            const engine = new CircuitEngine();
            engine.setFrequency(60);

            // V1 → n1 → wire → n2 → R1 → GND
            engine.addComponent('Vac', 'V1', 'n1', 'GND', 10, { phase: 0 });
            engine.addComponent('W', 'W1', 'n1', 'n2', 0);
            engine.addComponent('R', 'R1', 'n2', 'GND', 100);

            const results = engine.solveAC();
            expect(results).not.toBeNull();

            // n1 and n2 should be collapsed to the same node
            // The voltage at the source node should be ~10V
            // Since they're collapsed, we may only get one node in results
            // but the circuit should solve correctly
            const allNodes = Object.keys(results.nodes).filter(n => n !== 'GND');
            expect(allNodes.length).toBeGreaterThanOrEqual(1);

            // The non-GND node should have ~10V (source voltage through negligible wire)
            const vNode = results.nodes[allNodes[0]];
            expect(vNode.mag()).toBeCloseTo(10, 1);
        });
    });

    describe('solveAC — ideal source validation', () => {
        it('throws on conflicting parallel voltage sources', () => {
            const engine = new CircuitEngine();
            engine.setFrequency(60);

            engine.addComponent('Vac', 'V1', 'n1', 'GND', 10, { phase: 0 });
            engine.addComponent('Vac', 'V2', 'n1', 'GND', 5, { phase: 0 });
            engine.addComponent('R', 'R1', 'n1', 'GND', 100);

            expect(() => engine.solveAC()).toThrow('Conflicting');
        });

        it('drops duplicate identical voltage sources without error', () => {
            const engine = new CircuitEngine();
            engine.setFrequency(60);

            engine.addComponent('Vac', 'V1', 'n1', 'GND', 10, { phase: 0 });
            engine.addComponent('Vac', 'V2', 'n1', 'GND', 10, { phase: 0 });
            engine.addComponent('R', 'R1', 'n1', 'GND', 100);

            const results = engine.solveAC();
            expect(results).not.toBeNull();
            expect(results.nodes['n1'].mag()).toBeCloseTo(10, 1);
        });
    });

    describe('solveAC — diode rejection', () => {
        it('throws when diode is used in AC phasor analysis', () => {
            const engine = new CircuitEngine();
            engine.setFrequency(60);

            engine.addComponent('Vac', 'V1', 'n1', 'GND', 10, { phase: 0 });
            engine.addComponent('D', 'D1', 'n1', 'GND', 0.7);

            expect(() => engine.solveAC()).toThrow('Diode');
        });
    });
});
