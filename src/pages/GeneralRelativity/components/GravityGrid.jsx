import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const vertexShader = `
uniform float uTime;
uniform vec3 uMassPos;
uniform float uMass;
uniform float uG;
uniform float uIntensity;

varying float vDepth;
varying vec2 vUv;

void main() {
    vUv = uv;
    vec3 pos = position;

    // Simple Newtonian-ish deformation: y = -GM/r
    // Avoid singularity with softening
    float d = distance(pos.xz, uMassPos.xz);
    float r = max(d, 2.0); // Softening radius 2.0

    // Depth is negative potential (inverted well)
    // Scale factor for visibility
    float depth = (uG * uMass) / r;

    // Apply intensity
    pos.y -= depth * 0.1 * uIntensity;

    vDepth = depth;

    vec4 modelViewPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * modelViewPosition;
}
`;

const fragmentShader = `
uniform vec3 uColor;
uniform float uIntensity;

varying float vDepth;
varying vec2 vUv;

void main() {
    // Brighter deeper down
    vec3 color = uColor;
    float alpha = 0.3 + (vDepth * 0.005);

    // Grid lines logic (simple)
    // Using wireframe prop on material handles lines, but let's do color modulation

    // Heat map color
    vec3 hotColor = vec3(1.0, 0.2, 0.1);
    vec3 coolColor = uColor;

    vec3 finalColor = mix(coolColor, hotColor, clamp(vDepth * 0.002, 0.0, 1.0));

    gl_FragColor = vec4(finalColor, alpha);
}
`;

export default function GravityGrid({ params }) {
    const materialRef = useRef();

    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
        uMassPos: { value: new THREE.Vector3(0, 0, 0) },
        uMass: { value: params.blackHoleMass },
        uG: { value: 1.0 },
        uIntensity: { value: params.gridIntensity },
        uColor: { value: new THREE.Color(0x44aaff) }
    }), []);

    useFrame((state) => {
        if (materialRef.current) {
            materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
            materialRef.current.uniforms.uMass.value = params.blackHoleMass;
            materialRef.current.uniforms.uIntensity.value = params.gridIntensity;
        }
    });

    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -10, 0]}>
            <planeGeometry args={[200, 200, 100, 100]} />
            <shaderMaterial
                ref={materialRef}
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                uniforms={uniforms}
                wireframe={true}
                transparent={true}
                side={THREE.DoubleSide}
            />
        </mesh>
    );
}
