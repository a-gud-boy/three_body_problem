import React, { useState, useEffect, useRef, useCallback } from 'react';
import SchematicEditor from './SchematicEditor';
import './WaveformTab.css';

// For waveform shaping with diodes, since we didn't build a full non-linear Newton-Raphson
// transient SPICE engine in CircuitEngine (as it's extremely complex for this scope),
// we will implement an analytical/heuristic clipping simulator for this specific tab
// that mimics diode behavior based on user-placed components.
const WaveformTab = () => {
    const [components, setComponents] = useState([
        { id: 'Vac1', type: 'Vac', node1: 'in', node2: 'GND', value: 10, phase: 0, x: 100, y: 200, rotation: 0 },
        { id: 'R1', type: 'R', node1: 'in', node2: 'out', value: 1000, x: 200, y: 100, rotation: 0 },
        { id: 'D1', type: 'D', node1: 'out', node2: 'GND', value: 0.7, x: 300, y: 200, rotation: 90 }, // Diode pointing down
        { id: 'GND1', type: 'G', node1: 'GND', node2: 'GND', value: 0, x: 200, y: 300, rotation: 0 },

        // Explicit layout wiring
        { id: 'W1', type: 'W', sourceComp: 'Vac1', sourceTerm: 't1', targetComp: 'R1', targetTerm: 't1', node1: 'in', node2: 'in', x: 0, y: 0 },
        { id: 'W2', type: 'W', sourceComp: 'R1', sourceTerm: 't2', targetComp: 'D1', targetTerm: 't1', node1: 'out', node2: 'out', x: 0, y: 0 },
        { id: 'W3', type: 'W', sourceComp: 'Vac1', sourceTerm: 't2', targetComp: 'GND1', targetTerm: 't1', node1: 'GND', node2: 'GND', x: 0, y: 0 },
        { id: 'W4', type: 'W', sourceComp: 'D1', sourceTerm: 't2', targetComp: 'GND1', targetTerm: 't1', node1: 'GND', node2: 'GND', x: 0, y: 0 }
    ]);
    const [frequency, setFrequency] = useState(60);
    // Bug #19 fix: Add local selection state for SchematicEditor
    const [selectedId, setSelectedId] = useState(null);
    const canvasRef = useRef(null);
    const timeRef = useRef(0);

    const [probe1, setProbe1] = useState('in');
    const [probe2, setProbe2] = useState('out');

    // Piecewise-linear DC operating point solver for diode circuits
    const solvePiecewise = useCallback((t, omega, comps) => {
        // Bug #14 fix: Filter out wire and ground components before solving
        const activeComps = comps.filter(c => c.type !== 'W' && c.type !== 'G');
        const nodes = Array.from(new Set(activeComps.flatMap(c => [c.node1, c.node2]).filter(n => n !== 'GND')));
        const numNodes = nodes.length;
        if (numNodes === 0) return {};

        const nodeIdx = (n) => nodes.indexOf(n);

        // We will do a simple iterative solve (relaxation method) for the instantaneous voltages
        let v = new Array(numNodes).fill(0);
        let srcVals = {};

        activeComps.forEach(c => {
            if (c.type === 'Vac') {
                srcVals[c.id] = c.value * Math.sin(omega * t + (c.phase || 0) * Math.PI / 180);
            }
        });

        // Bug #16 fix: Add convergence check, reduced iterations
        for (let iter = 0; iter < 200; iter++) {
            let nextV = [...v];
            let maxDelta = 0;
            for (let i = 0; i < numNodes; i++) {
                let nodeName = nodes[i];
                let iSum = 0;
                let gSum = 0;

                activeComps.forEach(c => {
                    let n1 = c.node1;
                    let n2 = c.node2;
                    if (n1 !== nodeName && n2 !== nodeName) return;

                    let otherNode = n1 === nodeName ? n2 : n1;
                    let otherV = otherNode === 'GND' ? 0 : v[nodeIdx(otherNode)];
                    let sign = n1 === nodeName ? 1 : -1;

                    if (c.type === 'R') {
                        let g = 1 / c.value;
                        gSum += g;
                        iSum += g * otherV;
                    } else if (c.type === 'Vac' || c.type === 'V') {
                        // Use very high conductance to model ideal voltage source
                        let g = 1e6;
                        let vSrc = c.type === 'Vac' ? srcVals[c.id] : c.value;
                        // Node1 is positive terminal
                        gSum += g;
                        iSum += g * (otherV + sign * vSrc);
                    } else if (c.type === 'D') {
                        // Diode model with smooth tanh transition to prevent
                        // relaxation oscillation at the forward-drop threshold.
                        // node1 = anode, node2 = cathode. vDiode = V_anode - V_cathode.
                        let vAnode = n1 === nodeName ? v[i] : otherV;
                        let vCathode = n2 === nodeName ? v[i] : otherV;
                        let vDiode = vAnode - vCathode;
                        let forwardDrop = c.value || 0.7;

                        // Smooth blending factor: 0 = off, 1 = on
                        // The /0.05 controls the sharpness of the transition
                        let blend = 0.5 * (1 + Math.tanh((vDiode - forwardDrop) / 0.05));
                        // Smoothly interpolate between off-conductance and on-conductance
                        let gOff = 1e-6;
                        let gOn = 100; // ~10 ohm series resistance when conducting
                        let g = gOff + blend * (gOn - gOff);
                        gSum += g;
                        // When conducting, acts like voltage source of forwardDrop
                        iSum += g * (otherV + sign * forwardDrop * blend);
                    } else if (c.type === 'C' || c.type === 'L') {
                        // Ignore L and C for this simple instantaneous clipper solver as they require state history
                    }
                });

                if (gSum > 0) {
                    nextV[i] = iSum / gSum;
                    maxDelta = Math.max(maxDelta, Math.abs(nextV[i] - v[i]));
                }
            }
            v = nextV;
            // Bug #16 fix: Early exit on convergence
            if (maxDelta < 1e-6) break;
        }

        let res = { 'GND': 0 };
        for (let i = 0; i < numNodes; i++) {
            res[nodes[i]] = v[i];
        }
        return res;
    }, []);

    // Pre-compute one full cycle of waveform data when circuit or frequency changes
    const traceDataRef = useRef({ trace1: [], trace2: [] });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const omega = 2 * Math.PI * frequency;
        const numSamples = canvas.width / 2; // Same step as original (x += 2)
        const trace1 = [];
        const trace2 = [];

        // Bug #17 fix: Scale time axis with frequency to show 3 complete cycles
        const period = 1 / frequency;
        const displayTime = 3 * period;

        for (let i = 0; i < numSamples; i++) {
            const x = i * 2;
            const t = (x / canvas.width) * displayTime;
            const nodeVoltages = solvePiecewise(t, omega, components);
            trace1.push({ x, y: nodeVoltages[probe1] || 0 });
            trace2.push({ x, y: nodeVoltages[probe2] || 0 });
        }

        traceDataRef.current = { trace1, trace2 };
    }, [components, frequency, probe1, probe2, solvePiecewise]);

    // Animation loop — draws pre-computed data, pauses when tab/canvas is hidden
    useEffect(() => {
        let animationId;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        // Track canvas visibility to avoid wasting CPU when tab is hidden
        let isCanvasVisible = true;
        const observer = new IntersectionObserver(
            ([entry]) => { isCanvasVisible = entry.isIntersecting; },
            { threshold: 0.01 }
        );
        observer.observe(canvas);

        const draw = () => {
            // Skip frame if the browser tab or canvas is hidden
            if (document.hidden || !isCanvasVisible) {
                animationId = requestAnimationFrame(draw);
                return;
            }

            timeRef.current += 0.05;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const midY = canvas.height / 2;

            // Draw Grid
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, midY); ctx.lineTo(canvas.width, midY);
            ctx.stroke();

            const { trace1, trace2 } = traceDataRef.current;

            // Auto-scale Y axis based on peak amplitude across both traces
            let maxAmplitude = 0;
            for (const pt of trace1) maxAmplitude = Math.max(maxAmplitude, Math.abs(pt.y));
            for (const pt of trace2) maxAmplitude = Math.max(maxAmplitude, Math.abs(pt.y));
            const scaleY = maxAmplitude > 0 ? (midY * 0.75) / maxAmplitude : 10;

            // Draw Output Waveform (Pink)
            ctx.strokeStyle = '#ec4899';
            ctx.lineWidth = 3;
            ctx.beginPath();
            for (let i = 0; i < trace2.length; i++) {
                const px = trace2[i].x;
                const py = midY - trace2[i].y * scaleY;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();

            // Draw Input Waveform (Blue) - Draw last to be on top
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let i = 0; i < trace1.length; i++) {
                const px = trace1[i].x;
                const py = midY - trace1[i].y * scaleY;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();

            animationId = requestAnimationFrame(draw);
        };

        draw();
        return () => {
            cancelAnimationFrame(animationId);
            observer.disconnect();
        };
    }, [components, frequency, probe1, probe2]);

    // Ref-based counter to avoid ID collisions after deletions
    const diodeCounterRef = useRef(components.filter(c => c.type === 'D').length + 1);

    // Extend the toolbar to support Diode
    const handleAddDiode = () => {
        const counter = diodeCounterRef.current++;
        const newId = `D${counter}`;
        setComponents([...components, {
            id: newId,
            type: 'D',
            node1: 'out',
            node2: 'GND',
            value: 0.7, // Forward voltage drop
            x: 100,
            y: 100,
            rotation: 90
        }]);
    };

    return (
        <div className="waveform-tab">
            <div className="split-view">
                <div className="left-panel">
                    <h3>Clipper / Rectifier Builder</h3>
                    <div className="toolbar-extension">
                        <button className="add-diode-btn" onClick={handleAddDiode}>Add Diode</button>
                    </div>
                    <div className="canvas-container">
                        <SchematicEditor components={components} setComponents={setComponents} selectedId={selectedId} setSelectedId={setSelectedId} />
                    </div>
                </div>
                <div className="right-panel">
                    <h3>Oscilloscope View</h3>
                    <canvas ref={canvasRef} width={600} height={400} className="oscilloscope-canvas"></canvas>
                    <div className="probes-setup">
                        <label htmlFor="probe1">
                            Probe 1 (Blue):
                        </label>
                        <input id="probe1" type="text" value={probe1} onChange={e => setProbe1(e.target.value)} />
                        <label htmlFor="probe2">
                            Probe 2 (Pink):
                        </label>
                        <input id="probe2" type="text" value={probe2} onChange={e => setProbe2(e.target.value)} />
                    </div>
                    <div className="instructions" style={{ marginTop: '20px' }}>
                        <p><strong>How it works:</strong> Add diodes to build rectifier or clipper circuits. The engine performs instantaneous iterative non-linear relaxation analysis.</p>
                        <p><strong>Note:</strong> node1 is the Anode, node2 is the Cathode. Visual rotation does not affect the physical connection, only the labels node1/node2 do.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WaveformTab;
