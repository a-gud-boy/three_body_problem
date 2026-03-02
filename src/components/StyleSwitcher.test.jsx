import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import StyleSwitcher from './StyleSwitcher';

describe('StyleSwitcher', () => {
    const mockOnThemeChange = vi.fn();

    it('renders the current theme name', () => {
        render(<StyleSwitcher currentTheme="cosmic-dark" onThemeChange={mockOnThemeChange} />);
        expect(screen.getByText('Cosmic Dark')).toBeTruthy();
    });

    it('opens the panel when the toggle button is clicked', () => {
        render(<StyleSwitcher currentTheme="cosmic-dark" onThemeChange={mockOnThemeChange} />);
        const toggleButton = screen.getByLabelText('Switch homepage style');

        fireEvent.click(toggleButton);

        expect(screen.getByText('Choose Style')).toBeTruthy();
        expect(screen.getByText('Pick a visual theme for the homepage')).toBeTruthy();
    });

    it('displays all theme options when open', () => {
        render(<StyleSwitcher currentTheme="cosmic-dark" onThemeChange={mockOnThemeChange} />);
        const toggleButton = screen.getByLabelText('Switch homepage style');
        fireEvent.click(toggleButton);

        expect(screen.getByText('Cosmic Dark')).toBeTruthy();
        expect(screen.getByText('Neon Grid')).toBeTruthy();
        expect(screen.getByText('Glassmorphism')).toBeTruthy();
        expect(screen.getByText('Aurora Borealis')).toBeTruthy();
        expect(screen.getByText('Minimal Mono')).toBeTruthy();
    });

    it('calls onThemeChange and closes panel when a theme is selected', () => {
        render(<StyleSwitcher currentTheme="cosmic-dark" onThemeChange={mockOnThemeChange} />);
        const toggleButton = screen.getByLabelText('Switch homepage style');
        fireEvent.click(toggleButton);

        const neonGridOption = screen.getByText('Neon Grid').closest('button');
        fireEvent.click(neonGridOption);

        expect(mockOnThemeChange).toHaveBeenCalledWith('neon-grid');

        const panel = document.querySelector('.switcher-panel');
        expect(panel && panel.classList.contains('open')).toBe(false);
    });

    it('closes the panel when clicking outside', () => {
        render(
            <div>
                <div data-testid="outside">Outside</div>
                <StyleSwitcher currentTheme="cosmic-dark" onThemeChange={mockOnThemeChange} />
            </div>
        );

        const toggleButton = screen.getByLabelText('Switch homepage style');
        fireEvent.click(toggleButton);

        const panel = document.querySelector('.switcher-panel');
        expect(panel && panel.classList.contains('open')).toBe(true);

        fireEvent.mousedown(screen.getByTestId('outside'));
        expect(panel && panel.classList.contains('open')).toBe(false);
    });

    it('highlights the active theme', () => {
        render(<StyleSwitcher currentTheme="neon-grid" onThemeChange={mockOnThemeChange} />);
        const toggleButton = screen.getByLabelText('Switch homepage style');
        fireEvent.click(toggleButton);

        const activeOption = document.querySelector('.switcher-option.active');
        expect(activeOption).toBeTruthy();
        expect(activeOption.textContent).toContain('Neon Grid');
    });
});
