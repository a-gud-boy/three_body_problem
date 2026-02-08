// src/pages/GeneralRelativity/utils/initializers.js

import * as THREE from 'three';
import { calculateOrbitalVelocity, calculateSchwarzschildRadius, G } from './physics';

/**
 * Creates an array of particles for an accretion disk around a central mass.
 * Returns an object with `positions` (Float32Array) and `velocities` (Float32Array).
 */
export const createAccretionDisk = (count, centerMass, minR, maxR, type = 'newtonian', speedOfLight = 100) => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3); // RGB

    const rs = calculateSchwarzschildRadius(centerMass, speedOfLight);
    // Ensure minR is outside event horizon
    const safeMinR = Math.max(minR, rs * 1.5); // 1.5Rs is photon sphere? No, photon sphere is 1.5Rs, ISCO is 3Rs.
    // For visual stability, let's start disk at ISCO (3Rs) if relativistic.
    const startR = (type === 'relativistic') ? Math.max(safeMinR, rs * 3.0) : safeMinR;

    for (let i = 0; i < count; i++) {
        // Random angle
        const theta = Math.random() * Math.PI * 2;

        // Random radius (inverse square distribution looks better? or linear?)
        // Let's do linear for now.
        const r = startR + Math.random() * (maxR - startR);

        // Position
        // Add some thickness to disk (z-axis)
        const thickness = r * 0.02;
        const y = (Math.random() - 0.5) * thickness;

        const x = Math.cos(theta) * r;
        const z = Math.sin(theta) * r; // Using Y-up convention in Three.js usually means X-Z plane is ground.

        // Velocity for circular orbit
        const vMag = calculateOrbitalVelocity(centerMass, r, type, speedOfLight);

        // Tangent vector (-z, x)
        const vx = -Math.sin(theta) * vMag;
        const vz = Math.cos(theta) * vMag;
        const vy = 0; // Keeping it planar

        const i3 = i * 3;
        positions[i3] = x;
        positions[i3 + 1] = y;
        positions[i3 + 2] = z;

        velocities[i3] = vx;
        velocities[i3 + 1] = vy;
        velocities[i3 + 2] = vz;

        // Color based on radius (hot/blue inside, cold/red outside)
        const t = (r - startR) / (maxR - startR);
        // Inner: Cyan/White, Outer: Red/Orange
        colors[i3] = 0.2 + 0.8 * (1.0 - t); // R
        colors[i3 + 1] = 0.5 + 0.5 * (1.0 - t*0.5); // G
        colors[i3 + 2] = 1.0; // B
    }

    return { positions, velocities, colors };
};

/**
 * Creates grid vertices for a flat plane in X-Z.
 * Returns standard Geometry or BufferAttribute data.
 */
export const createGridData = (size, segments) => {
    // We can just use THREE.PlaneGeometry, but maybe we want custom logic.
    // Let's stick to standard geometry usage in the component.
    return { size, segments };
};
