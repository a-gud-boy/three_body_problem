import { memo } from 'react';
import './PeriodicTable.css';

// Memoized element cell for performance
const ElementCell = memo(function ElementCell({
    element,
    category,
    isSelected,
    onSelect,
    onHover,
    compact,
}) {
    const categoryColor = category?.color || '#868e96';
    const categoryBg = category?.bgColor || 'rgba(134, 142, 150, 0.15)';

    return (
        <button
            className={`element-cell ${isSelected ? 'selected' : ''} ${compact ? 'compact' : ''}`}
            style={{
                '--element-color': categoryColor,
                '--element-bg': categoryBg,
                gridColumn: element.col,
                gridRow: element.row,
            }}
            onClick={() => onSelect(element)}
            onMouseEnter={() => onHover?.(element)}
            onMouseLeave={() => onHover?.(null)}
            title={`${element.name} (${element.symbol})`}
        >
            <span className="element-number">{element.atomicNumber}</span>
            <span className="element-symbol">{element.symbol}</span>
            {!compact && <span className="element-mass">{element.atomicMass.toFixed(element.atomicMass < 100 ? 2 : 1)}</span>}
        </button>
    );
});

export default memo(function PeriodicTable({
    elements,
    categories,
    selectedElement,
    onElementSelect,
    onElementHover,
    compact = false,
}) {
    return (
        <div className={`periodic-table-container ${compact ? 'compact' : ''}`}>
            <div className="periodic-table-header">
                <h2>Periodic Table of Elements</h2>
                {!compact && (
                    <div className="category-legend">
                        {Object.entries(categories).map(([key, cat]) => (
                            <div key={key} className="legend-item">
                                <span
                                    className="legend-color"
                                    style={{ background: cat.color }}
                                />
                                <span className="legend-name">{cat.name}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className={`periodic-table-grid ${compact ? 'compact' : ''}`}>
                {/* Lanthanide/Actinide placeholders in main table */}
                <div className="series-placeholder lanthanide" style={{ gridColumn: '3', gridRow: '6' }}>
                    57-71
                </div>
                <div className="series-placeholder actinide" style={{ gridColumn: '3', gridRow: '7' }}>
                    89-103
                </div>

                {/* All elements */}
                {elements.map((element) => (
                    <ElementCell
                        key={element.atomicNumber}
                        element={element}
                        category={categories[element.category]}
                        isSelected={selectedElement?.atomicNumber === element.atomicNumber}
                        onSelect={onElementSelect}
                        onHover={onElementHover}
                        compact={compact}
                    />
                ))}
            </div>

            {/* Lanthanide and Actinide series labels */}
            <div className="series-labels">
                <span className="series-label lanthanide">Lanthanides</span>
                <span className="series-label actinide">Actinides</span>
            </div>
        </div>
    );
});
