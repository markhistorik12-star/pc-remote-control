import { act, renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useSettings } from '../useSettings';

const STORAGE_KEY = 'pcRemoteSettings';

describe('useSettings', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  it('returns empty settings initially', () => {
    const { result } = renderHook(() => useSettings());
    expect(result.current.settings).toEqual({ ip: '', token: '', mac: 'F0:1E:34:14:2B:1B' });
  });

  it('saves settings and persists to localStorage', () => {
    const { result } = renderHook(() => useSettings());

    act(() => {
      result.current.saveSettings('192.168.1.10', 'abc123');
    });

    expect(result.current.settings).toEqual({ ip: '192.168.1.10', token: 'abc123', mac: 'F0:1E:34:14:2B:1B' });
    expect(localStorage.getItem(STORAGE_KEY)).toBe(
      JSON.stringify({ ip: '192.168.1.10', token: 'abc123', mac: 'F0:1E:34:14:2B:1B' })
    );
  });

  it('clears settings and removes from localStorage', () => {
    const { result } = renderHook(() => useSettings());

    act(() => {
      result.current.saveSettings('192.168.1.10', 'abc123');
      result.current.clearSettings();
    });

    expect(result.current.settings).toEqual({ ip: '', token: '', mac: 'F0:1E:34:14:2B:1B' });
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
