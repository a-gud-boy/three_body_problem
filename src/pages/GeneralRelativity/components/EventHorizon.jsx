import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Renders the Event Horizon as a dark sphere at r = Rs with a subtle
 * animated purple/blue rim glow (Hawking radiation corona).
 * Visible primarily when lensing is disabled, providing a visual anchor.
 */

const glowVertexShader = `
varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mvPosition.xyz);
    gl_Position = projectionMatrix * mvPosition;
}
`;

const glowFragmentShader = `
uniform float uTime;
uniform float uIntensity;

varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
    // Fresnel rim glow — bright at edges, transparent at center
    float fresnel = 1.0 - abs(dot(vNormal, vViewDir));
    fresnel = pow(fresnel, 3.0);

    // Animate with subtle pulse
    float pulse = 0.8 + 0.2 * sin(uTime * 1.5);

    // Purple-blue corona color
    vec3 innerColor = vec3(0.4, 0.2, 0.8);  // Deep purple
    vec3 outerColor = vec3(0.2, 0.5, 1.0);  // Bright blue
    vec3 color = mix(innerColor, outerColor, fresnel);

    float alpha = fresnel * pulse * uIntensity;

    gl_FragColor = vec4(color, alpha);
}
`;

export default function EventHorizon({ params }) {
    const groupRef = useRef();
    const glowMatRef = useRef();

    // Core black sphere material
    const coreMaterial = useMemo(() => {
        return new THREE.MeshBasicMaterial({
            color: 0x000000,
            side: THREE.FrontSide,
        });
    }, []);

    // Glow uniforms
    const glowUniforms = useMemo(() => ({
        uTime: { value: 0 },
        uIntensity: { value: 0.6 },
    }), []);

    useFrame((state) => {
        if (!groupRef.current) return;

        const c = Math.max(params.speedOfLight, 10);
        const rs = (2.0 * 1.0 * params.blackHoleMass) / (c * c);

        // Scale group to Schwarzschild radius
        groupRef.current.scale.setScalar(rs);

        // Update glow animation
        if (glowMatRef.current) {
            glowMatRef.current.uniforms.uTime.value = state.clock.elapsedTime;
        }
    });

    return (
        <group ref={groupRef}>
            {/* Core black sphere */}
            <mesh material={coreMaterial}>
                <sphereGeometry args={[1, 32, 32]} />
            </mesh>

            {/* Fresnel glow shell (slightly larger) */}
            <mesh scale={[1.15, 1.15, 1.15]}>
                <sphereGeometry args={[1, 32, 32]} />
                <shaderMaterial
                    ref={glowMatRef}
                    vertexShader={glowVertexShader}
                    fragmentShader={glowFragmentShader}
                    uniforms={glowUniforms}
                    transparent={true}
                    blending={THREE.AdditiveBlending}
                    side={THREE.FrontSide}
                    depthWrite={false}
                />
            </mesh>

            {/* Outer soft halo */}
            <mesh scale={[1.4, 1.4, 1.4]}>
                <sphereGeometry args={[1, 24, 24]} />
                <meshBasicMaterial
                    color={new THREE.Color(0.3, 0.15, 0.6)}
                    transparent
                    opacity={0.04}
                    blending={THREE.AdditiveBlending}
                    side={THREE.FrontSide}
                    depthWrite={false}
                />
            </mesh>
        </group>
    );
}
