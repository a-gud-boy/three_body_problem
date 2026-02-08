import React from 'react';
import TSLGrid from '../components/TSLGrid';
import TSLParticles from '../components/TSLParticles';
// import TSLLensing from '../components/TSLLensing';
// Temporarily disabled TSLLensing as it's complex to debug in TSL without seeing errors first.
// Let's stick to Grid and Particles for MVP of WebGPU.

export default function WebGPUSystem({ params, isPlaying }) {
    return (
        <group>
            {params.showGrid && <TSLGrid params={params} />}
            {params.showDisk && <TSLParticles params={params} isPlaying={isPlaying} />}
            {/* <TSLLensing params={params} /> */}
        </group>
    );
}
