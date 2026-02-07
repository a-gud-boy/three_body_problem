// Shell names
export const SHELL_NAMES = ['K', 'L', 'M', 'N', 'O', 'P', 'Q'];

// Cache for electron sprites to avoid repeated gradient creation
const electronSpriteCache = {};

function getElectronSprite(color) {
    if (electronSpriteCache[color]) {
        return electronSpriteCache[color];
    }

    const canvas = document.createElement("canvas");
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext("2d");

    // Electron glow
    const gradient = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.5, `${color}66`);
    gradient.addColorStop(1, "transparent");

    ctx.beginPath();
    ctx.arc(8, 8, 8, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Electron core
    ctx.beginPath();
    ctx.arc(8, 8, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();

    electronSpriteCache[color] = canvas;
    return canvas;
}

export function drawBohrModel(ctx, cx, cy, maxRadius, element, shells, color, time) {
    const activeShells = shells.filter(s => s > 0);
    const numShells = activeShells.length;

    // Calculate shell radii
    const shellRadii = activeShells.map((_, i) => {
        return 35 + (i + 1) * (maxRadius - 35) / (numShells + 0.5);
    });

    // Draw orbital paths
    shellRadii.forEach((radius, shellIndex) => {
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.15 - shellIndex * 0.02})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Shell label
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = '10px system-ui';
        ctx.fillText(SHELL_NAMES[shellIndex], cx + radius + 5, cy - 5);
    });

    // Draw nucleus
    drawNucleus(ctx, cx, cy, element, time);

    // Draw electrons
    shellRadii.forEach((radius, shellIndex) => {
        const electronCount = activeShells[shellIndex];
        const speed = 1 / (shellIndex + 1); // Outer shells move slower

        for (let i = 0; i < electronCount; i++) {
            const angle = (time * speed) + (i * Math.PI * 2) / electronCount;
            const x = cx + Math.cos(angle) * radius;
            const y = cy + Math.sin(angle) * radius;

            // Electron glow and core (optimized)
            const sprite = getElectronSprite(color);
            ctx.drawImage(sprite, x - 8, y - 8);
        }
    });
}

// Draw nucleus with protons and neutrons
function drawNucleus(ctx, cx, cy, element, time) {
    const protons = element.atomicNumber;
    const neutrons = Math.round(element.atomicMass) - protons;
    const total = protons + neutrons;

    // Nucleus size based on nucleon count
    const nucleusRadius = Math.min(25, 10 + Math.cbrt(total) * 4);

    // Outer glow
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, nucleusRadius * 2);
    gradient.addColorStop(0, 'rgba(255, 100, 100, 0.3)');
    gradient.addColorStop(0.5, 'rgba(255, 100, 100, 0.1)');
    gradient.addColorStop(1, 'transparent');

    ctx.beginPath();
    ctx.arc(cx, cy, nucleusRadius * 2, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw nucleons (simplified visualization for small atoms)
    if (total <= 20) {
        // Show individual nucleons
        const nucleonRadius = nucleusRadius / Math.sqrt(total) * 0.8;

        for (let i = 0; i < total; i++) {
            const angle = (i * 2.399) + time * 0.2; // Golden angle spiral
            const r = Math.sqrt(i / total) * nucleusRadius * 0.8;
            const x = cx + Math.cos(angle) * r;
            const y = cy + Math.sin(angle) * r;

            ctx.beginPath();
            ctx.arc(x, y, nucleonRadius, 0, Math.PI * 2);
            ctx.fillStyle = i < protons ? '#ff6b6b' : '#868e96';
            ctx.fill();

            // Slight highlight
            ctx.beginPath();
            ctx.arc(x - nucleonRadius * 0.3, y - nucleonRadius * 0.3, nucleonRadius * 0.3, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fill();
        }
    } else {
        // Simplified nucleus for larger atoms
        ctx.beginPath();
        ctx.arc(cx, cy, nucleusRadius, 0, Math.PI * 2);

        const nucleusGrad = ctx.createRadialGradient(
            cx - nucleusRadius * 0.3, cy - nucleusRadius * 0.3, 0,
            cx, cy, nucleusRadius
        );
        nucleusGrad.addColorStop(0, '#ff9999');
        nucleusGrad.addColorStop(0.5, '#ff6b6b');
        nucleusGrad.addColorStop(1, '#cc5555');

        ctx.fillStyle = nucleusGrad;
        ctx.fill();

        // Text showing nucleon counts
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = 'bold 9px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${protons}p`, cx, cy - 4);
        ctx.fillText(`${neutrons}n`, cx, cy + 5);
        ctx.textAlign = 'start';
        ctx.textBaseline = 'alphabetic';
    }
}

// Draw Electron Cloud (quantum probability density)
export function drawElectronCloud(ctx, cx, cy, maxRadius, element, orbitals, color, time) {
    // Draw probability density using points
    const totalElectrons = element.atomicNumber;

    // Draw each orbital
    orbitals.forEach((orbital, index) => {
        const { n, l, electrons, type } = orbital;

        // Color based on orbital type
        const orbitalColors = {
            's': '#4dabf7', // Blue
            'p': '#da77f2', // Purple
            'd': '#ffd43b', // Yellow
            'f': '#ff6b6b', // Red
        };

        const orbColor = orbitalColors[type] || color;

        // Draw orbital shape
        drawOrbitalShape(ctx, cx, cy, maxRadius, n, l, electrons, orbColor, time, index);
    });

    // Draw central region (nucleus representation)
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 20);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    gradient.addColorStop(0.3, 'rgba(255, 100, 100, 0.6)');
    gradient.addColorStop(1, 'transparent');

    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw probability sampling points
    drawProbabilitySampling(ctx, cx, cy, maxRadius, orbitals, time);
}

