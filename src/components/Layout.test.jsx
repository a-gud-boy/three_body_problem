import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import Layout from './Layout';

function renderWithRouter(initialEntries) {
    const router = createMemoryRouter(
        [
            {
                element: <Layout />,
                children: [
                    { path: '/', element: <div>Home Page</div> },
                    { path: '/sim', element: <div>Simulation Page</div> },
                ],
            },
        ],
        { initialEntries }
    );
    return render(<RouterProvider router={router} />);
}

describe('Layout', () => {
    it('renders outlet content on home route', () => {
        renderWithRouter(['/']);
        expect(screen.getByText('Home Page')).toBeTruthy();
    });

    it('renders outlet content on sub-route', () => {
        renderWithRouter(['/sim']);
        expect(screen.getByText('Simulation Page')).toBeTruthy();
    });

    it('hides back button on home route', () => {
        renderWithRouter(['/']);
        expect(screen.queryByLabelText('Back to home page')).toBeNull();
    });

    it('shows back button on sub-routes', () => {
        renderWithRouter(['/sim']);
        expect(screen.getByLabelText('Back to home page')).toBeTruthy();
    });

    it('renders skip navigation link', () => {
        renderWithRouter(['/']);
        const skipLink = screen.getByText('Skip to main content');
        expect(skipLink).toBeTruthy();
        expect(skipLink.getAttribute('href')).toBe('#main-content');
    });

    it('wraps content in main element with id', () => {
        renderWithRouter(['/']);
        const main = document.getElementById('main-content');
        expect(main).toBeTruthy();
        expect(main.tagName).toBe('MAIN');
    });
});
