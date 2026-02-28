import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PeriodicTable from './PeriodicTable';

// Minimal test data — 2 elements
const mockElements = [
    { atomicNumber: 1, symbol: 'H', name: 'Hydrogen', atomicMass: 1.008, category: 'nonmetal', col: 1, row: 1 },
    { atomicNumber: 2, symbol: 'He', name: 'Helium', atomicMass: 4.0026, category: 'noble-gas', col: 18, row: 1 },
];

const mockCategories = {
    'nonmetal': { name: 'Nonmetal', color: '#22c55e', bgColor: 'rgba(34,197,94,0.15)' },
    'noble-gas': { name: 'Noble Gas', color: '#a855f7', bgColor: 'rgba(168,85,247,0.15)' },
};

describe('PeriodicTable', () => {
    it('renders all provided elements', () => {
        render(
            <PeriodicTable
                elements={mockElements}
                categories={mockCategories}
                selectedElement={null}
                onElementSelect={() => { }}
            />
        );

        expect(screen.getByText('H')).toBeTruthy();
        expect(screen.getByText('He')).toBeTruthy();
    });

    it('fires onElementSelect when an element is clicked', () => {
        const onSelect = vi.fn();

        render(
            <PeriodicTable
                elements={mockElements}
                categories={mockCategories}
                selectedElement={null}
                onElementSelect={onSelect}
            />
        );

        // Click on Hydrogen (title contains "Hydrogen (H)")
        const hButton = screen.getByTitle('Hydrogen (H)');
        fireEvent.click(hButton);

        expect(onSelect).toHaveBeenCalledTimes(1);
        expect(onSelect).toHaveBeenCalledWith(mockElements[0]);
    });

    it('marks selected element with the selected class', () => {
        render(
            <PeriodicTable
                elements={mockElements}
                categories={mockCategories}
                selectedElement={mockElements[0]}
                onElementSelect={() => { }}
            />
        );

        const hButton = screen.getByTitle('Hydrogen (H)');
        expect(hButton.className).toContain('selected');

        const heButton = screen.getByTitle('Helium (He)');
        expect(heButton.className).not.toContain('selected');
    });

    it('renders category legend', () => {
        render(
            <PeriodicTable
                elements={mockElements}
                categories={mockCategories}
                selectedElement={null}
                onElementSelect={() => { }}
            />
        );

        expect(screen.getByText('Nonmetal')).toBeTruthy();
        expect(screen.getByText('Noble Gas')).toBeTruthy();
    });
});
