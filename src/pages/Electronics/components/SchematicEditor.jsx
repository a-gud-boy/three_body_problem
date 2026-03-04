// src/pages/Electronics/components/SchematicEditor.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CircuitCanvas from './CircuitCanvas';
import { COMPONENT_TYPES } from '../engine/CircuitEngine';
import './SchematicEditor.css';

const CREATE_NODE_OPTION = '__create_node__';

const COMPONENT_LABELS = {
    [COMPONENT_TYPES.RESISTOR]: 'Resistor',
    [COMPONENT_TYPES.CAPACITOR]: 'Capacitor',
    [COMPONENT_TYPES.INDUCTOR]: 'Inductor',
    [COMPONENT_TYPES.AC_VOLTAGE]: 'AC-Source',
    [COMPONENT_TYPES.GROUND]: 'Ground'
};

const NODE_PATTERNS = [/^NODE-(\d+)$/i, /^n(\d+)$/i];

const parseNodeIndex = (nodeName) => {
    if (typeof nodeName !== 'string') return null;
    for (const pattern of NODE_PATTERNS) {
        const match = nodeName.match(pattern);
        if (match) return Number(match[1]);
    }
    return null;
};

const normalizeNodeName = (nodeName) => {
    if (nodeName === 'GND') return 'GND';
    const index = parseNodeIndex(nodeName);
    if (Number.isFinite(index)) return `NODE-${index}`;
    return nodeName;
};

const getNextNodeName = (sourceComponents, offset = 0) => {
    const maxIndex = sourceComponents.reduce((max, component) => {
        if (component.type === 'W') return max;
        const nodeIndices = [parseNodeIndex(component.node1), parseNodeIndex(component.node2)].filter(Number.isFinite);
        if (nodeIndices.length === 0) return max;
        return Math.max(max, ...nodeIndices);
    }, 0);
    return `NODE-${maxIndex + 1 + offset}`;
};

const getNextComponentId = (type, sourceComponents) => {
    const label = COMPONENT_LABELS[type] || type;
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matcher = new RegExp(`^${escapedLabel}-(\\d+)$`, 'i');

    const maxIndex = sourceComponents.reduce((max, component) => {
        if (component.type !== type || typeof component.id !== 'string') return max;
        const match = component.id.match(matcher);
        if (!match) return max;
        return Math.max(max, Number(match[1]));
    }, 0);

    return `${label}-${maxIndex + 1}`;
};

