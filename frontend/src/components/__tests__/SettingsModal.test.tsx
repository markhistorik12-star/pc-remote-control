import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import SettingsModal from '../SettingsModal';
import type { Settings } from '../../hooks/useSettings';

afterEach(() => cleanup());

describe('SettingsModal', () => {
  const defaultSettings: Settings = { ip: '192.168.1.100', token: 'ABC123' };

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <SettingsModal isOpen={false} onClose={vi.fn()} settings={defaultSettings} onSave={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders IP and token inputs when isOpen is true', () => {
    render(
      <SettingsModal isOpen onClose={vi.fn()} settings={defaultSettings} onSave={vi.fn()} />
    );

    expect(screen.getByPlaceholderText('192.168.1.100')).not.toBeNull();
    expect(screen.getByPlaceholderText('ABC123')).not.toBeNull();
    expect((screen.getByPlaceholderText('192.168.1.100') as HTMLInputElement).value).toBe('192.168.1.100');
    expect((screen.getByPlaceholderText('ABC123') as HTMLInputElement).value).toBe('ABC123');
  });

  it('calls onSave with ip and token when Guardar is clicked', () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    render(
      <SettingsModal isOpen onClose={onClose} settings={defaultSettings} onSave={onSave} />
    );

    fireEvent.click(screen.getAllByText('Guardar')[0]);
    expect(onSave).toHaveBeenCalledWith('192.168.1.100', 'ABC123');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Cancelar is clicked', () => {
    const onClose = vi.fn();
    const onSave = vi.fn();
    render(<SettingsModal isOpen onClose={onClose} settings={defaultSettings} onSave={onSave} />);

    fireEvent.click(screen.getAllByText('Cancelar')[0]);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });
});