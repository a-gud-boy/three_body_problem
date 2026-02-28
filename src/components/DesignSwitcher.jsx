import { useState, useRef, useEffect } from 'react';
import { Layout, ChevronDown, Check } from 'lucide-react';

const DESIGNS = [
    { id: 'classic', name: 'Classic', description: 'Hero + featured card + grid' },
    { id: 'bento', name: 'Bento Grid', description: 'Apple-style asymmetric layout' },
    { id: 'immersive', name: 'Immersive', description: 'Full-screen hero + carousel' },
    { id: 'dashboard', name: 'Dashboard', description: 'Analytics-style with search' },
    { id: 'magazine', name: 'Magazine', description: 'Editorial publication layout' },
    { id: 'terminal', name: 'Terminal', description: 'Hacker CLI aesthetic' },
];

export default function DesignSwitcher({ currentDesign, onDesignChange }) {
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

    const current = DESIGNS.find((d) => d.id === currentDesign) || DESIGNS[0];

    return (
        <div className="design-switcher" ref={panelRef}>
            <button
                className="design-toggle"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Switch homepage design"
            >
                <Layout size={16} />
                <span>{current.name}</span>
                <ChevronDown size={14} className={`design-chevron ${isOpen ? 'rotate' : ''}`} />
            </button>

            <div className={`design-panel ${isOpen ? 'open' : ''}`}>
                {DESIGNS.map((design) => (
                    <button
                        key={design.id}
                        className={`design-option ${currentDesign === design.id ? 'active' : ''}`}
                        onClick={() => {
                            onDesignChange(design.id);
                            setIsOpen(false);
                        }}
                    >
                        <div className="design-option-text">
                            <span className="design-option-name">{design.name}</span>
                            <span className="design-option-desc">{design.description}</span>
                        </div>
                        {currentDesign === design.id && <Check size={14} className="design-check" />}
                    </button>
                ))}
            </div>
        </div>
    );
}
