import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const vertexShader = `
varying vec3 vWorldPosition;

void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

const fragmentShader = `
uniform float uTime;
uniform vec3 uMassPos;
uniform float uMass;     // Black Hole Mass
uniform float uG;        // Gravitational Constant
uniform float uC;        // Speed of Light
uniform bool uEnabled;

// Disk Params
uniform float uDiskInner;
uniform float uDiskOuter;
uniform float uDiskHeight;
uniform bool uShowGrid;
uniform bool uShowDisk;

varying vec3 vWorldPosition;

// Constants
#define MAX_STEPS 300
#define STEP_SIZE 0.05
#define PI 3.14159265359

// Noise Functions
float hash(float n) { return fract(sin(n) * 43758.5453123); }
float random(vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123); }
float noise(vec3 x) {
    vec3 p = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    float n = p.x + p.y * 57.0 + 113.0 * p.z;
    return mix(mix(mix(hash(n + 0.0), hash(n + 1.0), f.x),
                   mix(hash(n + 57.0), hash(n + 58.0), f.x), f.y),
               mix(mix(hash(n + 113.0), hash(n + 114.0), f.x),
                   mix(hash(n + 170.0), hash(n + 171.0), f.x), f.y), f.z);
}

// Background Stars/Nebula
vec3 getBackground(vec3 dir) {
    float n = noise(dir * 200.0);
    float stars = step(0.98, n);

    // Nebula
    float n2 = noise(dir * 3.0 + vec3(uTime * 0.05));
    vec3 nebula = vec3(0.1, 0.0, 0.2) * n2 * 0.5;

    return vec3(stars) + nebula;
}

// Color Palette for Accretion Disk (Blackbody-ish)
vec3 getDiskColor(float t) {
    // t is 0 (cool) to 1 (hot)
    return mix(vec3(1.0, 0.3, 0.05), vec3(0.1, 0.4, 1.0), t); // Orange to Blue
}

