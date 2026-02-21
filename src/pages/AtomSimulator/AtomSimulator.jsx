import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Atom, FlaskConical, BookOpen, Eye, Layers, Zap } from 'lucide-react';
import { ELEMENTS, ELEMENT_CATEGORIES, getElementById, getElectronShells, getOrbitalConfiguration } from '../../data/elementsData';
import { DEMO_COMPOUNDS, findMatchingCompound } from '../../data/compoundsData';
import PeriodicTable from './components/PeriodicTable';
import AtomVisualizer from './components/AtomVisualizer';
import ElementInfo from './components/ElementInfo';
import CompoundBuilder from './components/CompoundBuilder';
import CompoundVisualizer from './components/CompoundVisualizer';
import DemosPanel from './components/DemosPanel';
import './AtomSimulator.css';

const MODES = {
    ELEMENT: 'element',
    COMPOUND: 'compound',
    DEMOS: 'demos',
};

const VISUALIZATION_MODES = {
    BOHR: 'bohr',
    CLOUD: 'cloud',
};

export default function AtomSimulator() {
    // Mode state
    const [mode, setMode] = useState(MODES.ELEMENT);
    const [visualizationMode, setVisualizationMode] = useState(VISUALIZATION_MODES.BOHR);

    // Element state
    const [selectedElement, setSelectedElement] = useState(getElementById(6)); // Carbon by default
    const [hoveredElement, setHoveredElement] = useState(null);

    // Compound state
    const [compoundAtoms, setCompoundAtoms] = useState([]);
    const [selectedCompound, setSelectedCompound] = useState(null);

    // Handle element selection
    const handleElementSelect = useCallback((element) => {
        setSelectedElement(element);
        setMode(MODES.ELEMENT);
    }, []);

    // Handle adding atom to compound
    const handleAddAtomToCompound = useCallback((element) => {
        setCompoundAtoms(prev => [...prev, { element, id: crypto.randomUUID() }]);
    }, []);

    // Handle removing atom from compound
    const handleRemoveAtomFromCompound = useCallback((atomId) => {
        setCompoundAtoms(prev => prev.filter(a => a.id !== atomId));
    }, []);

    // Handle demo compound selection
    const handleDemoSelect = useCallback((compound) => {
        setSelectedCompound(compound);
        setMode(MODES.DEMOS);
    }, []);

    // Get display element (selected or hovered)
    const displayElement = hoveredElement || selectedElement;

    return (
        <div className="atom-simulator">
            {/* Header */}
            <header className="atom-header">
                <Link to="/" className="back-link">
                    <ArrowLeft size={20} />
                    <span>Back to Hub</span>
                </Link>

                <div className="header-title">
                    <Atom className="header-icon" size={24} />
                    <h1>Atom Simulator</h1>
                </div>

                <div className="header-controls">
                    {/* Visualization Mode Toggle */}
                    <div className="vis-mode-toggle">
                        <button
                            className={`vis-mode-btn ${visualizationMode === VISUALIZATION_MODES.BOHR ? 'active' : ''}`}
                            onClick={() => setVisualizationMode(VISUALIZATION_MODES.BOHR)}
                            title="Bohr Model - Classical electron orbits"
                        >
                            <Layers size={16} />
                            <span>Bohr Model</span>
                        </button>
                        <button
                            className={`vis-mode-btn ${visualizationMode === VISUALIZATION_MODES.CLOUD ? 'active' : ''}`}
                            onClick={() => setVisualizationMode(VISUALIZATION_MODES.CLOUD)}
                            title="Electron Cloud - Probability density"
                        >
                            <Zap size={16} />
                            <span>Electron Cloud</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Mode Tabs */}
            <nav className="mode-tabs">
                <button
                    className={`mode-tab ${mode === MODES.ELEMENT ? 'active' : ''}`}
                    onClick={() => setMode(MODES.ELEMENT)}
                >
                    <Atom size={18} />
                    Element View
                </button>
                <button
                    className={`mode-tab ${mode === MODES.COMPOUND ? 'active' : ''}`}
                    onClick={() => setMode(MODES.COMPOUND)}
                >
                    <FlaskConical size={18} />
                    Compound Builder
                </button>
                <button
                    className={`mode-tab ${mode === MODES.DEMOS ? 'active' : ''}`}
                    onClick={() => setMode(MODES.DEMOS)}
                >
                    <BookOpen size={18} />
                    Demo Compounds
                </button>
            </nav>

            {/* Main Content */}
            <main className="atom-main">
                {/* Left Panel - Periodic Table / Compound Builder / Demos */}
                <section className="left-panel">
                    {mode === MODES.ELEMENT && (
                        <PeriodicTable
                            elements={ELEMENTS}
                            categories={ELEMENT_CATEGORIES}
                            selectedElement={selectedElement}
                            onElementSelect={handleElementSelect}
                            onElementHover={setHoveredElement}
                        />
                    )}

                    {mode === MODES.COMPOUND && (
                        <div className="compound-mode-container">
                            <PeriodicTable
                                elements={ELEMENTS}
                                categories={ELEMENT_CATEGORIES}
                                selectedElement={null}
                                onElementSelect={handleAddAtomToCompound}
                                onElementHover={setHoveredElement}
                                compact
                            />
                            <CompoundBuilder
                                atoms={compoundAtoms}
                                onRemoveAtom={handleRemoveAtomFromCompound}
                                onClear={() => setCompoundAtoms([])}
                            />
                        </div>
                    )}

                    {mode === MODES.DEMOS && (
                        <DemosPanel
                            compounds={DEMO_COMPOUNDS}
                            selectedCompound={selectedCompound}
                            onSelectCompound={handleDemoSelect}
                        />
                    )}
                </section>

                {/* Center Panel - Visualization */}
                <section className="center-panel">
                    <div className="visualization-container">
                        {mode === MODES.ELEMENT && displayElement && (
                            <AtomVisualizer
                                element={displayElement}
                                visualizationMode={visualizationMode}
                                shells={getElectronShells(displayElement.atomicNumber)}
                                orbitals={getOrbitalConfiguration(displayElement.atomicNumber)}
                            />
                        )}

                        {mode === MODES.COMPOUND && compoundAtoms.length > 0 && (() => {
                            const matchedCompound = findMatchingCompound(compoundAtoms);
                            return (
                                <CompoundVisualizer
                                    atoms={compoundAtoms}
                                    compound={matchedCompound}
                                    visualizationMode={visualizationMode}
                                />
                            );
                        })()}

                        {mode === MODES.DEMOS && selectedCompound && (
                            <CompoundVisualizer
                                compound={selectedCompound}
                                visualizationMode={visualizationMode}
                            />
                        )}

                        {/* Empty states */}
                        {mode === MODES.COMPOUND && compoundAtoms.length === 0 && (
                            <div className="empty-state">
                                <FlaskConical size={48} />
                                <p>Click elements in the periodic table to add atoms</p>
                            </div>
                        )}

                        {mode === MODES.DEMOS && !selectedCompound && (
                            <div className="empty-state">
                                <BookOpen size={48} />
                                <p>Select a demo compound from the left panel</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* Right Panel - Element/Compound Info */}
                <section className="right-panel">
                    {mode === MODES.ELEMENT && displayElement && (
                        <ElementInfo
                            element={displayElement}
                            shells={getElectronShells(displayElement.atomicNumber)}
                            orbitals={getOrbitalConfiguration(displayElement.atomicNumber)}
                            category={ELEMENT_CATEGORIES[displayElement.category]}
                        />
                    )}

                    {mode === MODES.DEMOS && selectedCompound && (
                        <div className="compound-info">
                            <h2>{selectedCompound.name}</h2>
                            <div className="compound-formula">{selectedCompound.formula}</div>
                            <p className="compound-description">{selectedCompound.description}</p>

                            <div className="info-section">
                                <h3>Properties</h3>
                                <div className="info-grid">
                                    <div className="info-item">
                                        <span className="info-label">Type</span>
                                        <span className="info-value">{selectedCompound.type}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Molecular Weight</span>
                                        <span className="info-value">{selectedCompound.properties.molecularWeight.toFixed(2)} g/mol</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Melting Point</span>
                                        <span className="info-value">
                                            {selectedCompound.properties.meltingPoint !== null
                                                ? `${selectedCompound.properties.meltingPoint}°C`
                                                : 'N/A'}
                                        </span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Boiling Point</span>
                                        <span className="info-value">
                                            {selectedCompound.properties.boilingPoint !== null
                                                ? `${selectedCompound.properties.boilingPoint}°C`
                                                : 'N/A'}
                                        </span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">State (25°C)</span>
                                        <span className="info-value capitalize">{selectedCompound.properties.state}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="info-section">
                                <h3>Composition</h3>
                                <div className="atom-counts">
                                    {Object.entries(
                                        selectedCompound.atoms.reduce((acc, atom) => {
                                            acc[atom.element] = (acc[atom.element] || 0) + 1;
                                            return acc;
                                        }, {})
                                    ).map(([symbol, count]) => (
                                        <span key={symbol} className="atom-count-badge">
                                            {symbol}: {count}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
