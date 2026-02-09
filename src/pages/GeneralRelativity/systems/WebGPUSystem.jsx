import React from 'react';
import TSLGrid from '../components/TSLGrid';
import TSLParticles from '../components/TSLParticles';
import TSLLensing from '../components/TSLLensing';

export default function WebGPUSystem({ params, isPlaying }) {
    // Only show standard objects if Lensing is OFF
    const showStandardObjects = !params.enableLensing;

    return (
        <group>
            {/* Lensing first (background) */}
            <TSLLensing params={params} />

            {showStandardObjects && params.showGrid && <TSLGrid params={params} />}
            {showStandardObjects && params.showDisk && <TSLParticles params={params} isPlaying={isPlaying} />}
        </group>
    );
}
