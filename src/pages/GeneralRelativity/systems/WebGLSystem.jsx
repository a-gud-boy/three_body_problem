import React from 'react';
import GravityGrid from '../components/GravityGrid';
import CPUGravityParticles from '../components/CPUGravityParticles';
import LensingEffect from '../components/LensingEffect';

export default function WebGLSystem({ params, isPlaying }) {
    // Only show standard objects if Lensing is OFF, because Lensing renderer handles the visuals
    const showStandardObjects = !params.enableLensing;

    return (
        <group>
            {showStandardObjects && params.showGrid && <GravityGrid params={params} />}
            {showStandardObjects && params.showDisk && <CPUGravityParticles params={params} isPlaying={isPlaying} />}
            <LensingEffect params={params} />
        </group>
    );
}
