// Demo compounds library for the Atom Simulator
// Common molecules with structure data for visualization

export const DEMO_COMPOUNDS = [
    {
        id: 'h2',
        name: 'Hydrogen',
        formula: 'H₂',
        formulaRaw: 'H2',
        type: 'covalent',
        description: 'Diatomic hydrogen.',
        atoms: [ { element: 'H', x: -0.37, y: 0.00, z: 0 }, { element: 'H', x: 0.37, y: 0.00, z: 0 } ],
        bonds: [ { from: 0, to: 1, order: 1 } ],
        properties: { molecularWeight: 2.02, meltingPoint: -259, boilingPoint: -253, state: 'gas' },
    },
    {
        id: 'n2',
        name: 'Nitrogen',
        formula: 'N₂',
        formulaRaw: 'N2',
        type: 'covalent',
        description: 'Diatomic nitrogen.',
        atoms: [ { element: 'N', x: -0.55, y: 0.00, z: 0 }, { element: 'N', x: 0.55, y: 0.00, z: 0 } ],
        bonds: [ { from: 0, to: 1, order: 3 } ],
        properties: { molecularWeight: 28.01, meltingPoint: -210, boilingPoint: -196, state: 'gas' },
    },
    {
        id: 'o2',
        name: 'Oxygen',
        formula: 'O₂',
        formulaRaw: 'O2',
        type: 'covalent',
        description: 'Diatomic oxygen.',
        atoms: [ { element: 'O', x: -0.60, y: 0.00, z: 0 }, { element: 'O', x: 0.60, y: 0.00, z: 0 } ],
        bonds: [ { from: 0, to: 1, order: 2 } ],
        properties: { molecularWeight: 32.0, meltingPoint: -219, boilingPoint: -183, state: 'gas' },
    },
    {
        id: 'f2',
        name: 'Fluorine',
        formula: 'F₂',
        formulaRaw: 'F2',
        type: 'covalent',
        description: 'Diatomic fluorine.',
        atoms: [ { element: 'F', x: -0.71, y: 0.00, z: 0 }, { element: 'F', x: 0.71, y: 0.00, z: 0 } ],
        bonds: [ { from: 0, to: 1, order: 1 } ],
        properties: { molecularWeight: 38.0, meltingPoint: -220, boilingPoint: -188, state: 'gas' },
    },
    {
        id: 'cl2',
        name: 'Chlorine',
        formula: 'Cl₂',
        formulaRaw: 'Cl2',
        type: 'covalent',
        description: 'Diatomic chlorine.',
        atoms: [ { element: 'Cl', x: -0.99, y: 0.00, z: 0 }, { element: 'Cl', x: 0.99, y: 0.00, z: 0 } ],
        bonds: [ { from: 0, to: 1, order: 1 } ],
        properties: { molecularWeight: 70.9, meltingPoint: -101, boilingPoint: -34, state: 'gas' },
    },
    {
        id: 'br2',
        name: 'Bromine',
        formula: 'Br₂',
        formulaRaw: 'Br2',
        type: 'covalent',
        description: 'Diatomic bromine.',
        atoms: [ { element: 'Br', x: -1.14, y: 0.00, z: 0 }, { element: 'Br', x: 1.14, y: 0.00, z: 0 } ],
        bonds: [ { from: 0, to: 1, order: 1 } ],
        properties: { molecularWeight: 159.8, meltingPoint: -7, boilingPoint: 59, state: 'liquid' },
    },
    {
        id: 'i2',
        name: 'Iodine',
        formula: 'I₂',
        formulaRaw: 'I2',
        type: 'covalent',
        description: 'Diatomic iodine.',
        atoms: [ { element: 'I', x: -1.33, y: 0.00, z: 0 }, { element: 'I', x: 1.33, y: 0.00, z: 0 } ],
        bonds: [ { from: 0, to: 1, order: 1 } ],
        properties: { molecularWeight: 253.8, meltingPoint: 114, boilingPoint: 184, state: 'solid' },
    },
    {
        id: 'hf',
        name: 'Hydrogen Fluoride',
        formula: 'HF',
        formulaRaw: 'HF',
        type: 'covalent',
        description: 'Strong acid precursor.',
        atoms: [ { element: 'F', x: -0.46, y: 0.00, z: 0 }, { element: 'H', x: 0.46, y: 0.00, z: 0 } ],
        bonds: [ { from: 0, to: 1, order: 1 } ],
        properties: { molecularWeight: 20.01, meltingPoint: -83, boilingPoint: 20, state: 'gas' },
    },
    {
        id: 'hcl',
        name: 'Hydrochloric Acid',
        formula: 'HCl',
        formulaRaw: 'HCl',
        type: 'covalent',
        description: 'Strong acid precursor.',
        atoms: [ { element: 'Cl', x: -0.64, y: 0.00, z: 0 }, { element: 'H', x: 0.64, y: 0.00, z: 0 } ],
        bonds: [ { from: 0, to: 1, order: 1 } ],
        properties: { molecularWeight: 36.46, meltingPoint: -114, boilingPoint: -85, state: 'gas' },
    },
    {
        id: 'hbr',
        name: 'Hydrogen Bromide',
        formula: 'HBr',
        formulaRaw: 'HBr',
        type: 'covalent',
        description: 'Strong acid precursor.',
        atoms: [ { element: 'Br', x: -0.70, y: 0.00, z: 0 }, { element: 'H', x: 0.70, y: 0.00, z: 0 } ],
        bonds: [ { from: 0, to: 1, order: 1 } ],
        properties: { molecularWeight: 80.91, meltingPoint: -87, boilingPoint: -67, state: 'gas' },
    },
    {
        id: 'hi',
        name: 'Hydrogen Iodide',
        formula: 'HI',
        formulaRaw: 'HI',
        type: 'covalent',
        description: 'Strong acid precursor.',
        atoms: [ { element: 'I', x: -0.81, y: 0.00, z: 0 }, { element: 'H', x: 0.81, y: 0.00, z: 0 } ],
        bonds: [ { from: 0, to: 1, order: 1 } ],
        properties: { molecularWeight: 127.9, meltingPoint: -51, boilingPoint: -35, state: 'gas' },
    },
    {
        id: 'h2o',
        name: 'Water',
        formula: 'H₂O',
        formulaRaw: 'H2O',
        type: 'covalent',
        description: 'Universal solvent.',
        atoms: [ { element: 'O', x: 0.00, y: 0.00, z: 0 }, { element: 'H', x: -0.76, y: 0.59, z: 0 }, { element: 'H', x: 0.76, y: 0.59, z: 0 } ],
        bonds: [ { from: 0, to: 1, order: 1 }, { from: 0, to: 2, order: 1 } ],
        properties: { molecularWeight: 18.02, meltingPoint: 0, boilingPoint: 100, state: 'liquid' },
    },
    {
        id: 'co',
        name: 'Carbon Monoxide',
        formula: 'CO',
        formulaRaw: 'CO',
        type: 'covalent',
        description: 'Toxic combustion byproduct.',
        atoms: [ { element: 'C', x: -0.56, y: 0.00, z: 0 }, { element: 'O', x: 0.56, y: 0.00, z: 0 } ],
        bonds: [ { from: 0, to: 1, order: 3 } ],
        properties: { molecularWeight: 28.01, meltingPoint: -205, boilingPoint: -191, state: 'gas' },
    },
    {
        id: 'co2',
        name: 'Carbon Dioxide',
        formula: 'CO₂',
        formulaRaw: 'CO2',
        type: 'covalent',
        description: 'Greenhouse gas.',
        atoms: [ { element: 'O', x: -1.16, y: 0.00, z: 0 }, { element: 'C', x: 0.00, y: 0.00, z: 0 }, { element: 'O', x: 1.16, y: 0.00, z: 0 } ],
        bonds: [ { from: 0, to: 1, order: 2 }, { from: 1, to: 2, order: 2 } ],
        properties: { molecularWeight: 44.01, meltingPoint: -78, boilingPoint: -57, state: 'gas' },
    },
    {
        id: 'no',
        name: 'Nitric Oxide',
        formula: 'NO',
        formulaRaw: 'NO',
        type: 'covalent',
        description: 'Signaling molecule.',
        atoms: [ { element: 'N', x: -0.57, y: 0.00, z: 0 }, { element: 'O', x: 0.57, y: 0.00, z: 0 } ],
        bonds: [ { from: 0, to: 1, order: 2 } ],
        properties: { molecularWeight: 30.01, meltingPoint: -164, boilingPoint: -152, state: 'gas' },
    },
    {
        id: 'no2',
        name: 'Nitrogen Dioxide',
        formula: 'NO₂',
        formulaRaw: 'NO2',
        type: 'covalent',
        description: 'Brown toxic gas.',
        atoms: [ { element: 'N', x: 0.00, y: 0.00, z: 0 }, { element: 'O', x: -1.10, y: 0.47, z: 0 }, { element: 'O', x: 1.10, y: 0.47, z: 0 } ],
        bonds: [ { from: 0, to: 1, order: 2 }, { from: 0, to: 2, order: 1 } ],
        properties: { molecularWeight: 46.01, meltingPoint: -11, boilingPoint: 21, state: 'gas' },
    },
    {
        id: 'so2',
        name: 'Sulfur Dioxide',
        formula: 'SO₂',
        formulaRaw: 'SO2',
        type: 'covalent',
        description: 'Volcanic gas.',
        atoms: [ { element: 'S', x: 0.00, y: 0.00, z: 0 }, { element: 'O', x: -1.23, y: 0.73, z: 0 }, { element: 'O', x: 1.23, y: 0.73, z: 0 } ],
        bonds: [ { from: 0, to: 1, order: 2 }, { from: 0, to: 2, order: 2 } ],
        properties: { molecularWeight: 64.07, meltingPoint: -72, boilingPoint: -10, state: 'gas' },
    },
    {
        id: 'h2o2',
        name: 'Hydrogen Peroxide',
        formula: 'H₂O₂',
        formulaRaw: 'H2O2',
        type: 'covalent',
        description: 'Oxidizer.',
        atoms: [ { element: 'O', x: -0.73, y: 0.50, z: 0 }, { element: 'O', x: 0.73, y: -0.50, z: 0 }, { element: 'H', x: -1.20, y: 1.20, z: 0 }, { element: 'H', x: 1.20, y: -1.20, z: 0 } ],
        bonds: [ { from: 0, to: 1, order: 1 }, { from: 0, to: 2, order: 1 }, { from: 1, to: 3, order: 1 } ],
        properties: { molecularWeight: 34.01, meltingPoint: -0.4, boilingPoint: 150, state: 'liquid' },
    },
    {
        id: 'nh3',
        name: 'Ammonia',
        formula: 'NH₃',
        formulaRaw: 'NH3',
        type: 'covalent',
        description: 'Common fertilizer base.',
        atoms: [ { element: 'N', x: 0.00, y: 0.00, z: 0 }, { element: 'H', x: 0.00, y: -1.00, z: 0 }, { element: 'H', x: -0.86, y: 0.50, z: 0 }, { element: 'H', x: 0.86, y: 0.50, z: 0 } ],
        bonds: [ { from: 0, to: 1, order: 1 }, { from: 0, to: 2, order: 1 }, { from: 0, to: 3, order: 1 } ],
        properties: { molecularWeight: 17.03, meltingPoint: -77, boilingPoint: -33, state: 'gas' },
    },
    {
        id: 'h2s',
        name: 'Hydrogen Sulfide',
        formula: 'H₂S',
        formulaRaw: 'H2S',
        type: 'covalent',
        description: 'Rotten egg smell.',
        atoms: [ { element: 'S', x: 0.00, y: 0.00, z: 0 }, { element: 'H', x: -0.96, y: 0.93, z: 0 }, { element: 'H', x: 0.96, y: 0.93, z: 0 } ],
        bonds: [ { from: 0, to: 1, order: 1 }, { from: 0, to: 2, order: 1 } ],
        properties: { molecularWeight: 34.08, meltingPoint: -82, boilingPoint: -60, state: 'gas' },
    },
    {
        id: 'ch4',
        name: 'Methane',
        formula: 'CH₄',
        formulaRaw: 'CH4',
        type: 'covalent',
        description: 'Alkane with 1 carbons.',
        atoms: [ { element: 'C', x: 0.00, y: 0.00, z: 0 }, { element: 'H', x: 0.00, y: 1.10, z: 0 }, { element: 'H', x: 1.10, y: 0.00, z: 0 }, { element: 'H', x: 0.00, y: -1.10, z: 0 }, { element: 'H', x: -1.10, y: 0.00, z: 0 } ],
        bonds: [ { from: 0, to: 1, order: 1 }, { from: 0, to: 2, order: 1 }, { from: 0, to: 3, order: 1 }, { from: 0, to: 4, order: 1 } ],
        properties: { molecularWeight: 16.04, meltingPoint: -182, boilingPoint: -161, state: 'gas' },
    },
    {
        id: 'c2h6',
        name: 'Ethane',
        formula: 'C₂H₆',
        formulaRaw: 'C2H6',
        type: 'covalent',
        description: 'Alkane with 2 carbons.',
        atoms: [ { element: 'C', x: -0.65, y: 0.50, z: 0 }, { element: 'C', x: 0.65, y: -0.50, z: 0 }, { element: 'H', x: -0.65, y: -0.60, z: 0 }, { element: 'H', x: -1.75, y: 0.50, z: 0 }, { element: 'H', x: -0.65, y: 1.60, z: 0 }, { element: 'H', x: 0.65, y: 0.60, z: 0 }, { element: 'H', x: 1.75, y: -0.50, z: 0 }, { element: 'H', x: 0.65, y: -1.60, z: 0 } ],
        bonds: [ { from: 0, to: 1, order: 1 }, { from: 0, to: 2, order: 1 }, { from: 0, to: 3, order: 1 }, { from: 0, to: 4, order: 1 }, { from: 1, to: 5, order: 1 }, { from: 1, to: 6, order: 1 }, { from: 1, to: 7, order: 1 } ],
        properties: { molecularWeight: 30.07, meltingPoint: -183, boilingPoint: -89, state: 'gas' },
    },
    {
        id: 'c3h8',
        name: 'Propane',
        formula: 'C₃H₈',
        formulaRaw: 'C3H8',
        type: 'covalent',
        description: 'Alkane with 3 carbons.',
        atoms: [ { element: 'C', x: -1.30, y: 0.50, z: 0 }, { element: 'C', x: 0.00, y: -0.50, z: 0 }, { element: 'C', x: 1.30, y: 0.50, z: 0 }, { element: 'H', x: -1.30, y: -0.60, z: 0 }, { element: 'H', x: -2.40, y: 0.50, z: 0 }, { element: 'H', x: -1.30, y: 1.60, z: 0 }, { element: 'H', x: 0.00, y: 0.60, z: 0 }, { element: 'H', x: 0.00, y: -1.60, z: 0 }, { element: 'H', x: 1.30, y: -0.60, z: 0 }, { element: 'H', x: 2.40, y: 0.50, z: 0 }, { element: 'H', x: 1.30, y: 1.60, z: 0 } ],
        bonds: [ { from: 0, to: 1, order: 1 }, { from: 1, to: 2, order: 1 }, { from: 0, to: 3, order: 1 }, { from: 0, to: 4, order: 1 }, { from: 0, to: 5, order: 1 }, { from: 1, to: 6, order: 1 }, { from: 1, to: 7, order: 1 }, { from: 2, to: 8, order: 1 }, { from: 2, to: 9, order: 1 }, { from: 2, to: 10, order: 1 } ],
        properties: { molecularWeight: 44.1, meltingPoint: -188, boilingPoint: -42, state: 'gas' },
    },
    {
        id: 'c4h10',
        name: 'Butane',
        formula: 'C₄H₁₀',
        formulaRaw: 'C4H10',
        type: 'covalent',
        description: 'Alkane with 4 carbons.',
        atoms: [ { element: 'C', x: -1.95, y: 0.50, z: 0 }, { element: 'C', x: -0.65, y: -0.50, z: 0 }, { element: 'C', x: 0.65, y: 0.50, z: 0 }, { element: 'C', x: 1.95, y: -0.50, z: 0 }, { element: 'H', x: -1.95, y: -0.60, z: 0 }, { element: 'H', x: -3.05, y: 0.50, z: 0 }, { element: 'H', x: -1.95, y: 1.60, z: 0 }, { element: 'H', x: -0.65, y: 0.60, z: 0 }, { element: 'H', x: -0.65, y: -1.60, z: 0 }, { element: 'H', x: 0.65, y: -0.60, z: 0 }, { element: 'H', x: 0.65, y: 1.60, z: 0 }, { element: 'H', x: 1.95, y: 0.60, z: 0 }, { element: 'H', x: 3.05, y: -0.50, z: 0 }, { element: 'H', x: 1.95, y: -1.60, z: 0 } ],
        bonds: [ { from: 0, to: 1, order: 1 }, { from: 1, to: 2, order: 1 }, { from: 2, to: 3, order: 1 }, { from: 0, to: 4, order: 1 }, { from: 0, to: 5, order: 1 }, { from: 0, to: 6, order: 1 }, { from: 1, to: 7, order: 1 }, { from: 1, to: 8, order: 1 }, { from: 2, to: 9, order: 1 }, { from: 2, to: 10, order: 1 }, { from: 3, to: 11, order: 1 }, { from: 3, to: 12, order: 1 }, { from: 3, to: 13, order: 1 } ],
        properties: { molecularWeight: 58.12, meltingPoint: -138, boilingPoint: -1, state: 'gas' },
    },
    {
        id: 'c5h12',
        name: 'Pentane',
        formula: 'C₅H₁₂',
        formulaRaw: 'C5H12',
        type: 'covalent',
        description: 'Alkane with 5 carbons.',
        atoms: [ { element: 'C', x: -2.60, y: 0.50, z: 0 }, { element: 'C', x: -1.30, y: -0.50, z: 0 }, { element: 'C', x: 0.00, y: 0.50, z: 0 }, { element: 'C', x: 1.30, y: -0.50, z: 0 }, { element: 'C', x: 2.60, y: 0.50, z: 0 }, { element: 'H', x: -2.60, y: -0.60, z: 0 }, { element: 'H', x: -3.70, y: 0.50, z: 0 }, { element: 'H', x: -2.60, y: 1.60, z: 0 }, { element: 'H', x: -1.30, y: 0.60, z: 0 }, { element: 'H', x: -1.30, y: -1.60, z: 0 }, { element: 'H', x: 0.00, y: -0.60, z: 0 }, { element: 'H', x: 0.00, y: 1.60, z: 0 }, { element: 'H', x: 1.30, y: 0.60, z: 0 }, { element: 'H', x: 1.30, y: -1.60, z: 0 }, { element: 'H', x: 2.60, y: -0.60, z: 0 }, { element: 'H', x: 3.70, y: 0.50, z: 0 }, { element: 'H', x: 2.60, y: 1.60, z: 0 } ],
        bonds: [ { from: 0, to: 1, order: 1 }, { from: 1, to: 2, order: 1 }, { from: 2, to: 3, order: 1 }, { from: 3, to: 4, order: 1 }, { from: 0, to: 5, order: 1 }, { from: 0, to: 6, order: 1 }, { from: 0, to: 7, order: 1 }, { from: 1, to: 8, order: 1 }, { from: 1, to: 9, order: 1 }, { from: 2, to: 10, order: 1 }, { from: 2, to: 11, order: 1 }, { from: 3, to: 12, order: 1 }, { from: 3, to: 13, order: 1 }, { from: 4, to: 14, order: 1 }, { from: 4, to: 15, order: 1 }, { from: 4, to: 16, order: 1 } ],
        properties: { molecularWeight: 72.15, meltingPoint: -130, boilingPoint: 36, state: 'liquid' },
    },
    {
        id: 'c6h14',
        name: 'Hexane',
        formula: 'C₆H₁₄',
        formulaRaw: 'C6H14',
        type: 'covalent',
        description: 'Alkane with 6 carbons.',
        atoms: [ { element: 'C', x: -3.25, y: 0.50, z: 0 }, { element: 'C', x: -1.95, y: -0.50, z: 0 }, { element: 'C', x: -0.65, y: 0.50, z: 0 }, { element: 'C', x: 0.65, y: -0.50, z: 0 }, { element: 'C', x: 1.95, y: 0.50, z: 0 }, { element: 'C', x: 3.25, y: -0.50, z: 0 }, { element: 'H', x: -3.25, y: -0.60, z: 0 }, { element: 'H', x: -4.35, y: 0.50, z: 0 }, { element: 'H', x: -3.25, y: 1.60, z: 0 }, { element: 'H', x: -1.95, y: 0.60, z: 0 }, { element: 'H', x: -1.95, y: -1.60, z: 0 }, { element: 'H', x: -0.65, y: -0.60, z: 0 }, { element: 'H', x: -0.65, y: 1.60, z: 0 }, { element: 'H', x: 0.65, y: 0.60, z: 0 }, { element: 'H', x: 0.65, y: -1.60, z: 0 }, { element: 'H', x: 1.95, y: -0.60, z: 0 }, { element: 'H', x: 1.95, y: 1.60, z: 0 }, { element: 'H', x: 3.25, y: 0.60, z: 0 }, { element: 'H', x: 4.35, y: -0.50, z: 0 }, { element: 'H', x: 3.25, y: -1.60, z: 0 } ],
        bonds: [ { from: 0, to: 1, order: 1 }, { from: 1, to: 2, order: 1 }, { from: 2, to: 3, order: 1 }, { from: 3, to: 4, order: 1 }, { from: 4, to: 5, order: 1 }, { from: 0, to: 6, order: 1 }, { from: 0, to: 7, order: 1 }, { from: 0, to: 8, order: 1 }, { from: 1, to: 9, order: 1 }, { from: 1, to: 10, order: 1 }, { from: 2, to: 11, order: 1 }, { from: 2, to: 12, order: 1 }, { from: 3, to: 13, order: 1 }, { from: 3, to: 14, order: 1 }, { from: 4, to: 15, order: 1 }, { from: 4, to: 16, order: 1 }, { from: 5, to: 17, order: 1 }, { from: 5, to: 18, order: 1 }, { from: 5, to: 19, order: 1 } ],
        properties: { molecularWeight: 86.18, meltingPoint: -95, boilingPoint: 69, state: 'liquid' },
    },
    {
        id: 'c7h16',
        name: 'Heptane',
        formula: 'C₇H₁₆',
        formulaRaw: 'C7H16',
        type: 'covalent',
        description: 'Alkane with 7 carbons.',
        atoms: [ { element: 'C', x: -3.90, y: 0.50, z: 0 }, { element: 'C', x: -2.60, y: -0.50, z: 0 }, { element: 'C', x: -1.30, y: 0.50, z: 0 }, { element: 'C', x: 0.00, y: -0.50, z: 0 }, { element: 'C', x: 1.30, y: 0.50, z: 0 }, { element: 'C', x: 2.60, y: -0.50, z: 0 }, { element: 'C', x: 3.90, y: 0.50, z: 0 }, { element: 'H', x: -3.90, y: -0.60, z: 0 }, { element: 'H', x: -5.00, y: 0.50, z: 0 }, { element: 'H', x: -3.90, y: 1.60, z: 0 }, { element: 'H', x: -2.60, y: 0.60, z: 0 }, { element: 'H', x: -2.60, y: -1.60, z: 0 }, { element: 'H', x: -1.30, y: -0.60, z: 0 }, { element: 'H', x: -1.30, y: 1.60, z: 0 }, { element: 'H', x: 0.00, y: 0.60, z: 0 }, { element: 'H', x: 0.00, y: -1.60, z: 0 }, { element: 'H', x: 1.30, y: -0.60, z: 0 }, { element: 'H', x: 1.30, y: 1.60, z: 0 }, { element: 'H', x: 2.60, y: 0.60, z: 0 }, { element: 'H', x: 2.60, y: -1.60, z: 0 }, { element: 'H', x: 3.90, y: -0.60, z: 0 }, { element: 'H', x: 5.00, y: 0.50, z: 0 }, { element: 'H', x: 3.90, y: 1.60, z: 0 } ],
        bonds: [ { from: 0, to: 1, order: 1 }, { from: 1, to: 2, order: 1 }, { from: 2, to: 3, order: 1 }, { from: 3, to: 4, order: 1 }, { from: 4, to: 5, order: 1 }, { from: 5, to: 6, order: 1 }, { from: 0, to: 7, order: 1 }, { from: 0, to: 8, order: 1 }, { from: 0, to: 9, order: 1 }, { from: 1, to: 10, order: 1 }, { from: 1, to: 11, order: 1 }, { from: 2, to: 12, order: 1 }, { from: 2, to: 13, order: 1 }, { from: 3, to: 14, order: 1 }, { from: 3, to: 15, order: 1 }, { from: 4, to: 16, order: 1 }, { from: 4, to: 17, order: 1 }, { from: 5, to: 18, order: 1 }, { from: 5, to: 19, order: 1 }, { from: 6, to: 20, order: 1 }, { from: 6, to: 21, order: 1 }, { from: 6, to: 22, order: 1 } ],
        properties: { molecularWeight: 100.2, meltingPoint: -91, boilingPoint: 98, state: 'liquid' },
    },
    {
        id: 'c8h18',
        name: 'Octane',
        formula: 'C₈H₁₈',
        formulaRaw: 'C8H18',
        type: 'covalent',
        description: 'Alkane with 8 carbons.',
        atoms: [ { element: 'C', x: -4.55, y: 0.50, z: 0 }, { element: 'C', x: -3.25, y: -0.50, z: 0 }, { element: 'C', x: -1.95, y: 0.50, z: 0 }, { element: 'C', x: -0.65, y: -0.50, z: 0 }, { element: 'C', x: 0.65, y: 0.50, z: 0 }, { element: 'C', x: 1.95, y: -0.50, z: 0 }, { element: 'C', x: 3.25, y: 0.50, z: 0 }, { element: 'C', x: 4.55, y: -0.50, z: 0 }, { element: 'H', x: -4.55, y: -0.60, z: 0 }, { element: 'H', x: -5.65, y: 0.50, z: 0 }, { element: 'H', x: -4.55, y: 1.60, z: 0 }, { element: 'H', x: -3.25, y: 0.60, z: 0 }, { element: 'H', x: -3.25, y: -1.60, z: 0 }, { element: 'H', x: -1.95, y: -0.60, z: 0 }, { element: 'H', x: -1.95, y: 1.60, z: 0 }, { element: 'H', x: -0.65, y: 0.60, z: 0 }, { element: 'H', x: -0.65, y: -1.60, z: 0 }, { element: 'H', x: 0.65, y: -0.60, z: 0 }, { element: 'H', x: 0.65, y: 1.60, z: 0 }, { element: 'H', x: 1.95, y: 0.60, z: 0 }, { element: 'H', x: 1.95, y: -1.60, z: 0 }, { element: 'H', x: 3.25, y: -0.60, z: 0 }, { element: 'H', x: 3.25, y: 1.60, z: 0 }, { element: 'H', x: 4.55, y: 0.60, z: 0 }, { element: 'H', x: 5.65, y: -0.50, z: 0 }, { element: 'H', x: 4.55, y: -1.60, z: 0 } ],
        bonds: [ { from: 0, to: 1, order: 1 }, { from: 1, to: 2, order: 1 }, { from: 2, to: 3, order: 1 }, { from: 3, to: 4, order: 1 }, { from: 4, to: 5, order: 1 }, { from: 5, to: 6, order: 1 }, { from: 6, to: 7, order: 1 }, { from: 0, to: 8, order: 1 }, { from: 0, to: 9, order: 1 }, { from: 0, to: 10, order: 1 }, { from: 1, to: 11, order: 1 }, { from: 1, to: 12, order: 1 }, { from: 2, to: 13, order: 1 }, { from: 2, to: 14, order: 1 }, { from: 3, to: 15, order: 1 }, { from: 3, to: 16, order: 1 }, { from: 4, to: 17, order: 1 }, { from: 4, to: 18, order: 1 }, { from: 5, to: 19, order: 1 }, { from: 5, to: 20, order: 1 }, { from: 6, to: 21, order: 1 }, { from: 6, to: 22, order: 1 }, { from: 7, to: 23, order: 1 }, { from: 7, to: 24, order: 1 }, { from: 7, to: 25, order: 1 } ],
        properties: { molecularWeight: 114.2, meltingPoint: -57, boilingPoint: 125, state: 'liquid' },
    },
    {
        id: 'c2h4',
        name: 'Ethene',
        formula: 'C₂H₄',
        formulaRaw: 'C2H4',
        type: 'covalent',
        description: 'Simplest alkene.',
        atoms: [ { element: 'C', x: -0.67, y: 0.00, z: 0 }, { element: 'C', x: 0.67, y: 0.00, z: 0 }, { element: 'H', x: -1.20, y: 0.90, z: 0 }, { element: 'H', x: -1.20, y: -0.90, z: 0 }, { element: 'H', x: 1.20, y: 0.90, z: 0 }, { element: 'H', x: 1.20, y: -0.90, z: 0 } ],
        bonds: [ { from: 0, to: 1, order: 2 }, { from: 0, to: 2, order: 1 }, { from: 0, to: 3, order: 1 }, { from: 1, to: 4, order: 1 }, { from: 1, to: 5, order: 1 } ],
        properties: { molecularWeight: 28.05, meltingPoint: -169, boilingPoint: -103, state: 'gas' },
    },
    {
        id: 'c2h2',
        name: 'Acetylene',
        formula: 'C₂H₂',
        formulaRaw: 'C2H2',
        type: 'covalent',
        description: 'Welding fuel.',
        atoms: [ { element: 'H', x: -1.66, y: 0.00, z: 0 }, { element: 'C', x: -0.60, y: 0.00, z: 0 }, { element: 'C', x: 0.60, y: 0.00, z: 0 }, { element: 'H', x: 1.66, y: 0.00, z: 0 } ],
        bonds: [ { from: 0, to: 1, order: 1 }, { from: 1, to: 2, order: 3 }, { from: 2, to: 3, order: 1 } ],
        properties: { molecularWeight: 26.04, meltingPoint: -80, boilingPoint: -84, state: 'gas' },
    },
    {
        id: 'ch3oh',
        name: 'Methanol',
        formula: 'CH₃OH',
        formulaRaw: 'CH3OH',
        type: 'covalent',
        description: 'Wood alcohol.',
        atoms: [ { element: 'C', x: 0.00, y: 0.00, z: 0 }, { element: 'O', x: 1.40, y: 0.00, z: 0 }, { element: 'H', x: 1.80, y: 0.80, z: 0 }, { element: 'H', x: -0.50, y: 1.00, z: 0 }, { element: 'H', x: -0.50, y: -1.00, z: 0 }, { element: 'H', x: -1.00, y: 0.00, z: 0 } ],
        bonds: [ { from: 0, to: 1, order: 1 }, { from: 1, to: 2, order: 1 }, { from: 0, to: 3, order: 1 }, { from: 0, to: 4, order: 1 }, { from: 0, to: 5, order: 1 } ],
        properties: { molecularWeight: 32.04, meltingPoint: -97, boilingPoint: 64, state: 'liquid' },
    },
    {
        id: 'c2h5oh',
        name: 'Ethanol',
        formula: 'C₂H₅OH',
        formulaRaw: 'C2H5OH',
        type: 'covalent',
        description: 'Drinking alcohol.',
        atoms: [ { element: 'C', x: -0.70, y: 0.00, z: 0 }, { element: 'C', x: 0.70, y: 0.00, z: 0 }, { element: 'O', x: 1.80, y: -0.50, z: 0 }, { element: 'H', x: 2.50, y: 0.00, z: 0 }, { element: 'H', x: -0.70, y: 1.10, z: 0 }, { element: 'H', x: -0.70, y: -1.10, z: 0 }, { element: 'H', x: -1.80, y: 0.00, z: 0 }, { element: 'H', x: 0.70, y: 1.10, z: 0 }, { element: 'H', x: 0.70, y: -1.10, z: 0 } ],
        bonds: [ { from: 0, to: 1, order: 1 }, { from: 1, to: 2, order: 1 }, { from: 2, to: 3, order: 1 }, { from: 0, to: 4, order: 1 }, { from: 0, to: 5, order: 1 }, { from: 0, to: 6, order: 1 }, { from: 1, to: 7, order: 1 }, { from: 1, to: 8, order: 1 } ],
        properties: { molecularWeight: 46.07, meltingPoint: -114, boilingPoint: 78, state: 'liquid' },
    },
    {
        id: 'nacl',
        name: 'Sodium Chloride',
        formula: 'NaCl',
        formulaRaw: 'NaCl',
        type: 'ionic',
        description: 'Ionic crystal salt.',
        atoms: [ { element: 'Na', x: -1.18, y: 0.00, z: 0 }, { element: 'Cl', x: 1.18, y: 0.00, z: 0 } ],
        bonds: [ { from: 0, to: 1, order: 1, type: 'ionic' } ],
        properties: { molecularWeight: 58.44, meltingPoint: 800, boilingPoint: 1400, state: 'solid' },
    },
    {
        id: 'kcl',
        name: 'Potassium Chloride',
        formula: 'KCl',
        formulaRaw: 'KCl',
        type: 'ionic',
        description: 'Ionic crystal salt.',
        atoms: [ { element: 'K', x: -1.30, y: 0.00, z: 0 }, { element: 'Cl', x: 1.30, y: 0.00, z: 0 } ],
        bonds: [ { from: 0, to: 1, order: 1, type: 'ionic' } ],
        properties: { molecularWeight: 74.55, meltingPoint: 800, boilingPoint: 1400, state: 'solid' },
    },
    {
        id: 'lif',
        name: 'Lithium Fluoride',
        formula: 'LiF',
        formulaRaw: 'LiF',
        type: 'ionic',
        description: 'Ionic crystal salt.',
        atoms: [ { element: 'Li', x: -0.75, y: 0.00, z: 0 }, { element: 'F', x: 0.75, y: 0.00, z: 0 } ],
        bonds: [ { from: 0, to: 1, order: 1, type: 'ionic' } ],
        properties: { molecularWeight: 25.94, meltingPoint: 800, boilingPoint: 1400, state: 'solid' },
    },
    {
        id: 'naf',
        name: 'Sodium Fluoride',
        formula: 'NaF',
        formulaRaw: 'NaF',
        type: 'ionic',
        description: 'Ionic crystal salt.',
        atoms: [ { element: 'Na', x: -0.95, y: 0.00, z: 0 }, { element: 'F', x: 0.95, y: 0.00, z: 0 } ],
        bonds: [ { from: 0, to: 1, order: 1, type: 'ionic' } ],
        properties: { molecularWeight: 41.99, meltingPoint: 800, boilingPoint: 1400, state: 'solid' },
    },
    {
        id: 'kbr',
        name: 'Potassium Bromide',
        formula: 'KBr',
        formulaRaw: 'KBr',
        type: 'ionic',
        description: 'Ionic crystal salt.',
        atoms: [ { element: 'K', x: -1.40, y: 0.00, z: 0 }, { element: 'Br', x: 1.40, y: 0.00, z: 0 } ],
        bonds: [ { from: 0, to: 1, order: 1, type: 'ionic' } ],
        properties: { molecularWeight: 119.0, meltingPoint: 800, boilingPoint: 1400, state: 'solid' },
    },
    {
        id: 'ki',
        name: 'Potassium Iodide',
        formula: 'KI',
        formulaRaw: 'KI',
        type: 'ionic',
        description: 'Ionic crystal salt.',
        atoms: [ { element: 'K', x: -1.50, y: 0.00, z: 0 }, { element: 'I', x: 1.50, y: 0.00, z: 0 } ],
        bonds: [ { from: 0, to: 1, order: 1, type: 'ionic' } ],
        properties: { molecularWeight: 166.0, meltingPoint: 800, boilingPoint: 1400, state: 'solid' },
    },
    {
        id: 'cacl2',
        name: 'Calcium Chloride',
        formula: 'CaCl₂',
        formulaRaw: 'CaCl2',
        type: 'ionic',
        description: 'Desiccant salt.',
        atoms: [ { element: 'Cl', x: -2.30, y: 0.00, z: 0 }, { element: 'Ca', x: 0.00, y: 0.00, z: 0 }, { element: 'Cl', x: 2.30, y: 0.00, z: 0 } ],
        bonds: [ { from: 1, to: 0, order: 1, type: 'ionic' }, { from: 1, to: 2, order: 1, type: 'ionic' } ],
        properties: { molecularWeight: 110.9, meltingPoint: 772, boilingPoint: 1935, state: 'solid' },
    },
    {
        id: 'naoh',
        name: 'Sodium Hydroxide',
        formula: 'NaOH',
        formulaRaw: 'NaOH',
        type: 'ionic',
        description: 'Strong base.',
        atoms: [ { element: 'Na', x: -1.58, y: 0.00, z: 0 }, { element: 'O', x: 0.62, y: 0.00, z: 0 }, { element: 'H', x: 1.58, y: 0.00, z: 0 } ],
        bonds: [ { from: 0, to: 1, order: 1, type: 'ionic' }, { from: 1, to: 2, order: 1 } ],
        properties: { molecularWeight: 40.0, meltingPoint: 318, boilingPoint: 1388, state: 'solid' },
    },
    {
        id: 'koh',
        name: 'Potassium Hydroxide',
        formula: 'KOH',
        formulaRaw: 'KOH',
        type: 'ionic',
        description: 'Strong base.',
        atoms: [ { element: 'K', x: -1.73, y: 0.00, z: 0 }, { element: 'O', x: 0.77, y: 0.00, z: 0 }, { element: 'H', x: 1.73, y: 0.00, z: 0 } ],
        bonds: [ { from: 0, to: 1, order: 1, type: 'ionic' }, { from: 1, to: 2, order: 1 } ],
        properties: { molecularWeight: 56.11, meltingPoint: 406, boilingPoint: 1327, state: 'solid' },
    },
    {
        id: 'h2so4',
        name: 'Sulfuric Acid',
        formula: 'H₂SO₄',
        formulaRaw: 'H2SO4',
        type: 'covalent',
        description: 'Strong mineral acid.',
        atoms: [ { element: 'S', x: 0.00, y: 0.00, z: 0 }, { element: 'O', x: 0.00, y: 1.40, z: 0 }, { element: 'O', x: 0.00, y: -1.40, z: 0 }, { element: 'O', x: 1.40, y: 0.00, z: 0 }, { element: 'O', x: -1.40, y: 0.00, z: 0 }, { element: 'H', x: 2.30, y: 0.00, z: 0 }, { element: 'H', x: -2.30, y: 0.00, z: 0 } ],
        bonds: [ { from: 0, to: 1, order: 2 }, { from: 0, to: 2, order: 2 }, { from: 0, to: 3, order: 1 }, { from: 0, to: 4, order: 1 }, { from: 3, to: 5, order: 1 }, { from: 4, to: 6, order: 1 } ],
        properties: { molecularWeight: 98.08, meltingPoint: 10, boilingPoint: 337, state: 'liquid' },
    },
    {
        id: 'hcn',
        name: 'Hydrogen Cyanide',
        formula: 'HCN',
        formulaRaw: 'HCN',
        type: 'covalent',
        description: 'Toxic gas.',
        atoms: [ { element: 'H', x: -1.11, y: 0.00, z: 0 }, { element: 'C', x: -0.05, y: 0.00, z: 0 }, { element: 'N', x: 1.11, y: 0.00, z: 0 } ],
        bonds: [ { from: 0, to: 1, order: 1 }, { from: 1, to: 2, order: 3 } ],
        properties: { molecularWeight: 27.03, meltingPoint: -13, boilingPoint: 26, state: 'gas' },
    },
    {
        id: 'urea',
        name: 'Urea',
        formula: 'CH₄N₂O',
        formulaRaw: 'CH4N2O',
        type: 'covalent',
        description: 'Organic waste product.',
        atoms: [ { element: 'C', x: 0.00, y: 0.00, z: 0 }, { element: 'O', x: 0.00, y: 1.20, z: 0 }, { element: 'N', x: -1.10, y: -0.60, z: 0 }, { element: 'N', x: 1.10, y: -0.60, z: 0 }, { element: 'H', x: -1.80, y: -0.20, z: 0 }, { element: 'H', x: -1.30, y: -1.50, z: 0 }, { element: 'H', x: 1.80, y: -0.20, z: 0 }, { element: 'H', x: 1.30, y: -1.50, z: 0 } ],
        bonds: [ { from: 0, to: 1, order: 2 }, { from: 0, to: 2, order: 1 }, { from: 0, to: 3, order: 1 }, { from: 2, to: 4, order: 1 }, { from: 2, to: 5, order: 1 }, { from: 3, to: 6, order: 1 }, { from: 3, to: 7, order: 1 } ],
        properties: { molecularWeight: 60.06, meltingPoint: 133, boilingPoint: 0, state: 'solid' },
    },
    {
        id: 'c6h6',
        name: 'Benzene',
        formula: 'C₆H₆',
        formulaRaw: 'C6H6',
        type: 'covalent',
        description: 'Aromatic ring.',
        atoms: [ { element: 'C', x: 1.40, y: 0.00, z: 0 }, { element: 'H', x: 2.40, y: 0.00, z: 0 }, { element: 'C', x: 0.70, y: 1.21, z: 0 }, { element: 'H', x: 1.20, y: 2.08, z: 0 }, { element: 'C', x: -0.70, y: 1.21, z: 0 }, { element: 'H', x: -1.20, y: 2.08, z: 0 }, { element: 'C', x: -1.40, y: 0.00, z: 0 }, { element: 'H', x: -2.40, y: 0.00, z: 0 }, { element: 'C', x: -0.70, y: -1.21, z: 0 }, { element: 'H', x: -1.20, y: -2.08, z: 0 }, { element: 'C', x: 0.70, y: -1.21, z: 0 }, { element: 'H', x: 1.20, y: -2.08, z: 0 } ],
        bonds: [ { from: 0, to: 2, order: 1.5 }, { from: 0, to: 1, order: 1 }, { from: 2, to: 4, order: 1.5 }, { from: 2, to: 3, order: 1 }, { from: 4, to: 6, order: 1.5 }, { from: 4, to: 5, order: 1 }, { from: 6, to: 8, order: 1.5 }, { from: 6, to: 7, order: 1 }, { from: 8, to: 10, order: 1.5 }, { from: 8, to: 9, order: 1 }, { from: 10, to: 0, order: 1.5 }, { from: 10, to: 11, order: 1 } ],
        properties: { molecularWeight: 78.11, meltingPoint: 5.5, boilingPoint: 80, state: 'liquid' },
    },
];

