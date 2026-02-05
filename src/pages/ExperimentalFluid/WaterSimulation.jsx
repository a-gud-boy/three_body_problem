import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree, createPortal } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import * as THREE from 'three';
import { simulationVertexShader, simulationFragmentShader } from './shaders/simulationShader';
import { waterVertexShader, waterFragmentShader } from './shaders/waterShader';

export default function WaterSimulation({
    width = 256,
    height = 256,
    damping = 0.99,
    speed = 0.5,
    mouseStrength = 0.5,
    color = new THREE.Color('#00aaff')
}) {
    const { gl, camera } = useThree();

    // FBO Settings
    const options = {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RedFormat, // We only need height in Red channel
        type: THREE.FloatType, // Important for negative values
        wrapS: THREE.ClampToEdgeWrapping,
        wrapT: THREE.ClampToEdgeWrapping,
    };

    // Create two buffers for ping-pong
    const targetA = useFBO(width, height, options);
    const targetB = useFBO(width, height, options);

    // Simulation Scene Setup
    const simScene = useMemo(() => new THREE.Scene(), []);
    const simCamera = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), []);

    // Simulation Material
    const simMaterial = useMemo(() => {
        return new THREE.ShaderMaterial({
            uniforms: {
                uCurrent: { value: null },
                uPrevious: { value: null },
                uResolution: { value: new THREE.Vector2(width, height) },
                uMouse: { value: new THREE.Vector2(0, 0) },
                uMousePressed: { value: false },
                uMouseStrength: { value: mouseStrength },
                uDamping: { value: damping },
                uSpeed: { value: speed }
            },
            vertexShader: simulationVertexShader,
            fragmentShader: simulationFragmentShader,
        });
    }, [width, height, damping, speed, mouseStrength]);

    // Simulation Mesh (Full screen quad for the FBO)
    const simMesh = useMemo(() => {
        const geom = new THREE.PlaneGeometry(2, 2);
        return new THREE.Mesh(geom, simMaterial);
    }, [simMaterial]);

    // Add mesh to sim scene
    useEffect(() => {
        simScene.add(simMesh);
        return () => simScene.remove(simMesh);
    }, [simScene, simMesh]);

    // Render Logic
    const mousePos = useRef(new THREE.Vector2(0, 0));
    const isPressed = useRef(false);

    const targetC = useFBO(width, height, options);
    const targets = useMemo(() => [targetA, targetB, targetC], [targetA, targetB, targetC]);
    const indices = useRef({ prev: 0, cur: 1, next: 2 });

    useFrame(({ gl }) => {
        // Update uniforms
        simMaterial.uniforms.uMouse.value.copy(mousePos.current);
        simMaterial.uniforms.uMousePressed.value = isPressed.current;
        simMaterial.uniforms.uDamping.value = damping;
        simMaterial.uniforms.uSpeed.value = speed;
        simMaterial.uniforms.uMouseStrength.value = mouseStrength;

        // Cycle Buffers
        const { prev, cur, next } = indices.current;

        simMaterial.uniforms.uPrevious.value = targets[prev].texture;
        simMaterial.uniforms.uCurrent.value = targets[cur].texture;

        // Render to Next
        gl.setRenderTarget(targets[next]);
        gl.render(simScene, simCamera);
        gl.setRenderTarget(null);

        // Update Indices
        indices.current.prev = cur;
        indices.current.cur = next;
        indices.current.next = prev;
    });

    // Interaction Handlers
    const handlePointerMove = (e) => {
        mousePos.current.set(e.uv.x, e.uv.y);
    };

    const handlePointerDown = (e) => {
        mousePos.current.set(e.uv.x, e.uv.y);
        isPressed.current = true;
    };

    const handlePointerUp = () => {
        isPressed.current = false;
    };

    // Visible Mesh Material
    const waterMaterial = useMemo(() => {
        return new THREE.ShaderMaterial({
            uniforms: {
                uSimulation: { value: null },
                uResolution: { value: new THREE.Vector2(width, height) },
                uColor: { value: new THREE.Color(color) },
                uDisplacementScale: { value: 0.5 }, // Adjust displacement height
            },
            vertexShader: waterVertexShader,
            fragmentShader: waterFragmentShader,
            transparent: true,
            side: THREE.DoubleSide
        });
    }, [width, height, color]);

    useFrame(() => {
        // Feed the "Current" texture to the material
        waterMaterial.uniforms.uSimulation.value = targets[indices.current.cur].texture;
        waterMaterial.uniforms.uColor.value.set(color);
    });

    return (
        <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            onPointerMove={handlePointerMove}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
        >
            <planeGeometry args={[10, 10, 256, 256]} />
            {/* High res geometry for vertex displacement */}
            <primitive object={waterMaterial} attach="material" />
        </mesh>
    );
}
