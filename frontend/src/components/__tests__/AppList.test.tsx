import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import AppList from '../AppList';

afterEach(() => cleanup());

describe('AppList', () => {
  it('renders common apps with Open and Close buttons', () => {
    const onOpenApp = vi.fn();
    const onCloseApp = vi.fn();
    render(<AppList onOpenApp={onOpenApp} onCloseApp={onCloseApp} />);

    expect(screen.getAllByText('notepad')[0]).not.toBeNull();
    expect(screen.getAllByText('calc')[0]).not.toBeNull();
    expect(screen.getAllByText('mspaint')[0]).not.toBeNull();
    expect(screen.getAllByText('Open')).toHaveLength(9);
    expect(screen.getAllByText('Close')).toHaveLength(9);
  });

  it('calls onOpenApp when Open button for an app is clicked', () => {
    const onOpenApp = vi.fn();
    const onCloseApp = vi.fn();
    render(<AppList onOpenApp={onOpenApp} onCloseApp={onCloseApp} />);

    const openButtons = screen.getAllByText('Open');
    fireEvent.click(openButtons[0]);
    expect(onOpenApp).toHaveBeenCalledWith('notepad');
  });

  it('calls onCloseApp when Close button for an app is clicked', () => {
    const onOpenApp = vi.fn();
    const onCloseApp = vi.fn();
    render(<AppList onOpenApp={onOpenApp} onCloseApp={onCloseApp} />);

    const closeButtons = screen.getAllByText('Close');
    fireEvent.click(closeButtons[0]);
    expect(onCloseApp).toHaveBeenCalledWith('notepad');
  });

  it('disables buttons when disabled prop is true', () => {
    render(<AppList onOpenApp={vi.fn()} onCloseApp={vi.fn()} disabled />);

    const openButtons = screen.getAllByText('Open');
    const closeButtons = screen.getAllByText('Close');
    openButtons.forEach((btn) => expect((btn as HTMLButtonElement).disabled).toBe(true));
    closeButtons.forEach((btn) => expect((btn as HTMLButtonElement).disabled).toBe(true));
  });
});
