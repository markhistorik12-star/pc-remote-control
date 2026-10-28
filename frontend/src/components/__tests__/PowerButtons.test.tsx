import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PowerButtons from '../PowerButtons';

describe('PowerButtons', () => {
  it('renders shutdown, restart, and lock buttons', () => {
    const onAction = vi.fn();
    render(<PowerButtons onAction={onAction} />);

    expect(screen.getByText('Shutdown')).toBeInTheDocument();
    expect(screen.getByText('Restart')).toBeInTheDocument();
    expect(screen.getByText('Lock')).toBeInTheDocument();
  });

  it('calls onAction with "shutdown" when shutdown button is clicked', () => {
    const onAction = vi.fn();
    render(<PowerButtons onAction={onAction} />);

    fireEvent.click(screen.getByText('Shutdown'));
    expect(onAction).toHaveBeenCalledWith('shutdown');
  });

  it('calls onAction with "restart" when restart button is clicked', () => {
    const onAction = vi.fn();
    render(<PowerButtons onAction={onAction} />);

    fireEvent.click(screen.getByText('Restart'));
    expect(onAction).toHaveBeenCalledWith('restart');
  });

  it('calls onAction with "lock" when lock button is clicked', () => {
    const onAction = vi.fn();
    render(<PowerButtons onAction={onAction} />);

    fireEvent.click(screen.getByText('Lock'));
    expect(onAction).toHaveBeenCalledWith('lock');
  });

  it('disables all buttons when disabled prop is true', () => {
    render(<PowerButtons onAction={vi.fn()} disabled />);

    expect(screen.getByText('Shutdown')).toBeDisabled();
    expect(screen.getByText('Restart')).toBeDisabled();
    expect(screen.getByText('Lock')).toBeDisabled();
  });
});
