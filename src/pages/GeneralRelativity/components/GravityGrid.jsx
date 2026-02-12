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

    // Position is LOCAL space.
    // Plane is X-Y plane (z=0) initially.
    // We are rotating it -90 on X, so Y becomes Z?
    // Wait, geometry is PlaneGeometry. By default it lies in X-Y plane.
    // With rotation [-PI/2, 0, 0], Local X -> World X. Local Y -> World -Z. Local Z -> World Y.

    // We want radial distance from center (0,0,0) in world space (which is 0,0 local)
    // d = length(pos.xy) in local space
    float d = length(pos.xy);
    float r = max(d, 2.0); // Softening radius 2.0

    // Potential depth
    float depth = (uG * uMass) / r;

    // Displace "down" in world Y.
    // World Y corresponds to Local Z.
    // We want to move in -World Y, which is -Local Z.
    // So pos.z -= depth ...

    pos.z -= depth * 0.1 * uIntensity;

    vDepth = depth;

    vec4 modelViewPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * modelViewPosition;
}
`;

const fragmentShader = `
uniform vec3 uColor;
uniform float uIntensity;
uniform float uTime; // Unused but kept for consistency

varying float vDepth;
varying vec2 vUv;

void main() {
    // Brighter deeper down
    vec3 color = uColor;
    // float alpha = 0.3 + (vDepth * 0.005);
    float alpha = 0.6; // Consistent with WebGPU

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
