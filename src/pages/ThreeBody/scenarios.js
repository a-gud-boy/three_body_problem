// --- Physics Constants & Presets ---

const SCENARIOS = {
    FIGURE_8: {
        name: "The Figure-8 (Planar)",
        description: "A stable, periodic solution where three bodies of equal mass chase each other in a figure-eight loop. (Z-axis is 0).",
        g: 1,
        bodies: [
            { x: 0.97000436, y: -0.24308753, z: 0, vx: 0.4662036850, vy: 0.4323657300, vz: 0, mass: 1, color: 0x3b82f6 }, // Blue
            { x: -0.97000436, y: 0.24308753, z: 0, vx: 0.4662036850, vy: 0.4323657300, vz: 0, mass: 1, color: 0xef4444 }, // Red
            { x: 0, y: 0, z: 0, vx: -2 * 0.4662036850, vy: -2 * 0.4323657300, vz: 0, mass: 1, color: 0x22c55e }  // Green
        ],
        scale: 150,
        cameraPos: { r: 400, theta: Math.PI / 4, phi: Math.PI / 3 }
    },
    SUN_EARTH_MOON: {
        name: "Hierarchical (Star-Planet-Moon)",
        description: "A hierarchical system. Stable over short terms. We've added slight inclination to the moon to make it 3D.",
        g: 0.8,
        bodies: [
            { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, mass: 200, color: 0xeab308 }, // Sun
            { x: 250, y: 0, z: 0, vx: 0, vy: 0.7, vz: 0, mass: 10, color: 0x3b82f6 }, // Earth
            { x: 270, y: 0, z: 5, vx: 0, vy: 1.1, vz: 0.2, mass: 0.1, color: 0x9ca3af }  // Moon
        ],
        scale: 1,
        cameraPos: { r: 500, theta: Math.PI / 3, phi: Math.PI / 4 }
    },
    CHAOS_RANDOM: {
        name: "3D Random Chaos",
        description: "Random positions and velocities in all three dimensions (X, Y, Z). Highly unpredictable.",
        g: 1,
        bodies: [], // Generated dynamically
        scale: 100,
        cameraPos: { r: 600, theta: 0.5, phi: 1.0 }
    },
    BURRAU: {
        name: "Pythagorean Problem",
        description: "Bodies of masses 3, 4, and 5 placed at the vertices of a 3-4-5 right triangle. A famous chaotic evolution.",
        g: 1,
        bodies: [
            { x: 0, y: 2, z: 0, vx: 0, vy: 0, vz: 0, mass: 3, color: 0xef4444 },
            { x: 2, y: -1, z: 0, vx: 0, vy: 0, vz: 0, mass: 4, color: 0x22c55e },
            { x: -1, y: -1, z: 0, vx: 0, vy: 0, vz: 0, mass: 5, color: 0x3b82f6 }
        ],
        scale: 80,
        cameraPos: { r: 500, theta: 0.2, phi: 0.5 }
    },
    LAGRANGE: {
        name: "Lagrange Points (L4/L5)",
        description: "Demonstrates Lagrange points L4 and L5 where a small body can orbit in stable equilibrium 60° ahead/behind a planet.",
        g: 1,
        bodies: [
            { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, mass: 100, color: 0xeab308 }, // Sun (massive)
            { x: 10, y: 0, z: 0, vx: 0, vy: 3.16227766, vz: 0, mass: 1, color: 0x3b82f6 }, // Planet (circular orbit)
            { x: 5, y: 8.66025404, z: 0, vx: -2.73861279, vy: 1.58113883, vz: 0, mass: 0.001, color: 0xff6600 } // Trojan at L4 (60° ahead)
        ],
        scale: 100,
        cameraPos: { r: 2500, theta: Math.PI / 6, phi: Math.PI / 3 }
    },
    SITNIKOV: {
        name: "Sitnikov Problem",
        description: "Two equal masses orbit in the XY plane while a third mass oscillates along the Z-axis perpendicular to their orbit.",
        g: 1,
        bodies: [
            { x: 1, y: 0, z: 0, vx: 0, vy: 0.5, vz: 0, mass: 1, color: 0x3b82f6 }, // Binary star 1
            { x: -1, y: 0, z: 0, vx: 0, vy: -0.5, vz: 0, mass: 1, color: 0xef4444 }, // Binary star 2
            { x: 0, y: 0, z: 3, vx: 0, vy: 0, vz: 0, mass: 0.001, color: 0x22c55e } // Test particle on Z-axis
        ],
        scale: 100,
        cameraPos: { r: 550, theta: Math.PI / 4, phi: Math.PI / 4 }
    },
    FOUR_BODY: {
        name: "4-Body Chaos",
        description: "Four equal masses arranged in a square with circular initial velocities. Chaotic and unpredictable evolution.",
        g: 1,
        bodies: [
            { x: 1, y: 1, z: 0, vx: -0.35, vy: 0.35, vz: 0, mass: 1, color: 0xef4444 },
            { x: -1, y: 1, z: 0, vx: -0.35, vy: -0.35, vz: 0, mass: 1, color: 0x3b82f6 },
            { x: -1, y: -1, z: 0, vx: 0.35, vy: -0.35, vz: 0, mass: 1, color: 0x22c55e },
            { x: 1, y: -1, z: 0, vx: 0.35, vy: 0.35, vz: 0, mass: 1, color: 0xeab308 }
        ],
        scale: 80,
        cameraPos: { r: 300, theta: 0.3, phi: 0.6 }
    }
};

const generateRandomBody = (existingBodies = []) => {
    const colors = [0xef4444, 0x3b82f6, 0x22c55e, 0xeab308, 0xa855f7, 0xec4899, 0x06b6d4];
    const MIN_DIST = 2.0;

    let x, y, z, tooClose;
    let attempts = 0;

    do {
        x = (Math.random() * 4 - 2);
        y = (Math.random() * 4 - 2);
        z = (Math.random() * 4 - 2);
        tooClose = false;

        for (const body of existingBodies) {
            const dx = x - body.x;
            const dy = y - body.y;
            const dz = z - body.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (dist < MIN_DIST) {
                tooClose = true;
                break;
            }
        }
        attempts++;
    } while (tooClose && attempts < 50);

    return {
        x, y, z,
        vx: (Math.random() - 0.5) * 0.8, vy: (Math.random() - 0.5) * 0.8, vz: (Math.random() - 0.5) * 0.8,
        mass: Math.random() * 3 + 0.5,
        color: colors[Math.floor(Math.random() * colors.length)]
    };
};

const generateRandomBodies = () => {
    const bodies = [];
    bodies.push(generateRandomBody(bodies));
    bodies.push(generateRandomBody(bodies));
    bodies.push(generateRandomBody(bodies));
    return bodies;
};

export { SCENARIOS, generateRandomBody, generateRandomBodies };
