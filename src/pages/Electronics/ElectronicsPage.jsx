import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import './ElectronicsPage.css';
import ACPhasorTab from './components/ACPhasorTab';
import WaveformTab from './components/WaveformTab';
import NetworkTheoremsTab from './components/NetworkTheoremsTab';

const ElectronicsPage = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('ac-phasor');

    return (
        <div className="electronics-container">
            {/* Header section similar to other pages */}
            <div className="simulation-header">
                <button className="back-button" onClick={() => navigate('/')}>
                    <ArrowLeft size={20} />
                    Back to Hub
                </button>
                <div className="title-section">
                    <h1>Electronics & Circuits</h1>
                    <p>Interactive Circuit Simulator</p>
                </div>
            </div>

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
                    {activeTab === 'ac-phasor' && <ACPhasorTab />}
                    {activeTab === 'waveform' && <WaveformTab />}
                    {activeTab === 'theorems' && <NetworkTheoremsTab />}
                </div>
            </div>
        </div>
    );
};

export default ElectronicsPage;
