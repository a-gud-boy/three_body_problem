import React, { useState, useEffect, useRef } from 'react';
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
        { id: 'GND1', type: 'G', node1: 'GND', node2: 'GND', value: 0, x: 200, y: 300, rotation: 0 }
    ]);
    const [frequency, setFrequency] = useState(60);
    const canvasRef = useRef(null);
    const [time, setTime] = useState(0);

    const [probe1, setProbe1] = useState('in');
    const [probe2, setProbe2] = useState('out');

    // To simulate diodes properly without a complex transient SPICE engine,
    // we use a piecewise linear simulation approach at each time step.
    const solvePiecewise = (t, omega, comps) => {
        import('../engine/CircuitEngine.js').then(module => {
             // Just an analytical solver based on the instantaneous DC voltage
             // This is a simplification but mathematically rigorous for purely resistive + diode clipper circuits.
        });

        // Since we cannot easily import the async engine within a hot animation loop gracefully without major refactoring,
        // and because AC solvers use complex numbers (which don't handle diodes well),
        // we'll implement a standalone lightweight Nodal Analysis solver here specifically for DC instantaneous points.

        const nodes = Array.from(new Set(comps.flatMap(c => [c.node1, c.node2]).filter(n => n !== 'GND')));
        const numNodes = nodes.length;
        if (numNodes === 0) return {};

        const nodeIdx = (n) => nodes.indexOf(n);

        // We will do a simple iterative solve (relaxation method) for the instantaneous voltages
        let v = new Array(numNodes).fill(0);
        let srcVals = {};

        comps.forEach(c => {
            if (c.type === 'Vac') {
                srcVals[c.id] = c.value * Math.sin(omega * t + (c.phase || 0) * Math.PI / 180);
            }
        });

        // Simple relaxation loop
        for (let iter = 0; iter < 100; iter++) {
            let nextV = [...v];
            for (let i = 0; i < numNodes; i++) {
                let nodeName = nodes[i];
                let iSum = 0;
                let gSum = 0;

                comps.forEach(c => {
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
                        // Ideal voltage source acts as a very low resistor
                        let g = 1e6;
                        let vSrc = c.type === 'Vac' ? srcVals[c.id] : c.value;
                        // Node1 is positive terminal
                        gSum += g;
                        iSum += g * (otherV + sign * vSrc);
                    } else if (c.type === 'D') {
                        // Diode piecewise linear model
                        // Forward drop: c.value (e.g. 0.7)
                        let vDiode = n1 === nodeName ? (v[i] - otherV) : (otherV - v[i]);
                        let forwardDrop = c.value || 0.7;

                        // We check the rotation to determine visual polarity if nodes are swapped by the user.
                        // Standard: node1 is Anode, node2 is Cathode.
                        // But if visual rotation is -90, they might have logically meant to point it up while keeping nodes.
                        // We will rely purely on the logical node1/node2 connection for physics, ignoring visual rotation here.

                        if (vDiode > forwardDrop) {
                            // Conducting: acts as a voltage source of 0.7V with small series resistance
                            let g = 100; // 10 ohms
                            gSum += g;
                            iSum += g * (otherV + sign * forwardDrop);
                        } else {
                            // Non-conducting: acts as high resistance
                            let g = 1e-6;
                            gSum += g;
                            iSum += g * otherV;
                        }
                    } else if (c.type === 'C' || c.type === 'L') {
                        // Ignore L and C for this simple instantaneous clipper solver as they require state history
                    }
                });

                if (gSum > 0) {
                    nextV[i] = iSum / gSum;
                }
            }
            v = nextV;
        }

        let res = { 'GND': 0 };
        for (let i = 0; i < numNodes; i++) {
            res[nodes[i]] = v[i];
        }
        return res;
    };

    useEffect(() => {
        let animationId;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const omega = 2 * Math.PI * frequency;

        const draw = () => {
            setTime(t => t + 0.05);
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const midY = canvas.height / 2;

            // Draw Grid
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, midY); ctx.lineTo(canvas.width, midY);
            ctx.stroke();

            const scaleY = 10; // Voltage to pixels

            // Generate trace data
            let trace1 = [];
            let trace2 = [];
            for(let x = 0; x < canvas.width; x += 2) {
                const t = x / 100 + time;
                const nodeVoltages = solvePiecewise(t, omega, components);
                trace1.push({x, y: nodeVoltages[probe1] || 0});
                trace2.push({x, y: nodeVoltages[probe2] || 0});
            }

            // Draw Output Waveform (Pink)
            ctx.strokeStyle = '#ec4899';
            ctx.lineWidth = 3;
            ctx.beginPath();
            for(let i=0; i<trace2.length; i++) {
                const px = trace2[i].x;
                const py = midY - trace2[i].y * scaleY;
                if(i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();

            // Draw Input Waveform (Blue) - Draw last to be on top
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2;
            ctx.beginPath();
            for(let i=0; i<trace1.length; i++) {
                const px = trace1[i].x;
                const py = midY - trace1[i].y * scaleY;
                if(i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();

            animationId = requestAnimationFrame(draw);
        };

        draw();
        return () => cancelAnimationFrame(animationId);
    }, [components, frequency, time, probe1, probe2]);

    // Extend the toolbar to support Diode
    const handleAddDiode = () => {
        const newId = `D${components.length + 1}`;
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
                        <SchematicEditor components={components} setComponents={setComponents} />
                    </div>
                </div>
                <div className="right-panel">
                    <h3>Oscilloscope View</h3>
                    <canvas ref={canvasRef} width={600} height={400} className="oscilloscope-canvas"></canvas>
                    <div className="probes-setup">
                        <label>
                            Probe 1 (Blue):
                            <input type="text" value={probe1} onChange={e => setProbe1(e.target.value)} />
                        </label>
                        <label>
                            Probe 2 (Pink):
                            <input type="text" value={probe2} onChange={e => setProbe2(e.target.value)} />
                        </label>
                    </div>
                    <div className="instructions" style={{marginTop: '20px'}}>
                        <p><strong>How it works:</strong> Add diodes to build rectifier or clipper circuits. The engine performs instantaneous iterative non-linear relaxation analysis.</p>
                        <p><strong>Note:</strong> node1 is the Anode, node2 is the Cathode. Visual rotation does not affect the physical connection, only the labels node1/node2 do.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WaveformTab;
