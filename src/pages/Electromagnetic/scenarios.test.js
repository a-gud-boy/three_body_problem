
import { SCENARIOS, generateRandomCharges } from './scenarios.js';

describe('Electromagnetic Scenarios', () => {
    describe('SCENARIOS Object', () => {
        it('should have all required scenario keys', () => {
            const expectedKeys = ['DIPOLE', 'QUADRUPOLE', 'LINEAR', 'CAPACITOR', 'RING', 'RANDOM'];
            const actualKeys = Object.keys(SCENARIOS);

            // Check all expected keys are present
            expectedKeys.forEach(key => {
                expect(actualKeys.includes(key)).toBeTruthy();
            });

            // Check no unexpected keys
            expect(actualKeys.length).toBe(expectedKeys.length, 'Unexpected number of scenarios');
        });

        it('should have valid structure for each scenario', () => {
            Object.values(SCENARIOS).forEach(scenario => {
                expect(typeof scenario.name).toBe('string', 'Name should be a string');
                expect(scenario.name.length > 0).toBeTruthy();

                expect(typeof scenario.description).toBe('string', 'Description should be a string');
                expect(scenario.description.length > 0).toBeTruthy();

                expect(Array.isArray(scenario.charges)).toBeTruthy();
            });
        });

        it('should have valid charges in predefined scenarios', () => {
            const scenariosWithCharges = Object.entries(SCENARIOS)
                .filter(([key]) => key !== 'RANDOM')
                .map(([, scenario]) => scenario);

            scenariosWithCharges.forEach(scenario => {
                expect(scenario.charges.length > 0).toBeTruthy();

                scenario.charges.forEach(charge => {
                    expect(typeof charge.x).toBe('number', 'x should be a number');
                    expect(typeof charge.y).toBe('number', 'y should be a number');
                    expect(typeof charge.z).toBe('number', 'z should be a number');
                    expect(charge.q === 1 || charge.q === -1).toBeTruthy();
                });
            });
        });

        it('should have empty charges for RANDOM scenario', () => {
            const randomScenario = SCENARIOS.RANDOM;
            expect(randomScenario).toBeTruthy();
            expect(randomScenario.charges.length).toBe(0, 'RANDOM scenario should have no predefined charges');
        });
    });

    describe('generateRandomCharges', () => {
        it('should generate the requested number of charges', () => {
            const count = 10;
            const charges = generateRandomCharges(count);
            expect(charges.length).toBe(count);
        });

        it('should default to 15 charges if no count provided', () => {
            const charges = generateRandomCharges();
            expect(charges.length).toBe(15);
        });

        it('should generate valid charge objects', () => {
            const charges = generateRandomCharges(5);
            charges.forEach(charge => {
                expect(typeof charge.x).toBe('number');
                expect(typeof charge.y).toBe('number');
                expect(typeof charge.z).toBe('number');
                expect(charge.q === 1 || charge.q === -1).toBeTruthy();
            });
        });

        it('should generate charges within expected bounds', () => {
            // Based on implementation: x/y within +/- 100, z within +/- 25
            const charges = generateRandomCharges(100);
            charges.forEach(charge => {
                expect(Math.abs(charge.x) <= 100).toBeTruthy();
                expect(Math.abs(charge.y) <= 100).toBeTruthy();
                expect(Math.abs(charge.z) <= 25).toBeTruthy();
            });
        });
    });
});
