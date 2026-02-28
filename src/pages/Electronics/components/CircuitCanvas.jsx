import React, { useState, useRef, useEffect } from 'react';
import './CircuitCanvas.css';

const GRID_SIZE = 40;

const COMPONENT_SVG = {
    'R': (props) => (
        <svg width="60" height="20" viewBox="0 0 60 20" {...props}>
            <path d="M 0,10 L 10,10 L 15,0 L 25,20 L 35,0 L 45,20 L 50,10 L 60,10" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
    ),
    'C': (props) => (
        <svg width="60" height="40" viewBox="0 0 60 40" {...props}>
            <path d="M 0,20 L 25,20" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M 35,20 L 60,20" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M 25,5 L 25,35" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M 35,5 L 35,35" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
    ),
    'L': (props) => (
        <svg width="60" height="20" viewBox="0 0 60 20" {...props}>
             <path d="M 0,10 L 10,10" fill="none" stroke="currentColor" strokeWidth="2" />
             <path d="M 10,10 Q 15,-5 20,10 T 30,10 T 40,10 T 50,10" fill="none" stroke="currentColor" strokeWidth="2" />
             <path d="M 50,10 L 60,10" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
    ),
    'Vac': (props) => (
        <svg width="40" height="40" viewBox="0 0 40 40" {...props}>
            <circle cx="20" cy="20" r="15" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M 10,20 Q 15,10 20,20 T 30,20" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M 20,0 L 20,5" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M 20,35 L 20,40" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
    ),
    'G': (props) => (
        <svg width="40" height="40" viewBox="0 0 40 40" {...props}>
            <path d="M 20,0 L 20,20" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M 5,20 L 35,20" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M 10,28 L 30,28" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M 15,36 L 25,36" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
    ),
    'D': (props) => (
        <svg width="60" height="20" viewBox="0 0 60 20" {...props}>
            <path d="M 0,10 L 20,10" fill="none" stroke="currentColor" strokeWidth="2" />
            <polygon points="20,0 20,20 40,10" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M 40,0 L 40,20" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M 40,10 L 60,10" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
    )
};

const CircuitCanvas = ({ components, setComponents, onSelectionChange, readOnly = false }) => {
    const containerRef = useRef(null);
    const [draggingId, setDraggingId] = useState(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [selectedId, setSelectedId] = useState(null);

    const snapToGrid = (val) => Math.round(val / GRID_SIZE) * GRID_SIZE;

    const handleMouseDown = (e, id) => {
        if (readOnly) return;
        e.stopPropagation();
        setSelectedId(id);
        if (onSelectionChange) onSelectionChange(id);

        const comp = components.find(c => c.id === id);
        if (comp) {
            setDraggingId(id);
            setDragOffset({
                x: e.clientX - comp.x,
                y: e.clientY - comp.y
            });
        }
    };

    const handleMouseMove = (e) => {
        if (!draggingId || readOnly) return;

        let newX = snapToGrid(e.clientX - dragOffset.x);
        let newY = snapToGrid(e.clientY - dragOffset.y);

        setComponents(prev => prev.map(c =>
            c.id === draggingId ? { ...c, x: newX, y: newY } : c
        ));
    };

    const handleMouseUp = () => {
        setDraggingId(null);
    };

    const handleCanvasClick = () => {
        setSelectedId(null);
        if (onSelectionChange) onSelectionChange(null);
    };

    // Calculate pseudo-terminals for visualization purposes based on rotation
    const getTerminals = (comp) => {
        const cx = comp.x;
        const cy = comp.y;
        let dx = 30; // standard half-width
        let dy = 0;

        if (comp.rotation === 90 || comp.rotation === -90) {
            dx = 0;
            dy = 30;
        }

        // Return absolute positions for node1 and node2 on the canvas
        // This is simplified and assumes a standard layout for all 2-terminal components
        return {
            t1: { x: cx - dx, y: cy - dy },
            t2: { x: cx + dx, y: cy + dy }
        };
    };

    // Very simple auto-wire drawing by grouping by node id
    const renderWires = () => {
        const nodes = {};

        components.forEach(comp => {
            const terms = getTerminals(comp);
            if (!nodes[comp.node1]) nodes[comp.node1] = [];
            nodes[comp.node1].push(terms.t1);

            if (!nodes[comp.node2]) nodes[comp.node2] = [];
            nodes[comp.node2].push(terms.t2);
        });

        const lines = [];
        let keyCounter = 0;

        Object.keys(nodes).forEach(nodeId => {
            if (nodeId === 'GND') return; // Ignore Ground for now or draw custom logic

            const points = nodes[nodeId];
            if (points.length < 2) return;

            // Connect the first point to all other points for this node (star topology for simplicity)
            const root = points[0];
            for (let i = 1; i < points.length; i++) {
                lines.push(
                    <line
                        key={`wire-${keyCounter++}`}
                        x1={root.x} y1={root.y}
                        x2={points[i].x} y2={points[i].y}
                        stroke="#3b82f6"
                        strokeWidth="2"
                    />
                );
            }
        });

        return lines;
    };

    // Auto connect logic when dragging ends
    useEffect(() => {
        // Implement complex proximity-based node merging logic if needed
        // For simplicity right now, nodes define the connections explicitly.
        // True "snap-to-terminal" auto connection would merge node IDs if distance < threshold.
    }, [components]);

    return (
        <div
            className="circuit-canvas-container"
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={handleCanvasClick}
        >
            <div className="grid-background" />

            {/* Draw wires (simplified for now: straight lines between connected terminals) */}
            <svg className="wires-layer">
                {renderWires()}
            </svg>

            {/* Draw components */}
            {components.map(comp => {
                const SvgIcon = COMPONENT_SVG[comp.type] || COMPONENT_SVG['R'];
                const isSelected = comp.id === selectedId;

                return (
                    <div
                        key={comp.id}
                        className={`circuit-component ${isSelected ? 'selected' : ''}`}
                        style={{
                            left: comp.x,
                            top: comp.y,
                            transform: `translate(-50%, -50%) rotate(${comp.rotation || 0}deg)`,
                            cursor: readOnly ? 'default' : (draggingId === comp.id ? 'grabbing' : 'grab')
                        }}
                        onMouseDown={(e) => handleMouseDown(e, comp.id)}
                    >
                        <SvgIcon className="component-svg" />
                        <div className="component-label" style={{ transform: `rotate(${-(comp.rotation || 0)}deg)` }}>
                            {comp.id}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default CircuitCanvas;
