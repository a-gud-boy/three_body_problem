import React, { useMemo, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Fn, uniform, storage, float, vec3, color, instanceIndex, positionLocal, varying, positionWorld, cameraPosition, normalize, dot, mix, clamp, max, min, sqrt, sin, cos, select, If } from 'three/tsl';
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
    const uRs = useMemo(() => uniform(0.0), []);
    const uSpin = useMemo(() => uniform(0.0), []);
    const uFrameCount = useMemo(() => uniform(0.0), []);
    const frameCountRef = useRef(0);

    // Update Uniforms
    useEffect(() => {
        uMass.value = params.blackHoleMass;
        const safeC = Math.max(params.speedOfLight, 10.0);
        uSpeedOfLight.value = safeC;
        const rsVal = (2.0 * 1.0 * params.blackHoleMass) / (safeC * safeC);
        uRs.value = rsVal;
        uSpin.value = params.kerrSpinParameter || 0;
    }, [params]);

    // Compute Shader Node
    const computeNode = useMemo(() => {
        return Fn(() => {
            const index = instanceIndex;
            const pos = posStorage.element(index);
            const vel = velStorage.element(index);

            const mass = uMass;
            const G = uG;
            const dt = uDeltaTime;
            const rs = uRs;
            const spin = uSpin;

            // --- Helper: compute gravitational acceleration at a position ---
            // Paczyński-Wiita: F = -GM / (r - rs)^2, softened
            const computeAccel = (p) => {
                const d = p.length().max(0.001);
                const diff = d.sub(rs);
                const distSq = diff.mul(diff).add(0.1);
                const accelMag = G.mul(mass).div(distSq).min(5000.0);
                const direction = p.negate().div(d);
                const grav = direction.mul(accelMag);

                // Frame dragging: tangential acceleration ~ spin * Rs² / r³
                // cross((0,1,0), p/r) = (p.z/r, 0, -p.x/r)
                const invR = float(1.0).div(d);
                const dragMag = spin.mul(rs).mul(rs).div(d.mul(d).mul(d)).mul(mass);
                const dragDir = vec3(p.z.mul(invR), float(0.0), p.x.negate().mul(invR));
                return grav.add(dragDir.mul(dragMag));
            };

            // --- Velocity Verlet Integration ---
            // Step 1: acceleration at current position
            const accelOld = computeAccel(pos);

            // Step 2: drift position — pos += vel * dt + 0.5 * a_old * dt²
            const halfDtSq = dt.mul(dt).mul(0.5);
            const newPos = pos.add(vel.mul(dt)).add(accelOld.mul(halfDtSq));

            // Step 3: acceleration at new position
            const accelNewVal = computeAccel(newPos);

            // Step 4: kick velocity — vel += 0.5 * (a_old + a_new) * dt
            const halfDt = dt.mul(0.5);
            const newVel = vel.add(accelOld.add(accelNewVal).mul(halfDt));

            // --- Respawn logic: particles falling into event horizon ---
            const r = newPos.length();
            const isInside = r.lessThan(rs.mul(1.05));

            // Also respawn particles that are too far
            const isTooFar = r.greaterThan(float(150.0));
            const shouldRespawn = isInside.or(isTooFar);

            // Pseudo-random angle from instance index + frame count
            const seed = index.toFloat().add(uFrameCount.mul(1.618034));
            const angle = sin(seed.mul(43758.5453123)).fract().mul(6.2831853);

            // ISCO-aware respawn radius
            const iscoR = max(rs.mul(3.0), float(10.0));
            const spawnRange = float(80.0).sub(iscoR);
            const rSpawn = iscoR.add(cos(seed.mul(12.9898)).fract().mul(spawnRange));

            // P-W orbital velocity: v = sqrt(r * GM / (r - rs)^2)
            const denom = rSpawn.sub(rs);
            const denomSq = denom.mul(denom).add(0.01);
            const vMagPW = sqrt(rSpawn.mul(G).mul(mass).div(denomSq));

            const respawnPos = vec3(cos(angle).mul(rSpawn), float(0.0), sin(angle).mul(rSpawn));
            const respawnVel = vec3(sin(angle).negate().mul(vMagPW), float(0.0), cos(angle).mul(vMagPW));

            // Conditional assignment
            const finalPos = select(shouldRespawn, respawnPos, newPos);
            const finalVel = select(shouldRespawn, respawnVel, newVel);

            // Write back
            velStorage.element(index).assign(finalVel);
            posStorage.element(index).assign(finalPos);
        })().compute(COUNT);

    }, [posStorage, velStorage, uMass, uSpeedOfLight, uG, uDeltaTime, uRs, uSpin, uFrameCount]);

    // Material
    const material = useMemo(() => {
        const mat = new MeshStandardNodeMaterial();
        mat.transparent = true;
        mat.blending = THREE.AdditiveBlending;

        const instancePos = posStorage.element(instanceIndex);
        mat.positionNode = positionLocal.add(instancePos);

        const vVel = varying(velStorage.element(instanceIndex));
        const vPos = varying(instancePos);

        const colorFn = Fn(() => {
            const d = vPos.length();
            const t = d.div(100.0).clamp(0.0, 1.0);

            const baseColor = mix(vec3(1.0, 1.0, 1.0), vec3(1.0, 0.3, 0.1), t);

            const viewDir = normalize(positionWorld.sub(cameraPosition));
            const radialVel = dot(vVel, viewDir);
            const shift = radialVel.div(uSpeedOfLight).mul(5.0).clamp(-1.0, 1.0);

            const redshiftColor = vec3(1.0, 0.0, 0.0);
            const blueshiftColor = vec3(0.0, 0.5, 1.0);

            const redFactor = max(shift, 0.0);
            const blueFactor = max(shift.negate(), 0.0);

            const c1 = mix(baseColor, redshiftColor, redFactor.mul(0.8));
            const finalCol = mix(c1, blueshiftColor, blueFactor.mul(0.8));

            return finalCol;
        });

        mat.colorNode = colorFn();

        return mat;
    }, [posStorage, velStorage, uSpeedOfLight]);

    useFrame(({ gl }) => {
        if (!isPlaying) return;

        frameCountRef.current += 1;
        uFrameCount.value = frameCountRef.current;

        try {
            if (gl.computeAsync) {
                gl.computeAsync(computeNode);
            } else if (gl.compute) {
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

