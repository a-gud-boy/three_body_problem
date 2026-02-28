import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Lock, Lightbulb } from 'lucide-react';
import { useEffect, useRef, useState, useCallback } from 'react';
import './HomePage.css';
import './HomeStyles.css';
import StyleSwitcher from './StyleSwitcher';
import DesignSwitcher from './DesignSwitcher';
import { simulations } from './homeData';

// Lazy-load the 5 new designs
import BentoHome from './HomeDesigns/BentoHome';
import ImmersiveHome from './HomeDesigns/ImmersiveHome';
import DashboardHome from './HomeDesigns/DashboardHome';
import MagazineHome from './HomeDesigns/MagazineHome';
import TerminalHome from './HomeDesigns/TerminalHome';

// ── Theme-specific backgrounds ──────────────────────────────
function AnimatedBackground() {
    const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.3 });
    const targetPos = useRef({ x: 0.5, y: 0.3 });
    const animationRef = useRef(null);

    useEffect(() => {
        const handleMouseMove = (e) => {
            targetPos.current = {
                x: e.clientX / window.innerWidth,
                y: e.clientY / window.innerHeight,
            };
        };

        window.addEventListener('mousemove', handleMouseMove);

        const animate = () => {
            setMousePos((prev) => ({
                x: prev.x + (targetPos.current.x - prev.x) * 0.03,
                y: prev.y + (targetPos.current.y - prev.y) * 0.03,
            }));
            animationRef.current = requestAnimationFrame(animate);
        };
        animate();

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(animationRef.current);
        };
    }, []);

    return (
        <div className="reactive-bg">
            <div className="bg-base" />
            <div
                className="bg-spotlight"
                style={{
                    background: `radial-gradient(
                        600px circle at ${mousePos.x * 100}% ${mousePos.y * 100}%,
                        rgba(168, 85, 247, 0.08) 0%,
                        rgba(139, 92, 246, 0.04) 25%,
                        transparent 50%
                    )`,
                }}
            />
            <div className="bg-ambient" />
            <div className="bg-grid" />
        </div>
    );
}

function NeonBackground() {
    return (
        <div className="neon-bg">
            <div className="neon-grid-lines" />
            <div className="neon-glow-1" />
            <div className="neon-glow-2" />
            <div className="neon-scanline" />
        </div>
    );
}

function GlassBackground() {
    return (
        <div className="glass-bg">
            <div className="glass-orb-1" />
            <div className="glass-orb-2" />
            <div className="glass-orb-3" />
        </div>
    );
}

function AuroraBackground() {
    return (
        <div className="aurora-bg">
            <div className="aurora-stars" />
            <div className="aurora-ribbon-1" />
            <div className="aurora-ribbon-2" />
            <div className="aurora-ribbon-3" />
        </div>
    );
}

function MonoBackground() {
    return (
        <div className="mono-bg">
            <div className="mono-accent-line" />
            <div className="mono-geo-1" />
            <div className="mono-geo-2" />
        </div>
    );
}

function ThemeBackground({ theme }) {
    switch (theme) {
        case 'neon-grid': return <NeonBackground />;
        case 'glass-light': return <GlassBackground />;
        case 'aurora': return <AuroraBackground />;
        case 'mono': return <MonoBackground />;
        default: return <AnimatedBackground />;
    }
}

