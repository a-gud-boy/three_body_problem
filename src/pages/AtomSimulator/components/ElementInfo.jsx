import './ElementInfo.css';

const SHELL_NAMES = ['K', 'L', 'M', 'N', 'O', 'P', 'Q'];

export default function ElementInfo({ element, shells, orbitals, category }) {
    const valenceElectrons = shells.filter(s => s > 0).pop() || 0;
    const protons = element.atomicNumber;
    const neutrons = Math.round(element.atomicMass) - protons;

    return (
        <div className="element-info">
            {/* Header */}
            <div className="element-info-header" style={{ '--category-color': category?.color || '#4dabf7' }}>
                <div className="element-big-symbol">{element.symbol}</div>
                <div className="element-header-details">
                    <h2>{element.name}</h2>
                    <span className="element-category-badge" style={{ background: category?.bgColor, color: category?.color }}>
                        {category?.name || 'Unknown'}
                    </span>
                </div>
            </div>

            {/* Basic Properties */}
            <div className="info-section">
                <h3>Properties</h3>
                <div className="property-grid">
                    <div className="property-item">
                        <span className="property-label">Atomic Number</span>
                        <span className="property-value">{element.atomicNumber}</span>
                    </div>
                    <div className="property-item">
                        <span className="property-label">Atomic Mass</span>
                        <span className="property-value">{element.atomicMass.toFixed(3)} u</span>
                    </div>
                    <div className="property-item">
                        <span className="property-label">Protons</span>
                        <span className="property-value proton">{protons}</span>
                    </div>
                    <div className="property-item">
                        <span className="property-label">Neutrons</span>
                        <span className="property-value neutron">{neutrons}</span>
                    </div>
                    <div className="property-item">
                        <span className="property-label">Electrons</span>
                        <span className="property-value electron">{protons}</span>
                    </div>
                    <div className="property-item">
                        <span className="property-label">Valence e⁻</span>
                        <span className="property-value">{valenceElectrons}</span>
                    </div>
                    {element.electronegativity && (
                        <div className="property-item">
                            <span className="property-label">Electronegativity</span>
                            <span className="property-value">{element.electronegativity.toFixed(2)}</span>
                        </div>
                    )}
                    {element.ionizationEnergy && (
                        <div className="property-item">
                            <span className="property-label">Ionization Energy</span>
                            <span className="property-value">{element.ionizationEnergy} kJ/mol</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Electron Configuration */}
            <div className="info-section">
                <h3>Electron Configuration</h3>
                <div className="electron-config">
                    <code>{element.electronConfig}</code>
                </div>

                {/* Shell diagram */}
                <div className="shell-diagram">
                    {shells.map((count, i) => count > 0 && (
                        <div key={i} className="shell-ring" style={{ '--ring-size': `${40 + i * 20}px` }}>
                            <span className="shell-label">{SHELL_NAMES[i]}: {count}</span>
                        </div>
                    ))}
                    <div className="shell-nucleus">
                        <span>{element.symbol}</span>
                    </div>
                </div>
            </div>

            {/* Orbital Details */}
            <div className="info-section">
                <h3>Orbital Filling</h3>
                <div className="orbital-filling">
                    {orbitals.map((orbital, i) => (
                        <div key={i} className="orbital-row">
                            <span className="orbital-name">{orbital.name}</span>
                            <div className="orbital-boxes">
                                {Array.from({ length: 2 * orbital.l + 1 }).map((_, boxIndex) => {
                                    const electronsInBox = Math.min(2, Math.max(0, orbital.electrons - boxIndex * 2));
                                    return (
                                        <div key={boxIndex} className="orbital-box">
                                            {electronsInBox >= 1 && <span className="arrow up">↑</span>}
                                            {electronsInBox >= 2 && <span className="arrow down">↓</span>}
                                        </div>
                                    );
                                })}
                            </div>
                            <span className="orbital-count">{orbital.electrons}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
