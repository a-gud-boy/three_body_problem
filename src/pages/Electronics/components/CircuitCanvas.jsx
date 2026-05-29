import React, { useImperativeHandle, useState, useRef, useMemo, useCallback } from 'react';
import { buildNodeCollapseMap } from '../engine/nodeCollapse';
import { getComponentConfig } from '../engine/componentConfig';
import './CircuitCanvas.css';

const GRID_SIZE = 40;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;
const CURVE_SAMPLES = 28;

function cubicBezierPoint(p0, p1, p2, p3, t) {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;

    return {
        x: (uuu * p0.x) + (3 * uu * t * p1.x) + (3 * u * tt * p2.x) + (ttt * p3.x),
        y: (uuu * p0.y) + (3 * uu * t * p1.y) + (3 * u * tt * p2.y) + (ttt * p3.y)
    };
}

function pointToSegmentDistance(p, a, b) {
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const abLen2 = abx * abx + aby * aby;
    if (abLen2 === 0) {
        return Math.hypot(p.x - a.x, p.y - a.y);
    }

    const apx = p.x - a.x;
    const apy = p.y - a.y;
    const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLen2));
    const projX = a.x + (abx * t);
    const projY = a.y + (aby * t);
    return Math.hypot(p.x - projX, p.y - projY);
}

function doesCutIntersectCurve(cutStart, cutEnd, curve, tolerance) {
    for (let i = 0; i <= CURVE_SAMPLES; i++) {
        const t = i / CURVE_SAMPLES;
        const p = cubicBezierPoint(curve.root, curve.cp1, curve.cp2, curve.target, t);
        if (pointToSegmentDistance(p, cutStart, cutEnd) <= tolerance) {
            return true;
        }
    }
    return false;
}

function buildTerminalCurve(p1, p2) {
    // Blender-like noodle: handles are horizontal and scale with separation.
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const dirX = dx >= 0 ? 1 : -1;

    // Favor horizontal spacing like node-graph noodles while still adapting on diagonals.
    const handle = Math.max(28, Math.min((absDx * 0.5) + (absDy * 0.18), 170));

    return {
        root: { x: p1.x, y: p1.y },
        cp1: { x: p1.x + dirX * handle, y: p1.y },
        cp2: { x: p2.x - dirX * handle, y: p2.y },
        target: { x: p2.x, y: p2.y }
    };
}

function getNextNodeCounter(sourceComponents) {
    let maxN = 0;
    sourceComponents.forEach(c => {
        const m1 = typeof c.node1 === 'string' && c.node1.match(/^(?:NODE-|n)(\d+)$/i);
        if (m1) maxN = Math.max(maxN, parseInt(m1[1], 10));

        const m2 = typeof c.node2 === 'string' && c.node2.match(/^(?:NODE-|n)(\d+)$/i);
        if (m2) maxN = Math.max(maxN, parseInt(m2[1], 10));
    });
    return maxN;
}


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

