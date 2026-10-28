import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import PowerButtons from '../PowerButtons';

afterEach(() => cleanup());

describe('PowerButtons', () => {
  it('renders shutdown, restart, and lock buttons', () => {
    const onAction = vi.fn();
    render(<PowerButtons onAction={onAction} />);

    expect(screen.getAllByText('Shutdown')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Restart')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Lock')[0]).toBeInTheDocument();
  });

  it('calls onAction with "shutdown" when shutdown button is clicked', () => {
    const onAction = vi.fn();
    render(<PowerButtons onAction={onAction} />);

    fireEvent.click(screen.getAllByText('Shutdown')[0]);
    expect(onAction).toHaveBeenCalledWith('shutdown');
  });

  it('calls onAction with "restart" when restart button is clicked', () => {
    const onAction = vi.fn();
    render(<PowerButtons onAction={onAction} />);

    fireEvent.click(screen.getAllByText('Restart')[0]);
    expect(onAction).toHaveBeenCalledWith('restart');
  });

  it('calls onAction with "lock" when lock button is clicked', () => {
    const onAction = vi.fn();
    render(<PowerButtons onAction={onAction} />);

    fireEvent.click(screen.getAllByText('Lock')[0]);
    expect(onAction).toHaveBeenCalledWith('lock');
  });

  it('disables all buttons when disabled prop is true', () => {
    render(<PowerButtons onAction={vi.fn()} disabled />);

    expect(screen.getAllByText('Shutdown')[0]).toBeDisabled();
    expect(screen.getAllByText('Restart')[0]).toBeDisabled();
    expect(screen.getAllByText('Lock')[0]).toBeDisabled();
  });
});
