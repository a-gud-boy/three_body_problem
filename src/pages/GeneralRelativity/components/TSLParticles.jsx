import React, { useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Fn, uniform, storage, float, vec3, color, instanceIndex, positionLocal, varying, positionWorld, cameraPosition, normalize, dot, mix, clamp, max } from 'three/tsl';
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
        mat.transparent = true;
        mat.blending = THREE.AdditiveBlending;

        // Position from storage (Vertex Stage)
        const instancePos = posStorage.element(instanceIndex);
        mat.positionNode = positionLocal.add(instancePos);

        // Varyings (Vertex -> Fragment)
        // Must be defined here to ensure they are hooked up correctly
        const vVel = varying(velStorage.element(instanceIndex));
        const vPos = varying(instancePos);

        // Color Logic (Fragment Stage)
        const colorFn = Fn(() => {
             // Distance for base color (heat map)
             const d = vPos.length();
             const t = d.div(100.0).clamp(0.0, 1.0);

             // Base Color: White to Red/Orange gradient based on distance
             const baseColor = mix(vec3(1.0, 1.0, 1.0), vec3(1.0, 0.3, 0.1), t);

             // Doppler Shift Logic
             // viewDir: Normalized vector from Camera to Fragment
             // In Three.js TSL, cameraPosition is World Position of camera.
             // positionWorld is World Position of fragment.
             // direction = normalize(positionWorld - cameraPosition)
             const viewDir = normalize(positionWorld.sub(cameraPosition));

             // Radial Velocity: Projection of velocity onto view direction
             // If particle moves AWAY (same dir as viewDir), dot > 0 -> Redshift
             // If particle moves TOWARDS (opp dir), dot < 0 -> Blueshift
             const radialVel = dot(vVel, viewDir);

             // Shift factor: v_r / c
             // We multiply by 5.0 to make the effect visible at lower speeds
             const shift = radialVel.div(uSpeedOfLight).mul(5.0).clamp(-1.0, 1.0);

             const redshiftColor = vec3(1.0, 0.0, 0.0);
             const blueshiftColor = vec3(0.0, 0.5, 1.0); // Cyan/Blue

             // Mix factors
             const redFactor = max(shift, 0.0);
             const blueFactor = max(shift.negate(), 0.0);

             // Apply mixing
             // mix(base, red, factor)
             const c1 = mix(baseColor, redshiftColor, redFactor.mul(0.8));
             const finalCol = mix(c1, blueshiftColor, blueFactor.mul(0.8));

             return finalCol;
        });

        mat.colorNode = colorFn();

        return mat;
    }, [posStorage, velStorage, uSpeedOfLight]);

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
