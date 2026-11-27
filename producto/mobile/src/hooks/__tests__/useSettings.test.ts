import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useSettings } from '../useSettings';

describe('useSettings (multi-device profiles)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts empty when no profiles or legacy settings exist', () => {
    const { result } = renderHook(() => useSettings());
    expect(result.current.profiles).toEqual([]);
    expect(result.current.activeProfile).toBeNull();
  });

  it('migrates legacy single-PC settings automatically', () => {
    localStorage.setItem(
      'pcRemoteHubSettings',
      JSON.stringify({ ip: '192.168.0.10', port: 5050, token: 'abc123', hostname: 'DESKTOP-MAIN' })
    );

    const { result } = renderHook(() => useSettings());
    expect(result.current.profiles).toHaveLength(1);
    expect(result.current.activeProfile?.name).toBe('DESKTOP-MAIN');
    expect(result.current.activeProfile?.token).toBe('ABC123');
  });

  it('supports adding multiple profiles, switching, editing, and deleting', () => {
    const { result } = renderHook(() => useSettings());

    let pc1Id = '';
    let pc2Id = '';

    act(() => {
      const p1 = result.current.upsertProfile({
        name: 'PC Sala',
        icon: 'gaming',
        ip: '192.168.0.10',
        port: 5050,
        token: 'aaa111',
        hostname: 'SALA-PC',
      });
      pc1Id = p1.id;
    });

    act(() => {
      const p2 = result.current.upsertProfile({
        name: 'Notebook Trabajo',
        icon: 'laptop',
        ip: '192.168.0.25',
        port: 5050,
        token: 'bbb222',
        hostname: 'WORK-LT',
      });
      pc2Id = p2.id;
    });

    expect(result.current.profiles).toHaveLength(2);
    expect(result.current.activeProfileId).toBe(pc2Id);

    // Switch back to PC 1
    act(() => {
      result.current.selectProfile(pc1Id);
    });
    expect(result.current.activeProfile?.name).toBe('PC Sala');

    // Rename PC 1
    act(() => {
      result.current.updateProfileMeta(pc1Id, { name: 'PC Principal' });
    });
    expect(result.current.activeProfile?.name).toBe('PC Principal');

    // Delete active profile -> falls back to remaining profile
    act(() => {
      result.current.deleteProfile(pc1Id);
    });
    expect(result.current.profiles).toHaveLength(1);
    expect(result.current.activeProfileId).toBe(pc2Id);
  });
});
