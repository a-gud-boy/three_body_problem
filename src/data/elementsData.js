// Complete Periodic Table Data
// All 118 elements with properties for visualization and simulation

// Element categories with colors
export const ELEMENT_CATEGORIES = {
    'alkali-metal': { name: 'Alkali Metal', color: '#ff6b6b', bgColor: 'rgba(255, 107, 107, 0.15)' },
    'alkaline-earth': { name: 'Alkaline Earth Metal', color: '#ffa94d', bgColor: 'rgba(255, 169, 77, 0.15)' },
    'transition-metal': { name: 'Transition Metal', color: '#ffd43b', bgColor: 'rgba(255, 212, 59, 0.15)' },
    'post-transition': { name: 'Post-Transition Metal', color: '#69db7c', bgColor: 'rgba(105, 219, 124, 0.15)' },
    'metalloid': { name: 'Metalloid', color: '#38d9a9', bgColor: 'rgba(56, 217, 169, 0.15)' },
    'nonmetal': { name: 'Reactive Nonmetal', color: '#4dabf7', bgColor: 'rgba(77, 171, 247, 0.15)' },
    'noble-gas': { name: 'Noble Gas', color: '#da77f2', bgColor: 'rgba(218, 119, 242, 0.15)' },
    'lanthanide': { name: 'Lanthanide', color: '#e599f7', bgColor: 'rgba(229, 153, 247, 0.15)' },
    'actinide': { name: 'Actinide', color: '#ff8787', bgColor: 'rgba(255, 135, 135, 0.15)' },
    'unknown': { name: 'Unknown Properties', color: '#868e96', bgColor: 'rgba(134, 142, 150, 0.15)' },
};

// Electron shell configuration helper
// Returns array of electrons per shell [K, L, M, N, O, P, Q]
export function getElectronShells(atomicNumber) {
    const shells = [0, 0, 0, 0, 0, 0, 0];
    const maxPerShell = [2, 8, 18, 32, 32, 18, 8];
    let remaining = atomicNumber;

    for (let i = 0; i < shells.length && remaining > 0; i++) {
        const electrons = Math.min(remaining, maxPerShell[i]);
        shells[i] = electrons;
        remaining -= electrons;
    }

    return shells;
}

// Orbital configuration for electron cloud visualization
// Returns detailed orbital info for quantum visualization
export function getOrbitalConfiguration(atomicNumber) {
    const orbitals = [];
    const fillingOrder = [
        { n: 1, l: 0, name: '1s', max: 2 },
        { n: 2, l: 0, name: '2s', max: 2 },
        { n: 2, l: 1, name: '2p', max: 6 },
        { n: 3, l: 0, name: '3s', max: 2 },
        { n: 3, l: 1, name: '3p', max: 6 },
        { n: 4, l: 0, name: '4s', max: 2 },
        { n: 3, l: 2, name: '3d', max: 10 },
        { n: 4, l: 1, name: '4p', max: 6 },
        { n: 5, l: 0, name: '5s', max: 2 },
        { n: 4, l: 2, name: '4d', max: 10 },
        { n: 5, l: 1, name: '5p', max: 6 },
        { n: 6, l: 0, name: '6s', max: 2 },
        { n: 4, l: 3, name: '4f', max: 14 },
        { n: 5, l: 2, name: '5d', max: 10 },
        { n: 6, l: 1, name: '6p', max: 6 },
        { n: 7, l: 0, name: '7s', max: 2 },
        { n: 5, l: 3, name: '5f', max: 14 },
        { n: 6, l: 2, name: '6d', max: 10 },
        { n: 7, l: 1, name: '7p', max: 6 },
    ];

    let remaining = atomicNumber;

    for (const orbital of fillingOrder) {
        if (remaining <= 0) break;
        const electrons = Math.min(remaining, orbital.max);
        orbitals.push({
            ...orbital,
            electrons,
            type: ['s', 'p', 'd', 'f'][orbital.l],
        });
        remaining -= electrons;
    }

    return orbitals;
}

