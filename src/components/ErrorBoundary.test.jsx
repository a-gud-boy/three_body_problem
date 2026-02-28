import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import ErrorBoundary from './ErrorBoundary';

// Helper component that throws on render
function ThrowingComponent({ shouldThrow }) {
    if (shouldThrow) throw new Error('Test explosion');
    return <div>All good</div>;
}

describe('ErrorBoundary', () => {
    it('renders children when there is no error', () => {
        render(
            <MemoryRouter>
                <ErrorBoundary>
                    <div>Hello World</div>
                </ErrorBoundary>
            </MemoryRouter>
        );

        expect(screen.getByText('Hello World')).toBeTruthy();
    });

    it('renders fallback UI when child throws', () => {
        // Suppress console.error from the throw
        const spy = vi.spyOn(console, 'error').mockImplementation(() => { });

        render(
            <MemoryRouter>
                <ErrorBoundary>
                    <ThrowingComponent shouldThrow={true} />
                </ErrorBoundary>
            </MemoryRouter>
        );

        expect(screen.getByText('Something went wrong')).toBeTruthy();
        expect(screen.getByText('Test explosion')).toBeTruthy();
        expect(screen.getByText('Try Again')).toBeTruthy();
        expect(screen.getByText('Return Home')).toBeTruthy();

        spy.mockRestore();
    });

    it('shows error details in expandable section', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => { });

        render(
            <MemoryRouter>
                <ErrorBoundary>
                    <ThrowingComponent shouldThrow={true} />
                </ErrorBoundary>
            </MemoryRouter>
        );

        expect(screen.getByText('Error Details')).toBeTruthy();

        spy.mockRestore();
    });

    it('resets on retry click', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => { });

        const { rerender } = render(
            <MemoryRouter>
                <ErrorBoundary>
                    <ThrowingComponent shouldThrow={true} />
                </ErrorBoundary>
            </MemoryRouter>
        );

        // Rerender with non-throwing child first so the new props are ready
        rerender(
            <MemoryRouter>
                <ErrorBoundary>
                    <ThrowingComponent shouldThrow={false} />
                </ErrorBoundary>
            </MemoryRouter>
        );

        // Click "Try Again" — ErrorBoundary resets state and renders new children
        fireEvent.click(screen.getByText('Try Again'));

        expect(screen.getByText('All good')).toBeTruthy();

        spy.mockRestore();
    });
});
