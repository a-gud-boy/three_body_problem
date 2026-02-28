import { useState, useRef, useEffect } from 'react';
import { Palette, Check, X } from 'lucide-react';

const THEMES = [
    {
        id: 'cosmic-dark',
        name: 'Cosmic Dark',
        description: 'Deep space with reactive spotlight',
        preview: 'linear-gradient(135deg, #0a0a10, #1a0a2e, #050508)',
        accent: '#a855f7',
    },
    {
        id: 'neon-grid',
        name: 'Neon Grid',
        description: 'Cyberpunk-inspired neon glow',
        preview: 'linear-gradient(135deg, #0a0014, #1a002e, #000a1a)',
        accent: '#ff2d95',
    },
    {
        id: 'glass-light',
        name: 'Glassmorphism',
        description: 'Frosted glass on soft gradients',
        preview: 'linear-gradient(135deg, #e8e0f0, #d4e8f0, #f0e4e8)',
        accent: '#7c3aed',
    },
    {
        id: 'aurora',
        name: 'Aurora Borealis',
        description: 'Northern lights in motion',
        preview: 'linear-gradient(135deg, #020810, #041420, #060d18)',
        accent: '#34d399',
    },
    {
        id: 'mono',
        name: 'Minimal Mono',
        description: 'Clean Swiss-inspired design',
        preview: 'linear-gradient(135deg, #fafafa, #f0f0f0, #ffffff)',
        accent: '#000000',
    },
];

export default function StyleSwitcher({ currentTheme, onThemeChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const panelRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const currentThemeData = THEMES.find((t) => t.id === currentTheme) || THEMES[0];

    return (
        <div className="style-switcher" ref={panelRef}>
            {/* Floating Toggle Button */}
            <button
                className="switcher-toggle"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Switch homepage style"
                title="Switch homepage style"
            >
                {isOpen ? <X size={18} /> : <Palette size={18} />}
                <span className="switcher-toggle-label">{currentThemeData.name}</span>
            </button>

            {/* Panel */}
            <div className={`switcher-panel ${isOpen ? 'open' : ''}`}>
                <div className="switcher-panel-header">
                    <h4>Choose Style</h4>
                    <p>Pick a visual theme for the homepage</p>
                </div>
                <div className="switcher-options">
                    {THEMES.map((theme) => (
                        <button
                            key={theme.id}
                            className={`switcher-option ${currentTheme === theme.id ? 'active' : ''}`}
                            onClick={() => {
                                onThemeChange(theme.id);
                                setIsOpen(false);
                            }}
                        >
                            <div
                                className="option-preview"
                                style={{ background: theme.preview, borderColor: theme.accent }}
                            >
                                {currentTheme === theme.id && (
                                    <Check size={14} className="option-check" />
                                )}
                            </div>
                            <div className="option-info">
                                <span className="option-name">{theme.name}</span>
                                <span className="option-desc">{theme.description}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