// Complete periodic table data
export const ELEMENTS = [
    // Period 1
    { atomicNumber: 1, symbol: 'H', name: 'Hydrogen', atomicMass: 1.008, category: 'nonmetal', electronegativity: 2.20, ionizationEnergy: 1312, row: 1, col: 1, electronConfig: '1s¹' },
    { atomicNumber: 2, symbol: 'He', name: 'Helium', atomicMass: 4.003, category: 'noble-gas', electronegativity: null, ionizationEnergy: 2372, row: 1, col: 18, electronConfig: '1s²' },

    // Period 2
    { atomicNumber: 3, symbol: 'Li', name: 'Lithium', atomicMass: 6.941, category: 'alkali-metal', electronegativity: 0.98, ionizationEnergy: 520, row: 2, col: 1, electronConfig: '[He] 2s¹' },
    { atomicNumber: 4, symbol: 'Be', name: 'Beryllium', atomicMass: 9.012, category: 'alkaline-earth', electronegativity: 1.57, ionizationEnergy: 900, row: 2, col: 2, electronConfig: '[He] 2s²' },
    { atomicNumber: 5, symbol: 'B', name: 'Boron', atomicMass: 10.81, category: 'metalloid', electronegativity: 2.04, ionizationEnergy: 801, row: 2, col: 13, electronConfig: '[He] 2s² 2p¹' },
    { atomicNumber: 6, symbol: 'C', name: 'Carbon', atomicMass: 12.01, category: 'nonmetal', electronegativity: 2.55, ionizationEnergy: 1086, row: 2, col: 14, electronConfig: '[He] 2s² 2p²' },
    { atomicNumber: 7, symbol: 'N', name: 'Nitrogen', atomicMass: 14.01, category: 'nonmetal', electronegativity: 3.04, ionizationEnergy: 1402, row: 2, col: 15, electronConfig: '[He] 2s² 2p³' },
    { atomicNumber: 8, symbol: 'O', name: 'Oxygen', atomicMass: 16.00, category: 'nonmetal', electronegativity: 3.44, ionizationEnergy: 1314, row: 2, col: 16, electronConfig: '[He] 2s² 2p⁴' },
    { atomicNumber: 9, symbol: 'F', name: 'Fluorine', atomicMass: 19.00, category: 'nonmetal', electronegativity: 3.98, ionizationEnergy: 1681, row: 2, col: 17, electronConfig: '[He] 2s² 2p⁵' },
    { atomicNumber: 10, symbol: 'Ne', name: 'Neon', atomicMass: 20.18, category: 'noble-gas', electronegativity: null, ionizationEnergy: 2081, row: 2, col: 18, electronConfig: '[He] 2s² 2p⁶' },

    // Period 3
    { atomicNumber: 11, symbol: 'Na', name: 'Sodium', atomicMass: 22.99, category: 'alkali-metal', electronegativity: 0.93, ionizationEnergy: 496, row: 3, col: 1, electronConfig: '[Ne] 3s¹' },
    { atomicNumber: 12, symbol: 'Mg', name: 'Magnesium', atomicMass: 24.31, category: 'alkaline-earth', electronegativity: 1.31, ionizationEnergy: 738, row: 3, col: 2, electronConfig: '[Ne] 3s²' },
    { atomicNumber: 13, symbol: 'Al', name: 'Aluminum', atomicMass: 26.98, category: 'post-transition', electronegativity: 1.61, ionizationEnergy: 578, row: 3, col: 13, electronConfig: '[Ne] 3s² 3p¹' },
    { atomicNumber: 14, symbol: 'Si', name: 'Silicon', atomicMass: 28.09, category: 'metalloid', electronegativity: 1.90, ionizationEnergy: 786, row: 3, col: 14, electronConfig: '[Ne] 3s² 3p²' },
    { atomicNumber: 15, symbol: 'P', name: 'Phosphorus', atomicMass: 30.97, category: 'nonmetal', electronegativity: 2.19, ionizationEnergy: 1012, row: 3, col: 15, electronConfig: '[Ne] 3s² 3p³' },
    { atomicNumber: 16, symbol: 'S', name: 'Sulfur', atomicMass: 32.07, category: 'nonmetal', electronegativity: 2.58, ionizationEnergy: 1000, row: 3, col: 16, electronConfig: '[Ne] 3s² 3p⁴' },
    { atomicNumber: 17, symbol: 'Cl', name: 'Chlorine', atomicMass: 35.45, category: 'nonmetal', electronegativity: 3.16, ionizationEnergy: 1251, row: 3, col: 17, electronConfig: '[Ne] 3s² 3p⁵' },
    { atomicNumber: 18, symbol: 'Ar', name: 'Argon', atomicMass: 39.95, category: 'noble-gas', electronegativity: null, ionizationEnergy: 1521, row: 3, col: 18, electronConfig: '[Ne] 3s² 3p⁶' },

    // Period 4
    { atomicNumber: 19, symbol: 'K', name: 'Potassium', atomicMass: 39.10, category: 'alkali-metal', electronegativity: 0.82, ionizationEnergy: 419, row: 4, col: 1, electronConfig: '[Ar] 4s¹' },
    { atomicNumber: 20, symbol: 'Ca', name: 'Calcium', atomicMass: 40.08, category: 'alkaline-earth', electronegativity: 1.00, ionizationEnergy: 590, row: 4, col: 2, electronConfig: '[Ar] 4s²' },
    { atomicNumber: 21, symbol: 'Sc', name: 'Scandium', atomicMass: 44.96, category: 'transition-metal', electronegativity: 1.36, ionizationEnergy: 633, row: 4, col: 3, electronConfig: '[Ar] 3d¹ 4s²' },
    { atomicNumber: 22, symbol: 'Ti', name: 'Titanium', atomicMass: 47.87, category: 'transition-metal', electronegativity: 1.54, ionizationEnergy: 659, row: 4, col: 4, electronConfig: '[Ar] 3d² 4s²' },
    { atomicNumber: 23, symbol: 'V', name: 'Vanadium', atomicMass: 50.94, category: 'transition-metal', electronegativity: 1.63, ionizationEnergy: 651, row: 4, col: 5, electronConfig: '[Ar] 3d³ 4s²' },
    { atomicNumber: 24, symbol: 'Cr', name: 'Chromium', atomicMass: 52.00, category: 'transition-metal', electronegativity: 1.66, ionizationEnergy: 653, row: 4, col: 6, electronConfig: '[Ar] 3d⁵ 4s¹' },
    { atomicNumber: 25, symbol: 'Mn', name: 'Manganese', atomicMass: 54.94, category: 'transition-metal', electronegativity: 1.55, ionizationEnergy: 717, row: 4, col: 7, electronConfig: '[Ar] 3d⁵ 4s²' },
    { atomicNumber: 26, symbol: 'Fe', name: 'Iron', atomicMass: 55.85, category: 'transition-metal', electronegativity: 1.83, ionizationEnergy: 762, row: 4, col: 8, electronConfig: '[Ar] 3d⁶ 4s²' },
    { atomicNumber: 27, symbol: 'Co', name: 'Cobalt', atomicMass: 58.93, category: 'transition-metal', electronegativity: 1.88, ionizationEnergy: 760, row: 4, col: 9, electronConfig: '[Ar] 3d⁷ 4s²' },
    { atomicNumber: 28, symbol: 'Ni', name: 'Nickel', atomicMass: 58.69, category: 'transition-metal', electronegativity: 1.91, ionizationEnergy: 737, row: 4, col: 10, electronConfig: '[Ar] 3d⁸ 4s²' },
    { atomicNumber: 29, symbol: 'Cu', name: 'Copper', atomicMass: 63.55, category: 'transition-metal', electronegativity: 1.90, ionizationEnergy: 745, row: 4, col: 11, electronConfig: '[Ar] 3d¹⁰ 4s¹' },
    { atomicNumber: 30, symbol: 'Zn', name: 'Zinc', atomicMass: 65.38, category: 'transition-metal', electronegativity: 1.65, ionizationEnergy: 906, row: 4, col: 12, electronConfig: '[Ar] 3d¹⁰ 4s²' },
    { atomicNumber: 31, symbol: 'Ga', name: 'Gallium', atomicMass: 69.72, category: 'post-transition', electronegativity: 1.81, ionizationEnergy: 579, row: 4, col: 13, electronConfig: '[Ar] 3d¹⁰ 4s² 4p¹' },
    { atomicNumber: 32, symbol: 'Ge', name: 'Germanium', atomicMass: 72.63, category: 'metalloid', electronegativity: 2.01, ionizationEnergy: 762, row: 4, col: 14, electronConfig: '[Ar] 3d¹⁰ 4s² 4p²' },
    { atomicNumber: 33, symbol: 'As', name: 'Arsenic', atomicMass: 74.92, category: 'metalloid', electronegativity: 2.18, ionizationEnergy: 947, row: 4, col: 15, electronConfig: '[Ar] 3d¹⁰ 4s² 4p³' },
    { atomicNumber: 34, symbol: 'Se', name: 'Selenium', atomicMass: 78.97, category: 'nonmetal', electronegativity: 2.55, ionizationEnergy: 941, row: 4, col: 16, electronConfig: '[Ar] 3d¹⁰ 4s² 4p⁴' },
    { atomicNumber: 35, symbol: 'Br', name: 'Bromine', atomicMass: 79.90, category: 'nonmetal', electronegativity: 2.96, ionizationEnergy: 1140, row: 4, col: 17, electronConfig: '[Ar] 3d¹⁰ 4s² 4p⁵' },
    { atomicNumber: 36, symbol: 'Kr', name: 'Krypton', atomicMass: 83.80, category: 'noble-gas', electronegativity: 3.00, ionizationEnergy: 1351, row: 4, col: 18, electronConfig: '[Ar] 3d¹⁰ 4s² 4p⁶' },

    // Period 5
    { atomicNumber: 37, symbol: 'Rb', name: 'Rubidium', atomicMass: 85.47, category: 'alkali-metal', electronegativity: 0.82, ionizationEnergy: 403, row: 5, col: 1, electronConfig: '[Kr] 5s¹' },
    { atomicNumber: 38, symbol: 'Sr', name: 'Strontium', atomicMass: 87.62, category: 'alkaline-earth', electronegativity: 0.95, ionizationEnergy: 550, row: 5, col: 2, electronConfig: '[Kr] 5s²' },
    { atomicNumber: 39, symbol: 'Y', name: 'Yttrium', atomicMass: 88.91, category: 'transition-metal', electronegativity: 1.22, ionizationEnergy: 600, row: 5, col: 3, electronConfig: '[Kr] 4d¹ 5s²' },
    { atomicNumber: 40, symbol: 'Zr', name: 'Zirconium', atomicMass: 91.22, category: 'transition-metal', electronegativity: 1.33, ionizationEnergy: 640, row: 5, col: 4, electronConfig: '[Kr] 4d² 5s²' },
    { atomicNumber: 41, symbol: 'Nb', name: 'Niobium', atomicMass: 92.91, category: 'transition-metal', electronegativity: 1.60, ionizationEnergy: 652, row: 5, col: 5, electronConfig: '[Kr] 4d⁴ 5s¹' },
    { atomicNumber: 42, symbol: 'Mo', name: 'Molybdenum', atomicMass: 95.95, category: 'transition-metal', electronegativity: 2.16, ionizationEnergy: 684, row: 5, col: 6, electronConfig: '[Kr] 4d⁵ 5s¹' },
    { atomicNumber: 43, symbol: 'Tc', name: 'Technetium', atomicMass: 98, category: 'transition-metal', electronegativity: 1.90, ionizationEnergy: 702, row: 5, col: 7, electronConfig: '[Kr] 4d⁵ 5s²' },
    { atomicNumber: 44, symbol: 'Ru', name: 'Ruthenium', atomicMass: 101.1, category: 'transition-metal', electronegativity: 2.20, ionizationEnergy: 710, row: 5, col: 8, electronConfig: '[Kr] 4d⁷ 5s¹' },
    { atomicNumber: 45, symbol: 'Rh', name: 'Rhodium', atomicMass: 102.9, category: 'transition-metal', electronegativity: 2.28, ionizationEnergy: 720, row: 5, col: 9, electronConfig: '[Kr] 4d⁸ 5s¹' },
    { atomicNumber: 46, symbol: 'Pd', name: 'Palladium', atomicMass: 106.4, category: 'transition-metal', electronegativity: 2.20, ionizationEnergy: 804, row: 5, col: 10, electronConfig: '[Kr] 4d¹⁰' },
    { atomicNumber: 47, symbol: 'Ag', name: 'Silver', atomicMass: 107.9, category: 'transition-metal', electronegativity: 1.93, ionizationEnergy: 731, row: 5, col: 11, electronConfig: '[Kr] 4d¹⁰ 5s¹' },
    { atomicNumber: 48, symbol: 'Cd', name: 'Cadmium', atomicMass: 112.4, category: 'transition-metal', electronegativity: 1.69, ionizationEnergy: 868, row: 5, col: 12, electronConfig: '[Kr] 4d¹⁰ 5s²' },
    { atomicNumber: 49, symbol: 'In', name: 'Indium', atomicMass: 114.8, category: 'post-transition', electronegativity: 1.78, ionizationEnergy: 558, row: 5, col: 13, electronConfig: '[Kr] 4d¹⁰ 5s² 5p¹' },
    { atomicNumber: 50, symbol: 'Sn', name: 'Tin', atomicMass: 118.7, category: 'post-transition', electronegativity: 1.96, ionizationEnergy: 709, row: 5, col: 14, electronConfig: '[Kr] 4d¹⁰ 5s² 5p²' },
    { atomicNumber: 51, symbol: 'Sb', name: 'Antimony', atomicMass: 121.8, category: 'metalloid', electronegativity: 2.05, ionizationEnergy: 834, row: 5, col: 15, electronConfig: '[Kr] 4d¹⁰ 5s² 5p³' },
    { atomicNumber: 52, symbol: 'Te', name: 'Tellurium', atomicMass: 127.6, category: 'metalloid', electronegativity: 2.10, ionizationEnergy: 869, row: 5, col: 16, electronConfig: '[Kr] 4d¹⁰ 5s² 5p⁴' },
    { atomicNumber: 53, symbol: 'I', name: 'Iodine', atomicMass: 126.9, category: 'nonmetal', electronegativity: 2.66, ionizationEnergy: 1008, row: 5, col: 17, electronConfig: '[Kr] 4d¹⁰ 5s² 5p⁵' },
    { atomicNumber: 54, symbol: 'Xe', name: 'Xenon', atomicMass: 131.3, category: 'noble-gas', electronegativity: 2.60, ionizationEnergy: 1170, row: 5, col: 18, electronConfig: '[Kr] 4d¹⁰ 5s² 5p⁶' },

    // Period 6
    { atomicNumber: 55, symbol: 'Cs', name: 'Cesium', atomicMass: 132.9, category: 'alkali-metal', electronegativity: 0.79, ionizationEnergy: 376, row: 6, col: 1, electronConfig: '[Xe] 6s¹' },
    { atomicNumber: 56, symbol: 'Ba', name: 'Barium', atomicMass: 137.3, category: 'alkaline-earth', electronegativity: 0.89, ionizationEnergy: 503, row: 6, col: 2, electronConfig: '[Xe] 6s²' },
    // Lanthanides (row 8 for display, col 3-17)
    { atomicNumber: 57, symbol: 'La', name: 'Lanthanum', atomicMass: 138.9, category: 'lanthanide', electronegativity: 1.10, ionizationEnergy: 538, row: 8, col: 3, electronConfig: '[Xe] 5d¹ 6s²' },
    { atomicNumber: 58, symbol: 'Ce', name: 'Cerium', atomicMass: 140.1, category: 'lanthanide', electronegativity: 1.12, ionizationEnergy: 534, row: 8, col: 4, electronConfig: '[Xe] 4f¹ 5d¹ 6s²' },
    { atomicNumber: 59, symbol: 'Pr', name: 'Praseodymium', atomicMass: 140.9, category: 'lanthanide', electronegativity: 1.13, ionizationEnergy: 527, row: 8, col: 5, electronConfig: '[Xe] 4f³ 6s²' },
    { atomicNumber: 60, symbol: 'Nd', name: 'Neodymium', atomicMass: 144.2, category: 'lanthanide', electronegativity: 1.14, ionizationEnergy: 533, row: 8, col: 6, electronConfig: '[Xe] 4f⁴ 6s²' },
    { atomicNumber: 61, symbol: 'Pm', name: 'Promethium', atomicMass: 145, category: 'lanthanide', electronegativity: 1.13, ionizationEnergy: 540, row: 8, col: 7, electronConfig: '[Xe] 4f⁵ 6s²' },
    { atomicNumber: 62, symbol: 'Sm', name: 'Samarium', atomicMass: 150.4, category: 'lanthanide', electronegativity: 1.17, ionizationEnergy: 545, row: 8, col: 8, electronConfig: '[Xe] 4f⁶ 6s²' },
    { atomicNumber: 63, symbol: 'Eu', name: 'Europium', atomicMass: 152.0, category: 'lanthanide', electronegativity: 1.20, ionizationEnergy: 547, row: 8, col: 9, electronConfig: '[Xe] 4f⁷ 6s²' },
    { atomicNumber: 64, symbol: 'Gd', name: 'Gadolinium', atomicMass: 157.3, category: 'lanthanide', electronegativity: 1.20, ionizationEnergy: 593, row: 8, col: 10, electronConfig: '[Xe] 4f⁷ 5d¹ 6s²' },
    { atomicNumber: 65, symbol: 'Tb', name: 'Terbium', atomicMass: 158.9, category: 'lanthanide', electronegativity: 1.20, ionizationEnergy: 566, row: 8, col: 11, electronConfig: '[Xe] 4f⁹ 6s²' },
    { atomicNumber: 66, symbol: 'Dy', name: 'Dysprosium', atomicMass: 162.5, category: 'lanthanide', electronegativity: 1.22, ionizationEnergy: 573, row: 8, col: 12, electronConfig: '[Xe] 4f¹⁰ 6s²' },
    { atomicNumber: 67, symbol: 'Ho', name: 'Holmium', atomicMass: 164.9, category: 'lanthanide', electronegativity: 1.23, ionizationEnergy: 581, row: 8, col: 13, electronConfig: '[Xe] 4f¹¹ 6s²' },
    { atomicNumber: 68, symbol: 'Er', name: 'Erbium', atomicMass: 167.3, category: 'lanthanide', electronegativity: 1.24, ionizationEnergy: 589, row: 8, col: 14, electronConfig: '[Xe] 4f¹² 6s²' },
    { atomicNumber: 69, symbol: 'Tm', name: 'Thulium', atomicMass: 168.9, category: 'lanthanide', electronegativity: 1.25, ionizationEnergy: 597, row: 8, col: 15, electronConfig: '[Xe] 4f¹³ 6s²' },
    { atomicNumber: 70, symbol: 'Yb', name: 'Ytterbium', atomicMass: 173.0, category: 'lanthanide', electronegativity: 1.10, ionizationEnergy: 603, row: 8, col: 16, electronConfig: '[Xe] 4f¹⁴ 6s²' },
    { atomicNumber: 71, symbol: 'Lu', name: 'Lutetium', atomicMass: 175.0, category: 'lanthanide', electronegativity: 1.27, ionizationEnergy: 524, row: 8, col: 17, electronConfig: '[Xe] 4f¹⁴ 5d¹ 6s²' },
    // Continue Period 6
    { atomicNumber: 72, symbol: 'Hf', name: 'Hafnium', atomicMass: 178.5, category: 'transition-metal', electronegativity: 1.30, ionizationEnergy: 659, row: 6, col: 4, electronConfig: '[Xe] 4f¹⁴ 5d² 6s²' },
    { atomicNumber: 73, symbol: 'Ta', name: 'Tantalum', atomicMass: 180.9, category: 'transition-metal', electronegativity: 1.50, ionizationEnergy: 761, row: 6, col: 5, electronConfig: '[Xe] 4f¹⁴ 5d³ 6s²' },
    { atomicNumber: 74, symbol: 'W', name: 'Tungsten', atomicMass: 183.8, category: 'transition-metal', electronegativity: 2.36, ionizationEnergy: 770, row: 6, col: 6, electronConfig: '[Xe] 4f¹⁴ 5d⁴ 6s²' },
    { atomicNumber: 75, symbol: 'Re', name: 'Rhenium', atomicMass: 186.2, category: 'transition-metal', electronegativity: 1.90, ionizationEnergy: 760, row: 6, col: 7, electronConfig: '[Xe] 4f¹⁴ 5d⁵ 6s²' },
    { atomicNumber: 76, symbol: 'Os', name: 'Osmium', atomicMass: 190.2, category: 'transition-metal', electronegativity: 2.20, ionizationEnergy: 840, row: 6, col: 8, electronConfig: '[Xe] 4f¹⁴ 5d⁶ 6s²' },
    { atomicNumber: 77, symbol: 'Ir', name: 'Iridium', atomicMass: 192.2, category: 'transition-metal', electronegativity: 2.20, ionizationEnergy: 880, row: 6, col: 9, electronConfig: '[Xe] 4f¹⁴ 5d⁷ 6s²' },
    { atomicNumber: 78, symbol: 'Pt', name: 'Platinum', atomicMass: 195.1, category: 'transition-metal', electronegativity: 2.28, ionizationEnergy: 870, row: 6, col: 10, electronConfig: '[Xe] 4f¹⁴ 5d⁹ 6s¹' },
    { atomicNumber: 79, symbol: 'Au', name: 'Gold', atomicMass: 197.0, category: 'transition-metal', electronegativity: 2.54, ionizationEnergy: 890, row: 6, col: 11, electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s¹' },
    { atomicNumber: 80, symbol: 'Hg', name: 'Mercury', atomicMass: 200.6, category: 'transition-metal', electronegativity: 2.00, ionizationEnergy: 1007, row: 6, col: 12, electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s²' },
    { atomicNumber: 81, symbol: 'Tl', name: 'Thallium', atomicMass: 204.4, category: 'post-transition', electronegativity: 1.62, ionizationEnergy: 589, row: 6, col: 13, electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p¹' },
    { atomicNumber: 82, symbol: 'Pb', name: 'Lead', atomicMass: 207.2, category: 'post-transition', electronegativity: 2.33, ionizationEnergy: 716, row: 6, col: 14, electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p²' },
    { atomicNumber: 83, symbol: 'Bi', name: 'Bismuth', atomicMass: 209.0, category: 'post-transition', electronegativity: 2.02, ionizationEnergy: 703, row: 6, col: 15, electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p³' },
    { atomicNumber: 84, symbol: 'Po', name: 'Polonium', atomicMass: 209, category: 'metalloid', electronegativity: 2.00, ionizationEnergy: 812, row: 6, col: 16, electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁴' },
    { atomicNumber: 85, symbol: 'At', name: 'Astatine', atomicMass: 210, category: 'nonmetal', electronegativity: 2.20, ionizationEnergy: 920, row: 6, col: 17, electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁵' },
    { atomicNumber: 86, symbol: 'Rn', name: 'Radon', atomicMass: 222, category: 'noble-gas', electronegativity: 2.20, ionizationEnergy: 1037, row: 6, col: 18, electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁶' },

    // Period 7
    { atomicNumber: 87, symbol: 'Fr', name: 'Francium', atomicMass: 223, category: 'alkali-metal', electronegativity: 0.70, ionizationEnergy: 380, row: 7, col: 1, electronConfig: '[Rn] 7s¹' },
    { atomicNumber: 88, symbol: 'Ra', name: 'Radium', atomicMass: 226, category: 'alkaline-earth', electronegativity: 0.90, ionizationEnergy: 509, row: 7, col: 2, electronConfig: '[Rn] 7s²' },
    // Actinides (row 9 for display)
    { atomicNumber: 89, symbol: 'Ac', name: 'Actinium', atomicMass: 227, category: 'actinide', electronegativity: 1.10, ionizationEnergy: 499, row: 9, col: 3, electronConfig: '[Rn] 6d¹ 7s²' },
    { atomicNumber: 90, symbol: 'Th', name: 'Thorium', atomicMass: 232.0, category: 'actinide', electronegativity: 1.30, ionizationEnergy: 587, row: 9, col: 4, electronConfig: '[Rn] 6d² 7s²' },
    { atomicNumber: 91, symbol: 'Pa', name: 'Protactinium', atomicMass: 231.0, category: 'actinide', electronegativity: 1.50, ionizationEnergy: 568, row: 9, col: 5, electronConfig: '[Rn] 5f² 6d¹ 7s²' },
    { atomicNumber: 92, symbol: 'U', name: 'Uranium', atomicMass: 238.0, category: 'actinide', electronegativity: 1.38, ionizationEnergy: 598, row: 9, col: 6, electronConfig: '[Rn] 5f³ 6d¹ 7s²' },
    { atomicNumber: 93, symbol: 'Np', name: 'Neptunium', atomicMass: 237, category: 'actinide', electronegativity: 1.36, ionizationEnergy: 605, row: 9, col: 7, electronConfig: '[Rn] 5f⁴ 6d¹ 7s²' },
    { atomicNumber: 94, symbol: 'Pu', name: 'Plutonium', atomicMass: 244, category: 'actinide', electronegativity: 1.28, ionizationEnergy: 585, row: 9, col: 8, electronConfig: '[Rn] 5f⁶ 7s²' },
    { atomicNumber: 95, symbol: 'Am', name: 'Americium', atomicMass: 243, category: 'actinide', electronegativity: 1.30, ionizationEnergy: 578, row: 9, col: 9, electronConfig: '[Rn] 5f⁷ 7s²' },
    { atomicNumber: 96, symbol: 'Cm', name: 'Curium', atomicMass: 247, category: 'actinide', electronegativity: 1.30, ionizationEnergy: 581, row: 9, col: 10, electronConfig: '[Rn] 5f⁷ 6d¹ 7s²' },
    { atomicNumber: 97, symbol: 'Bk', name: 'Berkelium', atomicMass: 247, category: 'actinide', electronegativity: 1.30, ionizationEnergy: 601, row: 9, col: 11, electronConfig: '[Rn] 5f⁹ 7s²' },
    { atomicNumber: 98, symbol: 'Cf', name: 'Californium', atomicMass: 251, category: 'actinide', electronegativity: 1.30, ionizationEnergy: 608, row: 9, col: 12, electronConfig: '[Rn] 5f¹⁰ 7s²' },
    { atomicNumber: 99, symbol: 'Es', name: 'Einsteinium', atomicMass: 252, category: 'actinide', electronegativity: 1.30, ionizationEnergy: 619, row: 9, col: 13, electronConfig: '[Rn] 5f¹¹ 7s²' },
    { atomicNumber: 100, symbol: 'Fm', name: 'Fermium', atomicMass: 257, category: 'actinide', electronegativity: 1.30, ionizationEnergy: 627, row: 9, col: 14, electronConfig: '[Rn] 5f¹² 7s²' },
    { atomicNumber: 101, symbol: 'Md', name: 'Mendelevium', atomicMass: 258, category: 'actinide', electronegativity: 1.30, ionizationEnergy: 635, row: 9, col: 15, electronConfig: '[Rn] 5f¹³ 7s²' },
    { atomicNumber: 102, symbol: 'No', name: 'Nobelium', atomicMass: 259, category: 'actinide', electronegativity: 1.30, ionizationEnergy: 642, row: 9, col: 16, electronConfig: '[Rn] 5f¹⁴ 7s²' },
    { atomicNumber: 103, symbol: 'Lr', name: 'Lawrencium', atomicMass: 266, category: 'actinide', electronegativity: 1.30, ionizationEnergy: 470, row: 9, col: 17, electronConfig: '[Rn] 5f¹⁴ 7s² 7p¹' },
    // Continue Period 7
    { atomicNumber: 104, symbol: 'Rf', name: 'Rutherfordium', atomicMass: 267, category: 'transition-metal', electronegativity: null, ionizationEnergy: 580, row: 7, col: 4, electronConfig: '[Rn] 5f¹⁴ 6d² 7s²' },
    { atomicNumber: 105, symbol: 'Db', name: 'Dubnium', atomicMass: 268, category: 'transition-metal', electronegativity: null, ionizationEnergy: null, row: 7, col: 5, electronConfig: '[Rn] 5f¹⁴ 6d³ 7s²' },
    { atomicNumber: 106, symbol: 'Sg', name: 'Seaborgium', atomicMass: 269, category: 'transition-metal', electronegativity: null, ionizationEnergy: null, row: 7, col: 6, electronConfig: '[Rn] 5f¹⁴ 6d⁴ 7s²' },
    { atomicNumber: 107, symbol: 'Bh', name: 'Bohrium', atomicMass: 270, category: 'transition-metal', electronegativity: null, ionizationEnergy: null, row: 7, col: 7, electronConfig: '[Rn] 5f¹⁴ 6d⁵ 7s²' },
    { atomicNumber: 108, symbol: 'Hs', name: 'Hassium', atomicMass: 277, category: 'transition-metal', electronegativity: null, ionizationEnergy: null, row: 7, col: 8, electronConfig: '[Rn] 5f¹⁴ 6d⁶ 7s²' },
    { atomicNumber: 109, symbol: 'Mt', name: 'Meitnerium', atomicMass: 278, category: 'unknown', electronegativity: null, ionizationEnergy: null, row: 7, col: 9, electronConfig: '[Rn] 5f¹⁴ 6d⁷ 7s²' },
    { atomicNumber: 110, symbol: 'Ds', name: 'Darmstadtium', atomicMass: 281, category: 'unknown', electronegativity: null, ionizationEnergy: null, row: 7, col: 10, electronConfig: '[Rn] 5f¹⁴ 6d⁸ 7s²' },
    { atomicNumber: 111, symbol: 'Rg', name: 'Roentgenium', atomicMass: 282, category: 'unknown', electronegativity: null, ionizationEnergy: null, row: 7, col: 11, electronConfig: '[Rn] 5f¹⁴ 6d⁹ 7s²' },
    { atomicNumber: 112, symbol: 'Cn', name: 'Copernicium', atomicMass: 285, category: 'transition-metal', electronegativity: null, ionizationEnergy: null, row: 7, col: 12, electronConfig: '[Rn] 5f¹⁴ 6d¹⁰ 7s²' },
    { atomicNumber: 113, symbol: 'Nh', name: 'Nihonium', atomicMass: 286, category: 'unknown', electronegativity: null, ionizationEnergy: null, row: 7, col: 13, electronConfig: '[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p¹' },
    { atomicNumber: 114, symbol: 'Fl', name: 'Flerovium', atomicMass: 289, category: 'unknown', electronegativity: null, ionizationEnergy: null, row: 7, col: 14, electronConfig: '[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p²' },
    { atomicNumber: 115, symbol: 'Mc', name: 'Moscovium', atomicMass: 290, category: 'unknown', electronegativity: null, ionizationEnergy: null, row: 7, col: 15, electronConfig: '[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p³' },
    { atomicNumber: 116, symbol: 'Lv', name: 'Livermorium', atomicMass: 293, category: 'unknown', electronegativity: null, ionizationEnergy: null, row: 7, col: 16, electronConfig: '[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p⁴' },
    { atomicNumber: 117, symbol: 'Ts', name: 'Tennessine', atomicMass: 294, category: 'unknown', electronegativity: null, ionizationEnergy: null, row: 7, col: 17, electronConfig: '[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p⁵' },
    { atomicNumber: 118, symbol: 'Og', name: 'Oganesson', atomicMass: 294, category: 'noble-gas', electronegativity: null, ionizationEnergy: null, row: 7, col: 18, electronConfig: '[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p⁶' },
];

// Helper to get element by atomic number
export function getElementById(atomicNumber) {
    return ELEMENTS.find(el => el.atomicNumber === atomicNumber);
}

// Helper to get element by symbol
export function getElementBySymbol(symbol) {
    return ELEMENTS.find(el => el.symbol.toLowerCase() === symbol.toLowerCase());
}

// Get valence electrons for bonding calculations
export function getValenceElectrons(atomicNumber) {
    const element = getElementById(atomicNumber);
    if (!element) return 0;

    // Simplified valence calculation based on group
    const col = element.col;
    if (col <= 2) return col;
    if (col >= 13) return col - 10;
    if (element.category === 'transition-metal') return 2; // Simplified
    return 0;
}

// CPK coloring scheme for atoms in molecules
export const CPK_COLORS = {
    H: '#FFFFFF',  // White
    C: '#909090',  // Gray
    N: '#3050F8',  // Blue
    O: '#FF0D0D',  // Red
    F: '#90E050',  // Green
    Cl: '#1FF01F', // Green
    Br: '#A62929', // Brown
    I: '#940094',  // Purple
    S: '#FFFF30',  // Yellow
    P: '#FF8000',  // Orange
    Na: '#AB5CF2', // Purple
    K: '#8F40D4',  // Purple
    Ca: '#3DFF00', // Green
    Fe: '#E06633', // Orange
    Mg: '#8AFF00', // Green
    default: '#FF1493', // Pink for unknown
};

export function getAtomColor(symbol) {
    return CPK_COLORS[symbol] || CPK_COLORS.default;
}
