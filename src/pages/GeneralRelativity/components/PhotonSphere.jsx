/* eslint-disable react-hooks/immutability */
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Renders a translucent, animated glowing shell at r = 1.5 × Rs (the photon sphere),
 * where light orbits the black hole. Educational and visually striking.
 */
export default React.memo(function PhotonSphere({ params }) {
    const meshRef = useRef();

    const material = useMemo(() => {
        return new THREE.MeshBasicMaterial({
            color: new THREE.Color(0.3, 0.6, 1.0),
            transparent: true,
            opacity: 0.08,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
    }, []);

    // Inner glow ring mesh
    const glowMaterial = useMemo(() => {
        return new THREE.MeshBasicMaterial({
            color: new THREE.Color(0.5, 0.7, 1.0),
            transparent: true,
            opacity: 0.15,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
    }, []);

    useFrame((state) => {
        if (!meshRef.current) return;

        const c = Math.max(params.speedOfLight, 10);
        const rs = (2.0 * 1.0 * params.blackHoleMass) / (c * c);
        const photonR = rs * 1.5;

        // Animate scale with a subtle pulse
        const pulse = 1.0 + Math.sin(state.clock.elapsedTime * 2.0) * 0.03;
        meshRef.current.scale.setScalar(photonR * pulse);

        // Animate opacity with a subtle breathing effect
        const mat = material;
        const gMat = glowMaterial;
        mat.opacity = 0.06 + Math.sin(state.clock.elapsedTime * 1.5) * 0.03;
        gMat.opacity = 0.1 + Math.sin(state.clock.elapsedTime * 2.5 + 1.0) * 0.06;
    });

    return (
        <group ref={meshRef}>
            {/* Main photon sphere shell */}
            <mesh material={material}>
                <sphereGeometry args={[1, 48, 48]} />
            </mesh>
            {/* Slightly larger outer glow */}
            <mesh material={glowMaterial} scale={[1.08, 1.08, 1.08]}>
                <sphereGeometry args={[1, 32, 32]} />
            </mesh>
            {/* Equatorial ring highlight — light orbits in the equatorial plane */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[1, 0.02, 16, 64]} />
                <meshBasicMaterial
                    color={new THREE.Color(0.4, 0.8, 1.0)}
                    transparent
                    opacity={0.3}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </mesh>
        </group>
    );
});