// Demo compounds library for the Atom Simulator
// Common molecules with structure data for visualization

export const DEMO_COMPOUNDS = [
    {
        id: 'h2',
        name: 'Hydrogen Gas',
        formula: 'H₂',
        formulaRaw: 'H2',
        type: 'covalent',
        description: 'Lightest and most abundant element in the universe.',
        atoms: [
            { element: 'H', x: -0.30, y: 0, z: 0 },
            { element: 'H', x: 0.30, y: 0, z: 0 },
        ],
        bonds: [
            { from: 0, to: 1, order: 1 },
        ],
        properties: {
            molecularWeight: 2.016,
            meltingPoint: -259.1,
            boilingPoint: -252.9,
            state: 'gas',
        },
    },
    {
        id: 'cl2',
        name: 'Chlorine Gas',
        formula: 'Cl₂',
        formulaRaw: 'Cl2',
        type: 'covalent',
        description: 'Yellow-green gas. Strong oxidizing agent.',
        atoms: [
            { element: 'Cl', x: -0.88, y: 0, z: 0 },
            { element: 'Cl', x: 0.88, y: 0, z: 0 },
        ],
        bonds: [
            { from: 0, to: 1, order: 1 },
        ],
        properties: {
            molecularWeight: 70.9,
            meltingPoint: -101.5,
            boilingPoint: -34.0,
            state: 'gas',
        },
    },
    // Simple Molecules
    {
        id: 'h2o',
        name: 'Water',
        formula: 'H₂O',
        formulaRaw: 'H2O',
        type: 'covalent',
        description: 'Essential for life. A polar molecule with bent geometry.',
        atoms: [
            { element: 'O', x: 0, y: 0, z: 0 },
            { element: 'H', x: -0.88, y: 0, z: 0 },
            { element: 'H', x: 0.22, y: 0.85, z: 0 },
        ],
        bonds: [
            { from: 0, to: 1, order: 1 },
            { from: 0, to: 2, order: 1 },
        ],
        properties: {
            molecularWeight: 18.015,
            meltingPoint: 0,
            boilingPoint: 100,
            state: 'liquid',
        },
        bondAngle: 104.5,
    },
    {
        id: 'co2',
        name: 'Carbon Dioxide',
        formula: 'CO₂',
        formulaRaw: 'CO2',
        type: 'covalent',
        description: 'Greenhouse gas. Linear molecule with double bonds.',
        atoms: [
            { element: 'C', x: 0, y: 0, z: 0 },
            { element: 'O', x: -1.17, y: 0, z: 0 },
            { element: 'O', x: 1.17, y: 0, z: 0 },
        ],
        bonds: [
            { from: 0, to: 1, order: 2 },
            { from: 0, to: 2, order: 2 },
        ],
        properties: {
            molecularWeight: 44.01,
            meltingPoint: -78.5,
            boilingPoint: -56.6,
            state: 'gas',
        },
        bondAngle: 180,
    },
    {
        id: 'nacl',
        name: 'Sodium Chloride',
        formula: 'NaCl',
        formulaRaw: 'NaCl',
        type: 'ionic',
        description: 'Table salt. Ionic compound forming cubic crystals.',
        atoms: [
            { element: 'Na', x: 0, y: 0, z: 0 },
            { element: 'Cl', x: 1.75, y: 0, z: 0 },
        ],
        bonds: [
            { from: 0, to: 1, order: 1, type: 'ionic' },
        ],
        properties: {
            molecularWeight: 58.44,
            meltingPoint: 801,
            boilingPoint: 1413,
            state: 'solid',
        },
    },
    {
        id: 'ch4',
        name: 'Methane',
        formula: 'CH₄',
        formulaRaw: 'CH4',
        type: 'covalent',
        description: 'Simplest hydrocarbon. Tetrahedral geometry.',
        atoms: [
            { element: 'C', x: 0, y: 0, z: 0 },
            { element: 'H', x: 0, y: 0.88, z: 0 },
            { element: 'H', x: 0.88, y: 0, z: 0 },
            { element: 'H', x: 0, y: -0.88, z: 0 },
            { element: 'H', x: -0.88, y: 0, z: 0 },
        ],
        bonds: [
            { from: 0, to: 1, order: 1 },
            { from: 0, to: 2, order: 1 },
            { from: 0, to: 3, order: 1 },
            { from: 0, to: 4, order: 1 },
        ],
        properties: {
            molecularWeight: 16.04,
            meltingPoint: -182.5,
            boilingPoint: -161.5,
            state: 'gas',
        },
        bondAngle: 109.5,
    },
    {
        id: 'nh3',
        name: 'Ammonia',
        formula: 'NH₃',
        formulaRaw: 'NH3',
        type: 'covalent',
        description: 'Pungent gas. Trigonal pyramidal geometry.',
        atoms: [
            { element: 'N', x: 0, y: -0.2, z: 0 },
            { element: 'H', x: 0, y: 0.68, z: 0 },
            { element: 'H', x: -0.66, y: 0.38, z: 0 },
            { element: 'H', x: 0.66, y: 0.38, z: 0 },
        ],
        bonds: [
            { from: 0, to: 1, order: 1 },
            { from: 0, to: 2, order: 1 },
            { from: 0, to: 3, order: 1 },
        ],
        properties: {
            molecularWeight: 17.03,
            meltingPoint: -77.7,
            boilingPoint: -33.3,
            state: 'gas',
        },
        bondAngle: 107,
    },
    {
        id: 'o2',
        name: 'Oxygen Gas',
        formula: 'O₂',
        formulaRaw: 'O2',
        type: 'covalent',
        description: 'Essential for respiration. Double bond between atoms.',
        atoms: [
            { element: 'O', x: -0.59, y: 0, z: 0 },
            { element: 'O', x: 0.59, y: 0, z: 0 },
        ],
        bonds: [
            { from: 0, to: 1, order: 2 },
        ],
        properties: {
            molecularWeight: 32.00,
            meltingPoint: -218.8,
            boilingPoint: -183.0,
            state: 'gas',
        },
    },
    {
        id: 'n2',
        name: 'Nitrogen Gas',
        formula: 'N₂',
        formulaRaw: 'N2',
        type: 'covalent',
        description: '78% of atmosphere. Triple bond makes it very stable.',
        atoms: [
            { element: 'N', x: -0.59, y: 0, z: 0 },
            { element: 'N', x: 0.59, y: 0, z: 0 },
        ],
        bonds: [
            { from: 0, to: 1, order: 3 },
        ],
        properties: {
            molecularWeight: 28.01,
            meltingPoint: -210.0,
            boilingPoint: -195.8,
            state: 'gas',
        },
    },
    {
        id: 'h2o2',
        name: 'Hydrogen Peroxide',
        formula: 'H₂O₂',
        formulaRaw: 'H2O2',
        type: 'covalent',
        description: 'Antiseptic and bleaching agent. Non-planar structure.',
        atoms: [
            { element: 'O', x: -0.59, y: 0, z: 0 },
            { element: 'O', x: 0.59, y: 0, z: 0 },
            { element: 'H', x: -0.86, y: 0.83, z: 0 },
            { element: 'H', x: 0.86, y: -0.83, z: 0 },
        ],
        bonds: [
            { from: 0, to: 1, order: 1 },
            { from: 0, to: 2, order: 1 },
            { from: 1, to: 3, order: 1 },
        ],
        properties: {
            molecularWeight: 34.01,
            meltingPoint: -0.43,
            boilingPoint: 150.2,
            state: 'liquid',
        },
    },
    {
        id: 'hcl',
        name: 'Hydrochloric Acid',
        formula: 'HCl',
        formulaRaw: 'HCl',
        type: 'covalent',
        description: 'Strong acid found in stomach. Polar covalent bond.',
        atoms: [
            { element: 'Cl', x: 0, y: 0, z: 0 },
            { element: 'H', x: -1.17, y: 0, z: 0 },
        ],
        bonds: [
            { from: 0, to: 1, order: 1 },
        ],
        properties: {
            molecularWeight: 36.46,
            meltingPoint: -114.2,
            boilingPoint: -85.1,
            state: 'gas',
        },
    },
    {
        id: 'c2h5oh',
        name: 'Ethanol',
        formula: 'C₂H₅OH',
        formulaRaw: 'C2H5OH',
        type: 'covalent',
        description: 'Alcohol found in beverages. Volatile and flammable.',
        atoms: [
            { element: 'C', x: -0.59, y: 0, z: 0 },
            { element: 'C', x: 0.59, y: 0, z: 0 },
            { element: 'O', x: 1.51, y: -0.7, z: 0 }, // Bent down
            { element: 'H', x: -1.47, y: 0, z: 0 }, // Side H
            { element: 'H', x: -0.59, y: 0.88, z: 0 }, // Top H
            { element: 'H', x: -0.59, y: -0.88, z: 0 }, // Bottom H
            { element: 'H', x: 0.59, y: 0.88, z: 0 }, // Top H
            { element: 'H', x: 0.59, y: -0.88, z: 0 }, // Bottom H
            { element: 'H', x: 2.39, y: -0.7, z: 0 }, // OH Hydrogen
        ],
        bonds: [
            { from: 0, to: 1, order: 1 },
            { from: 1, to: 2, order: 1 },
            { from: 0, to: 3, order: 1 },
            { from: 0, to: 4, order: 1 },
            { from: 0, to: 5, order: 1 },
            { from: 1, to: 6, order: 1 },
            { from: 1, to: 7, order: 1 },
            { from: 2, to: 8, order: 1 },
        ],
        properties: {
            molecularWeight: 46.07,
            meltingPoint: -114.1,
            boilingPoint: 78.4,
            state: 'liquid',
        },
    },
    {
        id: 'c6h12o6',
        name: 'Glucose',
        formula: 'C₆H₁₂O₆',
        formulaRaw: 'C6H12O6',
        type: 'covalent',
        description: 'Simple sugar. Primary energy source for cells.',
        atoms: [
            // Simplified linear backbone with attached hydrogens (Fisher Projection style 2D)
            { element: 'C', x: -2.93, y: 0, z: 0 }, { element: 'H', x: -2.93, y: -0.88, z: 0 }, { element: 'O', x: -2.93, y: 1.17, z: 0 }, // C1=O
            { element: 'C', x: -1.76, y: 0, z: 0 }, { element: 'H', x: -1.76, y: -0.88, z: 0 }, { element: 'O', x: -1.76, y: 1.17, z: 0 }, // C2-OH
            { element: 'C', x: -0.59, y: 0, z: 0 }, { element: 'H', x: -0.59, y: 0.88, z: 0 }, { element: 'O', x: -0.59, y: -1.17, z: 0 }, // C3-OH (flipped)
            { element: 'C', x: 0.59, y: 0, z: 0 }, { element: 'H', x: 0.59, y: -0.88, z: 0 }, { element: 'O', x: 0.59, y: 1.17, z: 0 }, // C4-OH
            { element: 'C', x: 1.76, y: 0, z: 0 }, { element: 'H', x: 1.76, y: -0.88, z: 0 }, { element: 'O', x: 1.76, y: 1.17, z: 0 }, // C5-OH
            { element: 'C', x: 2.93, y: 0, z: 0 }, { element: 'H', x: 2.93, y: -0.88, z: 0 }, { element: 'H', x: 3.81, y: 0, z: 0 }, { element: 'O', x: 2.93, y: 1.17, z: 0 }, // C6-OH
            // Hydroxyl protons
            { element: 'H', x: -1.76, y: 1.76, z: 0 }, // approx
            { element: 'H', x: -0.59, y: -1.76, z: 0 },
            { element: 'H', x: 0.59, y: 1.76, z: 0 },
            { element: 'H', x: 1.76, y: 1.76, z: 0 },
            { element: 'H', x: 2.93, y: 1.76, z: 0 },
        ],
        bonds: [
            // Backbone C-C
            { from: 0, to: 3, order: 1 }, { from: 3, to: 6, order: 1 }, { from: 6, to: 9, order: 1 },
            { from: 9, to: 12, order: 1 }, { from: 12, to: 15, order: 1 },
            // C1 substituents
            { from: 0, to: 2, order: 2 }, { from: 0, to: 1, order: 1 },
            // C2 substituents
            { from: 3, to: 4, order: 1 }, { from: 3, to: 5, order: 1 },
            // C3 substituents
            { from: 6, to: 7, order: 1 }, { from: 6, to: 8, order: 1 },
            // C4 substituents
            { from: 9, to: 10, order: 1 }, { from: 9, to: 11, order: 1 },
            // C5 substituents
            { from: 12, to: 13, order: 1 }, { from: 12, to: 14, order: 1 },
            // C6 substituents
            { from: 15, to: 16, order: 1 }, { from: 15, to: 17, order: 1 }, { from: 15, to: 18, order: 1 },
            // Hydroxyl H-O bonds
            { from: 5, to: 19, order: 1 }, { from: 8, to: 20, order: 1 },
            { from: 11, to: 21, order: 1 }, { from: 14, to: 22, order: 1 },
            { from: 18, to: 23, order: 1 },
        ],
        properties: {
            molecularWeight: 180.16,
            meltingPoint: 146,
            boilingPoint: null,
            state: 'solid',
        },
    },
    {
        id: 'h2so4',
        name: 'Sulfuric Acid',
        formula: 'H₂SO₄',
        formulaRaw: 'H2SO4',
        type: 'covalent',
        description: 'Strong industrial acid. Used in batteries and fertilizers.',
        atoms: [
            { element: 'S', x: 0, y: 0, z: 0 },
            { element: 'O', x: 0, y: 1.46, z: 0 },
            { element: 'O', x: 0, y: -1.46, z: 0 },
            { element: 'O', x: 1.46, y: 0, z: 0 },
            { element: 'O', x: -1.46, y: 0, z: 0 },
            { element: 'H', x: 2.34, y: 0, z: 0 },
            { element: 'H', x: -2.34, y: 0, z: 0 },
        ],
        bonds: [
            { from: 0, to: 1, order: 2 },
            { from: 0, to: 2, order: 2 },
            { from: 0, to: 3, order: 1 },
            { from: 0, to: 4, order: 1 },
            { from: 3, to: 5, order: 1 },
            { from: 4, to: 6, order: 1 },
        ],
        properties: {
            molecularWeight: 98.08,
            meltingPoint: 10.4,
            boilingPoint: 337,
            state: 'liquid',
        },
    },
    {
        id: 'cacl2',
        name: 'Calcium Chloride',
        formula: 'CaCl₂',
        formulaRaw: 'CaCl2',
        type: 'ionic',
        description: 'Desiccant and de-icing agent. Highly hygroscopic.',
        atoms: [
            { element: 'Ca', x: 0, y: 0, z: 0 },
            { element: 'Cl', x: -1.75, y: 0, z: 0 },
            { element: 'Cl', x: 1.75, y: 0, z: 0 },
        ],
        bonds: [
            { from: 0, to: 1, order: 1, type: 'ionic' },
            { from: 0, to: 2, order: 1, type: 'ionic' },
        ],
        properties: {
            molecularWeight: 110.98,
            meltingPoint: 772,
            boilingPoint: 1935,
            state: 'solid',
        },
    },
    {
        id: 'naclo',
        name: 'Sodium Hypochlorite',
        formula: 'NaClO',
        formulaRaw: 'NaClO',
        type: 'ionic',
        description: 'Bleach. Strong oxidizing and disinfecting agent.',
        atoms: [
            { element: 'Na', x: -1.75, y: 0, z: 0 },
            { element: 'Cl', x: 0, y: 0, z: 0 },
            { element: 'O', x: 1.46, y: 0, z: 0 },
        ],
        bonds: [
            { from: 0, to: 1, order: 1, type: 'ionic' },
            { from: 1, to: 2, order: 1 },
        ],
        properties: {
            molecularWeight: 74.44,
            meltingPoint: 18,
            boilingPoint: 101,
            state: 'liquid',
        },
    },
    {
        id: 'c6h6',
        name: 'Benzene',
        formula: 'C₆H₆',
        formulaRaw: 'C6H6',
        type: 'covalent',
        description: 'Aromatic hydrocarbon. Hexagonal ring structure.',
        atoms: [
            { element: 'C', x: 1.17, y: 0, z: 0 },
            { element: 'C', x: 0.58, y: 1.01, z: 0 },
            { element: 'C', x: -0.58, y: 1.01, z: 0 },
            { element: 'C', x: -1.17, y: 0, z: 0 },
            { element: 'C', x: -0.58, y: -1.01, z: 0 },
            { element: 'C', x: 0.58, y: -1.01, z: 0 },
            { element: 'H', x: 2.05, y: 0, z: 0 },
            { element: 'H', x: 1.02, y: 1.77, z: 0 },
            { element: 'H', x: -1.02, y: 1.77, z: 0 },
            { element: 'H', x: -2.05, y: 0, z: 0 },
            { element: 'H', x: -1.02, y: -1.77, z: 0 },
            { element: 'H', x: 1.02, y: -1.77, z: 0 },
        ],
        bonds: [
            { from: 0, to: 1, order: 1.5 }, // Aromatic bonds
            { from: 1, to: 2, order: 1.5 },
            { from: 2, to: 3, order: 1.5 },
            { from: 3, to: 4, order: 1.5 },
            { from: 4, to: 5, order: 1.5 },
            { from: 5, to: 0, order: 1.5 },
            { from: 0, to: 6, order: 1 },
            { from: 1, to: 7, order: 1 },
            { from: 2, to: 8, order: 1 },
            { from: 3, to: 9, order: 1 },
            { from: 4, to: 10, order: 1 },
            { from: 5, to: 11, order: 1 },
        ],
        properties: {
            molecularWeight: 78.11,
            meltingPoint: 5.5,
            boilingPoint: 80.1,
            state: 'liquid',
        },
    },
];

