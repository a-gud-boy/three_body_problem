// --- Texture Generation & Caching ---

const createGlowTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.2, 'rgba(255,255,255,0.6)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.2)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
    return canvas;
};

// Cached textures (created once, reused for all bodies)
let cachedGlowCanvas = null;
const getCachedGlowCanvas = () => {
    if (!cachedGlowCanvas) {
        cachedGlowCanvas = createGlowTexture();
    }
    return cachedGlowCanvas;
};

let cachedGlowTexture = null;
const getCachedGlowTexture = (THREE) => {
    if (!cachedGlowTexture) {
        cachedGlowTexture = new THREE.CanvasTexture(getCachedGlowCanvas());
    }
    return cachedGlowTexture;
};

let cachedSphereGeometry = null;
const getCachedSphereGeometry = (THREE) => {
    if (!cachedSphereGeometry) {
        cachedSphereGeometry = new THREE.SphereGeometry(1, 32, 32);
    }
    return cachedSphereGeometry;
};

const proceduralTextureCache = {};

const getCachedProceduralTexture = (THREE, mass, colorHex) => {
    const massCategory = mass > 2 ? 'gas' : 'rocky';
    const cacheKey = `${massCategory}-${colorHex}`;

    if (!proceduralTextureCache[cacheKey]) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        const color = new THREE.Color(colorHex);

        // Fill background
        ctx.fillStyle = '#' + color.getHexString();
        ctx.fillRect(0, 0, 512, 512);

        if (mass > 2) {
            // Gas Giant (Banded)
            for (let i = 0; i < 20; i++) {
                const y = Math.random() * 512;
                const h = Math.random() * 50 + 10;
                ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.2})`;
                ctx.fillRect(0, y, 512, h);

                // Dark bands
                if (Math.random() > 0.5) {
                    const y2 = Math.random() * 512;
                    const h2 = Math.random() * 30 + 5;
                    ctx.fillStyle = `rgba(0, 0, 0, ${Math.random() * 0.3})`;
                    ctx.fillRect(0, y2, 512, h2);
                }
            }
            // Blur bands slightly
            ctx.filter = 'blur(4px)';
            ctx.drawImage(canvas, 0, 0);
            ctx.filter = 'none';
        } else {
            // Rocky Planet (Noise/Craters)
            for (let i = 0; i < 400; i++) {
                const x = Math.random() * 512;
                const y = Math.random() * 512;
                const r = Math.random() * 10 + 2;
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(0, 0, 0, ${Math.random() * 0.2})`;
                ctx.fill();
            }
            for (let i = 0; i < 200; i++) {
                const x = Math.random() * 512;
                const y = Math.random() * 512;
                const r = Math.random() * 5 + 1;
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.15})`;
                ctx.fill();
            }
        }

        proceduralTextureCache[cacheKey] = new THREE.CanvasTexture(canvas);
    }
    return proceduralTextureCache[cacheKey];
};

// Circular texture for stars
const createStarTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 32, 32);
    return canvas;
};

export {
    createGlowTexture,
    getCachedGlowCanvas,
    getCachedGlowTexture,
    getCachedSphereGeometry,
    getCachedProceduralTexture,
    createStarTexture,
};
