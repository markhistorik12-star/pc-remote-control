import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import PowerButtons from '../PowerButtons';

afterEach(() => cleanup());

describe('PowerButtons', () => {
  it('renders apagar, reiniciar, and bloquear buttons', () => {
    const onAction = vi.fn();
    render(<PowerButtons onAction={onAction} />);

    expect(screen.getAllByText('Apagar')[0]).not.toBeNull();
    expect(screen.getAllByText('Reiniciar')[0]).not.toBeNull();
    expect(screen.getAllByText('Bloquear')[0]).not.toBeNull();
  });

  it('calls onAction with "shutdown" when shutdown button is clicked', () => {
    const onAction = vi.fn();
    render(<PowerButtons onAction={onAction} />);

    fireEvent.click(screen.getAllByText('Apagar')[0]);
    expect(onAction).toHaveBeenCalledWith('shutdown');
  });

  it('calls onAction with "restart" when restart button is clicked', () => {
    const onAction = vi.fn();
    render(<PowerButtons onAction={onAction} />);

    fireEvent.click(screen.getAllByText('Reiniciar')[0]);
    expect(onAction).toHaveBeenCalledWith('restart');
  });

  it('calls onAction with "lock" when lock button is clicked', () => {
    const onAction = vi.fn();
    render(<PowerButtons onAction={onAction} />);

    fireEvent.click(screen.getAllByText('Bloquear')[0]);
    expect(onAction).toHaveBeenCalledWith('lock');
  });

  it('disables all buttons when disabled prop is true', () => {
    render(<PowerButtons onAction={vi.fn()} disabled />);

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
    buttons.forEach((btn) => expect((btn as HTMLButtonElement).disabled).toBe(true));
  });
});