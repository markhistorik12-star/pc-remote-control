import { act, renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSettings } from '../useSettings';

const STORAGE_KEY = 'pcRemoteSettings';

describe('useSettings', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    vi.stubGlobal('localStorage', {
      ...localStorage,
      getItem: vi.fn((key: string) => localStorage.getItem(key)),
      setItem: vi.fn((key: string, value: string) => localStorage.setItem(key, value)),
      removeItem: vi.fn((key: string) => localStorage.removeItem(key)),
    });
  });

  it('returns empty settings initially', () => {
    const { result } = renderHook(() => useSettings());
    expect(result.current.settings).toEqual({ ip: '', token: '' });
  });

  it('saves settings and persists to localStorage', () => {
    const { result } = renderHook(() => useSettings());

    act(() => {
      result.current.saveSettings('192.168.1.10', 'abc123');
    });

    expect(result.current.settings).toEqual({ ip: '192.168.1.10', token: 'abc123' });
    expect(localStorage.getItem(STORAGE_KEY)).toBe(
      JSON.stringify({ ip: '192.168.1.10', token: 'abc123' })
    );
  });

  it('clears settings and removes from localStorage', () => {
    const { result } = renderHook(() => useSettings());

    act(() => {
      result.current.saveSettings('192.168.1.10', 'abc123');
      result.current.clearSettings();
    });

    expect(result.current.settings).toEqual({ ip: '', token: '' });
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
