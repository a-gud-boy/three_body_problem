import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { simulations, threeBodySim } from '../homeData';
import './TerminalHome.css';

function TypingText({ text, speed = 40, delay = 0 }) {
    const [displayed, setDisplayed] = useState('');
    const [started, setStarted] = useState(false);

    useEffect(() => {
        const startTimer = setTimeout(() => setStarted(true), delay);
        return () => clearTimeout(startTimer);
    }, [delay]);

    useEffect(() => {
        if (!started) return;
        if (displayed.length >= text.length) return;
        const timer = setTimeout(() => {
            setDisplayed(text.slice(0, displayed.length + 1));
        }, speed);
        return () => clearTimeout(timer);
    }, [displayed, started, text, speed]);

    return (
        <span>
            {displayed}
            {displayed.length < text.length && <span className="term-cursor">█</span>}
        </span>
    );
}

function MatrixRain() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        const chars = 'アイウエオカキクケコ01サシスセソタチツテト10ナニヌネノハヒフヘホ';
        const fontSize = 14;
        const columns = Math.floor(canvas.width / fontSize);
        const drops = Array(columns).fill(1);

        const draw = () => {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#0f0';
            ctx.font = `${fontSize}px monospace`;

            for (let i = 0; i < drops.length; i++) {
                const text = chars[Math.floor(Math.random() * chars.length)];
                ctx.globalAlpha = 0.08 + Math.random() * 0.04;
                ctx.fillText(text, i * fontSize, drops[i] * fontSize);
                if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            }
            ctx.globalAlpha = 1;
        };

        const interval = setInterval(draw, 50);
        return () => {
            clearInterval(interval);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return <canvas ref={canvasRef} className="matrix-canvas" />;
}

export default function TerminalHome() {
    const allSims = [threeBodySim, ...simulations];
    const [showSims, setShowSims] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setShowSims(true), 2000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="term-home">
            <MatrixRain />

            <div className="term-window">
                <div className="term-titlebar">
                    <div className="term-dots">
                        <span className="term-dot red" />
                        <span className="term-dot yellow" />
                        <span className="term-dot green" />
                    </div>
                    <span className="term-titlebar-text">physics-hub — bash — 80×24</span>
                </div>

                <div className="term-body">
                    <div className="term-line">
                        <span className="term-prompt">user@physics-hub</span>
                        <span className="term-colon">:</span>
                        <span className="term-path">~</span>
                        <span className="term-dollar">$ </span>
                        <TypingText text="cat welcome.txt" speed={60} delay={300} />
                    </div>

                    <div className="term-output" style={{ animationDelay: '1.5s' }}>
                        <pre className="term-ascii">{`
 ██████╗ ██╗  ██╗██╗   ██╗███████╗██╗ ██████╗███████╗
 ██╔══██╗██║  ██║╚██╗ ██╔╝██╔════╝██║██╔════╝██╔════╝
 ██████╔╝███████║ ╚████╔╝ ███████╗██║██║     ███████╗
 ██╔═══╝ ██╔══██║  ╚██╔╝  ╚════██║██║██║     ╚════██║
 ██║     ██║  ██║   ██║   ███████║██║╚██████╗███████║
 ╚═╝     ╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═╝ ╚═════╝╚══════╝
            `}</pre>
                        <p className="term-welcome-msg">Interactive Physics Simulation Hub v2.0</p>
                        <p className="term-welcome-sub">WebGPU-powered real-time simulations</p>
                    </div>

                    <div className="term-line" style={{ animationDelay: '2s' }}>
                        <span className="term-prompt">user@physics-hub</span>
                        <span className="term-colon">:</span>
                        <span className="term-path">~</span>
                        <span className="term-dollar">$ </span>
                        <TypingText text="ls ./simulations/" speed={50} delay={2000} />
                    </div>

                    {showSims && (
                        <div className="term-sim-list">
                            <div className="term-ls-header">
                                <span className="term-ls-col">PERMS</span>
                                <span className="term-ls-col">STATUS</span>
                                <span className="term-ls-col">NAME</span>
                            </div>
                            {allSims.map((sim, i) => (
                                <Link
                                    to={sim.path}
                                    key={sim.id}
                                    className="term-sim-entry"
                                    style={{ animationDelay: `${2.2 + i * 0.08}s` }}
                                >
                                    <span className="term-perms">drwxr-xr-x</span>
                                    <span className="term-status-badge">
                                        {sim.status === 'available' ? '● READY' : '○ SOON'}
                                    </span>
                                    <span className="term-sim-name">
                                        {sim.icon} {sim.title}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    )}

                    {showSims && (
                        <div className="term-line term-prompt-final" style={{ animationDelay: '3.5s' }}>
                            <span className="term-prompt">user@physics-hub</span>
                            <span className="term-colon">:</span>
                            <span className="term-path">~</span>
                            <span className="term-dollar">$ </span>
                            <span className="term-cursor blink">█</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
