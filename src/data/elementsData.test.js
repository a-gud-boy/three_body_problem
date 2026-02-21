import {
    getElectronShells,
    getOrbitalConfiguration,
    getElementById,
    getElementBySymbol,
    getValenceElectrons,
    getAtomColor
} from './elementsData.js';

// --- getElectronShells Tests ---

test('getElectronShells: returns correct shells for Hydrogen (1)', () => {
    const shells = getElectronShells(1);
    expect(shells).toEqual([1, 0, 0, 0, 0, 0, 0]);
});

test('getElectronShells: returns correct shells for Carbon (6)', () => {
    const shells = getElectronShells(6);
    // 2, 4
    expect(shells).toEqual([2, 4, 0, 0, 0, 0, 0]);
});

test('getElectronShells: returns correct shells for Copper (29)', () => {
    const shells = getElectronShells(29);
    // 2, 8, 18, 1
    // Wait, let's check the implementation logic in elementsData.js.
    // The implementation is:
    // const maxPerShell = [2, 8, 18, 32, 32, 18, 8];
    // It fills shells purely based on max capacity in order.
    // Real chemistry for Copper is [Ar] 3d10 4s1 -> 2, 8, 18, 1
    // The simplified logic in getElectronShells fills 2, 8, 18, then remainder (1).
    // So for 29: 29 - 2 = 27; 27 - 8 = 19; 19 - 18 = 1. So [2, 8, 18, 1, 0, 0, 0].
    expect(shells).toEqual([2, 8, 18, 1, 0, 0, 0]);
});

test('getElectronShells: returns correct shells for Oganesson (118)', () => {
    const shells = getElectronShells(118);
    // Max: 2+8+18+32+32+18+8 = 118
    expect(shells).toEqual([2, 8, 18, 32, 32, 18, 8]);
});

test('getElectronShells: handles atomic number 0', () => {
    const shells = getElectronShells(0);
    expect(shells).toEqual([0, 0, 0, 0, 0, 0, 0]);
});

test('getElectronShells: handles large atomic numbers by clamping to max shells', () => {
    const shells = getElectronShells(200);
    // Should fill all shells to max
    expect(shells).toEqual([2, 8, 18, 32, 32, 18, 8]);
});

// --- getOrbitalConfiguration Tests ---

test('getOrbitalConfiguration: returns correct configuration for Hydrogen (1)', () => {
    const orbitals = getOrbitalConfiguration(1);
    expect(orbitals.length).toBe(1);
    expect(orbitals[0].name).toEqual('1s');
    expect(orbitals[0].electrons).toBe(1);
});

test('getOrbitalConfiguration: returns correct configuration for Helium (2)', () => {
    const orbitals = getOrbitalConfiguration(2);
    expect(orbitals.length).toBe(1);
    expect(orbitals[0].name).toEqual('1s');
    expect(orbitals[0].electrons).toBe(2);
});

test('getOrbitalConfiguration: returns correct configuration for Lithium (3)', () => {
    const orbitals = getOrbitalConfiguration(3);
    expect(orbitals.length).toBe(2);
    // 1s2
    expect(orbitals[0].name).toBe('1s');
    expect(orbitals[0].electrons).toBe(2);
    // 2s1
    expect(orbitals[1].name).toBe('2s');
    expect(orbitals[1].electrons).toBe(1);
});

test('getOrbitalConfiguration: correct total electrons for large elements', () => {
    const atomicNumber = 80; // Mercury
    const orbitals = getOrbitalConfiguration(atomicNumber);
    const totalElectrons = orbitals.reduce((sum, orb) => sum + orb.electrons, 0);
    expect(totalElectrons).toBe(atomicNumber);
});

test('getOrbitalConfiguration: handles zero atomic number', () => {
    const orbitals = getOrbitalConfiguration(0);
    expect(orbitals).toEqual([]);
});

