export const SCENARIOS = {
    DIPOLE: {
        name: "Electric Dipole",
        description: "Two opposite charges",
        charges: [
            { x: -60, y: 0, z: 0, q: 1 },
            { x: 60, y: 0, z: 0, q: -1 }
        ]
    },
    QUADRUPOLE: {
        name: "Quadrupole",
        description: "Four alternating charges",
        charges: [
            { x: -50, y: -50, z: 0, q: 1 },
            { x: 50, y: -50, z: 0, q: -1 },
            { x: 50, y: 50, z: 0, q: 1 },
            { x: -50, y: 50, z: 0, q: -1 }
        ]
    },
    LINEAR: {
        name: "Linear Array",
        description: "Five alternating charges",
        charges: [
            { x: -100, y: 0, z: 0, q: 1 },
            { x: -50, y: 0, z: 0, q: -1 },
            { x: 0, y: 0, z: 0, q: 1 },
            { x: 50, y: 0, z: 0, q: -1 },
            { x: 100, y: 0, z: 0, q: 1 }
        ]
    },
    CAPACITOR: {
        name: "Capacitor",
        description: "Parallel plate charges",
        charges: [
            { x: -80, y: 50, z: 0, q: 1 }, { x: -40, y: 50, z: 0, q: 1 },
            { x: 0, y: 50, z: 0, q: 1 }, { x: 40, y: 50, z: 0, q: 1 }, { x: 80, y: 50, z: 0, q: 1 },
            { x: -80, y: -50, z: 0, q: -1 }, { x: -40, y: -50, z: 0, q: -1 },
            { x: 0, y: -50, z: 0, q: -1 }, { x: 40, y: -50, z: 0, q: -1 }, { x: 80, y: -50, z: 0, q: -1 }
        ]
    },
    RING: {
        name: "Charge Ring",
        description: "Circular arrangement",
        charges: Array.from({ length: 12 }, (_, i) => ({
            x: Math.cos((i / 12) * Math.PI * 2) * 80,
            y: Math.sin((i / 12) * Math.PI * 2) * 80,
            z: 0,
            q: i % 2 === 0 ? 1 : -1
        }))
    },
    RANDOM: {
        name: "Random Cloud",
        description: "Random charges",
        charges: []
    }
};

export function generateRandomCharges(count = 15) {
    return Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * 200,
        y: (Math.random() - 0.5) * 200,
        z: (Math.random() - 0.5) * 50,
        q: Math.random() > 0.5 ? 1 : -1
    }));
}
