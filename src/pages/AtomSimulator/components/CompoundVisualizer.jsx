import { useRef, useEffect, useState, useMemo } from 'react';
import { drawCompound } from '../utils/compoundDrawUtils';
import './CompoundVisualizer.css';

export default function CompoundVisualizer({ compound, atoms }) {
    const canvasRef = useRef(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const isDragging = useRef(false);
    const lastMouse = useRef({ x: 0, y: 0 });

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

    // Mouse handlers for panning
    const handleMouseDown = (e) => {
        isDragging.current = true;
        lastMouse.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e) => {
        if (!isDragging.current) return;
        const dx = e.clientX - lastMouse.current.x;
        const dy = e.clientY - lastMouse.current.y;
        setOffset(prev => ({
            x: prev.x + dx,
            y: prev.y + dy,
        }));
        lastMouse.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
        isDragging.current = false;
    };

    const handleWheel = (e) => {
        e.preventDefault();
        const delta = -e.deltaY * 0.001;
        setScale(prev => Math.min(Math.max(0.2, prev + delta), 3));
    };

    const renderData = useMemo(() => compound ? compound : (atoms && atoms.length > 0 ? {
        atoms: atoms.map((a, i) => {
            const angle = (i / atoms.length) * Math.PI * 2;
            const radius = atoms.length > 1 ? 1.0 + (atoms.length * 0.1) : 0;
            return {
                element: a.element.symbol,
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius,
                z: 0
            };
        }),
        bonds: []
    } : null), [compound, atoms]);

    // Main Rendering Effect
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !renderData || dimensions.width === 0) return;

        const ctx = canvas.getContext('2d');
        const width = dimensions.width;
        const height = dimensions.height;
        canvas.width = width;
        canvas.height = height;

        const centerX = width / 2 + offset.x;
        const centerY = height / 2 + offset.y;


        // Calculate bounding box and center offset
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        if (renderData.atoms && renderData.atoms.length > 0) {
            renderData.atoms.forEach(atom => {
                minX = Math.min(minX, atom.x);
                maxX = Math.max(maxX, atom.x);
                minY = Math.min(minY, atom.y);
                maxY = Math.max(maxY, atom.y);
            });
        }
        const shiftX = (minX !== Infinity) ? (minX + maxX) / 2 : 0;
        const shiftY = (minY !== Infinity) ? (minY + maxY) / 2 : 0;

        const animate = () => {
            drawCompound(ctx, width, height, centerX, centerY, renderData, shiftX, shiftY, scale);
        };

        animate();

    }, [renderData, dimensions, offset, scale]);

    if (!renderData) {
        return <div className="compound-visualizer empty">No molecule to display</div>;
    }

    return (
        <div className="compound-visualizer" onWheel={handleWheel}>
            <canvas
                ref={canvasRef}
                className="molecule-canvas"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            />

            {compound && (
                <div className="molecule-label">
                    <span className="molecule-name">{compound.name}</span>
                    <span className="molecule-formula">{compound.formula}</span>
                </div>
            )}

            <div className="drag-hint">Drag to Pan • Scroll to Zoom</div>
        </div>
    );
}
