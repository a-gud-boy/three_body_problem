import { memo } from 'react';
import { COMPOUND_CATEGORIES } from '../../../data/compoundsData';
import './DemosPanel.css';

export default memo(function DemosPanel({ compounds, selectedCompound, onSelectCompound }) {
    return (
        <div className="demos-panel">
            <div className="demos-header">
                <h2>Demo Compounds</h2>
                <p>Explore common molecules and their structures</p>
            </div>

            {/* Category Sections */}
            {Object.entries(COMPOUND_CATEGORIES).map(([catId, category]) => (
                <div key={catId} className="demo-category">
                    <h3 className="category-title">{category.name}</h3>
                    <p className="category-desc">{category.description}</p>

                    <div className="demo-grid">
                        {category.compounds.map(compoundId => {
                            const compound = compounds.find(c => c.id === compoundId);
                            if (!compound) return null;

                            return (
                                <button
                                    key={compoundId}
                                    className={`demo-card ${selectedCompound?.id === compoundId ? 'selected' : ''}`}
                                    onClick={() => onSelectCompound(compound)}
                                >
                                    <div className="demo-icon">
                                        {getCompoundIcon(compound.type)}
                                    </div>
                                    <div className="demo-content">
                                        <span className="demo-formula">{compound.formula}</span>
                                        <span className="demo-name">{compound.name}</span>
                                    </div>
                                    <div className={`demo-type-badge ${compound.type}`}>
                                        {compound.type}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
});

function getCompoundIcon(type) {
    switch (type) {
        case 'ionic':
            return '🧂';
        case 'covalent':
            return '⚗️';
        default:
            return '🔬';
    }
}
