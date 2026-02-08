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
uniform float uMass;
uniform float uG;
uniform float uC;
uniform bool uEnabled;

varying vec3 vWorldPosition;

// Simple pseudo-random noise
float hash(vec3 p) {
    p = fract(p * 0.3183099 + .1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise(in vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i + vec3(0, 0, 0)), hash(i + vec3(1, 0, 0)), f.x),
                   mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x),
                   mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}

// Map direction to background color (Nebula/Stars)
vec3 getBackground(vec3 dir) {
    float n = noise(dir * 200.0); // Stars
    vec3 col = vec3(0.0);
    if (n > 0.98) col = vec3(1.0);

    // Nebula
    float n2 = noise(dir * 3.0 + vec3(uTime * 0.05));
    col += vec3(0.1, 0.0, 0.2) * n2 * 0.5;

    return col;
}

void main() {
    vec3 viewDir = normalize(vWorldPosition - cameraPosition);

    if (!uEnabled) {
        gl_FragColor = vec4(getBackground(viewDir), 1.0);
        return;
    }

    vec3 camToMass = uMassPos - cameraPosition;
    float distToMass = length(camToMass);
    vec3 dirToMass = normalize(camToMass);

    // Calculate angle theta between view direction and mass direction
    float cosTheta = dot(viewDir, dirToMass);
    // Avoid precision issues
    cosTheta = clamp(cosTheta, -1.0, 1.0);
    float sinTheta = sqrt(1.0 - cosTheta * cosTheta);

    // Impact parameter b
    float b = distToMass * sinTheta;

    // Schwarzschild Radius
    float rs = 2.0 * uG * uMass / (uC * uC);

    // Shadow (Photon Sphere approx is 2.6 Rs for visual shadow of event horizon)
    // Actually shadow radius is 3 * sqrt(3) / 2 * Rs ~= 2.6 * Rs
    float shadowRad = 2.6 * rs;

    // Check if looking at black hole shadow
    if (b < shadowRad && cosTheta > 0.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }

    // Einstein Deflection Angle: alpha = 4GM / (c^2 * b)
    // We only deflect if b is large enough to avoid division by zero
    float alpha = 0.0;
    if (b > 0.01) {
        alpha = (4.0 * uG * uMass) / (uC * uC * b);
    }

    // Construct new sample direction
    // Rotate viewDir AWAY from dirToMass by alpha
    // Rotation axis is perpendicular to the plane formed by viewDir and dirToMass
    vec3 axis = cross(viewDir, dirToMass);

    // If looking straight at or away, axis is zero.
    // If straight at, we handled it (shadow). If straight away, alpha is small?
    // Actually alpha decreases with b.

    vec3 sampleDir = viewDir;

    if (length(axis) > 0.001) {
        axis = normalize(axis);
        // Rodrigues rotation formula to rotate viewDir around axis by -alpha (away from mass)
        // Wait, deflect INWARD means light comes from OUTWARD.
        // So we trace OUTWARD (away from mass).
        // Angle is alpha.

        // Actually simpler:
        // The deflection is in the plane of (viewDir, dirToMass).
        // The vector pointing from Mass to Ray is: P = normalize(cross(axis, viewDir))? No.

        // Let's rely on the fact that for small alpha:
        // sampleDir ~= viewDir + alpha * normalize(projection of dirToMass onto image plane)?
        // Vector pointing towards mass in the view plane is:
        // V_perp = normalize(dirToMass - viewDir * dot(viewDir, dirToMass))
        // This vector points TOWARDS the mass in the sky.
        // We want to sample AWAY from the mass.
        // So sampleDir = normalize(viewDir - V_perp * alpha);

        vec3 vPerp = dirToMass - viewDir * cosTheta;
        if (length(vPerp) > 0.001) {
            vPerp = normalize(vPerp);
            sampleDir = normalize(viewDir - vPerp * alpha);
        }
    }

    gl_FragColor = vec4(getBackground(sampleDir), 1.0);
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
        uEnabled: { value: params.enableLensing }
    }), []);

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.material.uniforms.uTime.value = state.clock.elapsedTime;
            meshRef.current.material.uniforms.uMass.value = params.blackHoleMass;
            meshRef.current.material.uniforms.uC.value = params.speedOfLight;
            meshRef.current.material.uniforms.uEnabled.value = params.enableLensing;

            // Keep mesh centered on camera so it acts as infinite skybox
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
            />
        </mesh>
    );
}
