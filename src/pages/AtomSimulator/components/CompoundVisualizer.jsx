import { useRef, useEffect, useState } from 'react';
import { getElectronShells, getElementBySymbol, getAtomColor } from '../../../data/elementsData';
import './CompoundVisualizer.css';

export default function CompoundVisualizer({ compound, atoms, visualizationMode }) {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
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

    // Prepare data directly from inputs
    const renderData = compound ? compound : (atoms && atoms.length > 0 ? {
        atoms: atoms.map((a, i) => ({
            element: a.element.symbol,
            x: (i % 5) * 1.5 - 3,
            y: Math.floor(i / 5) * 1.5 - 1,
            z: 0 // Ignored in 2D
        })),
        bonds: []
    } : null);

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


        // Base visuals
        const SHELL_SPACING = 35; // Distance between shells
        const ELECTRON_SIZE = 5;
        const GLOBAL_SCALE = 120 * scale; // Zoom factor increased to prevent overlap

        const animate = () => {
            ctx.clearRect(0, 0, width, height);

            // Draw bonds first (shared electron visual helpers)
            // In Bohr style, we don't draw stick bonds, but we can draw shared regions
            // or just rely on the electron placement.
            // Let's draw faint lines to show connectivity if atoms are far apart, 
            // but the request implies "overlapping shells". 
            // Since we rely on fixed coordinates, we'll draw lines connecting nuclei for structure clarity.

            if (renderData.bonds) {
                ctx.beginPath();
                renderData.bonds.forEach(bond => {
                    const from = renderData.atoms[bond.from];
                    const to = renderData.atoms[bond.to];
                    if (!from || !to) return;

                    const x1 = centerX + (from.x - shiftX) * GLOBAL_SCALE;
                    const y1 = centerY + (from.y - shiftY) * GLOBAL_SCALE;
                    const x2 = centerX + (to.x - shiftX) * GLOBAL_SCALE;
                    const y2 = centerY + (to.y - shiftY) * GLOBAL_SCALE;

                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                });
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            // Draw Atoms
            renderData.atoms.forEach((atom, index) => {
                const cx = centerX + (atom.x - shiftX) * GLOBAL_SCALE;
                const cy = centerY + (atom.y - shiftY) * GLOBAL_SCALE;
                const elementInfo = getElementBySymbol(atom.element);
                const shells = getElectronShells(elementInfo.atomicNumber);
                const color = getAtomColor(atom.element);

                // Draw Nucleus
                const nucleusRadius = 12 * scale;
                ctx.beginPath();
                ctx.arc(cx, cy, nucleusRadius, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();
                ctx.fillStyle = getContrastColor(color);
                ctx.font = `bold ${10 * scale}px system-ui`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(atom.element, cx, cy);

                // Calculate bonds connected to this atom to identify shared electrons
                const atomBonds = renderData.bonds ? renderData.bonds.filter(b => b.from === index || b.to === index) : [];

                // Draw Shells & Electrons
                shells.forEach((electronCount, shellIndex) => {
                    if (electronCount === 0) return;

                    const isValence = shellIndex === shells.findLastIndex(c => c > 0);
                    const shellRadius = SHELL_SPACING * (shellIndex + 1) * scale;

                    // Draw Shell Ring
                    ctx.beginPath();
                    ctx.arc(cx, cy, shellRadius, 0, Math.PI * 2);
                    ctx.strokeStyle = `rgba(255, 255, 255, ${isValence ? 0.3 : 0.1})`;
                    ctx.lineWidth = 1.5;
                    ctx.stroke();

                    // Distribute Electrons
                    if (!isValence) {
                        // Inner electrons: Distribute evenly
                        for (let i = 0; i < electronCount; i++) {
                            const angle = (i * Math.PI * 2) / electronCount - Math.PI / 2;
                            const ex = cx + Math.cos(angle) * shellRadius;
                            const ey = cy + Math.sin(angle) * shellRadius;
                            drawElectron(ctx, ex, ey, color, ELECTRON_SIZE * scale);
                        }
                    } else {
                        // Valence electrons
                        // Determine shared electrons
                        let sharedElectrons = 0;
                        const bondingAngles = [];

                        // Map bonds to angles for shared electron placement
                        atomBonds.forEach(bond => {
                            const otherIdx = bond.from === index ? bond.to : bond.from;
                            const other = renderData.atoms[otherIdx];
                            const dx = (other.x - atom.x); // relative coords
                            const dy = (other.y - atom.y);
                            const angle = Math.atan2(dy, dx);

                            // Bond order determines shared electrons (1 bond = 1 shared from this atom)
                            const order = bond.order || 1;

                            for (let k = 0; k < order; k++) {
                                // Offset slightly if multiple bonds
                                const offset = (k - (order - 1) / 2) * 0.15;
                                bondingAngles.push(angle + offset);
                                sharedElectrons++;
                            }
                        });


                        // Determine unshared (lone pair) electrons
                        const loneElectrons = Math.max(0, electronCount - sharedElectrons);
                        let placedCount = 0;

                        // Place shared electrons (at bond angles)
                        bondingAngles.forEach(angle => {
                            const ex = cx + Math.cos(angle) * shellRadius;
                            const ey = cy + Math.sin(angle) * shellRadius;

                            // Draw shared electron highlight (box or circle around pair)
                            // Ideally pairs are drawn together, but let's place them on the shell
                            drawElectron(ctx, ex, ey, '#fff', ELECTRON_SIZE * scale); // White for shared
                        });

                        // Place lone electrons (avoid bonding regions)
                        if (loneElectrons > 0) {
                            // Find gaps angles avoiding bonding angles
                            const totalSlots = 8; // simplified octet slots
                            for (let i = 0; i < totalSlots; i++) {
                                if (placedCount >= loneElectrons) break;

                                const angle = (i * Math.PI * 2) / totalSlots - Math.PI / 2;

                                // Check proximity to any bonding angle
                                const tooClose = bondingAngles.some(bAngle => {
                                    let diff = Math.abs(bAngle - angle);
                                    while (diff > Math.PI) diff -= Math.PI * 2;
                                    while (diff < -Math.PI) diff += Math.PI * 2;
                                    return Math.abs(diff) < 0.5; // ~30 degrees clearance
                                });

                                if (!tooClose) {
                                    const ex = cx + Math.cos(angle) * shellRadius;
                                    const ey = cy + Math.sin(angle) * shellRadius;
                                    drawElectron(ctx, ex, ey, color, ELECTRON_SIZE * scale);
                                    placedCount++;
                                }
                            }

                            // Fallback if slots failed (e.g. crowded)
                            while (placedCount < loneElectrons) {
                                const angle = Math.random() * Math.PI * 2;
                                const ex = cx + Math.cos(angle) * shellRadius;
                                const ey = cy + Math.sin(angle) * shellRadius;
                                drawElectron(ctx, ex, ey, color, ELECTRON_SIZE * scale);
                                placedCount++;
                            }
                        }
                    }
                });
            });

            // animationRef.current = requestAnimationFrame(animate); 
            // No continuous animation needed for static 2D view, but useful if we add hover effects later
        };

        animate();

    }, [renderData, dimensions, offset, scale]);

    function drawElectron(ctx, x, y, color, size) {
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // Helper to determine text color
    function getContrastColor(color) {
        const num = parseInt(color.replace('#', ''), 16);
        const R = num >> 16;
        const G = (num >> 8) & 0x00FF;
        const B = num & 0x0000FF;
        const luminance = (0.299 * R + 0.587 * G + 0.114 * B) / 255;
        return luminance > 0.5 ? '#000000' : '#ffffff';
    }

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
