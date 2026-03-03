// src/pages/Electronics/components/SchematicEditor.jsx
import React, { useState, useRef, useCallback } from 'react';
import CircuitCanvas from './CircuitCanvas';
import { COMPONENT_TYPES } from '../engine/CircuitEngine';
import './SchematicEditor.css';

const SchematicEditor = ({ components, setComponents, selectedId, setSelectedId }) => {
    const [autoConnect, setAutoConnect] = useState(true);
    const idCounterRef = useRef(components.length + 1);

    const handleAdd = (type) => {
        const counter = idCounterRef.current++;
        const newId = `${type}${counter}`;
        const spawnOffset = (components.length % 10) * 20; // Slight stagger to prevent immediate terminal overlap
        setComponents([...components, {
            id: newId,
            type: type,
            node1: `n${counter}`,
            node2: `n${counter + 1}`,
            value: type === 'R' ? 1000 : (type === 'C' ? 1e-6 : (type === 'Vac' ? 10 : 0)),
            x: 100 + spawnOffset,
            y: 100 + spawnOffset,
            rotation: 0
        }]);
        setSelectedId(newId);
    };

    const handleUpdate = (field, value) => {
        setComponents(prev => prev.map(c =>
            c.id === selectedId ? { ...c, [field]: value } : c
        ));
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
    React.useEffect(() => {
        if (selectedId) {
            const comp = components.find(c => c.id === selectedId);
            setLocalProps(comp ? { ...comp } : null);
        } else {
            setLocalProps(null);
        }
    }, [selectedId, components]);

    const handleLocalPropChange = (field, value) => {
        setLocalProps(prev => ({ ...prev, [field]: value }));
    };

    const applyPropChange = (field, value) => {
        setComponents(prev => prev.map(c =>
            c.id === selectedId ? { ...c, [field]: value } : c
        ));
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
                    components={components}
                    setComponents={setComponents}
                    onSelectionChange={setSelectedId}
                    autoConnect={autoConnect}
                />
            </div>

            {localProps && selectedComponent && (
                <div className="properties-panel">
                    <h3>Properties: {localProps.id}</h3>
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
                        Node 1:
                        <input
                            type="text"
                            value={localProps.node1}
                            onChange={(e) => handleLocalPropChange('node1', e.target.value)}
                            onBlur={(e) => applyPropChange('node1', e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && applyPropChange('node1', e.target.value)}
                        />
                    </label>
                    <label>
                        Node 2:
                        <input
                            type="text"
                            value={localProps.node2}
                            onChange={(e) => handleLocalPropChange('node2', e.target.value)}
                            onBlur={(e) => applyPropChange('node2', e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && applyPropChange('node2', e.target.value)}
                        />
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
