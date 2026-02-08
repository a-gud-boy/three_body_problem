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
        uSpeedOfLight.value = params.speedOfLight;
        // Rs = 2GM/c^2
        uRs.value = (2.0 * 1.0 * params.blackHoleMass) / (params.speedOfLight * params.speedOfLight);
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
            const d = pos.length(); // Distance from (0,0,0)
            const safeD = d.max(0.001); // Prevent division by zero

            // Paczyński-Wiita potential: F = -GM / (r-rs)^2
            // Direction is -pos/r

            // Avoid division by zero and singularity in potential
            // r_eff = max(r - rs, 0.1)
            const r_eff = d.sub(rs).max(0.1);
            const denom = r_eff.mul(r_eff).mul(safeD); // r(r-rs)^2 (using safeD for r)

            // Calculate magnitude: GM / denom
            // Clamp acceleration to prevent numerical explosion near event horizon or center
            const accelMag = G.mul(mass).div(denom).min(5000.0);

            // Assign acceleration
            // Use manual normalization with safeD to avoid normalize(0)
            // direction = -pos / safeD
            const direction = pos.negate().div(safeD);
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

        // Robust check for backend initialization
        if (gl.backend && !gl.backend.isInitialized) return;

        try {
            // Use computeAsync if available (WebGPURenderer)
            if (gl.computeAsync) {
                gl.computeAsync(computeNode);
            } else if (gl.compute) {
                // Fallback
                gl.compute(computeNode);
            }
        } catch (e) {
            console.error("Compute error:", e);
        }
    });

    return (
        <instancedMesh args={[null, null, COUNT]} material={material}>
            <sphereGeometry args={[0.2, 8, 8]} />
        </instancedMesh>
    );
}
