// src/pages/Electronics/components/SchematicEditor.jsx
import React, { useState } from 'react';
import CircuitCanvas from './CircuitCanvas';
import { COMPONENT_TYPES } from '../engine/CircuitEngine';
import './SchematicEditor.css';

const SchematicEditor = ({ components, setComponents, initialComponents = [] }) => {
    const [selectedId, setSelectedId] = useState(null);
    const [autoConnect, setAutoConnect] = useState(true);

    const handleAdd = (type) => {
        const newId = `${type}${components.length + 1}`;
        setComponents([...components, {
            id: newId,
            type: type,
            node1: `n${components.length}`,
            node2: `n${components.length + 1}`,
            value: type === 'R' ? 1000 : (type === 'C' ? 1e-6 : (type === 'Vac' ? 10 : 0)),
            x: 100,
            y: 100,
            rotation: 0
        }]);
    };

    const handleUpdate = (field, value) => {
        setComponents(prev => prev.map(c =>
            c.id === selectedId ? { ...c, [field]: value } : c
        ));
    };

    const handleDelete = () => {
        setComponents(prev => prev.filter(c => c.id !== selectedId));
        setSelectedId(null);
    };

    const selectedComponent = components.find(c => c.id === selectedId);

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
                />
            </div>

            {selectedComponent && (
                <div className="properties-panel">
                    <h3>Properties: {selectedComponent.id}</h3>
                    <label>
                        Value:
                        <input
                            type="number"
                            value={selectedComponent.value}
                            onChange={(e) => handleUpdate('value', parseFloat(e.target.value))}
                        />
                    </label>
                    <label>
                        Node 1:
                        <input
                            type="text"
                            value={selectedComponent.node1}
                            onChange={(e) => handleUpdate('node1', e.target.value)}
                        />
                    </label>
                    <label>
                        Node 2:
                        <input
                            type="text"
                            value={selectedComponent.node2}
                            onChange={(e) => handleUpdate('node2', e.target.value)}
                        />
                    </label>
                    <label>
                        Rotation:
                        <input
                            type="number"
                            step="90"
                            value={selectedComponent.rotation || 0}
                            onChange={(e) => handleUpdate('rotation', parseInt(e.target.value))}
                        />
                    </label>
                    <button className="delete-btn" onClick={handleDelete}>Delete</button>
                </div>
            )}
        </div>
    );
};

export default SchematicEditor;
