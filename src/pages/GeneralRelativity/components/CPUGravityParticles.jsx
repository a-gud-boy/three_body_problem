import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createAccretionDisk } from '../utils/initializers';
import { calculateAcceleration, calculatePotential, C } from '../utils/physics';

export default function CPUGravityParticles({ params, isPlaying }) {
    const meshRef = useRef();
    const count = 5000;

    // Create initial data
    const { positions, velocities, colors } = useMemo(() => {
        // Start with a generic 'Newtonian' layout, physics will adjust dynamically
        return createAccretionDisk(count, params.blackHoleMass, 10, 80, 'newtonian', params.speedOfLight);
    }, [count]); // Only re-create on count change, not params change (to preserve state)

    // Store state in refs to persist across renders without re-allocation
    const posRef = useRef(positions);
    const velRef = useRef(velocities);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const tempVec = useMemo(() => new THREE.Vector3(), []);
    const massPos = useMemo(() => new THREE.Vector3(0, 0, 0), []); // Center of black hole

    // Reset logic if params change drastically (e.g. mass doubles)?
    // For now, let's keep particles where they are and just update forces.

    // Update colors based on depth (potential)
    // We can't update buffer attributes every frame efficiently for 5000 particles in CPU easily without upload overhead.
    // Let's just update positions.

    useFrame((state, delta) => {
        if (!isPlaying || !meshRef.current) return;

        // Cap delta to avoid explosion if tab inactive
        const dt = Math.min(delta, 0.05);

        const p = posRef.current;
        const v = velRef.current;
        const mass = params.blackHoleMass;
        const type = params.physicsModel; // 'newtonian' or 'relativistic'
        const c = params.speedOfLight;

        // Safety bounds
        const bounds = 150;
        const rs = (2 * 1.0 * mass) / (c*c);

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;

            // Current position
            const x = p[i3];
            const y = p[i3+1];
            const z = p[i3+2];

            // Get Acceleration
            // We can inline logic for speed or call utility. Utility is cleaner.
            const pos = { x, y, z };

            // Calculate Force/Acceleration
            // Mutates tempVec
            tempVec.set(0,0,0);
            calculateAcceleration(pos, massPos, mass, tempVec, type, c);

            // Update Velocity (Euler for simplicity, or semi-implicit Euler)
            v[i3] += tempVec.x * dt;
            v[i3+1] += tempVec.y * dt;
            v[i3+2] += tempVec.z * dt;

            // Update Position
            p[i3] += v[i3] * dt;
            p[i3+1] += v[i3+1] * dt;
            p[i3+2] += v[i3+2] * dt;

            // Simple boundary wrap / reset if fell in
            const rSq = x*x + y*y + z*z;

            // If fell into Event Horizon (or close to center)
            if (rSq < rs*rs * 1.1) { // 10% margin
                 // Respawn at outer edge
                 const angle = Math.random() * Math.PI * 2;
                 const r = 80;
                 p[i3] = Math.cos(angle) * r;
                 p[i3+1] = (Math.random()-0.5) * 2;
                 p[i3+2] = Math.sin(angle) * r;

                 // Reset velocity to circular
                 const vMag = Math.sqrt((1.0 * mass) / r); // Approx Newtonian velocity
                 v[i3] = -Math.sin(angle) * vMag;
                 v[i3+1] = 0;
                 v[i3+2] = Math.cos(angle) * vMag;
            } else if (rSq > bounds*bounds) {
                 // Too far, wrap? Or let fly?
                 // Let fly for now.
            }

            // Update Instance Matrix
            dummy.position.set(p[i3], p[i3+1], p[i3+2]);
            // Scale based on proximity?
            const scale = Math.max(0.1, 1.0 - (10.0 / (Math.sqrt(rSq)+0.1))); // Shrink near center
            dummy.scale.setScalar(scale * 0.5);
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
        }

        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={meshRef} args={[null, null, count]}>
            <sphereGeometry args={[0.3, 8, 8]} />
            <meshStandardMaterial color="#ffa500" emissive="#ff4400" emissiveIntensity={0.5} toneMapped={false} />
        </instancedMesh>
    );
}