// ── Classic design components ───────────────────────────────
function OrbitalAnimation() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = 300;
        const height = 300;
        canvas.width = width;
        canvas.height = height;

        const bodies = [
            { x: 150, y: 100, vx: 0.8, vy: 0.3, mass: 1, color: '#3b82f6', trail: [] },
            { x: 100, y: 180, vx: -0.4, vy: -0.6, mass: 1, color: '#ef4444', trail: [] },
            { x: 200, y: 180, vx: -0.4, vy: 0.3, mass: 1, color: '#22c55e', trail: [] },
        ];

        const G = 800;
        const dt = 0.15;
        const trailLength = 60;
        let animationId;

        const animate = () => {
            ctx.fillStyle = 'rgba(20, 20, 30, 0.15)';
            ctx.fillRect(0, 0, width, height);

            for (let i = 0; i < bodies.length; i++) {
                let ax = 0, ay = 0;
                for (let j = 0; j < bodies.length; j++) {
                    if (i !== j) {
                        const dx = bodies[j].x - bodies[i].x;
                        const dy = bodies[j].y - bodies[i].y;
                        const dist = Math.sqrt(dx * dx + dy * dy) + 10;
                        const force = G * bodies[j].mass / (dist * dist);
                        ax += force * dx / dist;
                        ay += force * dy / dist;
                    }
                }
                bodies[i].vx += ax * dt;
                bodies[i].vy += ay * dt;
            }

            for (const body of bodies) {
                body.x += body.vx * dt;
                body.y += body.vy * dt;
                if (body.x < 20 || body.x > width - 20) body.vx *= -0.8;
                if (body.y < 20 || body.y > height - 20) body.vy *= -0.8;
                body.x = Math.max(20, Math.min(width - 20, body.x));
                body.y = Math.max(20, Math.min(height - 20, body.y));
                body.trail.push({ x: body.x, y: body.y });
                if (body.trail.length > trailLength) body.trail.shift();
            }

            for (const body of bodies) {
                if (body.trail.length < 2) continue;
                ctx.beginPath();
                ctx.moveTo(body.trail[0].x, body.trail[0].y);
                for (let i = 1; i < body.trail.length; i++) {
                    ctx.lineTo(body.trail[i].x, body.trail[i].y);
                }
                ctx.strokeStyle = body.color;
                ctx.lineWidth = 1.5;
                ctx.globalAlpha = 0.6;
                ctx.stroke();
                ctx.globalAlpha = 1;
            }

            for (const body of bodies) {
                const gradient = ctx.createRadialGradient(body.x, body.y, 0, body.x, body.y, 15);
                gradient.addColorStop(0, body.color);
                gradient.addColorStop(1, 'transparent');
                ctx.beginPath();
                ctx.arc(body.x, body.y, 15, 0, Math.PI * 2);
                ctx.fillStyle = gradient;
                ctx.fill();
                ctx.beginPath();
                ctx.arc(body.x, body.y, 6, 0, Math.PI * 2);
                ctx.fillStyle = body.color;
                ctx.fill();
            }

            animationId = requestAnimationFrame(animate);
        };

        animate();
        return () => cancelAnimationFrame(animationId);
    }, []);

    return <canvas ref={canvasRef} className="orbital-canvas" />;
}

function SimCard({ simulation }) {
    const { title, description, icon, iconBg, status, path } = simulation;

    let badge;
    if (status === 'coming-soon') {
        badge = (
            <div className="coming-soon-badge">
                <Lock size={10} />
                Coming Soon
            </div>
        );
    } else if (status === 'concept') {
        badge = (
            <div className="concept-badge" style={{
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#94a3b8',
                padding: '0.25rem 0.5rem',
                borderRadius: '999px',
                fontSize: '0.65rem',
                fontWeight: '600',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
            }}>
                <Lightbulb size={10} />
                Concept
            </div>
        );
    } else {
        badge = (
            <div className="available-badge">
                <Sparkles size={10} />
                Available
            </div>
        );
    }

    const content = (
        <>
            <div className="sim-icon" style={{ background: iconBg }}>
                {icon}
            </div>
            <h3 className="sim-card-title">{title}</h3>
            <p className="sim-card-desc">{description}</p>
            {badge}
        </>
    );

    if ((status === 'available' || status === 'concept') && path) {
        return (
            <Link to={path} className="sim-card available">
                {content}
            </Link>
        );
    }

    return (
        <div className="sim-card disabled">
            {content}
        </div>
    );
}

