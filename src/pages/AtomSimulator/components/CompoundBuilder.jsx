import { memo } from 'react';
import { Trash2, X } from 'lucide-react';
import { getElementById } from '../../../data/elementsData';
import { generateFormula } from '../../../data/compoundsData';
import './CompoundBuilder.css';

export default memo(function CompoundBuilder({ atoms, onRemoveAtom, onClear }) {
    // Calculate compound info
    const atomCounts = atoms.reduce((acc, atom) => {
        const symbol = atom.element.symbol;
        acc[symbol] = (acc[symbol] || 0) + 1;
        return acc;
    }, {});

    const formula = generateFormula(atomCounts);

    const molecularWeight = atoms.reduce((total, atom) => {
        return total + atom.element.atomicMass;
    }, 0);

    const totalElectrons = atoms.reduce((total, atom) => {
        return total + atom.element.atomicNumber;
    }, 0);

    return (
        <div className="compound-builder">
            <div className="builder-header">
                <h3>Compound Builder</h3>
                {atoms.length > 0 && (
                    <button className="clear-btn" onClick={onClear}>
                        <Trash2 size={14} />
                        Clear
                    </button>
                )}
            </div>

            {/* Atom List */}
            <div className="atom-list">
                {atoms.length === 0 ? (
                    <p className="empty-text">Click elements above to add atoms</p>
                ) : (
                    atoms.map((atom) => (
                        <div key={atom.id} className="atom-chip">
                            <span
                                className="atom-chip-symbol"
                                style={{ color: `var(--element-${atom.element.category}, #4dabf7)` }}
                            >
                                {atom.element.symbol}
                            </span>
                            <span className="atom-chip-name">{atom.element.name}</span>
                            <button
                                className="remove-atom-btn"
                                onClick={() => onRemoveAtom(atom.id)}
                            >
                                <X size={12} />
                            </button>
                        </div>
                    ))
                )}
            </div>

            {/* Compound Info */}
            {atoms.length > 0 && (
                <div className="compound-info-panel">
                    <div className="formula-display">
                        <span className="formula-label">Formula</span>
                        <span className="formula-value">{formula || '—'}</span>
                    </div>

                    <div className="compound-stats">
                        <div className="stat-item">
                            <span className="stat-label">Atoms</span>
                            <span className="stat-value">{atoms.length}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Mol. Weight</span>
                            <span className="stat-value">{molecularWeight.toFixed(2)} g/mol</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Total e⁻</span>
                            <span className="stat-value">{totalElectrons}</span>
                        </div>
                    </div>

                    {/* Composition breakdown */}
                    <div className="composition-breakdown">
                        <span className="breakdown-label">Composition</span>
                        <div className="breakdown-bars">
                            {Object.entries(atomCounts).map(([symbol, count]) => {
                                const element = getElementById(
                                    atoms.find(a => a.element.symbol === symbol)?.element.atomicNumber
                                );
                                const massContribution = element ? (count * element.atomicMass / molecularWeight) * 100 : 0;
                                return (
                                    <div
                                        key={symbol}
                                        className="breakdown-bar"
                                        style={{ width: `${massContribution}%` }}
                                        title={`${symbol}: ${massContribution.toFixed(1)}%`}
                                    >
                                        <span className="bar-label">{symbol}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});
