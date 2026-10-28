import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AppList from '../AppList';

describe('AppList', () => {
  it('renders common apps with Open and Close buttons', () => {
    const onOpenApp = vi.fn();
    const onCloseApp = vi.fn();
    render(<AppList onOpenApp={onOpenApp} onCloseApp={onCloseApp} />);

    expect(screen.getByText('notepad')).toBeInTheDocument();
    expect(screen.getByText('calc')).toBeInTheDocument();
    expect(screen.getByText('mspaint')).toBeInTheDocument();
    expect(screen.getAllByText('Open')).toHaveLength(8);
    expect(screen.getAllByText('Close')).toHaveLength(8);
  });

  it('calls onOpenApp when Open button for an app is clicked', () => {
    const onOpenApp = vi.fn();
    const onCloseApp = vi.fn();
    render(<AppList onOpenApp={onOpenApp} onCloseApp={onCloseApp} />);

    // The first app row is notepad; its Open button
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
    openButtons.forEach((btn) => expect(btn).toBeDisabled());
    closeButtons.forEach((btn) => expect(btn).toBeDisabled());
  });
});