test('getOrbitalConfiguration: handles negative atomic number', () => {
    const orbitals = getOrbitalConfiguration(-1);
    expect(orbitals).toEqual([]);
});

test('getOrbitalConfiguration: verifies d-orbital filling (Scandium 21)', () => {
    // 1s2 2s2 2p6 3s2 3p6 4s2 3d1
    const orbitals = getOrbitalConfiguration(21);
    const dOrbital = orbitals.find(o => o.name === '3d');
    expect(dOrbital).toBeTruthy();
    expect(dOrbital.electrons).toBe(1);
});

// --- Lookup Helper Tests ---

test('getElementById: returns element for valid atomic number', () => {
    const hydrogen = getElementById(1);
    expect(hydrogen).toBeTruthy();
    expect(hydrogen.name).toBe('Hydrogen');
    expect(hydrogen.symbol).toBe('H');
});

test('getElementById: returns undefined for invalid atomic number', () => {
    const invalid = getElementById(999);
    expect(invalid).toBe(undefined);
});

test('getElementBySymbol: returns element for valid symbol', () => {
    const carbon = getElementBySymbol('C');
    expect(carbon).toBeTruthy();
    expect(carbon.atomicNumber).toBe(6);
});

test('getElementBySymbol: handles lowercase symbol', () => {
    const neon = getElementBySymbol('ne');
    expect(neon).toBeTruthy();
    expect(neon.atomicNumber).toBe(10);
});

test('getElementBySymbol: returns undefined for invalid symbol', () => {
    const invalid = getElementBySymbol('Xyz');
    expect(invalid).toBe(undefined);
});

// --- getValenceElectrons Tests ---

test('getValenceElectrons: returns correct valence for Group 1 (Alkali)', () => {
    // Lithium (3), Group 1
    const valence = getValenceElectrons(3);
    expect(valence).toBe(1);
});

test('getValenceElectrons: returns correct valence for Group 2 (Alkaline Earth)', () => {
    // Magnesium (12), Group 2
    const valence = getValenceElectrons(12);
    expect(valence).toBe(2);
});

test('getValenceElectrons: returns correct valence for Group 13', () => {
    // Boron (5), Group 13
    const valence = getValenceElectrons(5);
    // col 13 -> 13 - 10 = 3
    expect(valence).toBe(3);
});

test('getValenceElectrons: returns correct valence for Group 17 (Halogens)', () => {
    // Fluorine (9), Group 17
    const valence = getValenceElectrons(9);
    // col 17 -> 17 - 10 = 7
    expect(valence).toBe(7);
});

test('getValenceElectrons: returns correct valence for Group 18 (Noble Gases)', () => {
    // Neon (10), Group 18
    const valence = getValenceElectrons(10);
    // col 18 -> 18 - 10 = 8
    expect(valence).toBe(8);
});

test('getValenceElectrons: returns simplified valence for Transition Metals', () => {
    // Iron (26), Group 8
    const valence = getValenceElectrons(26);
    // Should be 2 per simplified logic
    expect(valence).toBe(2);
});

test('getValenceElectrons: returns 0 for unknown element', () => {
    const valence = getValenceElectrons(999);
    expect(valence).toBe(0);
});

// --- getAtomColor Tests ---

test('getAtomColor: returns correct color for known CPK element (Hydrogen)', () => {
    const color = getAtomColor('H');
    expect(color).toBe('#FFFFFF');
});

test('getAtomColor: returns correct color for known CPK element (Oxygen)', () => {
    const color = getAtomColor('O');
    expect(color).toBe('#FF0D0D');
});

test('getAtomColor: returns default color for unknown element symbol', () => {
    const color = getAtomColor('UnknownSymbol');
    expect(color).toBe('#FF1493'); // default pink
});

test('getAtomColor: handles multi-letter symbols (Na)', () => {
    const color = getAtomColor('Na');
    expect(color).toBe('#AB5CF2');
});
