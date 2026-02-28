import { useRef, useEffect, useState } from 'react';
import { ELEMENT_CATEGORIES } from '../../../data/elementsData';
import { SHELL_NAMES, drawBohrModel, drawElectronCloud } from '../utils/drawUtils';
import './AtomVisualizer.css';

export default function AtomVisualizer({
    element,
    visualizationMode,
    shells,
    orbitals,
}) {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const timeRef = useRef(0);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    // Handle resize
    useEffect(() => {
        const container = canvasRef.current?.parentElement;
        if (!container) return;

        const observer = new ResizeObserver((entries) => {
            const { width, height } = entries[0].contentRect;
            setDimensions({ width, height });
        });

        observer.observe(container);
        return () => observer.disconnect();
    }, []);

    // Main animation effect
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !element || dimensions.width === 0) return;

        const ctx = canvas.getContext('2d');
        const width = dimensions.width;
        const height = dimensions.height;
        canvas.width = width;
        canvas.height = height;

        const centerX = width / 2;
        const centerY = height / 2;
        const maxRadius = Math.min(width, height) / 2 - 40;

        const categoryColor = ELEMENT_CATEGORIES[element.category]?.color || '#4dabf7';

        const animate = () => {
            ctx.clearRect(0, 0, width, height);

            if (visualizationMode === 'bohr') {
                drawBohrModel(ctx, centerX, centerY, maxRadius, element, shells, categoryColor, timeRef.current);
            } else {
                drawElectronCloud(ctx, centerX, centerY, maxRadius, element, orbitals, categoryColor, timeRef.current);
            }

            timeRef.current += 0.016;
            animationRef.current = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [element, visualizationMode, shells, orbitals, dimensions]);

    return (
        <div className="atom-visualizer">
            <canvas ref={canvasRef} className="atom-canvas" />

            {/* Element Label */}
            <div className="atom-label">
                <span className="atom-symbol">{element.symbol}</span>
                <span className="atom-name">{element.name}</span>
                <span className="atom-number">#{element.atomicNumber}</span>
            </div>

            {/* Visualization Mode Label */}
            <div className="vis-mode-label">
                {visualizationMode === 'bohr' ? 'Bohr Model' : 'Electron Cloud'}
            </div>

            {/* Shell/Orbital Info */}
            <div className="shell-info">
                {visualizationMode === 'bohr' ? (
                    shells.map((count, i) => count > 0 && (
                        <div key={i} className="shell-item">
                            <span className="shell-name">{SHELL_NAMES[i]}</span>
                            <span className="shell-count">{count}</span>
                        </div>
                    ))
                ) : (
                    <div className="orbital-list">
                        {orbitals.slice(-5).map((orbital, i) => (
                            <span key={i} className="orbital-item">
                                {orbital.name}<sup>{orbital.electrons}</sup>
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
