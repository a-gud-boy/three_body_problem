import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import './ElectronicsPage.css';
import ACPhasorTab from './components/ACPhasorTab';
import WaveformTab from './components/WaveformTab';
import NetworkTheoremsTab from './components/NetworkTheoremsTab';

const ElectronicsPage = () => {
    const [activeTab, setActiveTab] = useState('ac-phasor');

    return (
        <div className="electronics-container">
            <header className="simulation-header">
                <Link to="/" className="back-link" aria-label="Back to home">
                    <ArrowLeft size={20} aria-hidden="true" />
                    <span>Back to Hub</span>
                </Link>
                <h1>Electronics &amp; Circuits</h1>
            </header>

            <div className="electronics-content">
                <div className="tabs">
                    <button
                        className={activeTab === 'ac-phasor' ? 'active' : ''}
                        onClick={() => setActiveTab('ac-phasor')}
                    >
                        AC Phasor Visualizer
                    </button>
                    <button
                        className={activeTab === 'waveform' ? 'active' : ''}
                        onClick={() => setActiveTab('waveform')}
                    >
                        Waveform Shaping
                    </button>
                    <button
                        className={activeTab === 'theorems' ? 'active' : ''}
                        onClick={() => setActiveTab('theorems')}
                    >
                        Network Theorems
                    </button>
                </div>

                <div className="tab-content">
                    <div style={{ display: activeTab === 'ac-phasor' ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}>
                        <ACPhasorTab />
                    </div>
                    <div style={{ display: activeTab === 'waveform' ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}>
                        <WaveformTab />
                    </div>
                    <div style={{ display: activeTab === 'theorems' ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}>
                        <NetworkTheoremsTab />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ElectronicsPage;
