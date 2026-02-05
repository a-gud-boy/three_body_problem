export const waterVertexShader = `
varying vec2 vUv;
varying vec3 vViewPosition;
varying vec3 vWorldPosition;

uniform sampler2D uSimulation;
uniform float uDisplacementScale;

void main() {
    vUv = uv;

    float height = texture2D(uSimulation, uv).r;
    vec3 newPos = position + normal * height * uDisplacementScale;

    vec4 worldPosition = modelMatrix * vec4(newPos, 1.0);
    vWorldPosition = worldPosition.xyz;
    vViewPosition = (viewMatrix * worldPosition).xyz;

    gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

export const waterFragmentShader = `
uniform sampler2D uSimulation;
uniform vec2 uResolution;
uniform vec3 uColor;

varying vec2 vUv;
varying vec3 vWorldPosition;

void main() {
    vec2 pixel = 1.0 / uResolution;

    float val = texture2D(uSimulation, vUv).r;
    float valRight = texture2D(uSimulation, vUv + vec2(pixel.x, 0.0)).r;
    float valUp = texture2D(uSimulation, vUv + vec2(0.0, pixel.y)).r;

    // Calculate normal (assuming plane UVs align with XY, and displacement is along Z)
    // Steepness factor controls how "bumpy" the normal looks relative to height
    vec3 normal = normalize(vec3((val - valRight) * 50.0, (val - valUp) * 50.0, 1.0));

    // Simple Lighting
    vec3 lightDir = normalize(vec3(0.5, 0.5, 1.0));
    float diff = max(dot(normal, lightDir), 0.0);

    vec3 viewDir = normalize(cameraPosition - vWorldPosition);

    // Fresnel
    float fresnel = pow(clamp(1.0 - dot(viewDir, normal), 0.0, 1.0), 3.0);

    vec3 waterColor = uColor;
    vec3 skyColor = vec3(0.8, 0.9, 1.0);

    vec3 finalColor = mix(waterColor * (0.4 + 0.6 * diff), skyColor, fresnel * 0.8);

    // Specular
    vec3 reflectDir = reflect(-lightDir, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
    finalColor += vec3(1.0) * spec;

    gl_FragColor = vec4(finalColor, 0.95);
}
`;
