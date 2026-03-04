// Build a union-find that collapses node names connected by wire objects.
// Returns a function collapseNode(nodeId) => canonical node name.
// Used by rendering (CircuitCanvas), properties panel (SchematicEditor),
// and the engine's _buildCollapsedNetlist logic.
export function buildNodeCollapseMap(sourceComponents) {
    const parent = new Map();

    const ensure = (n) => { if (n !== 'GND' && !parent.has(n)) parent.set(n, n); };
    const find = (n) => {
        if (n === 'GND') return 'GND';
        if (!parent.has(n)) return n;
        let root = parent.get(n);
        if (root === n) return n;
        root = find(root);
        parent.set(n, root);
        return root;
    };
    const union = (a, b) => {
        const ra = find(a);
        const rb = find(b);
        if (ra !== rb) parent.set(rb, ra);
    };

    sourceComponents.forEach(c => {
        ensure(c.node1);
        ensure(c.node2);
    });

    sourceComponents.forEach(c => {
        if (c.type !== 'W') return;
        const n1 = c.node1;
        const n2 = c.node2;
        if (n1 === 'GND' && n2 === 'GND') return;
        if (n1 !== 'GND' && n2 !== 'GND') {
            // Guard: only union if both nodes exist in the parent map
            if (parent.has(n1) && parent.has(n2)) {
                union(n1, n2);
            }
        }
    });

    // Ground any collapsed set that contains a GND-connected node
    const groundedRoots = new Set();
    sourceComponents.forEach(c => {
        if (c.type !== 'W') return;
        if (c.node1 === 'GND' && c.node2 !== 'GND' && parent.has(c.node2)) groundedRoots.add(find(c.node2));
        if (c.node2 === 'GND' && c.node1 !== 'GND' && parent.has(c.node1)) groundedRoots.add(find(c.node1));
    });

    return (nodeId) => {
        if (nodeId === 'GND') return 'GND';
        const root = find(nodeId);
        return groundedRoots.has(root) ? 'GND' : root;
    };
}

// Build a collapsed netlist for the MNA solver.
// Filters out wires and grounds, replaces node names with collapsed equivalents.
// Returns { components: [...], nodes: [...] }.
export function buildCollapsedNetlist(sourceComponents) {
    const collapseNode = buildNodeCollapseMap(sourceComponents);

    const collapsedComponents = sourceComponents
        .filter(c => c.type !== 'G' && c.type !== 'W')
        .map(c => ({
            ...c,
            node1: collapseNode(c.node1),
            node2: collapseNode(c.node2)
        }));

    const nodeSet = new Set();
    collapsedComponents.forEach(c => {
        if (c.node1 !== 'GND') nodeSet.add(c.node1);
        if (c.node2 !== 'GND') nodeSet.add(c.node2);
    });

    return {
        components: collapsedComponents,
        nodes: Array.from(nodeSet)
    };
}
