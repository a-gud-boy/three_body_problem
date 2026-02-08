import React, { useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Fn, uniform, storage, float, vec3, color, instanceIndex, positionLocal, If } from 'three/tsl';
import { MeshStandardNodeMaterial } from 'three/webgpu';
import * as THREE from 'three';
import { createAccretionDisk } from '../utils/initializers';

// Simulation Constants
const COUNT = 50000;

export default function TSLParticles({ params, isPlaying }) {

    // Create initial data
    const { positionBuffer, velocityBuffer, colorBuffer } = useMemo(() => {
        const { positions, velocities, colors } = createAccretionDisk(COUNT, params.blackHoleMass, 10, 80, 'newtonian', params.speedOfLight);
        return {
            positionBuffer: new THREE.InstancedBufferAttribute(positions, 3),
            velocityBuffer: new THREE.InstancedBufferAttribute(velocities, 3),
            colorBuffer: new THREE.InstancedBufferAttribute(colors, 3)
        };
    }, []);

    // Create Storage Buffers (Read/Write on GPU)
    // We need to wrap the Float32Arrays in StorageBufferAttribute or similar?
    // In TSL, `storage(bufferAttribute, type, count)` creates a node.
    // We must pass the attribute itself.

    // Actually, TSL storage uses `THREE.InstancedBufferAttribute` directly if passed to `storage`?
    // Let's check `ExperimentalFluidPage.jsx`.
    // `const currentBuffer = storage(new Float32Array(COUNT), 'float', COUNT);`
    // It passes a TypedArray.

    // But for `instancedMesh`, we want to use the buffer for rendering too.
    // If we use `storage(typedArray)`, we get a node we can read/write.
    // To render instances at those positions, we assign `material.positionNode = storageNode.element(instanceIndex)`.

    // So we keep the TypedArrays.
    const posArray = useMemo(() => positionBuffer.array, [positionBuffer]);
    const velArray = useMemo(() => velocityBuffer.array, [velocityBuffer]);
    // Color is static for now, so we can use attribute or storage. Let's use attribute for color to save compute?
    // Actually, if we want to change color based on radius, we need compute or node logic.
    // Let's just use `storage` for Pos and Vel.

    const posStorage = useMemo(() => storage(posArray, 'vec3', COUNT), [posArray]);
    const velStorage = useMemo(() => storage(velArray, 'vec3', COUNT), [velArray]);

    // Uniforms
    const uMass = useMemo(() => uniform(params.blackHoleMass), []);
    const uSpeedOfLight = useMemo(() => uniform(params.speedOfLight), []);
    const uG = useMemo(() => uniform(1.0), []);
    const uDeltaTime = useMemo(() => uniform(0.016), []);
    const uRs = useMemo(() => uniform(0.0), []); // Schwarzschild Radius

    // Update Uniforms
    useEffect(() => {
        uMass.value = params.blackHoleMass;
        uSpeedOfLight.value = params.speedOfLight;
        // Rs = 2GM/c^2
        uRs.value = (2.0 * 1.0 * params.blackHoleMass) / (params.speedOfLight * params.speedOfLight);
    }, [params]);

    // Compute Shader Node
    const computeShader = useMemo(() => {
        return Fn(() => {
            const index = instanceIndex;
            const pos = posStorage.element(index);
            const vel = velStorage.element(index);

            const mass = uMass;
            const G = uG;
            const c = uSpeedOfLight;
            const dt = uDeltaTime;
            const rs = uRs;

            // Physics
            const d = pos.length(); // Distance from (0,0,0)

            // Force/Acceleration
            // Newtonian: a = -GM/r^3 * pos
            // Relativistic (Paczyński-Wiita): a = -GM / (r-rs)^2 * (pos/r)

            // Guard against division by zero or NaN
            // Using `If` for conditional logic in TSL?
            // `If( condition, () => { ... } )`

            const accel = vec3(0.0).toVar();

            // We can't use standard JS `if` here easily if we want GPU branching.
            // But we can use `select` or TSL `If`.

            // Let's implement PW potential: F = -GM / (r-rs)^2
            // Direction is -pos/r
            // a = -GM / (r-rs)^2 / r * pos ? No.
            // a_mag = GM / (r-rs)^2
            // a_vec = -a_mag * (pos/r) = -GM / (r(r-rs)^2) * pos

            const r_eff = d.sub(rs).max(0.1); // r - rs
            const denom = r_eff.mul(r_eff).mul(d); // r(r-rs)^2
            const accelMag = G.mul(mass).div(denom); // GM / ...

            accel.assign( pos.negate().mul(accelMag) );

            // Update Velocity
            const newVel = vel.add(accel.mul(dt));

            // Update Position
            const newPos = pos.add(newVel.mul(dt));

            // Boundary / Horizon Check
            // If r < rs * 1.1, reset?
            // TSL doesn't have `Math.random()` easily for respawn.
            // We can wrap around a box? or just let them fall in (freeze).
            // Let's freeze if inside horizon.

            // If (d < rs * 1.5) -> freeze or kill
            // Just clamp position?

            // For now, let's keep it simple: just integration.

            velStorage.element(index).assign(newVel);
            posStorage.element(index).assign(newPos);

        }).compute(COUNT);
    }, [posStorage, velStorage, uMass, uSpeedOfLight, uG, uDeltaTime, uRs]);

    // Material
    const material = useMemo(() => {
        const mat = new MeshStandardNodeMaterial();

        // Position from storage
        const pos = posStorage.element(instanceIndex);
        mat.positionNode = pos;

        // Color based on velocity or radius
        const d = pos.length();
        const t = d.div(100.0).clamp(0.0, 1.0); // 0 to 100 radius
        mat.colorNode = color(0xffffff).mix(color(0xff0000), t);

        // Scale instance
        // mat.scaleNode? No, standard material doesn't have scaleNode easily exposed on InstancedMesh unless we transform position?
        // Actually `positionNode` sets the *vertex* position relative to instance?
        // No, `positionNode` in `MeshStandardNodeMaterial` usually overrides *vertex position*.
        // For InstancedMesh, we want `instancePosition`?

        // Wait, `positionNode` replaces the *final* position calculation?
        // Or is it `positionLocal`?

        // In `ExperimentalFluid`, `mat.positionNode = newPos` where newPos was `vec3(pos.x, height, pos.z)`.
        // This transformed the *vertices*.
        // For InstancedMesh, we want to transform the *instance*.
        // But here we are rendering *one* geometry instance many times?
        // `InstancedMesh` logic in TSL:
        // We usually do: `positionLocal.add(instancePosition)` where `instancePosition` comes from storage.

        const instancePos = posStorage.element(instanceIndex);
        mat.positionNode = positionLocal.add(instancePos);

        return mat;
    }, [posStorage]);

    useFrame(({ gl, clock }) => {
        if (!isPlaying) return;

        uDeltaTime.value = 0.016; // Fixed step for stability

        if (gl.compute) {
            gl.compute(computeShader);
        }
    });

    return (
        <instancedMesh args={[null, null, COUNT]} material={material}>
            <sphereGeometry args={[0.2, 8, 8]} />
        </instancedMesh>
    );
}
