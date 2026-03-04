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

            // Exact duplicate constraint: keep it (physically equivalent), solver may still
            // reject truly dependent topologies through singular-matrix detection.
            sanitized.push(comp);
        });

        return sanitized;
    }

    // Collapse ideal-wire-connected nodes before stamping MNA.
    // This keeps wires out of the matrix and improves conditioning.
    _buildCollapsedNetlist() {
        const parent = new Map();

        const ensureNode = (nodeId) => {
            if (nodeId !== 'GND' && !parent.has(nodeId)) {
                parent.set(nodeId, nodeId);
            }
        };

        const find = (nodeId) => {
            const root = parent.get(nodeId);
            if (root === nodeId) return root;
            const collapsed = find(root);
            parent.set(nodeId, collapsed);
            return collapsed;
        };

        const union = (a, b) => {
            const rootA = find(a);
            const rootB = find(b);
            if (rootA !== rootB) {
                parent.set(rootB, rootA);
            }
        };

        this.components.forEach((c) => {
            ensureNode(c.node1);
            ensureNode(c.node2);
        });

        this.components.forEach((c) => {
            if (c.type !== COMPONENT_TYPES.WIRE) return;
            if (c.node1 === 'GND' || c.node2 === 'GND') return;
            if (!parent.has(c.node1) || !parent.has(c.node2)) return;
            union(c.node1, c.node2);
        });

        // Any wire tied to ground grounds its entire collapsed set.
        const groundedRoots = new Set();
        this.components.forEach((c) => {
            if (c.type !== COMPONENT_TYPES.WIRE) return;
            if (c.node1 === 'GND' && c.node2 !== 'GND' && parent.has(c.node2)) {
                groundedRoots.add(find(c.node2));
            }
            if (c.node2 === 'GND' && c.node1 !== 'GND' && parent.has(c.node1)) {
                groundedRoots.add(find(c.node1));
            }
        });

        const normalizeNode = (nodeId) => {
            if (nodeId === 'GND') return 'GND';
            if (!parent.has(nodeId)) return nodeId;
            const root = find(nodeId);
            return groundedRoots.has(root) ? 'GND' : root;
        };

        const collapsedComponents = this.components
            .filter((c) => c.type !== COMPONENT_TYPES.GROUND)
            .filter((c) => c.type !== COMPONENT_TYPES.WIRE)
            .map((c) => ({
                ...c,
                node1: normalizeNode(c.node1),
                node2: normalizeNode(c.node2)
            }));

        const nodeSet = new Set();
        collapsedComponents.forEach((c) => {
            if (c.node1 !== 'GND') nodeSet.add(c.node1);
            if (c.node2 !== 'GND') nodeSet.add(c.node2);
        });

        return {
            components: collapsedComponents,
            nodes: Array.from(nodeSet)
        };
    }

    // AC Steady-State Analysis using Complex MNA
    solveAC() {
        const { components: collapsedComponents, nodes: collapsedNodes } = this._buildCollapsedNetlist();
        const netlistComponents = this._sanitizeAndValidateIdealSources(collapsedComponents);
        this.nodes = collapsedNodes;
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
                // Y = 1 / (j * omega * L) = -j / (omega * L)
                admittance = new Complex(0, -1 / (this.omega * comp.value));
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