function CircuitCanvas({
    ref,
    components,
    setComponents,
    onSelectionChange,
    selectedComponentId = null,
    readOnly = false,
    autoConnect = false,
}) {
    const [previewId, setPreviewId] = useState(null);

    useImperativeHandle(ref, () => ({
        setPreview: (id) => setPreviewId(id),
        clearPreview: () => setPreviewId(null),
    }), []);
    const containerRef = useRef(null);
    const dragPositionRef = useRef(null);
    const dragOffsetRef = useRef({ x: 0, y: 0 });
    const [draggingId, setDraggingId] = useState(null);
    const draggingIdRef = useRef(null);
    const autoConnectRef = useRef(autoConnect);
    autoConnectRef.current = autoConnect;
    const [selectedId, setSelectedId] = useState(null);

    // Wiring state
    const [wiringStart, setWiringStart] = useState(null);
    const [wiringPos, setWiringPos] = useState(null);
    const [hoveredTerminal, setHoveredTerminal] = useState(null);
    const [wireCutStart, setWireCutStart] = useState(null);
    const [wireCutPos, setWireCutPos] = useState(null);

    // Pan & zoom state
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [isPanning, setIsPanning] = useState(false);
    const panStartRef = useRef({ x: 0, y: 0 });
    const panOffsetStartRef = useRef({ x: 0, y: 0 });

    React.useEffect(() => {
        setSelectedId(selectedComponentId);
    }, [selectedComponentId]);


    const snapToGrid = useCallback((val) => Math.round(val / GRID_SIZE) * GRID_SIZE, []);

    // Calculate pseudo-terminals for visualization purposes based on rotation and component type.
    // Driven by COMPONENT_CONFIG — supports any number of terminals.
    const getTerminals = useCallback((comp) => {
        const cx = comp.x;
        const cy = comp.y;
        const config = getComponentConfig(comp.type);
        const { dims: d, vertical, terminals: termDefs } = config;
        const rot = comp.rotation || 0;
        const rotRad = rot * Math.PI / 180;
        const cosRot = Math.cos(rotRad);
        const sinRot = Math.sin(rotRad);

        const result = {};

        termDefs.forEach((termDef, idx) => {
            // Compute local position based on index: first terminal at negative end, last at positive end
            let localX, localY;
            if (termDefs.length === 1) {
                // Single terminal (e.g. Ground) — place at the top/left
                localX = vertical ? 0 : -d.hw;
                localY = vertical ? -d.hh : 0;
            } else {
                // Distribute terminals evenly: first at negative end, last at positive end
                const t = termDefs.length > 1 ? idx / (termDefs.length - 1) : 0.5;
                if (vertical) {
                    localX = 0;
                    localY = -d.hh + t * 2 * d.hh;
                } else {
                    localX = -d.hw + t * 2 * d.hw;
                    localY = 0;
                }
            }

            // Apply rotation
            const dirX = localX * cosRot - localY * sinRot;
            const dirY = localX * sinRot + localY * cosRot;
            const len = Math.hypot(dirX, dirY) || 1;

            result[termDef.termKey] = {
                x: cx + dirX,
                y: cy + dirY,
                nx: dirX / len,
                ny: dirY / len,
                isReal: true
            };
        });

        return result;
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

    const getExplicitWireCurve = useCallback((wire, sourceComponents = components) => {
        const sComp = sourceComponents.find(c => c.id === wire.sourceComp);
        const tComp = sourceComponents.find(c => c.id === wire.targetComp);
        if (!sComp || !tComp) return null;

        const sTerms = getTerminals(sComp);
        const tTerms = getTerminals(tComp);
        const root = sTerms[wire.sourceTerm];
        const target = tTerms[wire.targetTerm];
        if (!root || !target) return null;

        return buildTerminalCurve(root, target);
    }, [components, getTerminals]);

    const getImplicitWireEdges = useCallback((sourceComponents = components) => {
        const collapseNode = buildNodeCollapseMap(sourceComponents);
        const nodes = {};
        const explicitWires = [];

        sourceComponents.forEach(comp => {
            if (comp.type === 'W') {
                explicitWires.push(comp);
                return;
            }

            const terms = getTerminals(comp);
            if (terms.t1.isReal) {
                const collapsed = collapseNode(comp.node1);
                if (!nodes[collapsed]) nodes[collapsed] = [];
                nodes[collapsed].push({ ...terms.t1, compId: comp.id, termKey: 't1', nodeId: comp.node1 });
            }
            if (terms.t2.isReal) {
                const collapsed = collapseNode(comp.node2);
                if (!nodes[collapsed]) nodes[collapsed] = [];
                nodes[collapsed].push({ ...terms.t2, compId: comp.id, termKey: 't2', nodeId: comp.node2 });
            }
        });

        const edges = [];

        Object.keys(nodes).forEach(nodeId => {
            const points = nodes[nodeId];
            if (points.length < 2) return;

            const adjacency = new Map();
            points.forEach(p => adjacency.set(p, []));

            explicitWires.forEach(w => {
                const pS = points.find(p => p.compId === w.sourceComp && p.termKey === w.sourceTerm);
                const pT = points.find(p => p.compId === w.targetComp && p.termKey === w.targetTerm);
                if (pS && pT) {
                    adjacency.get(pS).push(pT);
                    adjacency.get(pT).push(pS);
                }
            });

            const islands = [];
            const visited = new Set();
            points.forEach(p => {
                if (visited.has(p)) return;
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
            });

            const connectedIslands = [islands[0]];
            const unconnectedIslands = islands.slice(1);

            while (unconnectedIslands.length > 0) {
                let minDist = Infinity;
                let bestConnIslandIdx = -1;
                let bestUnconnIslandIdx = -1;
                let bestP1 = null;
                let bestP2 = null;

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

                if (!bestP1 || !bestP2) break;

                edges.push({ nodeId, p1: bestP1, p2: bestP2 });

                const joinedIsland = unconnectedIslands[bestUnconnIslandIdx];
                connectedIslands[bestConnIslandIdx] = connectedIslands[bestConnIslandIdx].concat(joinedIsland);
                unconnectedIslands.splice(bestUnconnIslandIdx, 1);
            }
        });

        return edges;
    }, [components, getTerminals]);

    const pickImplicitCutTerminal = useCallback((edge, sourceComponents = components) => {
        const compA = sourceComponents.find(c => c.id === edge.p1.compId);
        const compB = sourceComponents.find(c => c.id === edge.p2.compId);

        const aIsGroundSymbol = compA?.type === 'G';
        const bIsGroundSymbol = compB?.type === 'G';

        if (!aIsGroundSymbol && bIsGroundSymbol) return edge.p1;
        if (!bIsGroundSymbol && aIsGroundSymbol) return edge.p2;

        // Default to p2 for deterministic behavior.
        return edge.p2;
    }, [components]);

    const pickExplicitCutTerminal = useCallback((wire, sourceComponents = components) => {
        const sourceComp = sourceComponents.find(c => c.id === wire.sourceComp);
        const targetComp = sourceComponents.find(c => c.id === wire.targetComp);

        const sourceIsGroundSymbol = sourceComp?.type === 'G';
        const targetIsGroundSymbol = targetComp?.type === 'G';

        if (!sourceIsGroundSymbol && targetIsGroundSymbol) {
            return { compId: wire.sourceComp, termKey: wire.sourceTerm };
        }
        if (!targetIsGroundSymbol && sourceIsGroundSymbol) {
            return { compId: wire.targetComp, termKey: wire.targetTerm };
        }

        // Default to target endpoint for deterministic behavior.
        return { compId: wire.targetComp, termKey: wire.targetTerm };
    }, [components]);

    const handleTerminalMouseDown = useCallback((e, comp, termKey) => {
        if (readOnly) return;
        e.stopPropagation();

        if (e.ctrlKey || e.metaKey) {
            let maxN = 0;
            components.forEach(c => {
                const m1 = typeof c.node1 === 'string' && c.node1.match(/^(?:NODE-|n)(\d+)$/i);
                if (m1) maxN = Math.max(maxN, parseInt(m1[1], 10));

                const m2 = typeof c.node2 === 'string' && c.node2.match(/^(?:NODE-|n)(\d+)$/i);
                if (m2) maxN = Math.max(maxN, parseInt(m2[1], 10));
            });
            const newNodeName = `NODE-${maxN + 1}`;

            // Bug #12 fix: Disconnect this terminal AND remove any explicit wires referencing it.
            setComponents(prev => prev
                .filter(c => {
                    if (c.type !== 'W') return true;
                    // Remove wires that reference the disconnected terminal
                    if (c.sourceComp === comp.id && c.sourceTerm === termKey) return false;
                    if (c.targetComp === comp.id && c.targetTerm === termKey) return false;
                    return true;
                })
                .map(c => {
                    if (c.id === comp.id) {
                        return {
                            ...c,
                            node1: termKey === 't1' ? newNodeName : c.node1,
                            node2: termKey === 't2' ? newNodeName : c.node2
                        };
                    }
                    return c;
                })
            );
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

        // Ctrl/Cmd + drag from a component should cut wires, not move the component.
        if ((e.ctrlKey || e.metaKey) && e.button === 0) {
            const canvasPos = screenToCanvas(e.clientX, e.clientY);
            setWireCutStart(canvasPos);
            setWireCutPos(canvasPos);
            return;
        }

        setSelectedId(id);
        if (onSelectionChange) onSelectionChange(id);

        const comp = components.find(c => c.id === id);
        if (comp) {
            const canvasPos = screenToCanvas(e.clientX, e.clientY);
            setDraggingId(id);
            draggingIdRef.current = id;
            dragPositionRef.current = { x: comp.x, y: comp.y };
            dragOffsetRef.current = {
                x: canvasPos.x - comp.x,
                y: canvasPos.y - comp.y
            };
        }
    }, [readOnly, components, onSelectionChange, screenToCanvas]);

    const handleMouseMove = useCallback((e) => {
        if (wireCutStart) {
            const canvasPos = screenToCanvas(e.clientX, e.clientY);
            setWireCutPos(canvasPos);
            return;
        }

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
                const config = getComponentConfig(comp.type);
                for (const termDef of config.terminals) {
                    const term = terms[termDef.termKey];
                    if (!term || !term.isReal) continue;
                    const dist = Math.hypot(canvasPos.x - term.x, canvasPos.y - term.y);
                    if (dist < minDist && !(comp.id === wiringStart.compId && wiringStart.termKey === termDef.termKey)) {
                        minDist = dist;
                        hovered = { compId: comp.id, termKey: termDef.termKey, node: comp[termDef.key], x: term.x, y: term.y, nx: term.nx, ny: term.ny };
                    }
                }
            }
            setHoveredTerminal(hovered);
            return;
        }

        // Handle component dragging — update React state so wires recalculate
        if (!draggingIdRef.current || readOnly) return;

        const canvasPos = screenToCanvas(e.clientX, e.clientY);
        let newX = canvasPos.x - dragOffsetRef.current.x;
        let newY = canvasPos.y - dragOffsetRef.current.y;

        dragPositionRef.current = { x: newX, y: newY };

        setComponents(prev => {
            return prev.map(c =>
                c.id === draggingIdRef.current ? { ...c, x: newX, y: newY } : c
            );
        });
    }, [wireCutStart, isPanning, readOnly, setComponents, screenToCanvas, wiringStart, components, getTerminals]);

    const handleMouseUp = useCallback(() => {
        if (wireCutStart) {
            const cutStart = wireCutStart;
            const cutEnd = wireCutPos || wireCutStart;
            const cutLength = Math.hypot(cutEnd.x - cutStart.x, cutEnd.y - cutStart.y);

            if (cutLength > 4) {
                const cutTolerance = 12 / zoom;
                setComponents(prev => {
                    const explicitWireIdsToRemove = new Set();
                    const terminalsToSplit = [];
                    prev.forEach(c => {
                        if (c.type !== 'W') return;
                        const curve = getExplicitWireCurve(c, prev);
                        if (!curve) return;
                        if (doesCutIntersectCurve(cutStart, cutEnd, curve, cutTolerance)) {
                            explicitWireIdsToRemove.add(c.id);
                            const terminal = pickExplicitCutTerminal(c, prev);
                            if (terminal) terminalsToSplit.push(terminal);
                        }
                    });

                    let next = prev.filter(c => !(c.type === 'W' && explicitWireIdsToRemove.has(c.id)));

                    // Also break implicit (node-name) connections if their rendered edge is cut.
                    const implicitEdges = getImplicitWireEdges(prev);
                    implicitEdges.forEach(edge => {
                        const curve = buildTerminalCurve(edge.p1, edge.p2);
                        if (doesCutIntersectCurve(cutStart, cutEnd, curve, cutTolerance)) {
                            const terminal = pickImplicitCutTerminal(edge, prev);
                            if (terminal) {
                                terminalsToSplit.push({ compId: terminal.compId, termKey: terminal.termKey });
                            }
                        }
                    });

                    if (terminalsToSplit.length > 0) {
                        const dedup = new Map();
                        terminalsToSplit.forEach(t => {
                            dedup.set(`${t.compId}:${t.termKey}`, t);
                        });

                        let maxNode = getNextNodeCounter(next);
                        const replacementByTerminal = new Map();
                        dedup.forEach((t, key) => {
                            maxNode += 1;
                            replacementByTerminal.set(key, `NODE-${maxNode}`);
                        });

                        next = next.map(comp => {
                            // Bug #9 fix: Also update wire objects when terminal nodes are renamed.
                            if (comp.type === 'W') {
                                let wNode1 = comp.node1;
                                let wNode2 = comp.node2;
                                // If the wire's source terminal was split, update its node1
                                const srcReplacement = replacementByTerminal.get(`${comp.sourceComp}:${comp.sourceTerm}`);
                                if (srcReplacement) wNode1 = srcReplacement;
                                // If the wire's target terminal was split, update its node2
                                const tgtReplacement = replacementByTerminal.get(`${comp.targetComp}:${comp.targetTerm}`);
                                if (tgtReplacement) wNode2 = tgtReplacement;
                                if (wNode1 !== comp.node1 || wNode2 !== comp.node2) {
                                    return { ...comp, node1: wNode1, node2: wNode2 };
                                }
                                return comp;
                            }

                            let node1 = comp.node1;
                            let node2 = comp.node2;
                            const replacement1 = replacementByTerminal.get(`${comp.id}:t1`);
                            const replacement2 = replacementByTerminal.get(`${comp.id}:t2`);

                            if (replacement1) node1 = replacement1;
                            if (replacement2) node2 = replacement2;

                            if (node1 === comp.node1 && node2 === comp.node2) {
                                return comp;
                            }

                            return { ...comp, node1, node2 };
                        });
                    }

                    return next;
                });
            }

            setWireCutStart(null);
            setWireCutPos(null);
            return;
        }

        // End panning
        if (isPanning) {
            setIsPanning(false);
            return;
        }

        if (wiringStart) {
            if (hoveredTerminal) {
                const sourceNode = wiringStart.node;
                const targetNode = hoveredTerminal.node;

                // Bug #7 fix: Don't do a global node rename. Just create a wire object
                // with the real source/target node names. The engine's _buildCollapsedNetlist()
                // union-find will handle merging them electrically at solve time.
                // Bug #10 fix: Use setComponents(prev => ...) to avoid stale closure.
                setComponents(prev => {
                    // Add an explicit wire object that carries both original node names
                    return [...prev, {
                        type: 'W',
                        id: `W_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        sourceComp: wiringStart.compId,
                        sourceTerm: wiringStart.termKey,
                        targetComp: hoveredTerminal.compId,
                        targetTerm: hoveredTerminal.termKey,
                        // Bug #8 fix: store the actual source and target node names
                        node1: sourceNode,
                        node2: targetNode,
                        x: 0,
                        y: 0
                    }];
                });
            }
            setWiringStart(null);
            setWiringPos(null);
            setHoveredTerminal(null);
            return;
        }

        const currentDraggingId = draggingIdRef.current;
        if (!currentDraggingId) return;

        const finalDragPos = dragPositionRef.current;

        // Use functional updater so we always work with the latest components state
        setComponents(prev => {
            const baseComponents = prev.map((c) => {
                if (c.id !== currentDraggingId || !finalDragPos) return c;
                return { ...c, x: finalDragPos.x, y: finalDragPos.y };
            });

            if (!autoConnectRef.current || readOnly) return baseComponents;

            const draggedComp = baseComponents.find(c => c.id === currentDraggingId);
            if (!draggedComp || draggedComp.type === 'G') return baseComponents;

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

            baseComponents.forEach(otherComp => {
                if (otherComp.id === currentDraggingId || otherComp.type === 'W') return;
                const otherTerms = getTerminals(otherComp);

                if (draggedTerms.t1?.isReal) {
                    if (otherTerms.t1?.isReal) {
                        const d11 = Math.hypot(draggedTerms.t1.x - otherTerms.t1.x, draggedTerms.t1.y - otherTerms.t1.y);
                        if (d11 < minD1) { minD1 = d11; newNode1 = otherComp.node1; targetComp1 = otherComp.id; targetTerm1 = 't1'; }
                    }
                    if (otherTerms.t2?.isReal) {
                        const d12 = Math.hypot(draggedTerms.t1.x - otherTerms.t2.x, draggedTerms.t1.y - otherTerms.t2.y);
                        if (d12 < minD1) { minD1 = d12; newNode1 = otherComp.node2; targetComp1 = otherComp.id; targetTerm1 = 't2'; }
                    }
                }

                if (draggedTerms.t2?.isReal) {
                    if (otherTerms.t1?.isReal) {
                        const d21 = Math.hypot(draggedTerms.t2.x - otherTerms.t1.x, draggedTerms.t2.y - otherTerms.t1.y);
                        if (d21 < minD2) { minD2 = d21; newNode2 = otherComp.node1; targetComp2 = otherComp.id; targetTerm2 = 't1'; }
                    }
                    if (otherTerms.t2?.isReal) {
                        const d22 = Math.hypot(draggedTerms.t2.x - otherTerms.t2.x, draggedTerms.t2.y - otherTerms.t2.y);
                        if (d22 < minD2) { minD2 = d22; newNode2 = otherComp.node2; targetComp2 = otherComp.id; targetTerm2 = 't2'; }
                    }
                }
            });

            if (newNode1 === draggedComp.node1 && newNode2 === draggedComp.node2) return baseComponents;

            let nextComponents = baseComponents.filter(c => {
                if (c.type !== 'W') return true;
                if (targetComp1 && targetTerm1 && newNode1 !== draggedComp.node1) {
                    if (c.sourceComp === currentDraggingId && c.sourceTerm === 't1') return false;
                    if (c.targetComp === currentDraggingId && c.targetTerm === 't1') return false;
                }
                if (targetComp2 && targetTerm2 && newNode2 !== draggedComp.node2) {
                    if (c.sourceComp === currentDraggingId && c.sourceTerm === 't2') return false;
                    if (c.targetComp === currentDraggingId && c.targetTerm === 't2') return false;
                }
                return true;
            });

            if (targetComp1 && targetTerm1 && newNode1 !== draggedComp.node1) {
                nextComponents.push({
                    type: 'W', id: `W_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    sourceComp: currentDraggingId, sourceTerm: 't1', targetComp: targetComp1, targetTerm: targetTerm1,
                    node1: draggedComp.node1, node2: newNode1, x: 0, y: 0
                });
            }
            if (targetComp2 && targetTerm2 && newNode2 !== draggedComp.node2) {
                nextComponents.push({
                    type: 'W', id: `W_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    sourceComp: currentDraggingId, sourceTerm: 't2', targetComp: targetComp2, targetTerm: targetTerm2,
                    node1: draggedComp.node2, node2: newNode2, x: 0, y: 0
                });
            }

            return nextComponents;
        });

        dragPositionRef.current = null;
        draggingIdRef.current = null;
        setDraggingId(null);
    }, [wireCutStart, wireCutPos, zoom, getExplicitWireCurve, getImplicitWireEdges, pickImplicitCutTerminal, pickExplicitCutTerminal, isPanning, readOnly, setComponents, wiringStart, hoveredTerminal, getTerminals]);

    // Attach mouseup to window so drag always ends even if cursor leaves the container
    React.useEffect(() => {
        const onWindowMouseUp = () => {
            // Always clear drag state on any mouseup, even outside the container
            if (draggingIdRef.current) {
                handleMouseUp();
            }
        };
        window.addEventListener('mouseup', onWindowMouseUp);
        return () => window.removeEventListener('mouseup', onWindowMouseUp);
    }, [handleMouseUp]);

    // Start panning on empty canvas click
    const handleCanvasMouseDown = useCallback((e) => {
        if (readOnly) return;

        // Ctrl/Cmd + drag: cut wires that intersect the stroke.
        if ((e.ctrlKey || e.metaKey) && e.button === 0) {
            const canvasPos = screenToCanvas(e.clientX, e.clientY);
            setWireCutStart(canvasPos);
            setWireCutPos(canvasPos);
            setIsPanning(false);
            return;
        }

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
    }, [readOnly, screenToCanvas, panOffset, onSelectionChange]);

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

    const handleKeyDown = useCallback((e) => {
        const panAmount = 20;
        let handled = false;

        switch (e.key) {
            case 'ArrowLeft':
                setPanOffset(prev => ({ ...prev, x: prev.x + panAmount }));
                handled = true;
                break;
            case 'ArrowRight':
                setPanOffset(prev => ({ ...prev, x: prev.x - panAmount }));
                handled = true;
                break;
            case 'ArrowUp':
                setPanOffset(prev => ({ ...prev, y: prev.y + panAmount }));
                handled = true;
                break;
            case 'ArrowDown':
                setPanOffset(prev => ({ ...prev, y: prev.y - panAmount }));
                handled = true;
                break;
            case '+':
            case '=':
            case 'NumpadAdd':
                setZoom(z => Math.min(MAX_ZOOM, z * 1.2));
                handled = true;
                break;
            case '-':
            case '_':
            case 'NumpadSubtract':
                setZoom(z => Math.max(MIN_ZOOM, z / 1.2));
                handled = true;
                break;
            case 'Home':
            case '0':
                handleResetView();
                handled = true;
                break;
            default:
                break;
        }

        if (handled) {
            e.preventDefault();
        }
    }, [handleResetView]);

    const handleCanvasClick = useCallback((e) => {
        // Don't deselect if we just finished panning
        if (isPanning) return;
    }, [isPanning]);

    // Memoized wire rendering with Manhattan (right-angle) routing
    // The wires-layer SVG is positioned at CSS (-2000, -2000), so we offset coordinates by +2000
    const WIRE_OFFSET = 2000;
    const wires = useMemo(() => {
        const collapseNode = buildNodeCollapseMap(components);
        const nodes = {};
        const explicitWires = [];

        components.forEach(comp => {
            if (comp.type === 'W') {
                explicitWires.push(comp);
                return; // Treat explicit wire objects specially below
            }

            const terms = getTerminals(comp);
            const config = getComponentConfig(comp.type);
            config.terminals.forEach(termDef => {
                const term = terms[termDef.termKey];
                if (term && term.isReal) {
                    const collapsed = collapseNode(comp[termDef.key]);
                    if (!nodes[collapsed]) nodes[collapsed] = [];
                    nodes[collapsed].push({ ...term, compId: comp.id, termKey: termDef.termKey });
                }
            });
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

            const isGround = w.node1 === 'GND' || w.node2 === 'GND';
            const wireColor = isGround ? '#22c55e' : '#3b82f6';
            const dash = isGround ? '6 3' : 'none';

            const curve = buildTerminalCurve(root, target);
            const rX = curve.root.x + WIRE_OFFSET;
            const rY = curve.root.y + WIRE_OFFSET;
            const tX = curve.target.x + WIRE_OFFSET;
            const tY = curve.target.y + WIRE_OFFSET;
            const cp1X = curve.cp1.x + WIRE_OFFSET;
            const cp1Y = curve.cp1.y + WIRE_OFFSET;
            const cp2X = curve.cp2.x + WIRE_OFFSET;
            const cp2Y = curve.cp2.y + WIRE_OFFSET;

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

                    const curve = buildTerminalCurve(bestP1, bestP2);
                    const rX = curve.root.x + WIRE_OFFSET;
                    const rY = curve.root.y + WIRE_OFFSET;
                    const tX = curve.target.x + WIRE_OFFSET;
                    const tY = curve.target.y + WIRE_OFFSET;
                    const cp1X = curve.cp1.x + WIRE_OFFSET;
                    const cp1Y = curve.cp1.y + WIRE_OFFSET;
                    const cp2X = curve.cp2.x + WIRE_OFFSET;
                    const cp2Y = curve.cp2.y + WIRE_OFFSET;

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
            role="application"
            tabIndex={0}
            aria-label="Interactive Circuit Canvas"
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={handleCanvasClick}
            onWheel={handleWheel}
            onKeyDown={handleKeyDown}
            onContextMenu={(e) => e.preventDefault()}
            style={{ cursor: wireCutStart ? 'crosshair' : (isPanning ? 'grabbing' : (draggingId ? 'grabbing' : 'default')) }}
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
                    {wireCutStart && wireCutPos && (
                        <line
                            x1={wireCutStart.x + WIRE_OFFSET}
                            y1={wireCutStart.y + WIRE_OFFSET}
                            x2={wireCutPos.x + WIRE_OFFSET}
                            y2={wireCutPos.y + WIRE_OFFSET}
                            stroke="#ef4444"
                            strokeWidth="4"
                            strokeDasharray="8 6"
                            opacity="0.9"
                        />
                    )}
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

                {/* Draw components */}
                {components.filter(c => c.type !== 'W').map(comp => {
                    const SvgIcon = COMPONENT_SVG[comp.type] || COMPONENT_SVG['R'];
                    const isSelected = comp.id === selectedId;
                    const isPreviewed = comp.id === previewId;

                    return (
                        <div
                            key={comp.id}
                            data-comp-id={comp.id}
                            className={`circuit-component ${isSelected ? 'selected' : ''} ${isPreviewed ? 'previewed' : ''}`}
                            style={{
                                left: comp.x,
                                top: comp.y,
                                transform: `translate(-50%, -50%) rotate(${comp.rotation || 0}deg)`,
                                zIndex: isPreviewed ? 25 : (isSelected ? 20 : 5),
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

                {/* Draw terminal handles ON TOP of components so they always receive mouse events */}
                {!readOnly && components.filter(comp => comp.type !== 'W').flatMap(comp => {
                    const terms = getTerminals(comp);
                    const config = getComponentConfig(comp.type);
                    return config.terminals.map(termDef => {
                        const term = terms[termDef.termKey];
                        if (!term || !term.isReal) return null;
                        const shortLabel = String.fromCharCode(96 + parseInt(termDef.termKey.slice(1)));
                        return (
                            <React.Fragment key={`${comp.id}-${termDef.termKey}`}>
                                <div
                                    className={`terminal-handle ${hoveredTerminal?.compId === comp.id && hoveredTerminal?.termKey === termDef.termKey ? 'hovered' : ''} ${wiringStart?.compId === comp.id && wiringStart?.termKey === termDef.termKey ? 'active' : ''}`}
                                    style={{ left: term.x, top: term.y }}
                                    onMouseDown={(e) => handleTerminalMouseDown(e, comp, termDef.termKey)}
                                    title={`${termDef.label}: Drag to connect. Ctrl+Click to disconnect.`}
                                />
                                <div
                                    className="terminal-label"
                                    style={{ left: term.x + (term.nx * 14), top: term.y + (term.ny * 14) }}
                                >
                                    {shortLabel}
                                </div>
                            </React.Fragment>
                        );
                    }).filter(Boolean);
                })}
            </div>
        </div>
    );
}

export default CircuitCanvas;
