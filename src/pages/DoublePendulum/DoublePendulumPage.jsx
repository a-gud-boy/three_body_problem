import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Play, Pause, RotateCcw, Settings2, GitFork, BarChart3, TrendingUp } from 'lucide-react';
import { getDerivatives } from './physicsUtils';
import './DoublePendulum.css';

const MAX_TRAIL_LENGTH = 1000;
const PHASE_HISTORY_LENGTH = 500;
const ENERGY_HISTORY_LENGTH = 300;

export default function DoublePendulumPage() {
    // Canvas Refs
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const phaseCanvasRef = useRef(null);
    const energyCanvasRef = useRef(null);

    // Simulation State
    const [isPlaying, setIsPlaying] = useState(true);


    // Physics Parameters
    const paramsRef = useRef({
        m1: 10,
        m2: 10,
        l1: 150,
        l2: 150,
        g: 1,
        damping: 1.0 // 1.0 = No friction
    });

    // System State
    const stateRef = useRef([
        {
            theta1: Math.PI / 2,
            theta2: Math.PI / 2,
            omega1: 0,
            omega2: 0,
            color: '#3b82f6', // Blue
            trail: []
        }
    ]);

    // Data History for Graphs
    const historyRef = useRef({
        phase: [], // {x: theta1, y: omega1}
        energy: [] // {k: kinetic, p: potential, t: total}
    });

    // UI State
    const [uiParams, setUiParams] = useState({
        m1: 10,
        m2: 10,
        l1: 150,
        l2: 150,
        g: 1,
        damping: 1.0
    });
    const [shadowMode, setShadowMode] = useState(false);

    // --- Physics Engine (RK4) ---
    // Moved getDerivatives outside component to avoid recreation

    const integrate = useCallback((dt) => {
        const params = paramsRef.current;

        stateRef.current.forEach(pendulum => {
            const s = { ...pendulum };

            const k1 = getDerivatives(s, params);
            const s2 = {
                theta1: s.theta1 + k1.dTheta1 * dt * 0.5,
                theta2: s.theta2 + k1.dTheta2 * dt * 0.5,
                omega1: s.omega1 + k1.dOmega1 * dt * 0.5,
                omega2: s.omega2 + k1.dOmega2 * dt * 0.5
            };
            const k2 = getDerivatives(s2, params);
            const s3 = {
                theta1: s.theta1 + k2.dTheta1 * dt * 0.5,
                theta2: s.theta2 + k2.dTheta2 * dt * 0.5,
                omega1: s.omega1 + k2.dOmega1 * dt * 0.5,
                omega2: s.omega2 + k2.dOmega2 * dt * 0.5
            };
            const k3 = getDerivatives(s3, params);
            const s4 = {
                theta1: s.theta1 + k3.dTheta1 * dt,
                theta2: s.theta2 + k3.dTheta2 * dt,
                omega1: s.omega1 + k3.dOmega1 * dt,
                omega2: s.omega2 + k3.dOmega2 * dt
            };
            const k4 = getDerivatives(s4, params);

            pendulum.theta1 += (k1.dTheta1 + 2 * k2.dTheta1 + 2 * k3.dTheta1 + k4.dTheta1) * dt / 6;
            pendulum.theta2 += (k1.dTheta2 + 2 * k2.dTheta2 + 2 * k3.dTheta2 + k4.dTheta2) * dt / 6;
            pendulum.omega1 += (k1.dOmega1 + 2 * k2.dOmega1 + 2 * k3.dOmega1 + k4.dOmega1) * dt / 6;
            pendulum.omega2 += (k1.dOmega2 + 2 * k2.dOmega2 + 2 * k3.dOmega2 + k4.dOmega2) * dt / 6;

            pendulum.omega1 *= params.damping;
            pendulum.omega2 *= params.damping;

            // Trail
            const x1 = params.l1 * Math.sin(pendulum.theta1);
            const y1 = params.l1 * Math.cos(pendulum.theta1);
            const x2 = x1 + params.l2 * Math.sin(pendulum.theta2);
            const y2 = y1 + params.l2 * Math.cos(pendulum.theta2);

            pendulum.trail.push({ x: x2, y: y2 });
            if (pendulum.trail.length > MAX_TRAIL_LENGTH) {
                pendulum.trail.shift();
            }
        });

        // Update Graph Data (Primary Pendulum only)
        const p = stateRef.current[0];

        // Phase Space: Theta1 vs Omega1

        let theta = p.theta1 % (Math.PI * 2);
        if (theta > Math.PI) theta -= Math.PI * 2;
        if (theta < -Math.PI) theta += Math.PI * 2;

        historyRef.current.phase.push({ x: theta, y: p.omega1 });
        if (historyRef.current.phase.length > PHASE_HISTORY_LENGTH) historyRef.current.phase.shift();

        // Energy

        const { m1, m2, l1, l2, g } = params;
        const pe1 = -m1 * g * l1 * Math.cos(p.theta1);
        const pe2 = -m2 * g * (l1 * Math.cos(p.theta1) + l2 * Math.cos(p.theta2));
        const pe = pe1 + pe2;

        const v1sq = (l1 * p.omega1) ** 2;
        const v2sq = (l1 * p.omega1) ** 2 + (l2 * p.omega2) ** 2 + 2 * l1 * l2 * p.omega1 * p.omega2 * Math.cos(p.theta1 - p.theta2);
        const ke = 0.5 * m1 * v1sq + 0.5 * m2 * v2sq;

        historyRef.current.energy.push({ k: ke, p: pe, t: ke + pe });
        if (historyRef.current.energy.length > ENERGY_HISTORY_LENGTH) historyRef.current.energy.shift();
    }, []);

    // --- Visualization ---
    const drawPhaseSpace = () => {
        const canvas = phaseCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, w, h);

        // Axis
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2);
        ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h);
        ctx.stroke();

        if (historyRef.current.phase.length < 2) return;

        ctx.strokeStyle = '#f472b6';
        ctx.lineWidth = 1;
        ctx.beginPath();
        // Scale: Theta -PI to PI -> 0 to w
        // Omega -0.5 to 0.5 -> 0 to h (roughly)
        const scaleX = w / (Math.PI * 2);
        const scaleY = h / 2.0; // Assume omega within [-1, 1] roughly

        const data = historyRef.current.phase;

        // Only draw connected line if points are close (avoid wrap-around lines)
        for (let i = 0; i < data.length - 1; i++) {
            const p1 = data[i];
            const p2 = data[i + 1];

            if (Math.abs(p1.x - p2.x) > 1) continue; // Skip wrap-around

            const x1 = w / 2 + p1.x * scaleX;
            const y1 = h / 2 - p1.y * scaleY * 10; // Scale omega
            const x2 = w / 2 + p2.x * scaleX;
            const y2 = h / 2 - p2.y * scaleY * 10;

            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
        }
        ctx.stroke();

        // Current Point
        const last = data[data.length - 1];
        const cx = w / 2 + last.x * scaleX;
        const cy = h / 2 - last.y * scaleY * 10;
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();
    };

    const drawEnergy = () => {
        const canvas = energyCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, w, h);

        const data = historyRef.current.energy;
        if (data.length < 2) return;

        // Find range
        let min = Infinity, max = -Infinity;
        data.forEach(d => {
            min = Math.min(min, d.k, d.p, d.t);
            max = Math.max(max, d.k, d.p, d.t);
        });
        const range = max - min || 1;
        const pad = range * 0.1;
        min -= pad; max += pad;

        const yScale = (val) => h - ((val - min) / (max - min)) * h;
        const xScale = w / data.length;

        const drawLine = (key, color) => {
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            data.forEach((d, i) => {
                const x = i * xScale;
                const y = yScale(d[key]);
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            });
            ctx.stroke();
        };

        drawLine('k', '#34d399'); // Kinetic (Green)
        drawLine('p', '#60a5fa'); // Potential (Blue)
        drawLine('t', '#fbbf24'); // Total (Amber)
    };

    const animate = useCallback(() => {
        if (isPlaying) {
            // Smaller steps for stability
            for (let i = 0; i < 5; i++) integrate(0.04);
        }

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const cx = width / 2;
        const cy = height / 3;

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, width, height);

        // Grid
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x < width; x += 50) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
        for (let y = 0; y < height; y += 50) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
        ctx.stroke();

        const { l1, l2, m1, m2 } = paramsRef.current;

        stateRef.current.forEach(p => {
            const x1 = cx + l1 * Math.sin(p.theta1);
            const y1 = cy + l1 * Math.cos(p.theta1);
            const x2 = x1 + l2 * Math.sin(p.theta2);
            const y2 = y1 + l2 * Math.cos(p.theta2);

            if (p.trail.length > 1) {
                ctx.beginPath();
                ctx.moveTo(cx + p.trail[0].x, cy + p.trail[0].y);
                for (let i = 1; i < p.trail.length; i++) {
                    ctx.lineTo(cx + p.trail[i].x, cy + p.trail[i].y);
                }
                ctx.strokeStyle = p.color;
                ctx.globalAlpha = 0.4;
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.globalAlpha = 1;
            }

            ctx.strokeStyle = '#94a3b8'; // Arm color
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();

            ctx.fillStyle = '#64748b';
            ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();

            const r1 = Math.max(6, Math.sqrt(m1) * 3);
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(x1, y1, r1, 0, Math.PI * 2); ctx.fill();

            const r2 = Math.max(6, Math.sqrt(m2) * 3);
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(x2, y2, r2, 0, Math.PI * 2); ctx.fill();
        });

        // Draw Analytics
        drawPhaseSpace();
        drawEnergy();

    }, [isPlaying, integrate]);

    useEffect(() => {
        let rId;
        const loop = () => {
            animate();
            rId = requestAnimationFrame(loop);
        };
        rId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rId);

    }, [animate]);

    useEffect(() => {
        const resize = () => {
            if (containerRef.current && canvasRef.current) {
                canvasRef.current.width = containerRef.current.clientWidth;
                canvasRef.current.height = containerRef.current.clientHeight;
            }
        };
        window.addEventListener('resize', resize);
        resize();
        return () => window.removeEventListener('resize', resize);
    }, []);

    const reset = () => {
        stateRef.current = [{
            theta1: Math.PI / 2,
            theta2: Math.PI / 2,
            omega1: 0,
            omega2: 0,
            color: '#3b82f6',
            trail: []
        }];
        historyRef.current.phase = [];
        historyRef.current.energy = [];
        setShadowMode(false);
        setIsPlaying(true);
    };

    const toggleShadowMode = () => {
        if (shadowMode) {
            // Disable: Remove shadow pendulum
            stateRef.current = [stateRef.current[0]];
            setShadowMode(false);
        } else {
            // Enable: Clone and perturb
            const main = stateRef.current[0];
            const shadow = {
                ...main,
                theta1: main.theta1 + 0.01, // Perturb
                color: '#ec4899', // Pink
                trail: []
            };
            stateRef.current.push(shadow);
            setShadowMode(true);
        }
    };

    return (
        <div className="double-pendulum-page">
            <header className="dp-header">
                <Link to="/" className="back-link" aria-label="Back to home">
                    <ArrowLeft size={20} aria-hidden="true" />
                    <span>Back to Hub</span>
                </Link>
                <h1>Double Pendulum</h1>
                <div className="header-controls">
                    <button onClick={() => setIsPlaying(!isPlaying)} className="btn-icon" aria-label={isPlaying ? 'Pause simulation' : 'Resume simulation'}>
                        {isPlaying ? <Pause size={20} aria-hidden="true" /> : <Play size={20} aria-hidden="true" />}
                    </button>
                    <button onClick={reset} className="btn-icon" aria-label="Reset simulation">
                        <RotateCcw size={20} aria-hidden="true" />
                    </button>
                </div>
            </header>

            <main className="dp-main">
                <div className="canvas-container" ref={containerRef}>
                    <canvas ref={canvasRef} role="img" aria-label="Double pendulum simulation" />
                    <div className="overlay-info">
                        Double Click reset to clear trails.
                    </div>
                </div>

                <aside className="dp-sidebar">
                    <div className="sidebar-section">
                        <h2><Settings2 size={16} /> Parameters</h2>
                        <div className="param-group">
                            <label>Mass 1: {uiParams.m1}</label>
                            <input type="range" min="1" max="50" value={uiParams.m1} onChange={(e) => { const v = Number(e.target.value); setUiParams(p => ({ ...p, m1: v })); paramsRef.current.m1 = v; }} />
                        </div>
                        <div className="param-group">
                            <label>Mass 2: {uiParams.m2}</label>
                            <input type="range" min="1" max="50" value={uiParams.m2} onChange={(e) => { const v = Number(e.target.value); setUiParams(p => ({ ...p, m2: v })); paramsRef.current.m2 = v; }} />
                        </div>
                        <div className="param-group">
                            <label>Length 1: {uiParams.l1}</label>
                            <input type="range" min="50" max="250" value={uiParams.l1} onChange={(e) => { const v = Number(e.target.value); setUiParams(p => ({ ...p, l1: v })); paramsRef.current.l1 = v; }} />
                        </div>
                        <div className="param-group">
                            <label>Length 2: {uiParams.l2}</label>
                            <input type="range" min="50" max="250" value={uiParams.l2} onChange={(e) => { const v = Number(e.target.value); setUiParams(p => ({ ...p, l2: v })); paramsRef.current.l2 = v; }} />
                        </div>
                        <div className="param-group">
                            <label>Gravity: {uiParams.g}</label>
                            <input type="range" min="0.1" max="5" step="0.1" value={uiParams.g} onChange={(e) => { const v = Number(e.target.value); setUiParams(p => ({ ...p, g: v })); paramsRef.current.g = v; }} />
                        </div>
                        <div className="param-group">
                            <label>Damping: {uiParams.damping}</label>
                            <input type="range" min="0.990" max="1.000" step="0.001" value={uiParams.damping} onChange={(e) => { const v = Number(e.target.value); setUiParams(p => ({ ...p, damping: v })); paramsRef.current.damping = v; }} />
                        </div>
                    </div>

                    <div className="sidebar-section">
                        <h2><GitFork size={16} /> Chaos Mode</h2>
                        <button
                            className={`btn-shadow ${shadowMode ? 'active' : ''}`}
                            onClick={toggleShadowMode}
                        >
                            {shadowMode ? "Remove Shadow" : "Spawn Shadow Pendulum"}
                        </button>
                        <p className="description-text">
                            Simulate the "Butterfly Effect" by adding a second pendulum with slightly perturbed initial conditions.
                        </p>
                    </div>

                    <div className="sidebar-section">
                        <h2><TrendingUp size={16} /> Phase Space (θ₁ vs ω₁)</h2>
                        <canvas ref={phaseCanvasRef} width={280} height={150} className="analysis-canvas" role="img" aria-label="Phase space plot of angle versus angular velocity" />
                    </div>

                    <div className="sidebar-section">
                        <h2><BarChart3 size={16} /> Energy</h2>
                        <canvas ref={energyCanvasRef} width={280} height={100} className="analysis-canvas" role="img" aria-label="Energy conservation chart" />
                        <div className="legend">
                            <span style={{ color: '#34d399' }}>Kinetic</span>
                            <span style={{ color: '#60a5fa' }}>Potential</span>
                            <span style={{ color: '#fbbf24' }}>Total</span>
                        </div>
                    </div>
                </aside>
            </main>
        </div>
    );
}
