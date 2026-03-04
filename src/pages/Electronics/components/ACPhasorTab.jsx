import React, { useEffect, useLayoutEffect, useRef, useState, useMemo, useCallback } from 'react';
import CircuitEngine from '../engine/CircuitEngine';
import Complex from '../engine/Complex';
import SchematicEditor from './SchematicEditor';
import './ACPhasorTab.css';

// Color palette for multi-node phasors
const NODE_COLORS = [
    '#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6',
    '#06b6d4', '#ef4444', '#84cc16', '#f97316', '#a78bfa'
];

const ACPhasorTab = () => {
    const [components, setComponents] = useState([
        // Series RLC circuit layout — rectangular loop
        // Vac left side (vertical): t1=top(NODE-1) at (120,100), t2=bottom(GND) at (120,280)
        { id: 'AC-Source-1', type: 'Vac', node1: 'NODE-1', node2: 'GND', value: 10, phase: 0, x: 120, y: 200, rotation: 0 },
        // R across top: t1=left(NODE-1) at (120,100), t2=right(NODE-2) at (240,100) — center at (180,100)
        { id: 'Resistor-1', type: 'R', node1: 'NODE-1', node2: 'NODE-2', value: 100, x: 200, y: 120, rotation: 0 },
        // L across top: t1=left(NODE-2) at (240,100), t2=right(NODE-3) at (360,100) — center at (300,100)
        { id: 'Inductor-1', type: 'L', node1: 'NODE-2', node2: 'NODE-3', value: 0.1, x: 360, y: 120, rotation: 0 },
        // C right side (vertical, rotated 90): t1(NODE-3) at (440,100), t2(GND) at (440,280) — center at (440,200)
        { id: 'Capacitor-1', type: 'C', node1: 'NODE-3', node2: 'GND', value: 10e-6, x: 440, y: 200, rotation: 90 },
        // Ground at bottom center
        { id: 'Ground-1', type: 'G', node1: 'GND', node2: 'GND', value: 0, x: 280, y: 320, rotation: 0 },

        // Explicit wiring mappings
        { id: 'W1', type: 'W', sourceComp: 'AC-Source-1', sourceTerm: 't1', targetComp: 'Resistor-1', targetTerm: 't1', node1: 'NODE-1', node2: 'NODE-1', x: 0, y: 0 },
        { id: 'W2', type: 'W', sourceComp: 'Resistor-1', sourceTerm: 't2', targetComp: 'Inductor-1', targetTerm: 't1', node1: 'NODE-2', node2: 'NODE-2', x: 0, y: 0 },
        { id: 'W3', type: 'W', sourceComp: 'Inductor-1', sourceTerm: 't2', targetComp: 'Capacitor-1', targetTerm: 't1', node1: 'NODE-3', node2: 'NODE-3', x: 0, y: 0 },
        { id: 'W4', type: 'W', sourceComp: 'AC-Source-1', sourceTerm: 't2', targetComp: 'Ground-1', targetTerm: 't1', node1: 'GND', node2: 'GND', x: 0, y: 0 },
        { id: 'W5', type: 'W', sourceComp: 'Capacitor-1', sourceTerm: 't2', targetComp: 'Ground-1', targetTerm: 't1', node1: 'GND', node2: 'GND', x: 0, y: 0 }
    ]);
    const [frequency, setFrequency] = useState(60);
    const [selectedId, setSelectedId] = useState(null);
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);

    const waveformCanvasRef = useRef(null);
    const phasorCanvasRef = useRef(null);
    const resultsRef = useRef(null);

    const selectedComponent = useMemo(
        () => components.find(c => c.id === selectedId),
        [components, selectedId]
    );

    // Keep resultsRef in sync
    useEffect(() => { resultsRef.current = results; }, [results]);

    // Run Engine Simulation
    useEffect(() => {
        const engine = new CircuitEngine();
        engine.setFrequency(frequency);
        components.forEach(c => {
            if (c.type !== 'G' && c.type !== 'W') {
                engine.addComponent(c.type, c.id, c.node1, c.node2, c.value, { phase: c.phase });
            }
        });
        try {
            const res = engine.solveAC();
            setResults(res);
            setError(null);
        } catch (e) {
            console.error(e);
            setResults(null);
            setError(`Simulation failed: ${e.message}`);
        }
    }, [components, frequency]);

    // Compute component impedance
    const getImpedance = (comp) => {
        const omega = 2 * Math.PI * frequency;
        if (comp.type === 'R') return new Complex(comp.value, 0);
        if (comp.type === 'C') return new Complex(0, -1 / (omega * comp.value));
        if (comp.type === 'L') return new Complex(0, omega * comp.value);
        return null;
    };

    // Compute selected component info
    const componentInfo = useMemo(() => {
        if (!selectedComponent || !results || !results.nodes) return null;
        if (selectedComponent.type === 'G' || selectedComponent.type === 'Vac') {
            // For source, show source voltage
            if (selectedComponent.type === 'Vac') {
                const vNode = results.nodes[selectedComponent.node1];
                if (!vNode) return null;
                return {
                    label: `${selectedComponent.id} — AC Source`,
                    voltage: vNode,
                    current: results.branches?.[selectedComponent.id] || null,
                    impedance: null,
                    isSource: true
                };
            }
            return null;
        }

        const Z = getImpedance(selectedComponent);
        const vn1 = results.nodes[selectedComponent.node1] || new Complex(0, 0);
        const vn2 = results.nodes[selectedComponent.node2] || new Complex(0, 0);
        const vDrop = vn1.sub(vn2);
        let current = null;
        if (Z && Z.mag() > 1e-15) {
            current = vDrop.div(Z);
        }

        const typeNames = { R: 'Resistor', C: 'Capacitor', L: 'Inductor' };
        const unitMap = { R: 'Ω', C: 'F', L: 'H' };
        return {
            label: `${selectedComponent.id} — ${typeNames[selectedComponent.type] || selectedComponent.type}`,
            voltage: vDrop,
            current,
            impedance: Z,
            unit: unitMap[selectedComponent.type] || '',
            isSource: false
        };
    }, [selectedComponent, results, frequency]);

    // Draw Waveform Canvas
    useEffect(() => {
        const canvas = waveformCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const currentTime = 0;

        const currentResults = resultsRef.current;
        const W = canvas.width;
        const H = canvas.height;

            ctx.clearRect(0, 0, W, H);

            // Background
            ctx.fillStyle = '#020617';
            ctx.fillRect(0, 0, W, H);

            // Grid
            const halfH = H / 2;
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 1;
            // Horizontal lines
            for (let i = 0; i <= 4; i++) {
                const y = (H / 4) * i;
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(W, y);
                ctx.stroke();
            }
            // Vertical lines
            for (let i = 0; i <= 6; i++) {
                const x = (W / 6) * i;
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, H);
                ctx.stroke();
            }

            // Center axis (brighter)
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, halfH);
            ctx.lineTo(W, halfH);
            ctx.stroke();

        if (!currentResults || !currentResults.nodes) {
            ctx.fillStyle = '#64748b';
            ctx.font = '14px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('No simulation data', W / 2, halfH);
            return;
        }

        const omega = 2 * Math.PI * frequency;
        const period = 1 / frequency;
        const displayTime = 3 * period;

        if (selectedComponent && selectedComponent.type !== 'G') {
            // Selected component mode: show voltage across it
            let complexVal;
            if (selectedComponent.type === 'Vac') {
                complexVal = currentResults.nodes[selectedComponent.node1] || new Complex(0, 0);
            } else {
                const vn1 = currentResults.nodes[selectedComponent.node1] || new Complex(0, 0);
                const vn2 = currentResults.nodes[selectedComponent.node2] || new Complex(0, 0);
                complexVal = vn1.sub(vn2);
            }

            const mag = complexVal.mag();
            const scaleY = mag > 0 ? (halfH * 0.75) / mag : 1;

            // Draw waveform with glow
            drawGlowWaveform(ctx, complexVal, '#3b82f6', omega, displayTime, currentTime, W, halfH, scaleY);

            // Label
            ctx.fillStyle = '#94a3b8';
            ctx.font = '11px Inter, sans-serif';
            ctx.textAlign = 'left';
            const labelText = selectedComponent.type === 'Vac'
                ? `V(${selectedComponent.node1})`
                : `V(${selectedComponent.node1}) - V(${selectedComponent.node2})`;
            ctx.fillText(labelText, 8, 16);
            ctx.fillText(`${mag.toFixed(2)}V pk`, 8, 30);
        } else {
            // Overview mode: show source waveform
            const acSource = components.find(c => c.type === 'Vac');
            if (acSource && currentResults.nodes[acSource.node1]) {
                const sourceV = currentResults.nodes[acSource.node1];
                const mag = sourceV.mag();
                const scaleY = mag > 0 ? (halfH * 0.75) / mag : 1;
                drawGlowWaveform(ctx, sourceV, '#3b82f6', omega, displayTime, currentTime, W, halfH, scaleY);

                ctx.fillStyle = '#94a3b8';
                ctx.font = '11px Inter, sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText(`Source: V(${acSource.node1})  ${mag.toFixed(2)}V pk`, 8, 16);
            }
        }
    }, [frequency, selectedComponent, components, results]);

    // Draw Phasor Diagram Canvas
    useEffect(() => {
        const canvas = phasorCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const currentTime = 0;

        const currentResults = resultsRef.current;
        const W = canvas.width;
        const H = canvas.height;
        const centerX = W / 2;
        const centerY = H / 2;
        const maxRadius = Math.min(centerX, centerY) * 0.75;

            ctx.clearRect(0, 0, W, H);

            // Background
            ctx.fillStyle = '#020617';
            ctx.fillRect(0, 0, W, H);

            // Draw circular grid
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 1;
            for (let r = 1; r <= 3; r++) {
                ctx.beginPath();
                ctx.arc(centerX, centerY, (maxRadius / 3) * r, 0, 2 * Math.PI);
                ctx.stroke();
            }
            // Axes
            ctx.strokeStyle = '#334155';
            ctx.beginPath();
            ctx.moveTo(0, centerY);
            ctx.lineTo(W, centerY);
            ctx.moveTo(centerX, 0);
            ctx.lineTo(centerX, H);
            ctx.stroke();

            // Axis labels
            ctx.fillStyle = '#475569';
            ctx.font = '10px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Re', W - 14, centerY - 6);
            ctx.fillText('Im', centerX + 14, 14);

        if (!currentResults || !currentResults.nodes) {
            ctx.fillStyle = '#64748b';
            ctx.font = '14px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('No data', centerX, centerY);
            return;
        }

        const omega = 2 * Math.PI * frequency;

        if (selectedComponent && selectedComponent.type !== 'G') {
            // Selected component: show its voltage phasor + source reference
            let complexVal;
            if (selectedComponent.type === 'Vac') {
                complexVal = currentResults.nodes[selectedComponent.node1] || new Complex(0, 0);
            } else {
                const vn1 = currentResults.nodes[selectedComponent.node1] || new Complex(0, 0);
                const vn2 = currentResults.nodes[selectedComponent.node2] || new Complex(0, 0);
                complexVal = vn1.sub(vn2);
            }

            const mag = complexVal.mag();
            const phasorScale = mag > 0 ? maxRadius / mag : 1;

            // Draw source reference (dimmed) if not the source itself
            if (selectedComponent.type !== 'Vac') {
                const acSource = components.find(c => c.type === 'Vac');
                if (acSource && currentResults.nodes[acSource.node1]) {
                    const srcV = currentResults.nodes[acSource.node1];
                    const srcScale = srcV.mag() > 0 ? maxRadius / Math.max(srcV.mag(), mag) : 1;
                    drawPhasorArrow(ctx, srcV, omega, currentTime, centerX, centerY, srcScale, '#3b82f640', `V(${acSource.node1})`, true);
                }
                // Recalculate scale relative to max
                const acSource2 = components.find(c => c.type === 'Vac');
                const srcMag = acSource2 && currentResults.nodes[acSource2.node1] ? currentResults.nodes[acSource2.node1].mag() : 0;
                const maxMag = Math.max(mag, srcMag);
                const adjustedScale = maxMag > 0 ? maxRadius / maxMag : 1;
                drawPhasorArrow(ctx, complexVal, omega, currentTime, centerX, centerY, adjustedScale, '#3b82f6', `V(${selectedComponent.id})`);
            } else {
                drawPhasorArrow(ctx, complexVal, omega, currentTime, centerX, centerY, phasorScale, '#3b82f6', `V(${selectedComponent.node1})`);
            }
        } else {
            // Overview: show all node phasors
            const nodeKeys = Object.keys(currentResults.nodes).filter(n => n !== 'GND');
            let maxMag = 0;
            nodeKeys.forEach(n => {
                maxMag = Math.max(maxMag, currentResults.nodes[n].mag());
            });
            const phasorScale = maxMag > 0 ? maxRadius / maxMag : 1;

            nodeKeys.forEach((node, idx) => {
                const color = NODE_COLORS[idx % NODE_COLORS.length];
                drawPhasorArrow(ctx, currentResults.nodes[node], omega, currentTime, centerX, centerY, phasorScale, color, `V(${node})`);
            });
        }
    }, [frequency, selectedComponent, components, results]);

    // Format engineering notation
    const formatValue = (val) => {
        if (val === null || val === undefined) return '—';
        const abs = Math.abs(val);
        if (abs >= 1e6) return (val / 1e6).toFixed(2) + ' M';
        if (abs >= 1e3) return (val / 1e3).toFixed(2) + ' k';
        if (abs >= 1) return val.toFixed(2) + ' ';
        if (abs >= 1e-3) return (val * 1e3).toFixed(2) + ' m';
        if (abs >= 1e-6) return (val * 1e6).toFixed(2) + ' µ';
        if (abs >= 1e-9) return (val * 1e9).toFixed(2) + ' n';
        return val.toExponential(2) + ' ';
    };

    const toDeg = (rad) => (rad * 180 / Math.PI).toFixed(1);

    return (
        <div className="ac-phasor-tab">
            <div className="simulation-area">
                <div className="schematic-container">
                    <SchematicEditor
                        components={components}
                        setComponents={setComponents}
                        selectedId={selectedId}
                        setSelectedId={setSelectedId}
                    />
                </div>
                <div className="visualizer-container">
                    {/* Panel Header */}
                    <div className="viz-header">
                        <div className="viz-title">
                            {selectedComponent && selectedComponent.type !== 'G'
                                ? componentInfo?.label || selectedComponent.id
                                : '⚡ Circuit Overview'}
                        </div>
                        {selectedComponent && (
                            <button className="deselect-btn" onClick={() => setSelectedId(null)}>
                                ✕ Deselect
                            </button>
                        )}
                    </div>

                    {error && (
                        <div className="error-banner">
                            ⚠ {error}
                        </div>
                    )}

                    {/* Waveform Section */}
                    <div className="viz-section">
                        <div className="viz-section-label">Waveform</div>
                        <canvas ref={waveformCanvasRef} width={600} height={180} className="viz-canvas" />
                    </div>

                    {/* Phasor Section */}
                    <div className="viz-section">
                        <div className="viz-section-label">Phasor Diagram</div>
                        <canvas ref={phasorCanvasRef} width={600} height={200} className="viz-canvas" />
                    </div>

                    {/* Controls */}
                    <div className="viz-controls">
                        <div className="control-row">
                            <label className="freq-control">
                                <span className="control-label">Frequency</span>
                                <input
                                    type="range"
                                    min="1" max="1000"
                                    value={frequency}
                                    onChange={(e) => setFrequency(Number(e.target.value))}
                                />
                                <span className="freq-value">{frequency} Hz</span>
                            </label>
                        </div>
                    </div>

                    {/* Component Info Readout */}
                    {componentInfo && (
                        <div className="info-readout">
                            {componentInfo.isSource ? (
                                <div className="info-grid">
                                    <div className="info-item">
                                        <span className="info-label">Voltage</span>
                                        <span className="info-value">{formatValue(componentInfo.voltage.mag())}V pk</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Phase</span>
                                        <span className="info-value">{toDeg(componentInfo.voltage.phase())}°</span>
                                    </div>
                                    {componentInfo.current && (
                                        <>
                                            <div className="info-item">
                                                <span className="info-label">Current</span>
                                                <span className="info-value">{formatValue(componentInfo.current.mag())}A</span>
                                            </div>
                                            <div className="info-item">
                                                <span className="info-label">I Phase</span>
                                                <span className="info-value">{toDeg(componentInfo.current.phase())}°</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div className="info-grid">
                                    {componentInfo.impedance && (
                                        <>
                                            <div className="info-item">
                                                <span className="info-label">|Z|</span>
                                                <span className="info-value">{formatValue(componentInfo.impedance.mag())}{componentInfo.unit}</span>
                                            </div>
                                            <div className="info-item">
                                                <span className="info-label">∠Z</span>
                                                <span className="info-value">{toDeg(componentInfo.impedance.phase())}°</span>
                                            </div>
                                        </>
                                    )}
                                    <div className="info-item">
                                        <span className="info-label">V<sub>drop</sub></span>
                                        <span className="info-value">{formatValue(componentInfo.voltage.mag())}V</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">∠V</span>
                                        <span className="info-value">{toDeg(componentInfo.voltage.phase())}°</span>
                                    </div>
                                    {componentInfo.current && (
                                        <>
                                            <div className="info-item">
                                                <span className="info-label">I</span>
                                                <span className="info-value">{formatValue(componentInfo.current.mag())}A</span>
                                            </div>
                                            <div className="info-item">
                                                <span className="info-label">∠I</span>
                                                <span className="info-value">{toDeg(componentInfo.current.phase())}°</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Drawing helpers ---

function drawGlowWaveform(ctx, complexVal, color, omega, displayTime, currentTime, W, halfH, scaleY) {
    const mag = complexVal.mag();
    const phase = complexVal.phase();

    // Glow layer
    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    for (let px = 0; px < W; px++) {
        const t = (px / W) * displayTime + currentTime;
        const y = halfH - mag * Math.cos(omega * t + phase) * scaleY;
        if (px === 0) ctx.moveTo(px, y);
        else ctx.lineTo(px, y);
    }
    ctx.stroke();
    ctx.restore();

    // Main line
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 1;
    ctx.beginPath();
    for (let px = 0; px < W; px++) {
        const t = (px / W) * displayTime + currentTime;
        const y = halfH - mag * Math.cos(omega * t + phase) * scaleY;
        if (px === 0) ctx.moveTo(px, y);
        else ctx.lineTo(px, y);
    }
    ctx.stroke();
}

function drawPhasorArrow(ctx, complexVal, omega, currentTime, centerX, centerY, scale, color, label, dimmed = false) {
    const mag = complexVal.mag();
    const phase = complexVal.phase() + omega * currentTime;
    const endX = centerX + mag * Math.cos(phase) * scale;
    const endY = centerY - mag * Math.sin(phase) * scale;

    // Line
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = dimmed ? 1.5 : 2.5;
    ctx.globalAlpha = dimmed ? 0.35 : 1;

    // Glow
    if (!dimmed) {
        ctx.shadowBlur = 8;
        ctx.shadowColor = color;
    }

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Arrowhead
    const angle = Math.atan2(-(endY - centerY), endX - centerX);
    const headLen = 10;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(endX - headLen * Math.cos(angle - 0.4), endY + headLen * Math.sin(angle - 0.4));
    ctx.lineTo(endX - headLen * Math.cos(angle + 0.4), endY + headLen * Math.sin(angle + 0.4));
    ctx.closePath();
    ctx.fill();

    // Label
    ctx.font = '11px Inter, sans-serif';
    ctx.fillStyle = color;
    ctx.globalAlpha = dimmed ? 0.5 : 0.9;
    const labelX = endX + 8 * Math.cos(phase);
    const labelY = endY - 8 * Math.sin(phase);
    ctx.textAlign = 'left';
    ctx.fillText(label, labelX, labelY);

    ctx.restore();
}

export default ACPhasorTab;
