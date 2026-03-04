import { solveComplexMatrix } from './matrix.js';
import { buildCollapsedNetlist } from './nodeCollapse.js';
import Complex from './Complex.js';

export const COMPONENT_TYPES = {
    RESISTOR: 'R',
    CAPACITOR: 'C',
    INDUCTOR: 'L',
    DC_VOLTAGE: 'V',
    AC_VOLTAGE: 'Vac',
    DIODE: 'D',
    WIRE: 'W',
    GROUND: 'G'
};

class CircuitEngine {
    constructor() {
        this.nodes = [];
        this.components = [];
        this.frequency = 60; // Hz for AC analysis
        this.omega = 2 * Math.PI * this.frequency;
        this.time = 0;
        this.dt = 1e-5; // For transient analysis
    }

    reset() {
        this.nodes = [];
        this.components = [];
        this.time = 0;
    }

    addComponent(type, id, node1, node2, value, extra = {}) {
        // Bug #6 fix: Ground components are topological markers, not circuit elements.
        // They should not be added to the engine.
        if (type === COMPONENT_TYPES.GROUND) return;
        this.components.push({ type, id, node1, node2, value, ...extra });
        this._addNode(node1);
        this._addNode(node2);
    }

    _addNode(nodeId) {
        if (!this.nodes.includes(nodeId) && nodeId !== 'GND') {
            this.nodes.push(nodeId);
        }
    }

    setFrequency(hz) {
        this.frequency = hz;
        this.omega = 2 * Math.PI * hz;
    }

    // Helper to map node ID to matrix index
    _getNodeIndex(nodeId) {
        if (nodeId === 'GND') return -1;
        return this.nodes.indexOf(nodeId);
    }

    _getSourcePhasor(vSrc) {
        if (vSrc.type === COMPONENT_TYPES.AC_VOLTAGE) {
            const phase = vSrc.phase || 0;
            return Complex.fromPolar(vSrc.value, phase * Math.PI / 180);
        }
        return new Complex(vSrc.value, 0);
    }

    _negateComplex(c) {
        return new Complex(-c.re, -c.im);
    }

    _sanitizeAndValidateIdealSources(components) {
        const EPS = 1e-9;
        const sanitized = [];
        const sourceByPair = new Map();

        components.forEach((comp) => {
            if (comp.type !== COMPONENT_TYPES.AC_VOLTAGE && comp.type !== COMPONENT_TYPES.DC_VOLTAGE) {
                sanitized.push(comp);
                return;
            }

            const value = this._getSourcePhasor(comp);

            // A non-zero ideal source shorted onto one node is contradictory.
            if (comp.node1 === comp.node2) {
                if (value.mag() > EPS) {
                    throw new Error(`Ideal voltage source '${comp.id}' is shorted (both terminals at '${comp.node1}') with non-zero voltage.`);
                }
                // 0V source between identical nodes is redundant.
                return;
            }

            const [a, b] = comp.node1.localeCompare(comp.node2) <= 0
                ? [comp.node1, comp.node2]
                : [comp.node2, comp.node1];

            const isForward = comp.node1 === a;
            const normalizedValue = isForward ? value : this._negateComplex(value);
            const key = `${a}__${b}`;

            if (!sourceByPair.has(key)) {
                sourceByPair.set(key, {
                    id: comp.id,
                    from: a,
                    to: b,
                    value: normalizedValue
                });
                sanitized.push(comp);
                return;
            }

            const existing = sourceByPair.get(key);
            const mismatch = normalizedValue.sub(existing.value).mag();
            if (mismatch > EPS) {
                throw new Error(
                    `Conflicting ideal voltage sources in parallel between '${a}' and '${b}' (${existing.id} vs ${comp.id}).`
                );
            }

            // Bug #3 fix: Drop exact duplicate voltage sources to prevent a singular matrix.
            // Two identical voltage sources in parallel are redundant.
        });

        return sanitized;
    }

    // Collapse ideal-wire-connected nodes before stamping MNA.
    // Delegates to the shared buildCollapsedNetlist() from nodeCollapse.js
    // to ensure rendering and solving always agree on node topology.
    _buildCollapsedNetlist() {
        return buildCollapsedNetlist(this.components);
    }

