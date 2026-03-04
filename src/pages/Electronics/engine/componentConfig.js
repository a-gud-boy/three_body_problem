// Centralized component configuration.
// Defines the terminal layout and visual dimensions for each component type.
// Both CircuitCanvas (for rendering) and SchematicEditor (for properties panel)
// derive their terminal handling from this single source of truth.

// Each terminal entry:
//   key      – The node field on the component object (e.g. 'node1', 'node2')
//   termKey  – The terminal identifier used in wiring (e.g. 't1', 't2')
//   label    – Human-readable label shown in the properties panel

export const COMPONENT_CONFIG = {
    R: {
        dims: { hw: 30, hh: 10 }, vertical: false, terminals: [
            { key: 'node1', termKey: 't1', label: 'Terminal a' },
            { key: 'node2', termKey: 't2', label: 'Terminal b' },
        ]
    },
    L: {
        dims: { hw: 30, hh: 10 }, vertical: false, terminals: [
            { key: 'node1', termKey: 't1', label: 'Terminal a' },
            { key: 'node2', termKey: 't2', label: 'Terminal b' },
        ]
    },
    C: {
        dims: { hw: 30, hh: 20 }, vertical: false, terminals: [
            { key: 'node1', termKey: 't1', label: 'Terminal a' },
            { key: 'node2', termKey: 't2', label: 'Terminal b' },
        ]
    },
    D: {
        dims: { hw: 30, hh: 10 }, vertical: false, terminals: [
            { key: 'node1', termKey: 't1', label: 'Anode' },
            { key: 'node2', termKey: 't2', label: 'Cathode' },
        ]
    },
    Vac: {
        dims: { hw: 20, hh: 20 }, vertical: true, terminals: [
            { key: 'node1', termKey: 't1', label: 'Terminal +' },
            { key: 'node2', termKey: 't2', label: 'Terminal −' },
        ]
    },
    V: {
        dims: { hw: 20, hh: 20 }, vertical: true, terminals: [
            { key: 'node1', termKey: 't1', label: 'Terminal +' },
            { key: 'node2', termKey: 't2', label: 'Terminal −' },
        ]
    },
    G: {
        dims: { hw: 20, hh: 20 }, vertical: true, terminals: [
            { key: 'node1', termKey: 't1', label: 'Ground pin' },
        ]
    },
};

// Default config for unknown component types
const DEFAULT_CONFIG = {
    dims: { hw: 30, hh: 10 }, vertical: false, terminals: [
        { key: 'node1', termKey: 't1', label: 'Terminal a' },
        { key: 'node2', termKey: 't2', label: 'Terminal b' },
    ]
};

export function getComponentConfig(type) {
    return COMPONENT_CONFIG[type] || DEFAULT_CONFIG;
}

// Returns the terminal descriptors for a given component type.
// Each descriptor has { key, termKey, label }.
export function getTerminalDescriptors(type) {
    return getComponentConfig(type).terminals;
}
