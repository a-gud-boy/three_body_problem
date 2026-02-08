import React, { useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Fn, uniform, float, vec3, vec4, mat4, positionLocal, cameraPosition, modelWorldMatrix, cross, dot, normalize, mix, clamp, sqrt, step, If } from 'three/tsl';
import { MeshBasicNodeMaterial } from 'three/webgpu';
import * as THREE from 'three';

// TSL Noise Functions (Simplified for WebGPU)
// Porting Hash13 or similar is verbose in TSL.
// Let's use a simpler pattern: just a gradient or static color for now.
// Or implement a simple noise node if possible.
// For MVP, let's just make it a cool gradient background that distorts.

const backgroundGradient = Fn(([dir]) => {
    // Simple vertical gradient based on Y component of direction
    const t = dir.y.mul(0.5).add(0.5); // 0 to 1
    const bottomColor = vec3(0.05, 0.0, 0.1); // Dark Purple
    const topColor = vec3(0.0, 0.05, 0.2); // Dark Blue

    // Add some "stars" via high frequency sine waves?
    // sin(dir.x * 100) * sin(dir.y * 100) > 0.99
    const stars = step(0.998, dir.x.mul(100.0).sin().mul(dir.y.mul(100.0).sin()).mul(dir.z.mul(100.0).sin()));

    return mix(bottomColor, topColor, t).add(stars);
});

const lensingShader = Fn(([posWorld, camPos, massPos, mass, G, c, enabled]) => {
    const viewDir = normalize(posWorld.sub(camPos));

    // If disabled, return background
    // We can't return early easily in TSL functions used in material nodes without `If`.
    // But we can mix result.

    const bgCol = backgroundGradient(viewDir);

    // Lensing Logic
    const camToMass = massPos.sub(camPos);
    const distToMass = camToMass.length();
    const dirToMass = normalize(camToMass);

    const cosTheta = clamp(dot(viewDir, dirToMass), -1.0, 1.0);
    const sinTheta = sqrt(float(1.0).sub(cosTheta.mul(cosTheta)));

    const b = distToMass.mul(sinTheta);

    const rs = float(2.0).mul(G).mul(mass).div(c.mul(c));
    const shadowRad = rs.mul(2.6);

    // Shadow Condition: b < shadowRad && cosTheta > 0
    const inShadow = b.lessThan(shadowRad).and(cosTheta.greaterThan(0.0));

    // Deflection: alpha = 4GM / (c^2 * b)
    const alphaNumerator = float(4.0).mul(G).mul(mass);
    const alphaDenominator = c.mul(c).mul(b.max(0.01));
    const alpha = alphaNumerator.div(alphaDenominator);

    // Deflect away from mass
    // Vector perp to viewDir in plane of (viewDir, dirToMass) pointing towards mass
    const vPerp = normalize(dirToMass.sub(viewDir.mul(cosTheta)));

    // Sample direction = viewDir - vPerp * alpha (approx)
    const sampleDir = normalize(viewDir.sub(vPerp.mul(alpha)));

    const lensedCol = backgroundGradient(sampleDir);

    // Final Mix
    // If in shadow -> Black
    // If enabled -> lensedCol, else bgCol

    const finalCol = mix(bgCol, lensedCol, float(enabled)); // enabled is boolean? cast to float

    return mix(finalCol, vec3(0.0), float(inShadow).mul(float(enabled)));
});

export default function TSLLensing({ params }) {
    // Uniforms
    const uMassPos = useMemo(() => uniform(new THREE.Vector3(0, 0, 0)), []);
    const uMass = useMemo(() => uniform(params.blackHoleMass), []);
    const uG = useMemo(() => uniform(1.0), []);
    const uC = useMemo(() => uniform(params.speedOfLight), []);
    const uEnabled = useMemo(() => uniform(params.enableLensing ? 1.0 : 0.0), []); // Float 1.0/0.0

    useEffect(() => {
        uMass.value = params.blackHoleMass;
        uC.value = params.speedOfLight;
        uEnabled.value = params.enableLensing ? 1.0 : 0.0;
    }, [params]);

    const material = useMemo(() => {
        const mat = new MeshBasicNodeMaterial();
        mat.side = THREE.BackSide;
        mat.depthWrite = false;

        // World Position of Vertex
        // In TSL, `positionWorld` is available? Yes.
        const posWorld = positionLocal.applyMatrix4(modelWorldMatrix); // Manual or built-in?
        // `positionWorld` is built-in TSL node.
        // Let's check imports. I didn't import `positionWorld`.
        // But I imported `modelWorldMatrix` and `positionLocal`.

        const worldPos = modelWorldMatrix.mul(vec4(positionLocal, 1.0)).xyz;

        mat.colorNode = lensingShader(worldPos, cameraPosition, uMassPos, uMass, uG, uC, uEnabled);

        return mat;
    }, [uMassPos, uMass, uG, uC, uEnabled]);

    useFrame(({ camera }) => {
        // Keep centered
    });

    return (
        <mesh scale={[900, 900, 900]}>
            <sphereGeometry args={[1, 64, 64]} />
            <primitive object={material} attach="material" />
        </mesh>
    );
}