    // AC Steady-State Analysis using Complex MNA
    solveAC() {
        const { components: collapsedComponents, nodes: collapsedNodes } = this._buildCollapsedNetlist();
        const netlistComponents = this._sanitizeAndValidateIdealSources(collapsedComponents);
        // Bug #1 fix: Do NOT overwrite this.nodes. Use local variable only.
        const numNodes = collapsedNodes.length;

        const getNodeIndex = (nodeId) => {
            if (nodeId === 'GND') return -1;
            return collapsedNodes.indexOf(nodeId);
        };

        // Find voltage sources for MNA extra rows
        const vSources = netlistComponents.filter(c => c.type === COMPONENT_TYPES.AC_VOLTAGE || c.type === COMPONENT_TYPES.DC_VOLTAGE);
        const m = vSources.length;
        const size = numNodes + m;

        // Initialize complex A matrix and B vector
        let A = Array(size).fill(0).map(() => Array(size).fill(0).map(() => new Complex(0)));
        let B = Array(size).fill(0).map(() => new Complex(0));

        // Stamp admittances for passive components into Y-matrix (upper left numNodes x numNodes block)
        netlistComponents.forEach(comp => {
            const n1 = getNodeIndex(comp.node1);
            const n2 = getNodeIndex(comp.node2);
            let admittance = new Complex(0);

            if (comp.type === COMPONENT_TYPES.RESISTOR) {
                admittance = new Complex(1 / comp.value, 0);
            } else if (comp.type === COMPONENT_TYPES.CAPACITOR) {
                // Y = j * omega * C
                admittance = new Complex(0, this.omega * comp.value);
            } else if (comp.type === COMPONENT_TYPES.INDUCTOR) {
                // Bug #4 fix: Guard against omega=0 (DC). At DC, inductor is a short (large admittance).
                if (this.omega === 0) {
                    admittance = new Complex(1e6, 0); // ~short circuit at DC
                } else {
                    // Y = 1 / (j * omega * L) = -j / (omega * L)
                    admittance = new Complex(0, -1 / (this.omega * comp.value));
                }
            } else if (comp.type === COMPONENT_TYPES.DIODE) {
                // Bug #5 fix: Diodes are non-linear and cannot be handled by AC phasor analysis.
                throw new Error(`Diode '${comp.id}' cannot be used in AC phasor analysis. Use the Waveform Shaping tab for diode circuits.`);
            }

            if (admittance.mag() > 0) {
                if (n1 >= 0) {
                    A[n1][n1] = A[n1][n1].add(admittance);
                }
                if (n2 >= 0) {
                    A[n2][n2] = A[n2][n2].add(admittance);
                }
                if (n1 >= 0 && n2 >= 0) {
                    A[n1][n2] = A[n1][n2].sub(admittance);
                    A[n2][n1] = A[n2][n1].sub(admittance);
                }
            }
        });

        // Stamp voltage sources into B/C matrices and RHS
        vSources.forEach((vSrc, index) => {
            const n1 = getNodeIndex(vSrc.node1); // Positive terminal
            const n2 = getNodeIndex(vSrc.node2); // Negative terminal
            const vIndex = numNodes + index;

            // B and C matrix stamps
            if (n1 >= 0) {
                A[n1][vIndex] = A[n1][vIndex].add(new Complex(1, 0));
                A[vIndex][n1] = A[vIndex][n1].add(new Complex(1, 0));
            }
            if (n2 >= 0) {
                A[n2][vIndex] = A[n2][vIndex].add(new Complex(-1, 0));
                A[vIndex][n2] = A[vIndex][n2].add(new Complex(-1, 0));
            }

            // Ideal source D-matrix term remains 0 for classic MNA.

            // Right-hand side stamp
            if (vSrc.type === COMPONENT_TYPES.AC_VOLTAGE) {
                // value is amplitude (peak voltage)
                B[vIndex] = B[vIndex].add(this._getSourcePhasor(vSrc));
            } else if (vSrc.type === COMPONENT_TYPES.DC_VOLTAGE) {
                B[vIndex] = B[vIndex].add(this._getSourcePhasor(vSrc));
            }
        });

        // Add small conductance to node diagonal only to prevent singular matrices (e.g., floating nodes)
        // Do NOT add epsilon to voltage-source rows (indices >= numNodes) as that corrupts the MNA stamp
        for (let i = 0; i < numNodes; i++) {
            A[i][i] = A[i][i].add(new Complex(1e-10, 0));
        }

        const x = solveComplexMatrix(A, B);

        if (!x) return null; // Singular matrix

        // Map results back
        const results = { nodes: {}, branches: {} };
        collapsedNodes.forEach((node, i) => {
            results.nodes[node] = x[i];
        });
        results.nodes['GND'] = new Complex(0, 0);

        vSources.forEach((vSrc, i) => {
            results.branches[vSrc.id] = x[numNodes + i];
        });

        return results;
    }
}

export default CircuitEngine;
