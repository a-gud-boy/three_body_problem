import { calculateMolecularWeight } from './compoundsData.js';
import { ELEMENTS } from './elementsData.js';

test('calculateMolecularWeight: calculates weight for Water (H2O)', () => {
    const waterAtoms = [
        { element: 'O' },
        { element: 'H' },
        { element: 'H' }
    ];
    // O ≈ 16.00, H ≈ 1.008. Total ≈ 18.016
    const weight = calculateMolecularWeight(waterAtoms, ELEMENTS);
    expect(Math.abs(weight - 18.016) < 0.001, `Expected ~18.016, got ${weight}`).toBeTruthy();
});

test('calculateMolecularWeight: calculates weight for Methane (CH4)', () => {
    const methaneAtoms = [
        { element: 'C' },
        { element: 'H' },
        { element: 'H' },
        { element: 'H' },
        { element: 'H' }
    ];
    // C ≈ 12.01, H ≈ 1.008. Total ≈ 12.01 + 4 * 1.008 = 16.042
    const weight = calculateMolecularWeight(methaneAtoms, ELEMENTS);
    expect(Math.abs(weight - 16.042) < 0.001, `Expected ~16.042, got ${weight}`).toBeTruthy();
});

test('calculateMolecularWeight: returns 0 for empty atoms array', () => {
    const weight = calculateMolecularWeight([], ELEMENTS);
    expect(weight).toBe(0);
});

test('calculateMolecularWeight: handles elements not in database by adding 0', () => {
    const unknownAtoms = [
        { element: 'X' }, // Unknown
        { element: 'H' }  // Known (1.008)
    ];
    const weight = calculateMolecularWeight(unknownAtoms, ELEMENTS);
    expect(weight).toBe(1.008);
});

test('calculateMolecularWeight: works with custom elements data', () => {
    const atoms = [{ element: 'A' }, { element: 'B' }];
    const customElements = [
        { symbol: 'A', atomicMass: 10 },
        { symbol: 'B', atomicMass: 20 }
    ];
    const weight = calculateMolecularWeight(atoms, customElements);
    expect(weight).toBe(30);
});

test('calculateMolecularWeight: handles case-sensitivity (must match exactly)', () => {
    const atoms = [{ element: 'h' }]; // Lowercase h
    const weight = calculateMolecularWeight(atoms, ELEMENTS);
    // H is in ELEMENTS, but h is not.
    expect(weight).toBe(0);
});
