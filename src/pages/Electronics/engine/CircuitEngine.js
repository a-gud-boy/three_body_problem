import { solveComplexMatrix } from './matrix.js';
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

    // AC Steady-State Analysis using Complex MNA
    solveAC() {
        const numNodes = this.nodes.length;

        // Find voltage sources for MNA extra rows
        const vSources = this.components.filter(c => c.type === COMPONENT_TYPES.AC_VOLTAGE || c.type === COMPONENT_TYPES.DC_VOLTAGE);
        const m = vSources.length;
        const size = numNodes + m;

        // Initialize complex A matrix and B vector
        let A = Array(size).fill(0).map(() => Array(size).fill(0).map(() => new Complex(0)));
        let B = Array(size).fill(0).map(() => new Complex(0));

        // Stamp admittances for passive components into Y-matrix (upper left numNodes x numNodes block)
        this.components.forEach(comp => {
            const n1 = this._getNodeIndex(comp.node1);
            const n2 = this._getNodeIndex(comp.node2);
            let admittance = new Complex(0);

            if (comp.type === COMPONENT_TYPES.RESISTOR) {
                admittance = new Complex(1 / comp.value, 0);
            } else if (comp.type === COMPONENT_TYPES.CAPACITOR) {
                // Y = j * omega * C
                admittance = new Complex(0, this.omega * comp.value);
            } else if (comp.type === COMPONENT_TYPES.INDUCTOR) {
                // Y = 1 / (j * omega * L) = -j / (omega * L)
                admittance = new Complex(0, -1 / (this.omega * comp.value));
            } else if (comp.type === COMPONENT_TYPES.WIRE) {
                // Model wire as tiny resistor
                admittance = new Complex(1 / 1e-6, 0);
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
            const n1 = this._getNodeIndex(vSrc.node1); // Positive terminal
            const n2 = this._getNodeIndex(vSrc.node2); // Negative terminal
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

            // Prevent singular matrices from parallel/shorted ideal voltage sources
            // by modeling a 1 micro-ohm internal series resistance (-R_internal on diagonal)
            A[vIndex][vIndex] = new Complex(-1e-6, 0);

            // Right-hand side stamp
            if (vSrc.type === COMPONENT_TYPES.AC_VOLTAGE) {
                const phase = vSrc.phase || 0;
                // value is amplitude (peak voltage)
                B[vIndex] = B[vIndex].add(Complex.fromPolar(vSrc.value, phase * Math.PI / 180));
            } else if (vSrc.type === COMPONENT_TYPES.DC_VOLTAGE) {
                B[vIndex] = B[vIndex].add(new Complex(vSrc.value, 0));
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
        this.nodes.forEach((node, i) => {
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