// Draw orbital shape based on quantum numbers
function drawOrbitalShape(ctx, cx, cy, maxRadius, n, l, electrons, color, time, index) {
    const baseRadius = 20 + n * (maxRadius - 20) / 8;
    const intensity = electrons / (2 * (2 * l + 1)); // Fill fraction

    ctx.save();
    ctx.globalAlpha = 0.3 * intensity;

    if (l === 0) {
        // s orbital - spherical
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseRadius);
        gradient.addColorStop(0, color);
        gradient.addColorStop(0.5, `${color}88`);
        gradient.addColorStop(1, 'transparent');

        ctx.beginPath();
        ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
    } else if (l === 1) {
        // p orbital - dumbbell shapes (px, py, pz)
        for (let m = 0; m < 3; m++) {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(m * Math.PI / 3 + time * 0.1);

            // Two lobes
            [-1, 1].forEach(dir => {
                const lobeGradient = ctx.createRadialGradient(
                    dir * baseRadius * 0.5, 0, 0,
                    dir * baseRadius * 0.5, 0, baseRadius * 0.6
                );
                lobeGradient.addColorStop(0, color);
                lobeGradient.addColorStop(1, 'transparent');

                ctx.beginPath();
                ctx.ellipse(dir * baseRadius * 0.5, 0, baseRadius * 0.4, baseRadius * 0.25, 0, 0, Math.PI * 2);
                ctx.fillStyle = lobeGradient;
                ctx.fill();
            });

            ctx.restore();
        }
    } else if (l === 2) {
        // d orbital - cloverleaf pattern
        for (let m = 0; m < 4; m++) {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(m * Math.PI / 4 + Math.PI / 8 + time * 0.05);

            const lobeGradient = ctx.createRadialGradient(
                baseRadius * 0.4, 0, 0,
                baseRadius * 0.4, 0, baseRadius * 0.4
            );
            lobeGradient.addColorStop(0, color);
            lobeGradient.addColorStop(1, 'transparent');

            ctx.beginPath();
            ctx.ellipse(baseRadius * 0.4, 0, baseRadius * 0.3, baseRadius * 0.15, 0, 0, Math.PI * 2);
            ctx.fillStyle = lobeGradient;
            ctx.fill();

            ctx.restore();
        }
    } else {
        // f orbital - complex multi-lobed (simplified)
        for (let m = 0; m < 6; m++) {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(m * Math.PI / 3 + time * 0.03);

            const lobeGradient = ctx.createRadialGradient(
                baseRadius * 0.35, 0, 0,
                baseRadius * 0.35, 0, baseRadius * 0.3
            );
            lobeGradient.addColorStop(0, color);
            lobeGradient.addColorStop(1, 'transparent');

            ctx.beginPath();
            ctx.ellipse(baseRadius * 0.35, 0, baseRadius * 0.2, baseRadius * 0.1, 0, 0, Math.PI * 2);
            ctx.fillStyle = lobeGradient;
            ctx.fill();

            ctx.restore();
        }
    }

    ctx.restore();
}

// Draw probability sampling points
function drawProbabilitySampling(ctx, cx, cy, maxRadius, orbitals, time) {
    const numPoints = 100;

    for (let i = 0; i < numPoints; i++) {
        // Use time and index to create deterministic but animated positions
        const seed = (i * 1.618 + time * 0.5) % (Math.PI * 2);
        const seed2 = (i * 2.399 + time * 0.3) % 1;

        // Pick an orbital based on seed
        const orbitalIndex = Math.floor(seed2 * orbitals.length);
        const orbital = orbitals[orbitalIndex];
        if (!orbital) continue;

        const { n, l } = orbital;
        const baseRadius = 20 + n * (maxRadius - 25) / 8;

        // Generate point position based on orbital type
        let x, y;

        if (l === 0) {
            // s orbital - spherical distribution
            const r = baseRadius * (0.2 + Math.random() * 0.8);
            const angle = seed * 3;
            x = cx + Math.cos(angle) * r * (0.3 + Math.sin(seed * 5) * 0.7);
            y = cy + Math.sin(angle) * r * (0.3 + Math.cos(seed * 5) * 0.7);
        } else {
            // Other orbitals - more directional
            const angle = (l === 1 ? Math.floor(seed * 3) : Math.floor(seed * (l + 2) * 2)) * Math.PI / (l + 1);
            const r = baseRadius * (0.2 + seed2 * 0.6);
            x = cx + Math.cos(angle + time * 0.1) * r;
            y = cy + Math.sin(angle + time * 0.1) * r;
        }

        // Draw point with fade in/out
        const fade = (Math.sin(seed + time * 2) + 1) / 2;
        if (fade > 0.3) {
            ctx.beginPath();
            ctx.arc(x, y, 1.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${fade * 0.6})`;
            ctx.fill();
        }
    }
}
