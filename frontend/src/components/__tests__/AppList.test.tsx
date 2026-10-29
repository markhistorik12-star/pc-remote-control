import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import AppList from '../AppList';

afterEach(() => cleanup());

describe('AppList', () => {
  it('renders common apps with Abrir and Cerrar buttons', () => {
    const onOpenApp = vi.fn();
    const onCloseApp = vi.fn();
    render(<AppList onOpenApp={onOpenApp} onCloseApp={onCloseApp} />);

    expect(screen.getAllByText('Bloc de notas')[0]).not.toBeNull();
    expect(screen.getAllByText('Calculadora')[0]).not.toBeNull();
    expect(screen.getAllByText('Paint')[0]).not.toBeNull();
    // 8 common apps, each with Abrir and Cerrar
    expect(screen.getAllByText('Abrir')).toHaveLength(8);
    expect(screen.getAllByText('Cerrar')).toHaveLength(8);
  });

  it('calls onOpenApp when Abrir button for an app is clicked', () => {
    const onOpenApp = vi.fn();
    const onCloseApp = vi.fn();
    render(<AppList onOpenApp={onOpenApp} onCloseApp={onCloseApp} />);

    const openButtons = screen.getAllByText('Abrir');
    fireEvent.click(openButtons[0]);
    expect(onOpenApp).toHaveBeenCalledWith('notepad');
  });

  it('calls onCloseApp when Cerrar button for an app is clicked', () => {
    const onOpenApp = vi.fn();
    const onCloseApp = vi.fn();
    render(<AppList onOpenApp={onOpenApp} onCloseApp={onCloseApp} />);

    const closeButtons = screen.getAllByText('Cerrar');
    fireEvent.click(closeButtons[0]);
    expect(onCloseApp).toHaveBeenCalledWith('notepad');
  });

  it('disables buttons when disabled prop is true', () => {
    render(<AppList onOpenApp={vi.fn()} onCloseApp={vi.fn()} disabled />);

    const openButtons = screen.getAllByRole('button', { name: /Abrir/i });
    const closeButtons = screen.getAllByRole('button', { name: /Cerrar/i });
    openButtons.forEach((btn) => expect((btn as HTMLButtonElement).disabled).toBe(true));
    closeButtons.forEach((btn) => expect((btn as HTMLButtonElement).disabled).toBe(true));
  });
});