
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SCENARIOS, generateRandomCharges } from './scenarios.js';

describe('Electromagnetic Scenarios', () => {
    describe('SCENARIOS Object', () => {
        it('should have all required scenario keys', () => {
            const expectedKeys = ['DIPOLE', 'QUADRUPOLE', 'LINEAR', 'CAPACITOR', 'RING', 'RANDOM'];
            const actualKeys = Object.keys(SCENARIOS);

            // Check all expected keys are present
            expectedKeys.forEach(key => {
                assert.ok(actualKeys.includes(key), `Missing scenario: ${key}`);
            });

            // Check no unexpected keys
            assert.strictEqual(actualKeys.length, expectedKeys.length, 'Unexpected number of scenarios');
        });

        it('should have valid structure for each scenario', () => {
            Object.values(SCENARIOS).forEach(scenario => {
                assert.strictEqual(typeof scenario.name, 'string', 'Name should be a string');
                assert.ok(scenario.name.length > 0, 'Name should not be empty');

                assert.strictEqual(typeof scenario.description, 'string', 'Description should be a string');
                assert.ok(scenario.description.length > 0, 'Description should not be empty');

                assert.ok(Array.isArray(scenario.charges), 'Charges should be an array');
            });
        });

        it('should have valid charges in predefined scenarios', () => {
            const scenariosWithCharges = Object.entries(SCENARIOS)
                .filter(([key]) => key !== 'RANDOM')
                .map(([_, scenario]) => scenario);

            scenariosWithCharges.forEach(scenario => {
                assert.ok(scenario.charges.length > 0, `${scenario.name} should have charges`);

                scenario.charges.forEach(charge => {
                    assert.strictEqual(typeof charge.x, 'number', 'x should be a number');
                    assert.strictEqual(typeof charge.y, 'number', 'y should be a number');
                    assert.strictEqual(typeof charge.z, 'number', 'z should be a number');
                    assert.ok(charge.q === 1 || charge.q === -1, 'charge q should be 1 or -1');
                });
            });
        });

        it('should have empty charges for RANDOM scenario', () => {
            const randomScenario = SCENARIOS.RANDOM;
            assert.ok(randomScenario, 'RANDOM scenario should exist');
            assert.strictEqual(randomScenario.charges.length, 0, 'RANDOM scenario should have no predefined charges');
        });
    });

    describe('generateRandomCharges', () => {
        it('should generate the requested number of charges', () => {
            const count = 10;
            const charges = generateRandomCharges(count);
            assert.strictEqual(charges.length, count);
        });

        it('should default to 15 charges if no count provided', () => {
            const charges = generateRandomCharges();
            assert.strictEqual(charges.length, 15);
        });

        it('should generate valid charge objects', () => {
            const charges = generateRandomCharges(5);
            charges.forEach(charge => {
                assert.strictEqual(typeof charge.x, 'number');
                assert.strictEqual(typeof charge.y, 'number');
                assert.strictEqual(typeof charge.z, 'number');
                assert.ok(charge.q === 1 || charge.q === -1);
            });
        });

        it('should generate charges within expected bounds', () => {
            // Based on implementation: x/y within +/- 100, z within +/- 25
            const charges = generateRandomCharges(100);
            charges.forEach(charge => {
                assert.ok(Math.abs(charge.x) <= 100, `x ${charge.x} out of bounds`);
                assert.ok(Math.abs(charge.y) <= 100, `y ${charge.y} out of bounds`);
                assert.ok(Math.abs(charge.z) <= 25, `z ${charge.z} out of bounds`);
            });
        });
    });
});