// ── Classic Design (Design 0) ──────────────────────────────
function ClassicDesign() {
    return (
        <>
            {/* Navigation */}
            <nav className="nav">
                <div className="nav-logo">
                    <div className="nav-logo-icon">🌌</div>
                    Physics Hub
                </div>
                <div className="nav-links">
                    <a href="#simulations" className="nav-link">Simulations</a>
                    <a href="#research" className="nav-link">Research</a>
                    <a href="#community" className="nav-link">Community</a>
                    <button className="nav-cta">Sign In</button>
                </div>
            </nav>

            {/* Main Content */}
            <main className="main-content">
                {/* Hero Section */}
                <section className="hero">
                    <div className="hero-badge">
                        <Sparkles size={14} />
                        Interactive Physics Simulations
                    </div>
                    <h1 className="hero-title">Physics Simulation Hub</h1>
                    <p className="hero-subtitle">
                        Explore the fundamental forces of nature through interactive, real-time simulations
                        designed for research and education.
                    </p>
                    <div className="hero-buttons">
                        <Link to="/three-body" className="btn-primary">
                            Start Exploring
                        </Link>
                        <button className="btn-secondary">View Documentation</button>
                    </div>
                </section>

                {/* Simulation Library */}
                <section id="simulations">
                    <div className="section-header">
                        <h2 className="section-title">Simulation Library</h2>
                        <a href="#" className="section-link">
                            View all <ArrowRight size={16} />
                        </a>
                    </div>

                    <Link to="/three-body" className="featured-card">
                        <div className="featured-visual">
                            <OrbitalAnimation />
                        </div>
                        <div className="featured-content">
                            <div className="featured-badge">
                                <span className="featured-badge-dot" />
                                Available Now
                            </div>
                            <h3 className="featured-title">Three-Body Problem</h3>
                            <p className="featured-description">
                                Explore the chaotic dance of three celestial bodies under gravitational influence.
                                Modify mass, velocity, and observe the butterfly effect in real-time.
                            </p>
                            <div className="featured-tags">
                                <span className="tag">Gravity</span>
                                <span className="tag">Chaos Theory</span>
                                <span className="tag">Orbital Mechanics</span>
                            </div>
                            <span className="featured-cta">
                                Launch Simulation <ArrowRight size={18} />
                            </span>
                        </div>
                    </Link>

                    <div className="sim-grid">
                        {simulations.map((sim) => (
                            <SimCard key={sim.id} simulation={sim} />
                        ))}
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="footer">
                © 2026 Physics Simulation Hub. All rights reserved.
            </footer>
        </>
    );
}

// ── Design Router ──────────────────────────────────────────
function ActiveDesign({ design }) {
    switch (design) {
        case 'bento': return <BentoHome />;
        case 'immersive': return <ImmersiveHome />;
        case 'dashboard': return <DashboardHome />;
        case 'magazine': return <MagazineHome />;
        case 'terminal': return <TerminalHome />;
        default: return <ClassicDesign />;
    }
}

// ── Main Export ────────────────────────────────────────────
export default function HomePage() {
    const [theme, setTheme] = useState(() => {
        try { return localStorage.getItem('homepage-theme') || 'cosmic-dark'; }
        catch { return 'cosmic-dark'; }
    });

    const [design, setDesign] = useState(() => {
        try { return localStorage.getItem('homepage-design') || 'classic'; }
        catch { return 'classic'; }
    });

    const handleThemeChange = useCallback((newTheme) => {
        setTheme(newTheme);
        try { localStorage.setItem('homepage-theme', newTheme); }
        catch { /* ignore */ }
    }, []);

    const handleDesignChange = useCallback((newDesign) => {
        setDesign(newDesign);
        try { localStorage.setItem('homepage-design', newDesign); }
        catch { /* ignore */ }
    }, []);

    const themeClass = theme === 'cosmic-dark' ? '' : `theme-${theme}`;

    return (
        <div className={`homepage ${themeClass}`}>
            {/* Theme-specific Background */}
            <ThemeBackground theme={theme} />

            {/* Active Design */}
            <ActiveDesign design={design} />

            {/* Design Switcher (top center) */}
            <DesignSwitcher currentDesign={design} onDesignChange={handleDesignChange} />

            {/* Style Switcher (bottom right) */}
            <StyleSwitcher currentTheme={theme} onThemeChange={handleThemeChange} />
        </div>
    );
}