// Categories for organizing demos
export const COMPOUND_CATEGORIES = {
    'simple': {
        name: 'Simple Molecules',
        description: 'Basic molecules with few atoms',
        compounds: ['h2', 'cl2', 'h2o', 'co2', 'o2', 'n2', 'hcl'],
    },
    'organic': {
        name: 'Organic Compounds',
        description: 'Carbon-based molecules',
        compounds: ['ch4', 'c2h5oh', 'c6h12o6', 'c6h6'],
    },
    'ionic': {
        name: 'Ionic Compounds',
        description: 'Compounds formed by ion transfer',
        compounds: ['nacl', 'cacl2', 'naclo'],
    },
    'acids': {
        name: 'Acids',
        description: 'Proton donors',
        compounds: ['hcl', 'h2so4', 'h2o2'],
    },
};

// Helper functions
export function getCompoundById(id) {
    return DEMO_COMPOUNDS.find(c => c.id === id);
}

export function getCompoundsByCategory(categoryId) {
    const category = COMPOUND_CATEGORIES[categoryId];
    if (!category) return [];
    return category.compounds.map(getCompoundById).filter(Boolean);
}

// Calculate molecular weight from atoms
export function calculateMolecularWeight(atoms, elementsData) {
    return atoms.reduce((total, atom) => {
        const element = elementsData.find(e => e.symbol === atom.element);
        return total + (element ? element.atomicMass : 0);
    }, 0);
}

