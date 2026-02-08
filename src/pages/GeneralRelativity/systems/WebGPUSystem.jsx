import React from 'react';
import TSLGrid from '../components/TSLGrid';
import TSLParticles from '../components/TSLParticles';
import TSLLensing from '../components/TSLLensing';

export default function WebGPUSystem({ params, isPlaying }) {
    return (
        <group>
            {/* Lensing first (background) */}
            <TSLLensing params={params} />

            {params.showGrid && <TSLGrid params={params} />}
            {params.showDisk && <TSLParticles params={params} isPlaying={isPlaying} />}
        </group>
    );
}
