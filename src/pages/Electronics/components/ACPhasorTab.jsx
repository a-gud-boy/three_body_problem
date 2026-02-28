import React, { useEffect, useRef, useState } from 'react';
import CircuitEngine from '../engine/CircuitEngine';
import SchematicEditor from './SchematicEditor';
import './ACPhasorTab.css';

const ACPhasorTab = () => {
    const [components, setComponents] = useState([
        { id: 'Vac1', type: 'Vac', node1: 'n1', node2: 'GND', value: 10, phase: 0, x: 100, y: 200, rotation: 0 },
        { id: 'R1', type: 'R', node1: 'n1', node2: 'n2', value: 100, x: 200, y: 100, rotation: 0 },
        { id: 'L1', type: 'L', node1: 'n2', node2: 'n3', value: 0.1, x: 300, y: 100, rotation: 0 },
        { id: 'C1', type: 'C', node1: 'n3', node2: 'GND', value: 10e-6, x: 400, y: 200, rotation: 90 },
        { id: 'GND1', type: 'G', node1: 'GND', node2: 'GND', value: 0, x: 250, y: 300, rotation: 0 }
    ]);
    const [frequency, setFrequency] = useState(60);
    const [probe1, setProbe1] = useState('n1');
    const [probe2, setProbe2] = useState('n3');
    const [results, setResults] = useState(null);
    const canvasRef = useRef(null);
    const [time, setTime] = useState(0);

    // Run Engine Simulation
    useEffect(() => {
        const engine = new CircuitEngine();
        engine.setFrequency(frequency);
        components.forEach(c => {
            if (c.type !== 'G') {
                engine.addComponent(c.type, c.id, c.node1, c.node2, c.value, { phase: c.phase });
            }
        });

        try {
            const res = engine.solveAC();
            setResults(res);
        } catch (e) {
            console.error(e);
            setResults(null);
        }
    }, [components, frequency]);

    // Draw Live Oscilloscope and Phasors
    useEffect(() => {
        let animationId;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const draw = () => {
            setTime(t => t + 0.05);
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Split canvas: left is waveforms, right is phasors
            const midX = canvas.width / 2;

            // Draw Background Grids
            ctx.strokeStyle = '#334155';
            ctx.beginPath();
            ctx.moveTo(0, canvas.height/2); ctx.lineTo(canvas.width, canvas.height/2); // Horizontal axis
            ctx.moveTo(midX, 0); ctx.lineTo(midX, canvas.height); // Vertical divider
            ctx.stroke();

            if (results && results.nodes) {
                const omega = 2 * Math.PI * frequency;

                // Function to draw waveform
                const drawWaveform = (complexVal, color, label) => {
                    const mag = complexVal.mag();
                    const phase = complexVal.phase();
                    const scaleY = 5; // Scale for voltage

                    ctx.strokeStyle = color;
                    ctx.beginPath();
                    for(let x = 0; x < midX; x++) {
                        const t = x / 100 + time; // Simulation time
                        const y = canvas.height/2 - mag * Math.cos(omega * t + phase) * scaleY;
                        if(x === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    }
                    ctx.stroke();
                };

                // Function to draw phasor
                const drawPhasor = (complexVal, color, label) => {
                    const mag = complexVal.mag();
                    const phase = complexVal.phase() + omega * time; // Rotate with time
                    const scaleY = 5; // Scale for voltage
                    const centerX = midX + midX/2;
                    const centerY = canvas.height/2;

                    const endX = centerX + mag * Math.cos(phase) * scaleY;
                    const endY = centerY - mag * Math.sin(phase) * scaleY; // Y is flipped in canvas

                    ctx.strokeStyle = color;
                    ctx.fillStyle = color;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(centerX, centerY);
                    ctx.lineTo(endX, endY);
                    ctx.stroke();

                    // Draw head
                    ctx.beginPath();
                    ctx.arc(endX, endY, 4, 0, 2*Math.PI);
                    ctx.fill();

                    ctx.fillText(label, endX + 10, endY + 10);
                };

                if (probe1 && results.nodes[probe1]) {
                    drawWaveform(results.nodes[probe1], '#3b82f6', `V(${probe1})`);
                    drawPhasor(results.nodes[probe1], '#3b82f6', `V(${probe1})`);
                }
                if (probe2 && results.nodes[probe2]) {
                    drawWaveform(results.nodes[probe2], '#ec4899', `V(${probe2})`);
                    drawPhasor(results.nodes[probe2], '#ec4899', `V(${probe2})`);
                }
            }

            animationId = requestAnimationFrame(draw);
        };

        draw();
        return () => cancelAnimationFrame(animationId);
    }, [results, frequency, time, probe1, probe2]);

    return (
        <div className="ac-phasor-tab">
            <div className="simulation-area">
                <div className="schematic-container">
                    <SchematicEditor components={components} setComponents={setComponents} />
                </div>
                <div className="visualizer-container">
                    <div className="controls">
                        <label>
                            Frequency (Hz): {frequency}
                            <input
                                type="range"
                                min="1" max="1000"
                                value={frequency}
                                onChange={(e) => setFrequency(Number(e.target.value))}
                            />
                        </label>
                    </div>
                    <canvas ref={canvasRef} width={800} height={400} className="oscilloscope" />
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
                </div>
            </div>
        </div>
    );
};

export default ACPhasorTab;
