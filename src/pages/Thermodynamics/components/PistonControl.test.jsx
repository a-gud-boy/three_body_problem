import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PistonControl from './PistonControl';

describe('PistonControl', () => {
    it('renders with default value', () => {
        render(<PistonControl value={100} onChange={() => { }} />);

        const slider = screen.getByRole('slider');
        expect(slider).toBeTruthy();
        expect(slider.value).toBe('100');
    });

    it('fires onChange callback when slider changes', () => {
        const onChange = vi.fn();

        render(<PistonControl value={100} onChange={onChange} />);

        const slider = screen.getByRole('slider');
        fireEvent.change(slider, { target: { value: '75' } });

        expect(onChange).toHaveBeenCalled();
    });
});
