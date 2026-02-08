import React, { useMemo, useEffect } from 'react';
import { uniform, float, vec3, positionLocal, distance, mix, clamp, color } from 'three/tsl';
import { MeshStandardNodeMaterial } from 'three/webgpu';
import * as THREE from 'three';

// Standard JS Function returning TSL node graph
const calculateDisplacement = (pos, massPos, mass, G, intensity) => {
    // d = distance(pos.xz, massPos.xz)
    const d = distance(pos.xz, massPos.xz);
    const r = d.max(2.0); // Softening

    // depth = GM/r
    const depth = G.mul(mass).div(r);

    // newY = pos.y - depth * 0.1 * intensity
    const newY = pos.y.sub(depth.mul(0.1).mul(intensity));

    return vec3(pos.x, newY, pos.z);
};

// Standard JS Function returning TSL node graph
const calculateColor = (pos, massPos, mass, G, baseColor) => {
    const d = distance(pos.xz, massPos.xz);
    const r = d.max(2.0);
    const depth = G.mul(mass).div(r);

    // Heat map
    const t = clamp(depth.mul(0.002), 0.0, 1.0);
    const hotColor = vec3(1.0, 0.2, 0.1);

    return mix(baseColor, hotColor, t);
};

export default function TSLGrid({ params }) {
    // Uniforms
    // Use useMemo to ensure we reuse the SAME UniformNode instance across renders
    const uMassPos = useMemo(() => uniform(new THREE.Vector3(0, 0, 0)), []);
    const uMass = useMemo(() => uniform(params.blackHoleMass), []);
    const uG = useMemo(() => uniform(1.0), []);
    const uIntensity = useMemo(() => uniform(params.gridIntensity), []);
    const uColor = useMemo(() => uniform(new THREE.Color(0x44aaff)), []);

    // Update uniforms when params change
    useEffect(() => {
        uMass.value = params.blackHoleMass;
        uIntensity.value = params.gridIntensity;
    }, [params.blackHoleMass, params.gridIntensity, uMass, uIntensity]);

    const material = useMemo(() => {
        const mat = new MeshStandardNodeMaterial();
        mat.transparent = true;
        mat.side = THREE.DoubleSide;
        mat.wireframe = true;

        // Vertex Position Logic
        const newPos = calculateDisplacement(positionLocal, uMassPos, uMass, uG, uIntensity);
        mat.positionNode = newPos;

        // Fragment Color Logic
        mat.colorNode = calculateColor(positionLocal, uMassPos, uMass, uG, uColor);
        mat.opacity = 0.6;

        return mat;
    }, [uMassPos, uMass, uG, uIntensity, uColor]);

    return (
        <mesh material={material} rotation={[-Math.PI / 2, 0, 0]} position={[0, -10, 0]}>
            <planeGeometry args={[200, 200, 100, 100]} />
        </mesh>
    );
}
