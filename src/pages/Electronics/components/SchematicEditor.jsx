import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CircuitCanvas from './CircuitCanvas';
import { COMPONENT_TYPES } from '../engine/CircuitEngine';
import { buildNodeCollapseMap } from '../engine/nodeCollapse';
import { getTerminalDescriptors } from '../engine/componentConfig';
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

const getMaxNodeIndex = (sourceComponents) => sourceComponents.reduce((max, component) => {
    if (component.type === 'W') return max;
    const nodeIndices = [parseNodeIndex(component.node1), parseNodeIndex(component.node2)].filter(Number.isFinite);
    if (nodeIndices.length === 0) return max;
    return Math.max(max, ...nodeIndices);
}, 0);

const parseTerminalOptionKey = (optionKey) => {
    if (typeof optionKey !== 'string') return null;
    const match = optionKey.match(/^(.*):(a|b)$/);
    if (!match) return null;
    return {
        componentId: match[1],
        terminalKey: match[2] === 'a' ? 't1' : 't2'
    };
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
    const [extraTerminalSelectors, setExtraTerminalSelectors] = useState({ node1: [], node2: [] });
    const componentMenuRef = useRef(null);
    const circuitCanvasRef = useRef(null);
    const terminalSelectorIdRef = useRef(0);

    // Single cached collapse map — avoids rebuilding union-find 5× per render
    const collapseNode = useMemo(() => buildNodeCollapseMap(components), [components]);

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
        // Extra connection selectors are scoped to the selected component.
        setExtraTerminalSelectors({ node1: [], node2: [] });
    }, [selectedId]);

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
                    nodeName: collapseNode(component.node1),
                    rawNodeName: component.node1,
                    label: `${component.id} (a)`
                });
            }

            if (component.node2) {
                options.push({
                    key: `${component.id}:b`,
                    nodeName: collapseNode(component.node2),
                    rawNodeName: component.node2,
                    label: `${component.id} (b)`
                });
            }
        });

        return options;
    }, [components]);

    const getOrderedTerminalOptions = useCallback((field) => {
        const rawNodeName = localProps?.[field];
        const collapsedNodeName = rawNodeName ? collapseNode(rawNodeName) : rawNodeName;
        const selectedTermKey = field === 'node1' ? 'a' : 'b';

        return [...terminalOptions].sort((left, right) => {
            const leftIsSelectedNode = left.nodeName === collapsedNodeName;
            const rightIsSelectedNode = right.nodeName === collapsedNodeName;

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
    }, [components, localProps, selectedId, terminalOptions, collapseNode]);

    const connectionTerminalOptions = useCallback((field) => {
        const selectedTermKey = field === 'node1' ? 'a' : 'b';
        return getOrderedTerminalOptions(field)
            .filter(option => option.key !== `${selectedId}:${selectedTermKey}`);
    }, [getOrderedTerminalOptions, selectedId]);

    const handleNodeSelection = (field, selection) => {
        const resolvedNode = selection === CREATE_NODE_OPTION
            ? getNextNodeName(components)
            : selection;

        handleLocalPropChange(field, resolvedNode);
        applyPropChange(field, resolvedNode);
    };

    const connectTerminalToOption = useCallback((field, optionKey) => {
        const parsed = parseTerminalOptionKey(optionKey);
        if (!parsed || !selectedId) return;

        const sourceTerm = field === 'node1' ? 't1' : 't2';

        if (parsed.componentId === selectedId && parsed.terminalKey === sourceTerm) {
            return;
        }

        setComponents(prev => {
            const sourceComponent = prev.find(component => component.id === selectedId);
            const targetComponent = prev.find(component => component.id === parsed.componentId);
            if (!sourceComponent || !targetComponent) return prev;

            const sourceNode = sourceTerm === 't1' ? sourceComponent.node1 : sourceComponent.node2;
            const targetNode = parsed.terminalKey === 't1' ? targetComponent.node1 : targetComponent.node2;

            // Bug #7 fix: Don't do a global node rename. Just create a wire object.
            // The engine's _buildCollapsedNetlist() union-find handles merging at solve time.

            const existingWire = prev.some(component => {
                if (component.type !== 'W') return false;

                const sameDirection = component.sourceComp === selectedId
                    && component.sourceTerm === sourceTerm
                    && component.targetComp === parsed.componentId
                    && component.targetTerm === parsed.terminalKey;

                const reverseDirection = component.sourceComp === parsed.componentId
                    && component.sourceTerm === parsed.terminalKey
                    && component.targetComp === selectedId
                    && component.targetTerm === sourceTerm;

                return sameDirection || reverseDirection;
            });

            if (existingWire) return prev;

            return [
                ...prev,
                {
                    type: 'W',
                    id: `W_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
                    sourceComp: selectedId,
                    sourceTerm,
                    targetComp: parsed.componentId,
                    targetTerm: parsed.terminalKey,
                    // Bug #8 fix: Store real source and target node names
                    node1: sourceNode,
                    node2: targetNode,
                    x: 0,
                    y: 0
                }
            ];
        });
    }, [selectedId, setComponents]);

    const disconnectTerminalFromOption = useCallback((field, optionKey) => {
        const parsed = parseTerminalOptionKey(optionKey);
        if (!parsed || !selectedId) return;

        const sourceTerm = field === 'node1' ? 't1' : 't2';

        setComponents(prev => {
            const sourceComponent = prev.find(component => component.id === selectedId);
            const targetComponent = prev.find(component => component.id === parsed.componentId);
            if (!sourceComponent || !targetComponent) return prev;

            const sourceNode = sourceTerm === 't1' ? sourceComponent.node1 : sourceComponent.node2;
            const targetNode = parsed.terminalKey === 't1' ? targetComponent.node1 : targetComponent.node2;

            const nextWithoutWire = prev.filter(component => {
                if (component.type !== 'W') return true;

                const sameDirection = component.sourceComp === selectedId
                    && component.sourceTerm === sourceTerm
                    && component.targetComp === parsed.componentId
                    && component.targetTerm === parsed.terminalKey;

                const reverseDirection = component.sourceComp === parsed.componentId
                    && component.sourceTerm === parsed.terminalKey
                    && component.targetComp === selectedId
                    && component.targetTerm === sourceTerm;

                return !(sameDirection || reverseDirection);
            });

            // If these terminals are not electrically joined anymore, removing the wire is enough.
            if (sourceNode !== targetNode) return nextWithoutWire;

            const sourceIsGround = sourceNode === 'GND' || sourceComponent.type === 'G';
            const targetIsGround = targetNode === 'GND' || targetComponent.type === 'G';

            let splitCompId = parsed.componentId;
            let splitTerm = parsed.terminalKey;

            if (!sourceIsGround && targetIsGround) {
                splitCompId = selectedId;
                splitTerm = sourceTerm;
            }

            // Nothing to split if both sides are true ground.
            if ((sourceIsGround && splitCompId === selectedId && sourceComponent.type === 'G')
                || (targetIsGround && splitCompId === parsed.componentId && targetComponent.type === 'G')) {
                return nextWithoutWire;
            }

            const maxNodeIndex = getMaxNodeIndex(nextWithoutWire);
            const replacementNode = `NODE-${maxNodeIndex + 1}`;

            return nextWithoutWire.map(component => {
                if (component.type === 'W' || component.id !== splitCompId) return component;

                if (splitTerm === 't1') {
                    return { ...component, node1: replacementNode };
                }

                return { ...component, node2: replacementNode };
            });
        });
    }, [selectedId, setComponents]);

    const handleAddTerminalSelector = (field) => {
        const selectorId = `${field}-${terminalSelectorIdRef.current++}`;
        setExtraTerminalSelectors(prev => ({
            ...prev,
            [field]: [...prev[field], { id: selectorId, value: '' }]
        }));
    };

    const handleRemoveTerminalSelector = (field, selectorId, selectorValue) => {
        if (selectorValue) {
            disconnectTerminalFromOption(field, selectorValue);
        }

        setExtraTerminalSelectors(prev => ({
            ...prev,
            [field]: prev[field].filter(selector => selector.id !== selectorId)
        }));
    };

    const handleExtraTerminalSelection = (field, selectorId, selectedOptionKey) => {
        if (!selectedOptionKey) {
            setExtraTerminalSelectors(prev => ({
                ...prev,
                [field]: prev[field].map(selector => (
                    selector.id === selectorId
                        ? { ...selector, value: '' }
                        : selector
                ))
            }));
            return;
        }

        const selectedOption = terminalOptions.find(option => option.key === selectedOptionKey);
        if (!selectedOption) return;

        const resolvedNode = selectedOption.nodeName;
        const activeNode = localProps?.[field];

        if (!activeNode) {
            setExtraTerminalSelectors(prev => ({
                ...prev,
                [field]: prev[field].map(selector => (
                    selector.id === selectorId
                        ? { ...selector, value: selectedOptionKey }
                        : selector
                ))
            }));
            handleNodeSelection(field, resolvedNode);
            return;
        }

        connectTerminalToOption(field, selectedOptionKey);

        // Keep selector value on the active net so it remains stable after merges.
        setExtraTerminalSelectors(prev => ({
            ...prev,
            [field]: prev[field].map(selector => (
                selector.id === selectorId
                    ? { ...selector, value: selectedOptionKey }
                    : selector
            ))
        }));
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

    const renderTerminalField = (field, label) => {
        const selectors = extraTerminalSelectors[field];
        const rawNodeName = localProps[field];
        const collapsedValue = rawNodeName ? collapseNode(rawNodeName) : rawNodeName;
        const sourceTerm = field === 'node1' ? 't1' : 't2';
        const sourceTermLabel = field === 'node1' ? 'a' : 'b';

        // Find ALL directly-wired terminals via explicit wire objects
        const allWiredKeys = [];
        components.forEach(c => {
            if (c.type !== 'W') return;
            if (c.sourceComp === selectedId && c.sourceTerm === sourceTerm) {
                const key = `${c.targetComp}:${c.targetTerm === 't1' ? 'a' : 'b'}`;
                if (!allWiredKeys.includes(key)) allWiredKeys.push(key);
            }
            if (c.targetComp === selectedId && c.targetTerm === sourceTerm) {
                const key = `${c.sourceComp}:${c.sourceTerm === 't1' ? 'a' : 'b'}`;
                if (!allWiredKeys.includes(key)) allWiredKeys.push(key);
            }
        });

        // Primary connection: first explicit wire, or first same-collapsed-group terminal
        let primaryKey = allWiredKeys[0] || null;
        if (!primaryKey) {
            const match = terminalOptions.find(opt =>
                opt.nodeName === collapsedValue && opt.key !== `${selectedId}:${sourceTermLabel}`
            );
            if (match) primaryKey = match.key;
        }

        const selectValue = primaryKey || `${selectedId}:${sourceTermLabel}`;

        // Additional wired connections (beyond the first)
        const additionalWiredKeys = allWiredKeys.slice(1);

        // Sort options: primary wired first, then other wired, then same collapsed group, then others
        const wiredSet = new Set(allWiredKeys);
        const sortedOptions = [...terminalOptions]
            .filter(opt => opt.key !== `${selectedId}:${sourceTermLabel}`) // exclude self
            .sort((a, b) => {
                const aIsPrimary = a.key === primaryKey;
                const bIsPrimary = b.key === primaryKey;
                if (aIsPrimary !== bIsPrimary) return aIsPrimary ? -1 : 1;

                const aIsWired = wiredSet.has(a.key);
                const bIsWired = wiredSet.has(b.key);
                if (aIsWired !== bIsWired) return aIsWired ? -1 : 1;

                const aIsConnected = a.nodeName === collapsedValue;
                const bIsConnected = b.nodeName === collapsedValue;
                if (aIsConnected !== bIsConnected) return aIsConnected ? -1 : 1;

                return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
            });

        return (
            <div className="terminal-field">
                <span className="terminal-field-label">{label}:</span>
                <div className="terminal-control-group">
                    <div className="terminal-select-row">
                        <select
                            value={selectValue}
                            onChange={(e) => {
                                const selectedKey = e.target.value;
                                if (selectedKey === CREATE_NODE_OPTION) {
                                    const newNode = getNextNodeName(components);
                                    handleLocalPropChange(field, newNode);
                                    applyPropChange(field, newNode);
                                } else {
                                    // Disconnect primary if it exists, then connect new
                                    if (primaryKey) disconnectTerminalFromOption(field, primaryKey);
                                    connectTerminalToOption(field, selectedKey);
                                }
                            }}
                        >
                            {sortedOptions.map(option => (
                                <option key={option.key} value={option.key}>{option.label}</option>
                            ))}
                            <option value={CREATE_NODE_OPTION}>+ Create New Node</option>
                        </select>
                        <button
                            type="button"
                            className="terminal-remove-btn"
                            onClick={() => { if (primaryKey) disconnectTerminalFromOption(field, primaryKey); }}
                            aria-label={`Remove primary ${label.toLowerCase()} connection`}
                        >
                            x
                        </button>
                    </div>
                    {additionalWiredKeys.map(wiredKey => {
                        const opt = terminalOptions.find(o => o.key === wiredKey);
                        const wiredLabel = opt ? opt.label : wiredKey;
                        return (
                            <div key={`wired-${wiredKey}`} className="terminal-select-row extra-terminal-select-row">
                                <select value={wiredKey} onChange={(e) => {
                                    disconnectTerminalFromOption(field, wiredKey);
                                    if (e.target.value) connectTerminalToOption(field, e.target.value);
                                }}>
                                    <option value={wiredKey}>{wiredLabel}</option>
                                    {sortedOptions.filter(o => o.key !== wiredKey && !allWiredKeys.includes(o.key)).map(option => (
                                        <option key={option.key} value={option.key}>{option.label}</option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    className="terminal-remove-btn"
                                    onClick={() => disconnectTerminalFromOption(field, wiredKey)}
                                    aria-label={`Remove connection to ${wiredLabel}`}
                                >
                                    x
                                </button>
                            </div>
                        );
                    })}
                    {selectors.map(selector => (
                        <div key={selector.id} className="terminal-select-row extra-terminal-select-row">
                            <select
                                value={selector.value}
                                onChange={(e) => handleExtraTerminalSelection(field, selector.id, e.target.value)}
                            >
                                <option value="">Connect to terminal...</option>
                                {connectionTerminalOptions(field).map(option => (
                                    <option key={`${selector.id}-${option.key}`} value={option.key}>{option.label}</option>
                                ))}
                            </select>
                            <button
                                type="button"
                                className="terminal-remove-btn"
                                onClick={() => handleRemoveTerminalSelector(field, selector.id, selector.value)}
                                aria-label={`Remove ${label.toLowerCase()} connection target`}
                            >
                                x
                            </button>
                        </div>
                    ))}
                    <button
                        type="button"
                        className="terminal-add-btn"
                        onClick={() => handleAddTerminalSelector(field)}
                        aria-label={`Add another ${label.toLowerCase()} terminal connection`}
                    >
                        +
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="schematic-editor">
            <div className="toolbar">
                <button onClick={() => handleAdd(COMPONENT_TYPES.RESISTOR)}>Add R</button>
                <button onClick={() => handleAdd(COMPONENT_TYPES.CAPACITOR)}>Add C</button>
                <button onClick={() => handleAdd(COMPONENT_TYPES.INDUCTOR)}>Add L</button>
                <button onClick={() => handleAdd(COMPONENT_TYPES.AC_VOLTAGE)}>Add AC Source</button>
                <button onClick={() => handleAdd(COMPONENT_TYPES.GROUND)}>Add Ground</button>
                <div className="auto-connect-label">
                    <input
                        id="autoConnectToggle"
                        type="checkbox"
                        checked={autoConnect}
                        onChange={(e) => setAutoConnect(e.target.checked)}
                    />
                    <label htmlFor="autoConnectToggle">
                        Auto-connect Nodes
                    </label>
                </div>
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
                    <div>
                        <label htmlFor="propValue">
                            Value:
                        </label>
                        <input
                            id="propValue"
                            type="number"
                            value={localProps.value}
                            onChange={(e) => handleLocalPropChange('value', parseFloat(e.target.value))}
                            onBlur={(e) => applyPropChange('value', parseFloat(e.target.value))}
                            onKeyDown={(e) => e.key === 'Enter' && applyPropChange('value', parseFloat(e.target.value))}
                        />
                    </div>
                    {selectedComponent && getTerminalDescriptors(selectedComponent.type).map(termDef => (
                        renderTerminalField(termDef.key, termDef.label)
                    ))}
                    <div>
                        <label htmlFor="propRotation">
                            Rotation:
                        </label>
                        <input
                            id="propRotation"
                            type="number"
                            step="90"
                            value={localProps.rotation || 0}
                            onChange={(e) => handleLocalPropChange('rotation', parseInt(e.target.value))}
                            onBlur={(e) => applyPropChange('rotation', parseInt(e.target.value))}
                            onKeyDown={(e) => e.key === 'Enter' && applyPropChange('rotation', parseInt(e.target.value))}
                        />
                    </div>
                    <button className="delete-btn" onClick={handleDelete}>Delete</button>
                </div>
            )}
        </div>
    );
};

export default SchematicEditor;
