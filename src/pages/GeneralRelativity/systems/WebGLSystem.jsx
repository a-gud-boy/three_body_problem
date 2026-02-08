import React from 'react';
import GravityGrid from '../components/GravityGrid';
import CPUGravityParticles from '../components/CPUGravityParticles';
import LensingEffect from '../components/LensingEffect';

export default function WebGLSystem({ params, isPlaying }) {
    return (
        <group>
            {params.showGrid && <GravityGrid params={params} />}
            {params.showDisk && <CPUGravityParticles params={params} isPlaying={isPlaying} />}
            <LensingEffect params={params} />
        </group>
    );
}
