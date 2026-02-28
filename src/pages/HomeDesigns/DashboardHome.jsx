import { Link } from 'react-router-dom';
import { Search, ArrowRight, BarChart3, Activity, Globe, Filter } from 'lucide-react';
import { useState, useMemo } from 'react';
import { simulations, threeBodySim, categories } from '../homeData';
import './DashboardHome.css';

export default function DashboardHome() {
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    const allSims = useMemo(() => [threeBodySim, ...simulations], []);

    const filtered = useMemo(() => {
        return allSims.filter((sim) => {
            const matchesSearch = sim.title.toLowerCase().includes(search.toLowerCase()) ||
                sim.description.toLowerCase().includes(search.toLowerCase());
            const matchesCategory = activeCategory === 'All' || sim.category === activeCategory;
            return matchesSearch && matchesCategory;
        });
    }, [search, activeCategory, allSims]);

    const stats = [
        { label: 'Total Simulations', value: allSims.length, icon: <BarChart3 size={18} />, change: '+3 this month' },
        { label: 'Active Users', value: '2.4K', icon: <Activity size={18} />, change: '+12% ↑' },
        { label: 'GPU Simulations', value: '5', icon: <Globe size={18} />, change: 'WebGPU powered' },
    ];

    return (
        <div className="dash-home">
            {/* Sidebar */}
            <aside className="dash-sidebar">
                <div className="dash-sidebar-logo">
                    <span className="dash-logo-dot" />
                    Physics Hub
                </div>

                <nav className="dash-nav">
                    <div className="dash-nav-label">Categories</div>
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            className={`dash-nav-item ${activeCategory === cat ? 'active' : ''}`}
                            onClick={() => setActiveCategory(cat)}
                        >
                            <Filter size={14} />
                            {cat}
                            {cat !== 'All' && (
                                <span className="dash-nav-count">
                                    {allSims.filter((s) => s.category === cat).length}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>
            </aside>

            {/* Main content */}
            <main className="dash-main">
                {/* Top bar */}
                <div className="dash-topbar">
                    <div className="dash-search">
                        <Search size={16} />
                        <input
                            type="text"
                            placeholder="Search simulations..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="dash-search-input"
                        />
                    </div>
                </div>

                {/* Stats */}
                <div className="dash-stats">
                    {stats.map((stat, i) => (
                        <div key={i} className="dash-stat-card">
                            <div className="dash-stat-header">
                                <span className="dash-stat-icon">{stat.icon}</span>
                                <span className="dash-stat-change">{stat.change}</span>
                            </div>
                            <div className="dash-stat-value">{stat.value}</div>
                            <div className="dash-stat-label">{stat.label}</div>
                        </div>
                    ))}
                </div>

                {/* Sim list */}
                <div className="dash-section-header">
                    <h2 className="dash-section-title">
                        {activeCategory === 'All' ? 'All Simulations' : activeCategory}
                    </h2>
                    <span className="dash-result-count">{filtered.length} results</span>
                </div>

                <div className="dash-list">
                    {filtered.map((sim) => (
                        <Link to={sim.path} key={sim.id} className="dash-list-item">
                            <div className="dash-item-icon" style={{ background: sim.iconBg }}>
                                {sim.icon}
                            </div>
                            <div className="dash-item-info">
                                <h3 className="dash-item-title">{sim.title}</h3>
                                <p className="dash-item-desc">{sim.description}</p>
                            </div>
                            <span className="dash-item-cat">{sim.category}</span>
                            <ArrowRight size={16} className="dash-item-arrow" />
                        </Link>
                    ))}
                    {filtered.length === 0 && (
                        <div className="dash-empty">No simulations match your search.</div>
                    )}
                </div>
            </main>
        </div>
    );
}
