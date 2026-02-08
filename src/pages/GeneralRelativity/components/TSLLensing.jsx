import React, { useMemo, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Fn, uniform, float, vec3, vec4, positionWorld, cameraPosition, normalize, dot, mix, length, floor, fract, sqrt, max, min, step, select, sin, cos } from 'three/tsl';
import { MeshBasicNodeMaterial } from 'three/webgpu';
import * as THREE from 'three';

// --- Procedural Noise Functions (TSL Port) ---

// float hash(vec3 p)
const hash = Fn(([p]) => {
    const p1 = p.mul(0.3183099).add(0.1).fract();
    const p2 = p1.mul(17.0);
    return p2.x.mul(p2.y).mul(p2.z).mul(p2.x.add(p2.y).add(p2.z)).fract();
});

// float noise(in vec3 x)
const noise = Fn(([x]) => {
    const i = x.floor();
    const f = x.fract();
    // f = f * f * (3.0 - 2.0 * f)
    const u = f.mul(f).mul(float(3.0).sub(f.mul(2.0)));

    // Mix 8 corners
    const res = mix(
        mix(
            mix(hash(i.add(vec3(0, 0, 0))), hash(i.add(vec3(1, 0, 0))), u.x),
            mix(hash(i.add(vec3(0, 1, 0))), hash(i.add(vec3(1, 1, 0))), u.x),
            u.y
        ),
        mix(
            mix(hash(i.add(vec3(0, 0, 1))), hash(i.add(vec3(1, 0, 1))), u.x),
            mix(hash(i.add(vec3(0, 1, 1))), hash(i.add(vec3(1, 1, 1))), u.x),
            u.y
        ),
        u.z
    );
    return res;
});

// vec3 getBackground(vec3 dir, float time)
const getBackground = Fn(([dir, time]) => {
    // Stars
    const n = noise(dir.mul(200.0));
    const starVal = step(0.98, n); // if n > 0.98 then 1.0 else 0.0
    const stars = vec3(starVal);

    // Nebula
    // noise(dir * 3.0 + vec3(time * 0.05))
    const nebulaScale = dir.mul(3.0).add(vec3(time.mul(0.05)));
    const n2 = noise(nebulaScale);
    const nebula = vec3(0.1, 0.0, 0.2).mul(n2).mul(0.5);

    return stars.add(nebula);
});


export default function TSLLensing({ params }) {

    const meshRef = useRef();

    // Uniforms
    const uMassPos = useMemo(() => uniform(new THREE.Vector3(0, 0, 0)), []);
    const uMass = useMemo(() => uniform(params.blackHoleMass), []);
    const uG = useMemo(() => uniform(1.0), []);
    const uC = useMemo(() => uniform(params.speedOfLight), []);
    const uEnabled = useMemo(() => uniform(params.enableLensing ? 1 : 0), []);
    const uTime = useMemo(() => uniform(0.0), []);

    useEffect(() => {
        uMass.value = params.blackHoleMass;
        uC.value = Math.max(params.speedOfLight, 10.0);
        uEnabled.value = params.enableLensing ? 1 : 0;
    }, [params]);

    // Material Logic
    const material = useMemo(() => {
        const mat = new MeshBasicNodeMaterial();
        mat.side = THREE.BackSide;
        mat.depthWrite = false;

        // Fragment Logic
        const colorNode = Fn(() => {
            const viewDir = normalize(positionWorld.sub(cameraPosition));

            const camToMass = uMassPos.sub(cameraPosition);
            const distToMass = length(camToMass);
            const dirToMass = normalize(camToMass);

            const cosTheta = dot(viewDir, dirToMass).clamp(-1.0, 1.0);
            const sinTheta = sqrt(float(1.0).sub(cosTheta.mul(cosTheta)));

            const b = distToMass.mul(sinTheta);

            const rs = uG.mul(uMass).mul(2.0).div(uC.mul(uC));
            const shadowRad = rs.mul(2.6);

            // Deflection
            // alpha = 4GM / (c^2 * b)
            const safeB = max(b, 0.01);
            const alpha = uG.mul(uMass).mul(4.0).div(uC.mul(uC).mul(safeB));

            // Deflect viewDir
            // vPerp = normalize(dirToMass - viewDir * cosTheta)
            const vPerpRaw = dirToMass.sub(viewDir.mul(cosTheta));
            const vPerp = normalize(vPerpRaw);

            // Sample direction: viewDir - vPerp * alpha
            const deflectedDir = normalize(viewDir.sub(vPerp.mul(alpha)));

            // Check Shadow
            // Condition: b < shadowRad && cosTheta > 0.0
            const isShadow = b.lessThan(shadowRad).and(cosTheta.greaterThan(0.0));

            // Colors
            const deflectedColor = select(isShadow, vec3(0.0), getBackground(deflectedDir, uTime));
            const normalColor = getBackground(viewDir, uTime);

            // Final Selection
            const finalColor = select(uEnabled.greaterThan(0.5), deflectedColor, normalColor);

            return vec4(finalColor, 1.0);
        });

        mat.colorNode = colorNode();

        return mat;
    }, [uMassPos, uMass, uG, uC, uEnabled, uTime]);

    useFrame((state) => {
        uTime.value = state.clock.elapsedTime;
        if (meshRef.current) {
            meshRef.current.position.copy(state.camera.position);
        }
    });

    return (
        <mesh ref={meshRef} scale={[900, 900, 900]}>
            <sphereGeometry args={[1, 64, 64]} />
            <primitive object={material} attach="material" />
        </mesh>
    );
}
