import { Link } from 'react-router-dom';
import { ArrowRight, Clock, Bookmark } from 'lucide-react';
import { simulations, threeBodySim } from '../homeData';
import './MagazineHome.css';

export default function MagazineHome() {
    const featured = threeBodySim;
    const topStories = simulations.slice(0, 3);
    const moreArticles = simulations.slice(3);

    return (
        <div className="mag-home">
            {/* Masthead */}
            <header className="mag-masthead">
                <div className="mag-masthead-top">
                    <span className="mag-edition">Vol. 1 — February 2026</span>
                    <span className="mag-edition">physics-hub.io</span>
                </div>
                <h1 className="mag-logo-text">PHYSICS HUB</h1>
                <div className="mag-divider" />
            </header>

            <main className="mag-content">
                {/* Cover story */}
                <section className="mag-cover">
                    <Link to={featured.path} className="mag-cover-card">
                        <div className="mag-cover-visual">
                            <div className="mag-cover-gradient" />
                            <div className="mag-cover-orbits">
                                <div className="mag-orbit mo1" />
                                <div className="mag-orbit mo2" />
                                <div className="mag-orbit mo3" />
                            </div>
                        </div>
                        <div className="mag-cover-body">
                            <div className="mag-cover-meta">
                                <span className="mag-cat-badge">Cover Story</span>
                                <span className="mag-read-time"><Clock size={12} /> 5 min read</span>
                            </div>
                            <h2 className="mag-cover-title">{featured.title}</h2>
                            <p className="mag-cover-excerpt">{featured.description}</p>
                            <div className="mag-cover-tags">
                                {featured.tags.map((tag) => (
                                    <span key={tag} className="mag-tag">{tag}</span>
                                ))}
                            </div>
                            <span className="mag-read-more">
                                Read More <ArrowRight size={16} />
                            </span>
                        </div>
                    </Link>
                </section>

                {/* Two-column layout */}
                <div className="mag-two-col">
                    {/* Main column */}
                    <div className="mag-main-col">
                        <h3 className="mag-section-label">Top Stories</h3>
                        <div className="mag-stories">
                            {topStories.map((sim, i) => (
                                <Link to={sim.path} key={sim.id} className="mag-story">
                                    <div className="mag-story-number">{String(i + 1).padStart(2, '0')}</div>
                                    <div className="mag-story-body">
                                        <span className="mag-story-cat">{sim.category}</span>
                                        <h4 className="mag-story-title">{sim.title}</h4>
                                        <p className="mag-story-desc">{sim.description}</p>
                                    </div>
                                    <ArrowRight size={16} className="mag-story-arrow" />
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Sidebar column */}
                    <aside className="mag-sidebar-col">
                        <h3 className="mag-section-label">More to Explore</h3>
                        <div className="mag-sidebar-list">
                            {moreArticles.map((sim) => (
                                <Link to={sim.path} key={sim.id} className="mag-sidebar-item">
                                    <span className="mag-sidebar-icon" style={{ background: sim.iconBg }}>
                                        {sim.icon}
                                    </span>
                                    <div className="mag-sidebar-text">
                                        <h5 className="mag-sidebar-title">{sim.title}</h5>
                                        <span className="mag-sidebar-cat">{sim.category}</span>
                                    </div>
                                    <Bookmark size={14} className="mag-sidebar-bookmark" />
                                </Link>
                            ))}
                        </div>
                    </aside>
                </div>
            </main>

            <footer className="mag-footer">
                <div className="mag-divider" />
                <p>© 2026 Physics Simulation Hub — All simulations are interactive and run in your browser.</p>
            </footer>
        </div>
    );
}
