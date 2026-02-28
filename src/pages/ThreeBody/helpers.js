// --- Panel & UI Constants ---
const DEFAULT_PANEL_WIDTH = 380;
const MIN_PANEL_WIDTH = 260;
const MAX_PANEL_WIDTH = 600;
const MAX_BODIES = 100;
const PANEL_STORAGE_KEY = 'tbp-panel-width';

const clampPanelWidth = (value) => Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, value));

const getStoredPanelWidth = () => {
    if (typeof window === 'undefined') return DEFAULT_PANEL_WIDTH;
    const stored = parseInt(window.localStorage.getItem(PANEL_STORAGE_KEY) || '', 10);
    if (!Number.isNaN(stored)) {
        return clampPanelWidth(stored);
    }
    return DEFAULT_PANEL_WIDTH;
};

// --- Script Loader ---
const loadThreeScript = (callback) => {
    if (window.THREE) { callback(); return; }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    script.onload = callback;
    document.head.appendChild(script);
};

// --- 3D Helpers ---
const createCOMMarker = (THREE) => {
    const group = new THREE.Group();

    // Materials
    const goldMat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        metalness: 1.0,
        roughness: 0.3,
        envMapIntensity: 1.0
    });
    const silverMat = new THREE.MeshStandardMaterial({
        color: 0xeeeeee,
        metalness: 0.9,
        roughness: 0.2,
        flatShading: true
    });
    const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.1,
        roughness: 0.1,
        transmission: 0.9,
        transparent: true,
        opacity: 0.4
    });
    const redMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });

    // 1. Gold Tip (Cone pointing down to origin)
    const tipGeo = new THREE.ConeGeometry(0.2, 1.5, 32);
    tipGeo.rotateX(Math.PI);
    tipGeo.translate(0, 0.75, 0);
    const tip = new THREE.Mesh(tipGeo, goldMat);
    group.add(tip);

    // 2. Hexagonal Body
    const bodyGeo = new THREE.CylinderGeometry(1.0, 0.5, 1.2, 6);
    bodyGeo.translate(0, 1.5 + 0.6, 0);
    const body = new THREE.Mesh(bodyGeo, silverMat);
    group.add(body);

    // 3. Top Cap (Hex)
    const capGeo = new THREE.CylinderGeometry(1.0, 1.0, 0.1, 6);
    capGeo.translate(0, 2.75, 0);
    const cap = new THREE.Mesh(capGeo, silverMat);
    group.add(cap);

    // 4. Glass Dome
    const domeGeo = new THREE.SphereGeometry(0.7, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    domeGeo.translate(0, 2.8, 0);
    const dome = new THREE.Mesh(domeGeo, glassMat);
    group.add(dome);

    // 5. Bubble Level (Red disk inside)
    const levelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.05, 32);
    levelGeo.translate(0, 2.9, 0);
    const level = new THREE.Mesh(levelGeo, redMat);
    group.add(level);

    // 6. "CM" Text Label
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.font = 'bold 48px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CM', 64, 32);

    const textTex = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: textTex, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.set(0, 3.8, 0);
    sprite.scale.set(1.5, 0.75, 1);
    group.add(sprite);

    // Scale entire group
    group.scale.set(5, 5, 5);

    return group;
};

export {
    DEFAULT_PANEL_WIDTH,
    MIN_PANEL_WIDTH,
    MAX_PANEL_WIDTH,
    MAX_BODIES,
    PANEL_STORAGE_KEY,
    clampPanelWidth,
    getStoredPanelWidth,
    loadThreeScript,
    createCOMMarker,
};