void main() {
    if (!uEnabled) {
        vec3 dir = normalize(vWorldPosition - cameraPosition);
        gl_FragColor = vec4(getBackground(dir), 1.0);
        return;
    }

    vec3 rayPos = cameraPosition;
    vec3 rayDir = normalize(vWorldPosition - cameraPosition);

    // Schwarzschild Radius
    float rs = 2.0 * uG * uMass / (uC * uC);

    // Dithering to break up banding
    float jitter = random(gl_FragCoord.xy);
    rayPos += rayDir * jitter * 0.05; // Offset start slightly

    // Accumulator
    vec3 color = vec3(0.0);
    float opacity = 0.0;

    // Ray Marching Loop
    for(int i = 0; i < MAX_STEPS; i++) {
        vec3 p = rayPos - uMassPos;
        float r = length(p);

        // Event Horizon Collision
        if (r < rs) {
            color = vec3(0.0); // Black Hole
            opacity = 1.0;
            break;
        }

        // Escape condition
        if (r > 100.0) {
            break;
        }

        // --- Gravity Bending (Pseudo-Newtonian for visual) ---
        // Force F ~ 1.5 * Rs / r^2 (tuned for visual lensing)
        // Deflect rayDir towards mass
        // We update direction based on distance
        float distSq = dot(p, p);
        // Bending factor: Proportional to Rs/r^2
        // We use a small step integration
        vec3 accel = -normalize(p) * (1.5 * rs / distSq);

        rayDir += accel * STEP_SIZE;
        rayDir = normalize(rayDir);
        rayPos += rayDir * STEP_SIZE * r; // Adaptive step size based on distance?
        // Actually, fixed step in curved space is tricky.
        // Let's use simpler adaptive step: smaller near BH.
        // step = STEP_SIZE * max(r - rs, 0.1);

        // Let's retry the integration step carefully.
        // Using a fixed small step in "coordinate time" might be slow.
        // Let's use a dynamic step size.
        float stepDist = max(0.05, (r - rs) * 0.15);
        // Clamp step to avoid overshooting thin disk
        if (abs(p.y) < uDiskHeight * 3.0) stepDist = min(stepDist, 0.025);

        // Update Position
        rayPos += rayDir * stepDist;

        // --- Accretion Disk Rendering (Volumetric) ---
        // Check if within disk bounds
        // p.y is height from equatorial plane
        // r_plane is distance in XZ plane
        float r_plane = length(p.xz);

        if (uShowDisk && abs(p.y) < uDiskHeight && r_plane > uDiskInner && r_plane < uDiskOuter) {
            // Density Profile
            // Falloff from center radius
            float density = 1.0 - smoothstep(0.0, uDiskHeight, abs(p.y));
            // Radial falloff
            float radialDensity = noise(vec3(r_plane * 2.0, atan(p.z, p.x) * 5.0 + uTime, uTime * 0.2));
            density *= radialDensity;

            // Temperature / Color
            // Hotter near inner radius
            float temp = 1.0 - smoothstep(uDiskInner, uDiskOuter, r_plane);
            vec3 diskCol = getDiskColor(temp);

            // Doppler Shift (Simplified)
            // Velocity vector of disk material: Tangent to circle
            vec3 vel = normalize(cross(vec3(0.0, 1.0, 0.0), p));
            // Project velocity onto view direction (rayDir)
            // If moving away (dot > 0), Redshift. Towards (dot < 0), Blueshift.
            float doppler = dot(vel, rayDir);
            // Shift color
            // doppler > 0 -> Red, doppler < 0 -> Blue
            diskCol *= (1.0 - doppler * 0.5);

            // Accumulate
            // Boost alpha for visibility
            float alpha = density * 0.5 * stepDist;
            // Boost color intensity
            color += (diskCol * 2.0) * alpha * (1.0 - opacity);
            opacity += alpha;

            if (opacity > 0.95) break;
        }

        // --- Grid Visualization (XZ Plane) ---
        // Draw grid lines
        // Only if near y=0
        if (uShowGrid && abs(p.y) < 0.05 && r_plane > rs * 1.5 && r_plane < 50.0) {
             // Grid lines every 1 unit
             float gridX = abs(fract(p.x) - 0.5);
             float gridZ = abs(fract(p.z) - 0.5);
             float gridWidth = 0.02 * (r_plane / 10.0); // Thicker at distance

             if (gridX < gridWidth || gridZ < gridWidth) {
                 vec3 gridColor = vec3(0.2, 0.2, 0.2); // Dark grid
                 float gridAlpha = 0.2 * stepDist;
                 color += gridColor * gridAlpha * (1.0 - opacity);
                 opacity += gridAlpha;
             }
        }
    }

    // Final Background Mix
    vec3 bg = getBackground(rayDir);
    color += bg * (1.0 - opacity);

    gl_FragColor = vec4(color, 1.0);
}
`;

export default function LensingEffect({ params }) {
    const meshRef = useRef();

    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
        uMassPos: { value: new THREE.Vector3(0, 0, 0) },
        uMass: { value: params.blackHoleMass },
        uG: { value: 1.0 },
        uC: { value: params.speedOfLight },
        uEnabled: { value: params.enableLensing },
        uShowDisk: { value: true },
        uShowGrid: { value: true },
        uDiskInner: { value: 2.0 },
        uDiskOuter: { value: 8.0 },
        uDiskHeight: { value: 0.2 }
    }), []);

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.material.uniforms.uTime.value = state.clock.elapsedTime;
            meshRef.current.material.uniforms.uMass.value = params.blackHoleMass;
            meshRef.current.material.uniforms.uC.value = params.speedOfLight;
            meshRef.current.material.uniforms.uEnabled.value = params.enableLensing;
            meshRef.current.material.uniforms.uShowDisk.value = params.showDisk !== false;
            meshRef.current.material.uniforms.uShowGrid.value = params.showGrid !== false;

            // Recalculate disk params based on Rs
            const rs = 2.0 * 1.0 * params.blackHoleMass / (params.speedOfLight * params.speedOfLight);
            meshRef.current.material.uniforms.uDiskInner.value = rs * 3.0; // ISCO (Inner Stable Circular Orbit) roughly 3Rs
            meshRef.current.material.uniforms.uDiskOuter.value = rs * 12.0;
            meshRef.current.material.uniforms.uDiskHeight.value = rs * 0.2;

            // Keep mesh centered on camera
            meshRef.current.position.copy(state.camera.position);
        }
    });

    return (
        <mesh ref={meshRef} scale={[900, 900, 900]}>
            <sphereGeometry args={[1, 64, 64]} />
            <shaderMaterial
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                uniforms={uniforms}
                side={THREE.BackSide}
                depthWrite={false}
                transparent={true}
            />
        </mesh>
    );
}
