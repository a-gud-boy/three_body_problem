import { Link } from 'react-router-dom';
import { ArrowRight, Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef } from 'react';
import { simulations, threeBodySim } from '../homeData';
import './ImmersiveHome.css';

// Pre-computed at module level to satisfy react-hooks/purity rule
const PARTICLE_STYLES = Array.from({ length: 30 }, () => ({
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    animationDuration: `${3 + Math.random() * 4}s`,
    animationDelay: `${Math.random() * 3}s`,
    width: `${2 + Math.random() * 3}px`,
    height: `${2 + Math.random() * 3}px`,
}));

export default function ImmersiveHome() {
    const scrollRef = useRef(null);
    const allSims = [threeBodySim, ...simulations];

    const scroll = (dir) => {
        if (!scrollRef.current) return;
        const amount = 340 * dir;
        scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    };

    return (
        <div className="immersive-home">
            {/* Full viewport hero */}
            <section className="immersive-hero">
                <div className="immersive-hero-particles">
                    {PARTICLE_STYLES.map((style, i) => (
                        <div
                            key={i}
                            className="imm-particle"
                            style={style}
                        />
                    ))}
                </div>

                <div className="immersive-hero-content">
                    <h1 className="immersive-title">
                        <span className="imm-title-line">Explore the</span>
                        <span className="imm-title-accent">Universe</span>
                        <span className="imm-title-line">Through Physics</span>
                    </h1>
                    <p className="immersive-subtitle">
                        Interactive real-time simulations powered by WebGPU
                    </p>
                    <Link to="/three-body" className="immersive-cta">
                        <Play size={18} />
                        Start Exploring
                    </Link>
                </div>

                <div className="immersive-scroll-hint">
                    <div className="scroll-line" />
                    <span>Scroll to explore</span>
                </div>
            </section>

            {/* Horizontal carousel */}
            <section className="immersive-carousel-section">
                <div className="immersive-carousel-header">
                    <h2 className="immersive-section-title">Simulation Library</h2>
                    <div className="carousel-controls">
                        <button className="carousel-btn" onClick={() => scroll(-1)} aria-label="Previous">
                            <ChevronLeft size={20} />
                        </button>
                        <button className="carousel-btn" onClick={() => scroll(1)} aria-label="Next">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>

                <div className="immersive-carousel" ref={scrollRef}>
                    {allSims.map((sim, i) => (
                        <Link to={sim.path} key={sim.id} className="immersive-card">
                            <div className="imm-card-number">{String(i + 1).padStart(2, '0')}</div>
                            <div className="imm-card-icon" style={{ background: sim.iconBg }}>
                                {sim.icon}
                            </div>
                            <h3 className="imm-card-title">{sim.title}</h3>
                            <p className="imm-card-desc">{sim.description}</p>
                            <span className="imm-card-cta">
                                Launch <ArrowRight size={14} />
                            </span>
                        </Link>
                    ))}
                </div>
            </section>
        </div>
    );
}
