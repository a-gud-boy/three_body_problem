import React, { useMemo, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Fn, uniform, float, vec3, vec4, positionWorld, cameraPosition, normalize, dot, mix, length, floor, fract, max, min, step, sin, abs, smoothstep, cross, If, Loop, Var, Break, atan, acos, clamp, exp } from 'three/tsl';
import { MeshBasicNodeMaterial } from 'three/webgpu';
import * as THREE from 'three';

// --- Procedural Noise Functions (TSL Port) ---

// float hash(float n)
const hash = Fn(([n]) => {
    return fract(sin(n).mul(43758.5453123));
});

// float noise(vec3 x)
const noise = Fn(([x]) => {
    const p = floor(x);
    const f = fract(x);
    // f = f * f * (3.0 - 2.0 * f)
    const u = f.mul(f).mul(float(3.0).sub(f.mul(2.0)));

    // n = p.x + p.y * 57.0 + 113.0 * p.z;
    const n = p.x.add(p.y.mul(57.0)).add(p.z.mul(113.0));

    const res = mix(
        mix(
            mix(hash(n.add(0.0)), hash(n.add(1.0)), u.x),
            mix(hash(n.add(57.0)), hash(n.add(58.0)), u.x),
            u.y
        ),
        mix(
            mix(hash(n.add(113.0)), hash(n.add(114.0)), u.x),
            mix(hash(n.add(170.0)), hash(n.add(171.0)), u.x),
            u.y
        ),
        u.z
    );
    return res;
});

// vec3 getBackground(vec3 dir, float time, float showEinsteinRing)
const getBackground = Fn(([dir, time, showEinsteinRing]) => {
    // Stars
    const n = noise(dir.mul(200.0));
    const starVal = step(0.98, n);
    const stars = vec3(starVal);

    // Nebula
    const nebulaScale = dir.mul(3.0).add(vec3(time.mul(0.05)));
    const n2 = noise(nebulaScale);
    const nebula = vec3(0.1, 0.0, 0.2).mul(n2).mul(0.5);

    const bg = Var(stars.add(nebula));

    // Einstein Ring: bright background source behind the black hole
    If(showEinsteinRing.greaterThan(0.5), () => {
        const sourceDir = normalize(vec3(0.0, 0.0, -1.0));
        const angDist = acos(clamp(dot(dir, sourceDir), -1.0, 1.0));
        const sourceBright = exp(angDist.mul(angDist).negate().div(0.006));
        const sourceColor = vec3(0.9, 0.85, 1.0).mul(sourceBright).mul(8.0);
        bg.addAssign(sourceColor);
    });

    return bg;
});

// vec3 getDiskColor(float t) — proper blackbody spectrum
const getDiskColor = Fn(([t]) => {
    const c1 = vec3(0.6, 0.1, 0.0);   // Deep red (coolest)
    const c2 = vec3(1.0, 0.5, 0.1);   // Orange
    const c3 = vec3(1.0, 0.9, 0.6);   // Yellow-white
    const c4 = vec3(0.7, 0.85, 1.0);  // Blue-white (hottest)

    const color = Var(mix(c1, c2, clamp(t.div(0.33), 0.0, 1.0)));
    If(t.greaterThan(0.33), () => {
        color.assign(mix(c2, c3, clamp(t.sub(0.33).div(0.33), 0.0, 1.0)));
    });
    If(t.greaterThan(0.66), () => {
        color.assign(mix(c3, c4, clamp(t.sub(0.66).div(0.34), 0.0, 1.0)));
    });
    return color;
});

