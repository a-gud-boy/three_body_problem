import React, { useState } from 'react';
import SchematicEditor from './SchematicEditor';
import './NetworkTheoremsTab.css';
import CircuitEngine from '../engine/CircuitEngine';
import Complex from '../engine/Complex';

const NetworkTheoremsTab = () => {
    const [components, setComponents] = useState([
        { id: 'Vac1', type: 'Vac', node1: 'NODE-1', node2: 'GND', value: 12, phase: 0, x: 100, y: 200, rotation: 0 },
        { id: 'R1', type: 'R', node1: 'NODE-1', node2: 'NODE-2', value: 10, x: 200, y: 100, rotation: 0 },
        { id: 'R2', type: 'R', node1: 'NODE-2', node2: 'GND', value: 20, x: 250, y: 200, rotation: 90 },
        { id: 'R3', type: 'R', node1: 'NODE-2', node2: 'NODE-3', value: 30, x: 350, y: 100, rotation: 0 },
        { id: 'GND1', type: 'G', node1: 'GND', node2: 'GND', value: 0, x: 100, y: 300, rotation: 0 },

        // Explicit wiring mappings
        { id: 'W1', type: 'W', sourceComp: 'Vac1', sourceTerm: 't1', targetComp: 'R1', targetTerm: 't1', node1: 'NODE-1', node2: 'NODE-1', x: 0, y: 0 },
        { id: 'W2', type: 'W', sourceComp: 'R1', sourceTerm: 't2', targetComp: 'R2', targetTerm: 't1', node1: 'NODE-2', node2: 'NODE-2', x: 0, y: 0 },
        { id: 'W3', type: 'W', sourceComp: 'R2', sourceTerm: 't1', targetComp: 'R3', targetTerm: 't1', node1: 'NODE-2', node2: 'NODE-2', x: 0, y: 0 },
        { id: 'W4', type: 'W', sourceComp: 'Vac1', sourceTerm: 't2', targetComp: 'GND1', targetTerm: 't1', node1: 'GND', node2: 'GND', x: 0, y: 0 },
        { id: 'W5', type: 'W', sourceComp: 'R2', sourceTerm: 't2', targetComp: 'GND1', targetTerm: 't1', node1: 'GND', node2: 'GND', x: 0, y: 0 }
    ]);
    const [selectedId, setSelectedId] = useState(null);
    const [terminalA, setTerminalA] = useState('NODE-3');
    const [terminalB, setTerminalB] = useState('GND');
    const [theveninVoltage, setTheveninVoltage] = useState(null);
    const [theveninImpedance, setTheveninImpedance] = useState(null);
    const [nortonCurrent, setNortonCurrent] = useState(null);

    const calculateThevenin = () => {
        try {
            // 1. Calculate Open Circuit Voltage (Vth)
            const engineOpen = new CircuitEngine();
            components.forEach(c => {
                if (c.type !== 'G') engineOpen.addComponent(c.type, c.id, c.node1, c.node2, c.value, { phase: c.phase || 0 });
            });
            const resOpen = engineOpen.solveAC();

            let vA = resOpen.nodes[terminalA] || new Complex(0);
            let vB = resOpen.nodes[terminalB] || new Complex(0);
            let vTh = vA.sub(vB);
            setTheveninVoltage(vTh);

            // 2. Calculate Short Circuit Current (I_sc) to find Zth = Vth / I_sc
            const engineShort = new CircuitEngine();
            components.forEach(c => {
                if (c.type !== 'G') {
                    engineShort.addComponent(c.type, c.id, c.node1, c.node2, c.value, { phase: c.phase || 0 });
                }
            });
            // We need to measure current through the short, so we add a 0V voltage source acting as ammeter
            engineShort.addComponent('Vac', 'V_ammeter', terminalA, terminalB, 0, { phase: 0 });

            const resShort = engineShort.solveAC();
            let iSc = resShort.branches['V_ammeter'] || new Complex(0);
            // Current flows from A to B

            setNortonCurrent(iSc);

            if (iSc.mag() > 1e-9) {
                setTheveninImpedance(vTh.div(iSc));
            } else {
                setTheveninImpedance(null); // Open circuit — impedance is infinite
            }

        } catch (e) {
            console.error("Error calculating theorems:", e);
        }
    };

    return (
        <div className="theorems-tab">
            <div className="split-view">
                <div className="left-panel">
                    <h3>Circuit Builder</h3>
                    <div className="canvas-container">
                        <SchematicEditor components={components} setComponents={setComponents} selectedId={selectedId} setSelectedId={setSelectedId} />
                    </div>
                </div>
                <div className="right-panel">
                    <h3>Theorem Analysis</h3>
                    <div className="controls">
                        <label htmlFor="terminalA">
                            Terminal A:
                        </label>
                        <input id="terminalA" type="text" value={terminalA} onChange={e => setTerminalA(e.target.value)} />
                        <label htmlFor="terminalB">
                            Terminal B:
                        </label>
                        <input id="terminalB" type="text" value={terminalB} onChange={e => setTerminalB(e.target.value)} />
                        <button className="analyze-btn" onClick={calculateThevenin}>Calculate Equivalent Circuits</button>
                    </div>

                    {theveninVoltage && (
                        <div className="results-panel">
                            <h4>Thévenin Equivalent</h4>
                            <div className="result-item">
                                <span className="label">V_th (Open Circuit):</span>
                                <span className="value">{theveninVoltage.mag().toFixed(2)} V ∠ {(theveninVoltage.phase() * 180 / Math.PI).toFixed(1)}°</span>
                            </div>
                            <div className="result-item">
                                <span className="label">Z_th (Impedance):</span>
                                <span className="value">
                                    {theveninImpedance
                                        ? `${theveninImpedance.mag().toFixed(2)} Ω ∠ ${(theveninImpedance.phase() * 180 / Math.PI).toFixed(1)}°`
                                        : 'Open Circuit (∞ Ω)'}
                                </span>
                            </div>

                            <h4>Norton Equivalent</h4>
                            <div className="result-item">
                                <span className="label">I_n (Short Circuit):</span>
                                <span className="value">{nortonCurrent ? nortonCurrent.mag().toFixed(4) : 0} A ∠ {(nortonCurrent ? nortonCurrent.phase() * 180 / Math.PI : 0).toFixed(1)}°</span>
                            </div>
                            <div className="result-item">
                                <span className="label">Z_n (Impedance):</span>
                                <span className="value">
                                    {theveninImpedance
                                        ? `${theveninImpedance.mag().toFixed(2)} Ω ∠ ${(theveninImpedance.phase() * 180 / Math.PI).toFixed(1)}°`
                                        : 'Open Circuit (∞ Ω)'}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NetworkTheoremsTab;