// Generate formula from atom counts
export function generateFormula(atomCounts) {
    const order = ['C', 'H', 'N', 'O', 'S', 'P', 'F', 'Cl', 'Br', 'I'];
    const sorted = Object.entries(atomCounts).sort((a, b) => {
        const aIndex = order.indexOf(a[0]);
        const bIndex = order.indexOf(b[0]);
        if (aIndex === -1 && bIndex === -1) return a[0].localeCompare(b[0]);
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
    });

    return sorted.map(([symbol, count]) => {
        if (count === 1) return symbol;
        // Convert to subscript
        const subscript = count.toString().split('').map(d => '₀₁₂₃₄₅₆₇₈₉'[d]).join('');
        return symbol + subscript;
    }).join('');
}

// Find a matching demo compound based on a list of atoms
export function findMatchingCompound(atoms) {
    if (!atoms || atoms.length === 0) return null;

    // Count atoms by element
    const counts = atoms.reduce((acc, atom) => {
        const symbol = atom.element.symbol;
        acc[symbol] = (acc[symbol] || 0) + 1;
        return acc;
    }, {});

    // Check against demo compounds
    return DEMO_COMPOUNDS.find(compound => {
        // First check total atom count
        if (compound.atoms.length !== atoms.length) return false;

        // Then check composition
        const demoCounts = compound.atoms.reduce((acc, atom) => {
            acc[atom.element] = (acc[atom.element] || 0) + 1;
            return acc;
        }, {});

        // Compare counts
        const demoKeys = Object.keys(demoCounts);
        const userKeys = Object.keys(counts);

        if (demoKeys.length !== userKeys.length) return false;

        return demoKeys.every(key => demoCounts[key] === counts[key]);
    });
}
