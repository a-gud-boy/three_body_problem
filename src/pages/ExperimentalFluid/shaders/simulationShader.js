export const simulationVertexShader = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const simulationFragmentShader = `
uniform sampler2D uCurrent;
uniform sampler2D uPrevious;
uniform vec2 uResolution;
uniform vec2 uMouse;
uniform float uMouseStrength;
uniform float uDamping;
uniform float uSpeed;
uniform bool uMousePressed;

varying vec2 vUv;

void main() {
    vec2 pixel = 1.0 / uResolution;

    float current = texture2D(uCurrent, vUv).r;
    float prev = texture2D(uPrevious, vUv).r;

    float n = texture2D(uCurrent, vUv + vec2(0.0, pixel.y)).r;
    float s = texture2D(uCurrent, vUv + vec2(0.0, -pixel.y)).r;
    float e = texture2D(uCurrent, vUv + vec2(pixel.x, 0.0)).r;
    float w = texture2D(uCurrent, vUv + vec2(-pixel.x, 0.0)).r;

    // Laplacian
    float laplacian = n + s + e + w - 4.0 * current;

    // Verlet integration
    float next = (current * 2.0 - prev + laplacian * uSpeed) * uDamping;

    // Mouse Interaction
    float dist = distance(vUv, uMouse);
    if (uMousePressed && dist < 0.02) {
        next += uMouseStrength * (1.0 - dist / 0.02);
    }

    // Clamp to avoid explosions
    // next = clamp(next, -10.0, 10.0);

    gl_FragColor = vec4(next, 0.0, 0.0, 1.0);
}
`;