const SchematicEditor = ({ components, setComponents, selectedId, setSelectedId }) => {
    const [autoConnect, setAutoConnect] = useState(true);
    const [componentMenuOpen, setComponentMenuOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const componentMenuRef = useRef(null);
    const circuitCanvasRef = useRef(null);

    const handleAdd = (type) => {
        const newId = getNextComponentId(type, components);
        const nextNode = getNextNodeName(components);
        const spawnOffset = (components.length % 10) * 20; // Slight stagger to prevent immediate terminal overlap

        let node1 = nextNode;
        let node2 = getNextNodeName(components, 1);
        if (type === COMPONENT_TYPES.AC_VOLTAGE) {
            node2 = 'GND';
        }
        if (type === COMPONENT_TYPES.GROUND) {
            node1 = 'GND';
            node2 = 'GND';
        }

        setComponents([...components, {
            id: newId,
            type: type,
            node1,
            node2,
            value: type === 'R' ? 1000 : (type === 'C' ? 1e-6 : (type === 'Vac' ? 10 : 0)),
            x: 100 + spawnOffset,
            y: 100 + spawnOffset,
            rotation: 0
        }]);
        setSelectedId(newId);
    };

    const handleDelete = () => {
        setComponents(prev => prev.filter(c =>
            c.id !== selectedId &&
            !(c.type === 'W' && (c.sourceComp === selectedId || c.targetComp === selectedId))
        ));
        setSelectedId(null);
    };

    const selectedComponent = components.find(c => c.id === selectedId);

    // Local state for properties to prevent focus loss during typing
    const [localProps, setLocalProps] = useState(null);

    // Sync local props when selection changes or external components update
    useEffect(() => {
        if (selectedId) {
            const comp = components.find(c => c.id === selectedId);
            setLocalProps(comp ? { ...comp } : null);
        } else {
            setLocalProps(null);
        }
    }, [selectedId, components]);

    useEffect(() => {
        const hasLegacyNode = components.some(component => {
            if (component.type === 'W') return false;
            return /^n\d+$/i.test(component.node1) || /^n\d+$/i.test(component.node2);
        });

        if (!hasLegacyNode) return;

        setComponents(prev => prev.map(component => ({
            ...component,
            node1: normalizeNodeName(component.node1),
            node2: normalizeNodeName(component.node2)
        })));
    }, [components, setComponents]);

    useEffect(() => {
        if (!componentMenuOpen) {
            circuitCanvasRef.current?.clearPreview();
            setHighlightedIndex(-1);
        }
    }, [componentMenuOpen]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (componentMenuRef.current && !componentMenuRef.current.contains(event.target)) {
                setComponentMenuOpen(false);
                circuitCanvasRef.current?.clearPreview();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleLocalPropChange = (field, value) => {
        setLocalProps(prev => ({ ...prev, [field]: value }));
    };

    const applyPropChange = (field, value) => {
        setComponents(prev => prev.map(c =>
            c.id === selectedId ? { ...c, [field]: value } : c
        ));
    };

    const nodeOptions = useMemo(() => {
        const set = new Set(['GND']);
        components.forEach(component => {
            if (component.type === 'W') return;
            if (component.node1) set.add(component.node1);
            if (component.node2) set.add(component.node2);
        });

        return [...set].sort((a, b) => {
            if (a === 'GND') return -1;
            if (b === 'GND') return 1;

            const aIndex = parseNodeIndex(a);
            const bIndex = parseNodeIndex(b);
            if (Number.isFinite(aIndex) && Number.isFinite(bIndex)) {
                return aIndex - bIndex;
            }

            return a.localeCompare(b, undefined, { sensitivity: 'base' });
        });
    }, [components]);

    const terminalOptions = useMemo(() => {
        const sourceComponents = components
            .filter(component => component.type !== 'W')
            .sort((a, b) => a.id.localeCompare(b.id, undefined, { sensitivity: 'base' }));

        const options = [];
        sourceComponents.forEach(component => {
            if (component.node1) {
                options.push({
                    key: `${component.id}:a`,
                    nodeName: component.node1,
                    label: `${component.id} (a)`
                });
            }

            if (component.node2) {
                options.push({
                    key: `${component.id}:b`,
                    nodeName: component.node2,
                    label: `${component.id} (b)`
                });
            }
        });

        // Defensive fallback for any net that exists without a rendered terminal option.
        const representedNodes = new Set(options.map(option => option.nodeName));
        nodeOptions.forEach(nodeName => {
            if (representedNodes.has(nodeName)) return;
            options.push({
                key: `node:${nodeName}`,
                nodeName,
                label: nodeName === 'GND' ? 'Ground (GND)' : normalizeNodeName(nodeName)
            });
        });

        return options;
    }, [components, nodeOptions]);

    const getOrderedTerminalOptions = useCallback((field) => {
        const selectedNodeName = localProps?.[field];
        const selectedTermKey = field === 'node1' ? 'a' : 'b';

        return [...terminalOptions].sort((left, right) => {
            const leftIsSelectedNode = left.nodeName === selectedNodeName;
            const rightIsSelectedNode = right.nodeName === selectedNodeName;

            if (leftIsSelectedNode !== rightIsSelectedNode) {
                return leftIsSelectedNode ? -1 : 1;
            }

            // For the active node, show connected counterpart terminals before the same component terminal.
            if (leftIsSelectedNode && rightIsSelectedNode && selectedId) {
                const leftIsSelf = left.key === `${selectedId}:${selectedTermKey}`;
                const rightIsSelf = right.key === `${selectedId}:${selectedTermKey}`;
                if (leftIsSelf !== rightIsSelf) {
                    return leftIsSelf ? 1 : -1;
                }
            }

            return left.label.localeCompare(right.label, undefined, { sensitivity: 'base' });
        });
    }, [localProps, selectedId, terminalOptions]);

    const handleNodeSelection = (field, selection) => {
        const resolvedNode = selection === CREATE_NODE_OPTION
            ? getNextNodeName(components)
            : selection;

        handleLocalPropChange(field, resolvedNode);
        applyPropChange(field, resolvedNode);
    };

    const selectableComponents = useMemo(
        () => components.filter(component => component.type !== 'W'),
        [components]
    );

    useEffect(() => {
        if (!componentMenuOpen) return;
        const selectedIndex = selectableComponents.findIndex(c => c.id === selectedId);
        const nextIndex = selectedIndex >= 0 ? selectedIndex : (selectableComponents.length > 0 ? 0 : -1);
        setHighlightedIndex(nextIndex);
        if (nextIndex >= 0) circuitCanvasRef.current?.setPreview(selectableComponents[nextIndex].id);
    }, [componentMenuOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleComponentPick = (componentId) => {
        setSelectedId(componentId);
        setComponentMenuOpen(false);
        circuitCanvasRef.current?.clearPreview();
    };

    const shiftDropdownHighlight = (delta) => {
        if (selectableComponents.length === 0) return;
        const baseIndex = highlightedIndex >= 0 ? highlightedIndex : 0;
        const nextIndex = (baseIndex + delta + selectableComponents.length) % selectableComponents.length;
        setHighlightedIndex(nextIndex);
        circuitCanvasRef.current?.setPreview(selectableComponents[nextIndex].id);
    };

    const handleDropdownTriggerKeyDown = (event) => {
        if (!componentMenuOpen && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
            event.preventDefault();
            setComponentMenuOpen(true);
            return;
        }

        if (!componentMenuOpen) return;

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            shiftDropdownHighlight(1);
            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            shiftDropdownHighlight(-1);
            return;
        }

        if (event.key === 'Enter') {
            event.preventDefault();
            if (highlightedIndex >= 0 && selectableComponents[highlightedIndex]) {
                handleComponentPick(selectableComponents[highlightedIndex].id);
            }
            return;
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            setComponentMenuOpen(false);
            circuitCanvasRef.current?.clearPreview();
        }
    };

    return (
        <div className="schematic-editor">
            <div className="toolbar">
                <button onClick={() => handleAdd(COMPONENT_TYPES.RESISTOR)}>Add R</button>
                <button onClick={() => handleAdd(COMPONENT_TYPES.CAPACITOR)}>Add C</button>
                <button onClick={() => handleAdd(COMPONENT_TYPES.INDUCTOR)}>Add L</button>
                <button onClick={() => handleAdd(COMPONENT_TYPES.AC_VOLTAGE)}>Add AC Source</button>
                <button onClick={() => handleAdd(COMPONENT_TYPES.GROUND)}>Add Ground</button>
                <label className="auto-connect-label">
                    <input
                        type="checkbox"
                        checked={autoConnect}
                        onChange={(e) => setAutoConnect(e.target.checked)}
                    />
                    Auto-connect Nodes
                </label>
            </div>

            <div className="canvas-wrapper">
                <CircuitCanvas
                    ref={circuitCanvasRef}
                    components={components}
                    setComponents={setComponents}
                    onSelectionChange={setSelectedId}
                    selectedComponentId={selectedId}
                    autoConnect={autoConnect}
                />
            </div>

            {localProps && selectedComponent && (
                <div className="properties-panel">
                    <h3>Properties: {localProps.id}</h3>
                    <div
                        className="component-dropdown"
                        ref={componentMenuRef}
                    >
                        <span className="component-dropdown-label">Component:</span>
                        <button
                            type="button"
                            className="component-dropdown-trigger"
                            onClick={() => setComponentMenuOpen(prev => !prev)}
                            onKeyDown={handleDropdownTriggerKeyDown}
                            aria-haspopup="listbox"
                            aria-expanded={componentMenuOpen}
                        >
                            {localProps.id}
                        </button>
                        {componentMenuOpen && (
                            <div
                                className="component-dropdown-menu"
                                role="listbox"
                                aria-label="Circuit Components"
                                onMouseLeave={() => circuitCanvasRef.current?.clearPreview()}
                            >
                                {selectableComponents.map((component, index) => (
                                    <button
                                        type="button"
                                        key={component.id}
                                        data-component-id={component.id}
                                        className={`component-dropdown-item ${component.id === selectedId ? 'active' : ''} ${index === highlightedIndex ? 'preview' : ''}`}
                                        onMouseEnter={() => {
                                            setHighlightedIndex(index);
                                            circuitCanvasRef.current?.setPreview(component.id);
                                        }}
                                        onClick={() => handleComponentPick(component.id)}
                                    >
                                        {component.id}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <label>
                        Value:
                        <input
                            type="number"
                            value={localProps.value}
                            onChange={(e) => handleLocalPropChange('value', parseFloat(e.target.value))}
                            onBlur={(e) => applyPropChange('value', parseFloat(e.target.value))}
                            onKeyDown={(e) => e.key === 'Enter' && applyPropChange('value', parseFloat(e.target.value))}
                        />
                    </label>
                    <label>
                        Terminal a:
                        <select
                            value={localProps.node1}
                            onChange={(e) => handleNodeSelection('node1', e.target.value)}
                        >
                            {getOrderedTerminalOptions('node1').map(option => (
                                <option key={option.key} value={option.nodeName}>{option.label}</option>
                            ))}
                            <option value={CREATE_NODE_OPTION}>+ Create New Node</option>
                        </select>
                    </label>
                    <label>
                        Terminal b:
                        <select
                            value={localProps.node2}
                            onChange={(e) => handleNodeSelection('node2', e.target.value)}
                        >
                            {getOrderedTerminalOptions('node2').map(option => (
                                <option key={option.key} value={option.nodeName}>{option.label}</option>
                            ))}
                            <option value={CREATE_NODE_OPTION}>+ Create New Node</option>
                        </select>
                    </label>
                    <label>
                        Rotation:
                        <input
                            type="number"
                            step="90"
                            value={localProps.rotation || 0}
                            onChange={(e) => handleLocalPropChange('rotation', parseInt(e.target.value))}
                            onBlur={(e) => applyPropChange('rotation', parseInt(e.target.value))}
                            onKeyDown={(e) => e.key === 'Enter' && applyPropChange('rotation', parseInt(e.target.value))}
                        />
                    </label>
                    <button className="delete-btn" onClick={handleDelete}>Delete</button>
                </div>
            )}
        </div>
    );
};

export default SchematicEditor;
