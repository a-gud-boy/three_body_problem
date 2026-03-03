import React, { useState, useRef, useMemo, useCallback } from 'react';
import './CircuitCanvas.css';

const GRID_SIZE = 40;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;

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

const CircuitCanvas = ({ components, setComponents, onSelectionChange, readOnly = false, autoConnect = false }) => {
    const containerRef = useRef(null);
    const [draggingId, setDraggingId] = useState(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [selectedId, setSelectedId] = useState(null);

    // Wiring state
    const [wiringStart, setWiringStart] = useState(null);
    const [wiringPos, setWiringPos] = useState(null);
    const [hoveredTerminal, setHoveredTerminal] = useState(null);

    // Pan & zoom state
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [isPanning, setIsPanning] = useState(false);
    const panStartRef = useRef({ x: 0, y: 0 });
    const panOffsetStartRef = useRef({ x: 0, y: 0 });

    const snapToGrid = useCallback((val) => Math.round(val / GRID_SIZE) * GRID_SIZE, []);

    // Calculate pseudo-terminals for visualization purposes based on rotation and component type
    const getTerminals = useCallback((comp) => {
        const cx = comp.x;
        const cy = comp.y;

        // Per-component-type dimensions (half-sizes from SVG viewBox)
        const dims = {
            'R': { hw: 30, hh: 10 },
            'L': { hw: 30, hh: 10 },
            'D': { hw: 30, hh: 10 },
            'C': { hw: 30, hh: 20 },
            'Vac': { hw: 20, hh: 20 },
            'G': { hw: 20, hh: 20 },
        };

        const d = dims[comp.type] || { hw: 30, hh: 10 };
        const rot = comp.rotation || 0;

        // For Vac and G, terminals are along the vertical axis (top/bottom) by default
        const isVerticalComponent = comp.type === 'Vac' || comp.type === 'G';

        const rotRad = rot * Math.PI / 180;
        const cosRot = Math.cos(rotRad);
        const sinRot = Math.sin(rotRad);

        let local_t1_x, local_t1_y, local_t2_x, local_t2_y;

        if (isVerticalComponent) {
            local_t1_x = 0; local_t1_y = -d.hh;
            local_t2_x = 0; local_t2_y = d.hh;
        } else {
            local_t1_x = -d.hw; local_t1_y = 0;
            local_t2_x = d.hw; local_t2_y = 0;
        }

        const t1_dir_x = local_t1_x * cosRot - local_t1_y * sinRot;
        const t1_dir_y = local_t1_x * sinRot + local_t1_y * cosRot;

        const t2_dir_x = local_t2_x * cosRot - local_t2_y * sinRot;
        const t2_dir_y = local_t2_x * sinRot + local_t2_y * cosRot;

        const len1 = Math.hypot(t1_dir_x, t1_dir_y) || 1;
        const len2 = Math.hypot(t2_dir_x, t2_dir_y) || 1;

        return {
            t1: { x: cx + t1_dir_x, y: cy + t1_dir_y, nx: t1_dir_x / len1, ny: t1_dir_y / len1, isReal: true },
            t2: { x: cx + t2_dir_x, y: cy + t2_dir_y, nx: t2_dir_x / len2, ny: t2_dir_y / len2, isReal: comp.type !== 'G' }
        };
    }, []);

    // Convert screen coordinates to canvas (world) coordinates
    const screenToCanvas = useCallback((screenX, screenY) => {
        if (!containerRef.current) return { x: screenX, y: screenY };
        const rect = containerRef.current.getBoundingClientRect();
        return {
            x: (screenX - rect.left - panOffset.x) / zoom,
            y: (screenY - rect.top - panOffset.y) / zoom
        };
    }, [panOffset, zoom]);

    const handleTerminalMouseDown = useCallback((e, comp, termKey) => {
        if (readOnly) return;
        e.stopPropagation();

        if (e.ctrlKey || e.metaKey) {
            let maxN = 0;
            components.forEach(c => {
                const m1 = typeof c.node1 === 'string' && c.node1.match(/^n(\d+)$/);
                if (m1) maxN = Math.max(maxN, parseInt(m1[1], 10));

                const m2 = typeof c.node2 === 'string' && c.node2.match(/^n(\d+)$/);
                if (m2) maxN = Math.max(maxN, parseInt(m2[1], 10));
            });
            const newNodeName = `n${maxN + 1}`;

            // Disconnect this terminal by giving it a unique new node name
            setComponents(prev => prev.map(c => {
                if (c.id === comp.id) {
                    return {
                        ...c,
                        node1: termKey === 't1' ? newNodeName : c.node1,
                        node2: termKey === 't2' ? newNodeName : c.node2
                    };
                }
                return c;
            }));
            return;
        }

        const terms = getTerminals(comp);
        const term = terms[termKey];

        setWiringStart({
            compId: comp.id,
            termKey,
            x: term.x,
            y: term.y,
            nx: term.nx,
            ny: term.ny,
            node: termKey === 't1' ? comp.node1 : comp.node2
        });

        const canvasPos = screenToCanvas(e.clientX, e.clientY);
        setWiringPos(canvasPos);
        setHoveredTerminal(null);
    }, [readOnly, getTerminals, screenToCanvas, setComponents]);

    const handleMouseDown = useCallback((e, id) => {
        if (readOnly) return;
        e.stopPropagation();
        setSelectedId(id);
        if (onSelectionChange) onSelectionChange(id);

        const comp = components.find(c => c.id === id);
        if (comp) {
            const canvasPos = screenToCanvas(e.clientX, e.clientY);
            setDraggingId(id);
            setDragOffset({
                x: canvasPos.x - comp.x,
                y: canvasPos.y - comp.y
            });
        }
    }, [readOnly, components, onSelectionChange, screenToCanvas]);

    const handleMouseMove = useCallback((e) => {
        // Handle panning
        if (isPanning) {
            const dx = e.clientX - panStartRef.current.x;
            const dy = e.clientY - panStartRef.current.y;
            setPanOffset({
                x: panOffsetStartRef.current.x + dx,
                y: panOffsetStartRef.current.y + dy
            });
            return;
        }

        // Handle wiring dragging
        if (wiringStart) {
            const canvasPos = screenToCanvas(e.clientX, e.clientY);
            setWiringPos(canvasPos);

            let hovered = null;
            const snapDist = 40;
            let minDist = snapDist;

            for (const comp of components) {
                // Ignore pseudo-wire components during drag/hover
                if (comp.type === 'W') continue;

                const terms = getTerminals(comp);
                if (terms.t1.isReal) {
                    const d1 = Math.hypot(canvasPos.x - terms.t1.x, canvasPos.y - terms.t1.y);
                    if (d1 < minDist && !(comp.id === wiringStart.compId && wiringStart.termKey === 't1')) {
                        minDist = d1;
                        hovered = { compId: comp.id, termKey: 't1', node: comp.node1, x: terms.t1.x, y: terms.t1.y, nx: terms.t1.nx, ny: terms.t1.ny };
                    }
                }
                if (terms.t2.isReal) {
                    const d2 = Math.hypot(canvasPos.x - terms.t2.x, canvasPos.y - terms.t2.y);
                    if (d2 < minDist && !(comp.id === wiringStart.compId && wiringStart.termKey === 't2')) {
                        minDist = d2;
                        hovered = { compId: comp.id, termKey: 't2', node: comp.node2, x: terms.t2.x, y: terms.t2.y, nx: terms.t2.nx, ny: terms.t2.ny };
                    }
                }
            }
            setHoveredTerminal(hovered);
            return;
        }

        // Handle component dragging
        if (!draggingId || readOnly) return;

        const canvasPos = screenToCanvas(e.clientX, e.clientY);
        let newX = canvasPos.x - dragOffset.x;
        let newY = canvasPos.y - dragOffset.y;

        setComponents(prev => prev.map(c =>
            c.id === draggingId ? { ...c, x: newX, y: newY } : c
        ));
    }, [isPanning, draggingId, readOnly, dragOffset, setComponents, screenToCanvas, wiringStart, components, getTerminals]);

    const handleMouseUp = useCallback(() => {
        // End panning
        if (isPanning) {
            setIsPanning(false);
            return;
        }

        if (wiringStart) {
            if (hoveredTerminal) {
                const sourceNode = wiringStart.node;
                const targetNode = hoveredTerminal.node;

                let updatedComponents = [...components];

                if (sourceNode !== targetNode) {
                    const nodeToKeep = (sourceNode === 'GND' || targetNode === 'GND') ? 'GND' : targetNode;
                    const nodeToReplace = nodeToKeep === sourceNode ? targetNode : sourceNode;

                    updatedComponents = updatedComponents.map(c => ({
                        ...c,
                        node1: c.node1 === nodeToReplace ? nodeToKeep : c.node1,
                        node2: c.node2 === nodeToReplace ? nodeToKeep : c.node2
                    }));
                }

                // Add an explicit wire object to remember this connection!
                updatedComponents.push({
                    type: 'W',
                    id: `W_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    // We link based on component ID and terminals so even if node names change over time, the visual wire stays intact
                    sourceComp: wiringStart.compId,
                    sourceTerm: wiringStart.termKey,
                    targetComp: hoveredTerminal.compId,
                    targetTerm: hoveredTerminal.termKey,
                    // Use the final agreed upon underlying node ID 
                    node1: (sourceNode === 'GND' || targetNode === 'GND') ? 'GND' : targetNode,
                    node2: (sourceNode === 'GND' || targetNode === 'GND') ? 'GND' : targetNode,
                    x: 0,
                    y: 0
                });

                setComponents(updatedComponents);
            }
            setWiringStart(null);
            setWiringPos(null);
            setHoveredTerminal(null);
            return;
        }

        if (!draggingId) return;

        if (autoConnect && !readOnly) {
            setComponents(prev => {
                const draggedComp = prev.find(c => c.id === draggingId);
                if (!draggedComp || draggedComp.type === 'G') return prev; // Don't auto-reconnect grounds easily

                const draggedTerms = getTerminals(draggedComp);
                let newNode1 = draggedComp.node1;
                let newNode2 = draggedComp.node2;

                let targetComp1 = null;
                let targetTerm1 = null;
                let targetComp2 = null;
                let targetTerm2 = null;

                const snapDist = 40;
                let minD1 = snapDist;
                let minD2 = snapDist;

                prev.forEach(otherComp => {
                    if (otherComp.id === draggingId || otherComp.type === 'W') return;
                    const otherTerms = getTerminals(otherComp);

                    // Check t1 of dragged (if real)
                    if (draggedTerms.t1.isReal) {
                        if (otherTerms.t1.isReal) {
                            const d11 = Math.hypot(draggedTerms.t1.x - otherTerms.t1.x, draggedTerms.t1.y - otherTerms.t1.y);
                            if (d11 < minD1) {
                                minD1 = d11;
                                newNode1 = otherComp.node1;
                                targetComp1 = otherComp.id;
                                targetTerm1 = 't1';
                            }
                        }
                        if (otherTerms.t2.isReal) {
                            const d12 = Math.hypot(draggedTerms.t1.x - otherTerms.t2.x, draggedTerms.t1.y - otherTerms.t2.y);
                            if (d12 < minD1) {
                                minD1 = d12;
                                newNode1 = otherComp.node2;
                                targetComp1 = otherComp.id;
                                targetTerm1 = 't2';
                            }
                        }
                    }

                    // Check t2 of dragged (if real)
                    if (draggedTerms.t2.isReal) {
                        if (otherTerms.t1.isReal) {
                            const d21 = Math.hypot(draggedTerms.t2.x - otherTerms.t1.x, draggedTerms.t2.y - otherTerms.t1.y);
                            if (d21 < minD2) {
                                minD2 = d21;
                                newNode2 = otherComp.node1;
                                targetComp2 = otherComp.id;
                                targetTerm2 = 't1';
                            }
                        }
                        if (otherTerms.t2.isReal) {
                            const d22 = Math.hypot(draggedTerms.t2.x - otherTerms.t2.x, draggedTerms.t2.y - otherTerms.t2.y);
                            if (d22 < minD2) {
                                minD2 = d22;
                                newNode2 = otherComp.node2;
                                targetComp2 = otherComp.id;
                                targetTerm2 = 't2';
                            }
                        }
                    }
                });

                if (newNode1 !== draggedComp.node1 || newNode2 !== draggedComp.node2) {
                    let updated = [...prev];
                    updated = updated.map(c =>
                        c.id === draggingId ? { ...c, node1: newNode1, node2: newNode2 } : c
                    );

                    if (targetComp1 && targetTerm1 && newNode1 !== draggedComp.node1) {
                        updated.push({
                            type: 'W',
                            id: `W_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                            sourceComp: draggingId,
                            sourceTerm: 't1',
                            targetComp: targetComp1,
                            targetTerm: targetTerm1,
                            node1: newNode1,
                            node2: newNode1,
                            x: 0, y: 0
                        });
                    }
                    if (targetComp2 && targetTerm2 && newNode2 !== draggedComp.node2) {
                        updated.push({
                            type: 'W',
                            id: `W_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                            sourceComp: draggingId,
                            sourceTerm: 't2',
                            targetComp: targetComp2,
                            targetTerm: targetTerm2,
                            node1: newNode2,
                            node2: newNode2,
                            x: 0, y: 0
                        });
                    }

                    return updated;
                }
                return prev;
            });
        }

        setDraggingId(null);
    }, [isPanning, draggingId, autoConnect, readOnly, setComponents, wiringStart, hoveredTerminal]);

    // Start panning on empty canvas click
    const handleCanvasMouseDown = useCallback((e) => {
        // Middle mouse button always pans
        if (e.button === 1) {
            e.preventDefault();
            setIsPanning(true);
            panStartRef.current = { x: e.clientX, y: e.clientY };
            panOffsetStartRef.current = { ...panOffset };
            return;
        }

        // Left click on empty area = pan
        if (e.button === 0 && e.target === containerRef.current || e.target.classList.contains('grid-background') || e.target.classList.contains('canvas-inner')) {
            setSelectedId(null);
            if (onSelectionChange) onSelectionChange(null);
            setIsPanning(true);
            panStartRef.current = { x: e.clientX, y: e.clientY };
            panOffsetStartRef.current = { ...panOffset };
        }
    }, [panOffset, onSelectionChange]);

    // Zoom with scroll wheel
    const handleWheel = useCallback((e) => {
        e.preventDefault();
        const rect = containerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * delta));

        // Zoom towards mouse position
        const scale = newZoom / zoom;
        const newPanX = mouseX - (mouseX - panOffset.x) * scale;
        const newPanY = mouseY - (mouseY - panOffset.y) * scale;

        setZoom(newZoom);
        setPanOffset({ x: newPanX, y: newPanY });
    }, [zoom, panOffset]);

    // Reset pan/zoom
    const handleResetView = useCallback(() => {
        setPanOffset({ x: 0, y: 0 });
        setZoom(1);
    }, []);

    const handleCanvasClick = useCallback((e) => {
        // Don't deselect if we just finished panning
        if (isPanning) return;
    }, [isPanning]);

    // Memoized wire rendering with Manhattan (right-angle) routing
    // The wires-layer SVG is positioned at CSS (-2000, -2000), so we offset coordinates by +2000
    const WIRE_OFFSET = 2000;
    const wires = useMemo(() => {
        const nodes = {};
        const explicitWires = [];

        components.forEach(comp => {
            if (comp.type === 'W') {
                explicitWires.push(comp);
                return; // Treat explicit wire objects specially below
            }

            const terms = getTerminals(comp);
            if (terms.t1.isReal) {
                if (!nodes[comp.node1]) nodes[comp.node1] = [];
                nodes[comp.node1].push({ ...terms.t1, compId: comp.id, termKey: 't1' });
            }

            if (terms.t2.isReal) {
                if (!nodes[comp.node2]) nodes[comp.node2] = [];
                nodes[comp.node2].push({ ...terms.t2, compId: comp.id, termKey: 't2' });
            }
        });

        const elements = [];
        let keyCounter = 0;

        // Draw explicit wires FIRST securely 
        const drawnConnections = new Set();

        explicitWires.forEach(w => {
            // Find the physical coordinates of its bounds based on source/target
            const sComp = components.find(c => c.id === w.sourceComp);
            const tComp = components.find(c => c.id === w.targetComp);

            if (!sComp || !tComp) return; // Component was deleted!

            const sTerms = getTerminals(sComp);
            const tTerms = getTerminals(tComp);

            const root = sTerms[w.sourceTerm];
            const target = tTerms[w.targetTerm];

            if (!root || !target) return;

            const isGround = w.node1 === 'GND';
            const wireColor = isGround ? '#22c55e' : '#3b82f6';
            const dash = isGround ? '6 3' : 'none';

            const rX = root.x + WIRE_OFFSET;
            const rY = root.y + WIRE_OFFSET;
            const tX = target.x + WIRE_OFFSET;
            const tY = target.y + WIRE_OFFSET;

            const dist = Math.hypot(tX - rX, tY - rY);
            const tension = Math.min(Math.max(dist * 0.4, 40), 150);

            const cp1X = rX + root.nx * tension;
            const cp1Y = rY + root.ny * tension;
            const cp2X = tX + target.nx * tension;
            const cp2Y = tY + target.ny * tension;

            elements.push(
                <path
                    key={`wire-explicit-${keyCounter++}`}
                    d={`M ${rX},${rY} C ${cp1X},${cp1Y} ${cp2X},${cp2Y} ${tX},${tY}`}
                    fill="none"
                    stroke={wireColor}
                    strokeWidth="3"
                    strokeDasharray={dash}
                />
            );

            // Register that we satisfied drawing a line between this component pair!
            const routeKeyA = `${w.sourceComp}-${w.sourceTerm}-${w.targetComp}-${w.targetTerm}`;
            const routeKeyB = `${w.targetComp}-${w.targetTerm}-${w.sourceComp}-${w.sourceTerm}`;
            drawnConnections.add(routeKeyA);
            drawnConnections.add(routeKeyB);
        });

        Object.keys(nodes).forEach(nodeId => {
            let points = nodes[nodeId];
            if (points.length < 2) return;

            const isGround = nodeId === 'GND';
            const wireColor = isGround ? '#22c55e' : '#3b82f6';
            const dash = isGround ? '6 3' : 'none';

            // Track how many connections each point has to determine where to draw junction dots
            const connectionCounts = new Map();
            points.forEach(p => connectionCounts.set(p, 0));

            // Adjacency list for explicit wires
            const adjacency = new Map();
            points.forEach(p => adjacency.set(p, []));

            // Pre-seed connection counts and adjacency from explicit wires mapped to this node
            explicitWires.forEach(w => {
                if (w.node1 !== nodeId && w.node2 !== nodeId) return;

                const pS = points.find(p => p.compId === w.sourceComp && p.termKey === w.sourceTerm);
                const pT = points.find(p => p.compId === w.targetComp && p.termKey === w.targetTerm);

                if (pS && pT) {
                    connectionCounts.set(pS, connectionCounts.get(pS) + 1);
                    connectionCounts.set(pT, connectionCounts.get(pT) + 1);
                    adjacency.get(pS).push(pT);
                    adjacency.get(pT).push(pS);
                }
            });

            // Find connected components (islands) formed by explicit wires
            const islands = [];
            const visited = new Set();
            points.forEach(p => {
                if (!visited.has(p)) {
                    const island = [];
                    const queue = [p];
                    visited.add(p);
                    while (queue.length > 0) {
                        const curr = queue.shift();
                        island.push(curr);
                        adjacency.get(curr).forEach(neighbor => {
                            if (!visited.has(neighbor)) {
                                visited.add(neighbor);
                                queue.push(neighbor);
                            }
                        });
                    }
                    islands.push(island);
                }
            });

            // Connect distinct islands using Minimum Spanning Tree (MST)
            const connectedIslands = [islands[0]];
            const unconnectedIslands = islands.slice(1);

            while (unconnectedIslands.length > 0) {
                let minDist = Infinity;
                let bestConnIslandIdx = -1;
                let bestUnconnIslandIdx = -1;
                let bestP1 = null;
                let bestP2 = null;

                // Find the closest pair between ANY point in connectedIslands and ANY point in unconnectedIslands
                for (let i = 0; i < connectedIslands.length; i++) {
                    const island1 = connectedIslands[i];
                    for (let j = 0; j < unconnectedIslands.length; j++) {
                        const island2 = unconnectedIslands[j];

                        for (const p1 of island1) {
                            for (const p2 of island2) {
                                const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);

                                if (dist < minDist) {
                                    minDist = dist;
                                    bestConnIslandIdx = i;
                                    bestUnconnIslandIdx = j;
                                    bestP1 = p1;
                                    bestP2 = p2;
                                }
                            }
                        }
                    }
                }

                if (bestP1 && bestP2) {
                    // Increment connection count for junction dots if drawing a fresh implicit wire
                    connectionCounts.set(bestP1, connectionCounts.get(bestP1) + 1);
                    connectionCounts.set(bestP2, connectionCounts.get(bestP2) + 1);

                    const rX = bestP1.x + WIRE_OFFSET;
                    const rY = bestP1.y + WIRE_OFFSET;
                    const tX = bestP2.x + WIRE_OFFSET;
                    const tY = bestP2.y + WIRE_OFFSET;

                    const dist = Math.hypot(tX - rX, tY - rY);
                    const tension = Math.min(Math.max(dist * 0.4, 40), 150);

                    const cp1X = rX + bestP1.nx * tension;
                    const cp1Y = rY + bestP1.ny * tension;
                    const cp2X = tX + bestP2.nx * tension;
                    const cp2Y = tY + bestP2.ny * tension;

                    elements.push(
                        <path
                            key={`wire-implicit-${keyCounter++}`}
                            d={`M ${rX},${rY} C ${cp1X},${cp1Y} ${cp2X},${cp2Y} ${tX},${tY}`}
                            fill="none"
                            stroke={wireColor}
                            strokeWidth="3"
                            strokeDasharray={dash}
                            opacity="0.8" // Make implicit wires slightly faded
                        />
                    );

                    // Merge the unconnected island into the connected island
                    const joinedIsland = unconnectedIslands[bestUnconnIslandIdx];
                    connectedIslands[bestConnIslandIdx] = connectedIslands[bestConnIslandIdx].concat(joinedIsland);
                    unconnectedIslands.splice(bestUnconnIslandIdx, 1);
                } else {
                    break;
                }
            }

            // Draw junction dots where 3+ connections meet at a terminal
            connectionCounts.forEach((count, point) => {
                if (count >= 3) {
                    elements.push(
                        <circle
                            key={`junction-${keyCounter++}`}
                            cx={point.x + WIRE_OFFSET} cy={point.y + WIRE_OFFSET}
                            r="4"
                            fill={wireColor}
                        />
                    );
                }
            });
        });

        return elements;
    }, [components, getTerminals]);

    const zoomPercent = Math.round(zoom * 100);

    return (
        <div
            className="circuit-canvas-container"
            ref={containerRef}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={handleCanvasClick}
            onWheel={handleWheel}
            onContextMenu={(e) => e.preventDefault()}
            style={{ cursor: isPanning ? 'grabbing' : (draggingId ? 'grabbing' : 'default') }}
        >
            {/* Zoom controls */}
            <div className="canvas-controls">
                <button className="canvas-control-btn" onClick={(e) => { e.stopPropagation(); setZoom(z => Math.min(MAX_ZOOM, z * 1.2)); }} title="Zoom In">+</button>
                <span className="zoom-label">{zoomPercent}%</span>
                <button className="canvas-control-btn" onClick={(e) => { e.stopPropagation(); setZoom(z => Math.max(MIN_ZOOM, z / 1.2)); }} title="Zoom Out">−</button>
                <button className="canvas-control-btn reset-btn" onClick={(e) => { e.stopPropagation(); handleResetView(); }} title="Reset View">⌂</button>
            </div>

            {/* Panning hint */}
            <div className="pan-hint">Drag empty space to pan • Scroll to zoom</div>

            {/* Everything inside this div gets panned & zoomed */}
            <div
                className="canvas-inner"
                style={{
                    transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
                    transformOrigin: '0 0'
                }}
            >
                <div className="grid-background" />

                {/* Draw wires */}
                <svg className="wires-layer">
                    {wires}
                    {wiringStart && wiringPos && (() => {
                        const rX = wiringStart.x + WIRE_OFFSET;
                        const rY = wiringStart.y + WIRE_OFFSET;
                        const tX = (hoveredTerminal?.x || wiringPos.x) + WIRE_OFFSET;
                        const tY = (hoveredTerminal?.y || wiringPos.y) + WIRE_OFFSET;

                        const dist = Math.hypot(tX - rX, tY - rY);
                        const tension = Math.min(Math.max(dist * 0.4, 40), 150);

                        const cp1X = rX + wiringStart.nx * tension;
                        const cp1Y = rY + wiringStart.ny * tension;

                        const tgtNx = hoveredTerminal ? hoveredTerminal.nx : 0;
                        const tgtNy = hoveredTerminal ? hoveredTerminal.ny : 0;

                        const cp2X = tX + tgtNx * tension;
                        const cp2Y = tY + tgtNy * tension;

                        return (
                            <path
                                d={`M ${rX},${rY} C ${cp1X},${cp1Y} ${cp2X},${cp2Y} ${tX},${tY}`}
                                fill="none"
                                stroke={hoveredTerminal ? "#22c55e" : "#ef4444"}
                                strokeWidth="3"
                                strokeDasharray={hoveredTerminal ? "none" : "6 4"}
                            />
                        );
                    })()}
                </svg>

                {/* Draw active wiring terminals */}
                {!readOnly && components.flatMap(comp => {
                    const terms = getTerminals(comp);
                    const handles = [];
                    if (terms.t1.isReal) {
                        handles.push(
                            <div
                                key={`${comp.id}-t1`}
                                className={`terminal-handle ${hoveredTerminal?.compId === comp.id && hoveredTerminal?.termKey === 't1' ? 'hovered' : ''} ${wiringStart?.compId === comp.id && wiringStart?.termKey === 't1' ? 'active' : ''}`}
                                style={{ left: terms.t1.x, top: terms.t1.y }}
                                onMouseDown={(e) => handleTerminalMouseDown(e, comp, 't1')}
                                title="Drag to connect. Ctrl+Click to disconnect."
                            />
                        );
                    }
                    if (terms.t2.isReal) {
                        handles.push(
                            <div
                                key={`${comp.id}-t2`}
                                className={`terminal-handle ${hoveredTerminal?.compId === comp.id && hoveredTerminal?.termKey === 't2' ? 'hovered' : ''} ${wiringStart?.compId === comp.id && wiringStart?.termKey === 't2' ? 'active' : ''}`}
                                style={{ left: terms.t2.x, top: terms.t2.y }}
                                onMouseDown={(e) => handleTerminalMouseDown(e, comp, 't2')}
                                title="Drag to connect. Ctrl+Click to disconnect."
                            />
                        );
                    }
                    return handles;
                })}

                {/* Draw components */}
                {components.filter(c => c.type !== 'W').map(comp => {
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
                            onClick={(e) => e.stopPropagation()}
                        >
                            <SvgIcon className="component-svg" />
                            <div className="component-label" style={{ transform: `rotate(${-(comp.rotation || 0)}deg)` }}>
                                {comp.id}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CircuitCanvas;