// Categories for organizing demos
export const COMPOUND_CATEGORIES = {
    'simple': {
        name: 'Simple Elements',
        description: 'Diatomic gases and halogens',
        compounds: ['h2', 'n2', 'o2', 'f2', 'cl2', 'br2', 'i2'],
    },
    'oxides': {
        name: 'Oxides & Hydrides',
        description: 'Common binary compounds',
        compounds: ['h2o', 'co', 'co2', 'no', 'no2', 'so2', 'h2o2', 'nh3', 'h2s'],
    },
    'alkanes': {
        name: 'Alkanes',
        description: 'Saturated hydrocarbons (C1-C8)',
        compounds: ['ch4', 'c2h6', 'c3h8', 'c4h10', 'c5h12', 'c6h14', 'c7h16', 'c8h18'],
    },
    'organic_complex': {
        name: 'Complex Organic',
        description: 'Alkenes, Alkynes, Alcohols, Aromatics',
        compounds: ['c2h4', 'c2h2', 'c6h6', 'ch3oh', 'c2h5oh', 'urea', 'hcn'],
    },
    'acids_bases': {
        name: 'Acids & Bases',
        description: 'Common acids and hydroxides',
        compounds: ['hcl', 'hf', 'hbr', 'hi', 'h2so4', 'naoh', 'koh'],
    },
    'ionic': {
        name: 'Ionic Salts',
        description: 'Crystal lattice structures',
        compounds: ['nacl', 'kcl', 'lif', 'naf', 'kbr', 'ki', 'cacl2'],
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
