/* eslint-disable react-hooks/immutability */
import React, { useMemo, useEffect } from 'react';
import { uniform, vec3, positionLocal, mix, clamp, length, varying } from 'three/tsl';
import { MeshStandardNodeMaterial } from 'three/webgpu';
import * as THREE from 'three';

export default React.memo(function TSLGrid({ params }) {
    // Uniforms
    const uMass = useMemo(() => uniform(params.blackHoleMass), [params.blackHoleMass]);
    const uG = useMemo(() => uniform(1.0), []);
    const uIntensity = useMemo(() => uniform(params.gridIntensity), [params.gridIntensity]);
    const uColor = useMemo(() => uniform(new THREE.Color(0x44aaff)), []);

    // Update uniforms when params change
    useEffect(() => {
        const massUniform = uMass;
        const intensityUniform = uIntensity;
        massUniform.value = params.blackHoleMass;
        intensityUniform.value = params.gridIntensity;
    }, [params.blackHoleMass, params.gridIntensity, uMass, uIntensity]);

    const material = useMemo(() => {
        const mat = new MeshStandardNodeMaterial();
        mat.transparent = true;
        mat.side = THREE.DoubleSide;
        mat.wireframe = true;

        // --- Vertex Stage ---

        // PlaneGeometry is XY plane. We use local position.
        // Distance from center (0,0) in the XY plane.
        const d = length(positionLocal.xy);

        // Softened distance to avoid singularity
        const r = d.max(2.0);

        // Depth calculation: GM/r
        const depth = uG.mul(uMass).div(r);

        // Displace Z coordinate "downwards".
        // Plane is rotated -90 deg X, so local Z+ points world Y+.
        // To push "down" in world Y, we subtract from local Z.
        // Or if we want a funnel shape...
        const displacement = depth.mul(0.1).mul(uIntensity);
        const newZ = positionLocal.z.sub(displacement);

        const displacedPos = vec3(positionLocal.x, positionLocal.y, newZ);

        mat.positionNode = displacedPos;

        // --- Fragment Stage ---

        // Pass depth or distance as varying to fragment shader for coloring
        const vDepth = varying(displacement); // Use the calculated displacement as proxy for depth

        // Heat map logic
        const t = clamp(vDepth.mul(0.02), 0.0, 1.0); // Scale factor for color
        const hotColor = vec3(1.0, 0.2, 0.1);

        mat.colorNode = mix(uColor, hotColor, t);
        mat.opacity = 0.6;

        return mat;
    }, [uMass, uG, uIntensity, uColor]);

    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -10, 0]}>
            <planeGeometry args={[200, 200, 100, 100]} />
            <primitive object={material} attach="material" />
        </mesh>
    );
});