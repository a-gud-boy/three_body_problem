import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import HomePage from './HomePage';

// Mock canvas getContext for the AnimatedBackground
HTMLCanvasElement.prototype.getContext = () => ({
    fillRect: () => { },
    clearRect: () => { },
    beginPath: () => { },
    moveTo: () => { },
    lineTo: () => { },
    stroke: () => { },
    fill: () => { },
    arc: () => { },
    createLinearGradient: () => ({ addColorStop: () => { } }),
    createRadialGradient: () => ({ addColorStop: () => { } }),
    setTransform: () => { },
    drawImage: () => { },
    save: () => { },
    restore: () => { },
    closePath: () => { },
    measureText: () => ({ width: 0 }),
    font: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    textAlign: '',
    textBaseline: '',
});

// Mock ResizeObserver (not in jsdom)
global.ResizeObserver = class {
    observe() { }
    unobserve() { }
    disconnect() { }
};

describe('HomePage', () => {
    it('renders without crashing', () => {
        render(
            <MemoryRouter>
                <HomePage />
            </MemoryRouter>
        );

        // The page should render some heading or title content
        expect(document.body.textContent.length).toBeGreaterThan(0);
    });

    it('contains links to simulation pages', () => {
        render(
            <MemoryRouter>
                <HomePage />
            </MemoryRouter>
        );

        // Check for at least a few known simulation links
        const links = screen.getAllByRole('link');
        const hrefs = links.map(l => l.getAttribute('href'));

        // Should have link to three-body sim
        expect(hrefs.some(h => h && h.includes('three-body'))).toBe(true);
    });
});
