import React, { useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Fn, uniform, storage, float, vec3, color, instanceIndex, positionLocal } from 'three/tsl';
import { MeshStandardNodeMaterial, StorageInstancedBufferAttribute } from 'three/webgpu';
import * as THREE from 'three';
import { createAccretionDisk } from '../utils/initializers';

// Simulation Constants
const COUNT = 50000;

export default function TSLParticles({ params, isPlaying }) {

    // Create initial data
    const { positionBuffer, velocityBuffer } = useMemo(() => {
        const { positions, velocities } = createAccretionDisk(COUNT, params.blackHoleMass, 10, 80, 'newtonian', params.speedOfLight);
        return {
            positionBuffer: new StorageInstancedBufferAttribute(positions, 3),
            velocityBuffer: new StorageInstancedBufferAttribute(velocities, 3)
        };
    }, []);

    // Create Storage Buffers (Read/Write on GPU)
    const posStorage = useMemo(() => storage(positionBuffer, 'vec3', COUNT), [positionBuffer]);
    const velStorage = useMemo(() => storage(velocityBuffer, 'vec3', COUNT), [velocityBuffer]);

    // Uniforms
    const uMass = useMemo(() => uniform(params.blackHoleMass), []);
    const uSpeedOfLight = useMemo(() => uniform(params.speedOfLight), []);
    const uG = useMemo(() => uniform(1.0), []);
    const uDeltaTime = useMemo(() => uniform(0.016), []);
    const uRs = useMemo(() => uniform(0.0), []); // Schwarzschild Radius

    // Update Uniforms
    useEffect(() => {
        uMass.value = params.blackHoleMass;
        // Ensure c is at least 10 to avoid huge Rs or div by zero
        const safeC = Math.max(params.speedOfLight, 10.0);
        uSpeedOfLight.value = safeC;
        // Rs = 2GM/c^2
        const rsVal = (2.0 * 1.0 * params.blackHoleMass) / (safeC * safeC);
        uRs.value = rsVal;
    }, [params]);

    // Compute Shader Node
    const computeNode = useMemo(() => {
        // Define and invoke the compute shader logic in one go
        return Fn(() => {
            const index = instanceIndex;
            const pos = posStorage.element(index);
            const vel = velStorage.element(index);

            const mass = uMass;
            const G = uG;
            const dt = uDeltaTime;
            const rs = uRs;

            // Physics
            const d = pos.length().max(0.001); // Safe distance from (0,0,0)

            // Paczyński-Wiita potential: F = -GM / (r-rs)^2
            // To avoid singularity at r=rs, we soften the denominator
            const diff = d.sub(rs);
            // We use a softened squared distance: (r-rs)^2 + epsilon
            // This guarantees positive, non-zero denominator
            const distSq = diff.mul(diff).add(0.1);

            // Acceleration Magnitude
            const accelMag = G.mul(mass).div(distSq).min(5000.0); // Clamp max acceleration

            // Direction: -pos / r (Normalized towards center)
            const direction = pos.negate().div(d);
            const accel = direction.mul(accelMag);

            // Update Velocity
            const newVel = vel.add(accel.mul(dt));

            // Update Position
            const newPos = pos.add(newVel.mul(dt));

            // Write back to storage
            velStorage.element(index).assign(newVel);
            posStorage.element(index).assign(newPos);
        })().compute(COUNT);

    }, [posStorage, velStorage, uMass, uSpeedOfLight, uG, uDeltaTime, uRs]);

    // Material
    const material = useMemo(() => {
        const mat = new MeshStandardNodeMaterial();

        // Position from storage
        const instancePos = posStorage.element(instanceIndex);
        mat.positionNode = positionLocal.add(instancePos);

        // Color based on distance
        const d = instancePos.length();
        const t = d.div(100.0).clamp(0.0, 1.0); // 0 to 100 radius
        mat.colorNode = color(0xffffff).mix(color(0xff0000), t);

        return mat;
    }, [posStorage]);

    useFrame(({ gl }) => {
        if (!isPlaying) return;

        try {
            // Use computeAsync if available (WebGPURenderer)
            if (gl.computeAsync) {
                gl.computeAsync(computeNode);
            } else if (gl.compute) {
                // Fallback
                gl.compute(computeNode);
            }
        } catch (e) {
            // Suppress frame-level errors if backend is not ready
        }
    });

    return (
        <instancedMesh args={[null, null, COUNT]} material={material}>
            <sphereGeometry args={[0.2, 8, 8]} />
        </instancedMesh>
    );
}
