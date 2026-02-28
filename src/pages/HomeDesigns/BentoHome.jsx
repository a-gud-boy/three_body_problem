import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Zap, Cpu, FlaskConical } from 'lucide-react';
import { simulations, threeBodySim } from '../homeData';
import './BentoHome.css';

export default function BentoHome() {
    const featured = threeBodySim;
    const topSims = simulations.slice(0, 6);
    const stats = [
        { label: 'Simulations', value: '11', icon: <Zap size={18} /> },
        { label: 'GPU-Powered', value: '5', icon: <Cpu size={18} /> },
        { label: 'Categories', value: '6', icon: <FlaskConical size={18} /> },
    ];

    return (
        <div className="bento-home">
            <header className="bento-header">
                <div className="bento-logo">
                    <span className="bento-logo-icon">🌌</span>
                    Physics Hub
                </div>
            </header>

            <main className="bento-grid">
                {/* Hero — large */}
                <Link to={featured.path} className="bento-card bento-hero">
                    <div className="bento-hero-glow" />
                    <div className="bento-hero-content">
                        <div className="bento-tag">
                            <Sparkles size={12} /> Featured
                        </div>
                        <h1 className="bento-hero-title">{featured.title}</h1>
                        <p className="bento-hero-desc">{featured.description}</p>
                        <span className="bento-hero-cta">
                            Launch <ArrowRight size={16} />
                        </span>
                    </div>
                    <div className="bento-hero-visual">
                        <div className="bento-orbit-ring r1" />
                        <div className="bento-orbit-ring r2" />
                        <div className="bento-orbit-ring r3" />
                        <div className="bento-planet p1" />
                        <div className="bento-planet p2" />
                        <div className="bento-planet p3" />
                    </div>
                </Link>

                {/* Stats row */}
                {stats.map((stat, i) => (
                    <div key={i} className="bento-card bento-stat">
                        <div className="bento-stat-icon">{stat.icon}</div>
                        <div className="bento-stat-value">{stat.value}</div>
                        <div className="bento-stat-label">{stat.label}</div>
                    </div>
                ))}

                {/* Sim cards */}
                {topSims.map((sim, i) => (
                    <Link
                        to={sim.path}
                        key={sim.id}
                        className={`bento-card bento-sim ${i === 0 ? 'bento-sim-wide' : ''}`}
                    >
                        <div className="bento-sim-icon" style={{ background: sim.iconBg }}>
                            {sim.icon}
                        </div>
                        <h3 className="bento-sim-title">{sim.title}</h3>
                        <p className="bento-sim-desc">{sim.description}</p>
                        <span className="bento-sim-arrow"><ArrowRight size={14} /></span>
                    </Link>
                ))}

                {/* Explore all card */}
                <Link to="/three-body" className="bento-card bento-explore">
                    <span className="bento-explore-text">Explore All Simulations</span>
                    <ArrowRight size={20} />
                </Link>
            </main>
        </div>
    );
}