export default function TSLLensing({ params }) {

    const meshRef = useRef();

    // Uniforms
    const uMassPos = useMemo(() => uniform(new THREE.Vector3(0, 0, 0)), []);
    const uMass = useMemo(() => uniform(params.blackHoleMass), [params.blackHoleMass]);
    const uC = useMemo(() => uniform(params.speedOfLight), [params.speedOfLight]);
    const uSpin = useMemo(() => uniform(params.kerrSpinParameter || 0), [params.kerrSpinParameter]);
    const uEnabled = useMemo(() => uniform(params.enableLensing ? 1 : 0), [params.enableLensing]);
    const uTime = useMemo(() => uniform(0.0), []);
    const uShowDisk = useMemo(() => uniform(1), []);
    const uShowGrid = useMemo(() => uniform(1), []);
    const uShowEinsteinRing = useMemo(() => uniform(params.showEinsteinRing ? 1 : 0), [params.showEinsteinRing]);

    // Derived Uniforms
    const uRs = useMemo(() => uniform(0.0), []);
    const uDiskInner = useMemo(() => uniform(2.0), []);
    const uDiskOuter = useMemo(() => uniform(8.0), []);
    const uDiskHeight = useMemo(() => uniform(0.2), []);

    useEffect(() => {
        uMass.value = params.blackHoleMass;
        uC.value = Math.max(params.speedOfLight, 10.0);
        uEnabled.value = params.enableLensing ? 1 : 0;
        uSpin.value = params.kerrSpinParameter || 0;
        uShowDisk.value = params.showDisk !== false ? 1 : 0;
        uShowGrid.value = params.showGrid !== false ? 1 : 0;
        uShowEinsteinRing.value = params.showEinsteinRing ? 1 : 0;

        const rsVal = (2.0 * 1.0 * params.blackHoleMass) / (uC.value * uC.value);
        uRs.value = rsVal;
        uDiskInner.value = rsVal * 3.0;
        uDiskOuter.value = rsVal * 12.0;
        uDiskHeight.value = rsVal * 0.2;
    }, [params.blackHoleMass, params.speedOfLight, params.enableLensing, params.kerrSpinParameter, params.showDisk, params.showGrid, params.showEinsteinRing, uC, uDiskHeight, uDiskInner, uDiskOuter, uEnabled, uMass, uRs, uShowDisk, uShowEinsteinRing, uShowGrid, uSpin]);

    // Material Logic
    const material = useMemo(() => {
        const mat = new MeshBasicNodeMaterial();
        mat.side = THREE.BackSide;
        mat.depthWrite = false;
        mat.depthTest = false;

        const colorNode = Fn(() => {

            const finalColor = Var(vec3(0.0));
            const viewDir = normalize(positionWorld.sub(cameraPosition));

            // Logic Split
            If(uEnabled.lessThan(0.5), () => {
                finalColor.assign(getBackground(viewDir, uTime, uShowEinsteinRing));
            }).Else(() => {
                // Initialize Variables for Ray Marching
                const rayPos = Var(cameraPosition);
                const rayDir = Var(viewDir); // Copy viewDir
                const color = Var(vec3(0.0));
                const opacity = Var(float(0.0));

                // Constants
                const MAX_STEPS = 1000;
                const STEP_SIZE = float(0.02);

                // Jitter for dithering
                const jitter = hash(dot(viewDir, vec3(12.9898, 78.233, 54.53)));
                rayPos.addAssign(rayDir.mul(jitter.mul(0.05)));

                const maxDistance = max(float(100.0), length(cameraPosition.sub(uMassPos)).mul(1.5));

                // Loop
                Loop({ start: 0, end: MAX_STEPS }, () => {

                    const p = rayPos.sub(uMassPos);
                    const r = length(p);

                    // Horizon Collision
                    If(r.lessThan(uRs), () => {
                        color.assign(vec3(0.0));
                        opacity.assign(1.0);
                        Break();
                    });

                    // Escape
                    If(r.greaterThan(maxDistance), () => {
                        Break();
                    });

                    // Gravity Bending
                    const distSq = dot(p, p);
                    const accelBase = normalize(p).negate().mul(uRs.mul(1.5).div(distSq));

                    // Kerr frame-dragging: add tangential deflection
                    const radDir = normalize(p);
                    const tangent = cross(vec3(0.0, 1.0, 0.0), radDir);
                    const dragStrength = uSpin.mul(uRs).mul(uRs).div(r.mul(r).mul(r)).mul(2.0);
                    const accel = accelBase.add(tangent.mul(dragStrength));

                    rayDir.addAssign(accel.mul(STEP_SIZE));
                    rayDir.assign(normalize(rayDir));

                    // Step Size
                    const stepDist = Var(max(0.05, r.sub(uRs).mul(0.15)));

                    If(abs(p.y).lessThan(uDiskHeight.mul(3.0)), () => {
                        stepDist.assign(min(stepDist, 0.025));
                    });

                    // Prevent skipping the horizon when stepping at shallow angles
                    const nextPos = rayPos.add(rayDir.mul(stepDist));
                    const nextR = length(nextPos.sub(uMassPos));
                    If(nextR.lessThan(uRs), () => {
                        color.assign(vec3(0.0));
                        opacity.assign(1.0);
                        Break();
                    });

                    rayPos.addAssign(rayDir.mul(stepDist));

                    const r_plane = length(p.xz);

                    // --- Disk Rendering ---
                    If(uShowDisk.greaterThan(0.5).and(abs(p.y).lessThan(uDiskHeight)).and(r_plane.greaterThan(uDiskInner)).and(r_plane.lessThan(uDiskOuter)), () => {

                        // Density
                        const densityBase = float(1.0).sub(smoothstep(0.0, uDiskHeight, abs(p.y)));

                        const noiseCoord = vec3(
                            r_plane.mul(2.0),
                            atan(p.z, p.x).mul(5.0).add(uTime),
                            uTime.mul(0.2)
                        );
                        const radialDensity = noise(noiseCoord);
                        const density = densityBase.mul(radialDensity);

                        // Color
                        const temp = float(1.0).sub(smoothstep(uDiskInner, uDiskOuter, r_plane));
                        const diskCol = Var(getDiskColor(temp));

                        // Doppler
                        const vel = normalize(cross(vec3(0.0, 1.0, 0.0), p));
                        const doppler = dot(vel, rayDir);
                        diskCol.mulAssign(float(1.0).sub(doppler.mul(0.5)));

                        // Accumulate
                        const alpha = density.mul(1.5).mul(stepDist);
                        // Boost color
                        color.addAssign(diskCol.mul(4.0).mul(alpha).mul(float(1.0).sub(opacity)));
                        opacity.addAssign(alpha);

                        If(opacity.greaterThan(0.95), () => {
                            Break();
                        });
                    });

                    // --- Grid Rendering ---
                    If(uShowGrid.greaterThan(0.5).and(abs(p.y).lessThan(0.05)).and(r_plane.greaterThan(uRs.mul(1.5))).and(r_plane.lessThan(50.0)), () => {
                        const gridX = abs(fract(p.x).sub(0.5));
                        const gridZ = abs(fract(p.z).sub(0.5));
                        const gridWidth = r_plane.div(10.0).mul(0.02);

                        If(gridX.lessThan(gridWidth).or(gridZ.lessThan(gridWidth)), () => {
                            const gridColor = vec3(0.2, 0.2, 0.2);
                            const gridAlpha = stepDist.mul(0.2);
                            color.addAssign(gridColor.mul(gridAlpha).mul(float(1.0).sub(opacity)));
                            opacity.addAssign(gridAlpha);
                        });
                    });

                }); // End Loop

                // Background
                const bg = getBackground(rayDir, uTime, uShowEinsteinRing);
                color.addAssign(bg.mul(float(1.0).sub(opacity)));

                finalColor.assign(color);
            });

            return vec4(finalColor, 1.0);
        });

        mat.colorNode = colorNode();

        return mat;
    }, [uEnabled, uTime, uRs, uDiskInner, uDiskOuter, uDiskHeight, uShowDisk, uShowGrid, uShowEinsteinRing, uMassPos, uSpin]);

    useFrame((state) => {
        uTime.value = state.clock.elapsedTime;
        if (meshRef.current) {
            meshRef.current.position.copy(state.camera.position);
        }
    });

    return (
        <mesh ref={meshRef} scale={[900, 900, 900]} frustumCulled={false} renderOrder={-1}>
            <sphereGeometry args={[1, 64, 64]} />
            <primitive object={material} attach="material" />
        </mesh>
    );
}
