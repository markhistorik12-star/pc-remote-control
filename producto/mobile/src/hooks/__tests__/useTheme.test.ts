import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useTheme, THEME_OPTIONS } from '../useTheme';

describe('useTheme (9 color themes)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.colorScheme = '';
  });

  it('exposes all 9 themes and defaults to amber dark theme', () => {
    const { result } = renderHook(() => useTheme());
    expect(THEME_OPTIONS).toHaveLength(9);
    expect(result.current.theme).toBe('amber');
    expect(document.documentElement.getAttribute('data-theme')).toBe('amber');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('switches themes, persists selection, and toggles light colorScheme for latte', () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme('cyberpunk');
    });
    expect(result.current.theme).toBe('cyberpunk');
    expect(localStorage.getItem('pcRemoteHubTheme')).toBe('cyberpunk');
    expect(document.documentElement.getAttribute('data-theme')).toBe('cyberpunk');
    expect(document.documentElement.style.colorScheme).toBe('dark');

    act(() => {
      result.current.setTheme('latte');
    });
    expect(result.current.theme).toBe('latte');
    expect(document.documentElement.getAttribute('data-theme')).toBe('latte');
    expect(document.documentElement.style.colorScheme).toBe('light');
  });

  it('falls back safely to amber if localStorage contains an unknown theme id', () => {
    localStorage.setItem('pcRemoteHubTheme', 'invalid_injected_theme');
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('amber');
  });
});
