import { useState, useCallback } from 'react';
import type { AppItem } from '../services/api';

export type ProfileIconKey = 'desktop' | 'laptop' | 'gaming' | 'work';

export interface DeviceProfile {
  id: string;
  name: string;
  icon: ProfileIconKey;
  ip: string;
  port: number;
  token: string;
  hostname?: string;
  cachedApps?: AppItem[];
  lastConnectedAt?: number;
}

export interface Settings {
  ip: string;
  port: number;
  token: string;
  hostname?: string;
}

interface StoredProfilesState {
  profiles: DeviceProfile[];
  activeProfileId: string | null;
}

const PROFILES_STORAGE_KEY = 'pcRemoteHubProfiles_v1';
const LEGACY_STORAGE_KEY = 'pcRemoteHubSettings';

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `pc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeIcon(icon?: string): ProfileIconKey {
  if (icon === 'laptop' || icon === 'gaming' || icon === 'work' || icon === 'desktop') {
    return icon;
  }
  return 'desktop';
}

function loadInitialState(): StoredProfilesState {
  try {
    const raw = localStorage.getItem(PROFILES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.profiles)) {
        const profiles: DeviceProfile[] = parsed.profiles
          .filter((p: Partial<DeviceProfile>) => p && p.ip && p.token)
          .map((p: Partial<DeviceProfile>) => ({
            id: p.id || generateId(),
            name: (p.name || p.hostname || p.ip || 'Mi PC').trim(),
            icon: normalizeIcon(p.icon),
            ip: String(p.ip).trim(),
            port: Number(p.port) || 5050,
            token: String(p.token).trim().toUpperCase(),
            hostname: p.hostname || '',
            cachedApps: Array.isArray(p.cachedApps) ? p.cachedApps : [],
            lastConnectedAt: p.lastConnectedAt,
          }));
        const hasActive = profiles.some((p) => p.id === parsed.activeProfileId);
        return {
          profiles,
          activeProfileId: hasActive ? parsed.activeProfileId : profiles[0]?.id ?? null,
        };
      }
    }

    // Migrate legacy single-PC settings automatically if present
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw);
      if (legacy?.ip && legacy?.token) {
        const migrated: DeviceProfile = {
          id: generateId(),
          name: (legacy.hostname || legacy.ip || 'Mi PC').trim(),
          icon: 'desktop',
          ip: String(legacy.ip).trim(),
          port: Number(legacy.port) || 5050,
          token: String(legacy.token).trim().toUpperCase(),
          hostname: legacy.hostname || '',
          cachedApps: [],
          lastConnectedAt: Date.now(),
        };
        const initial: StoredProfilesState = {
          profiles: [migrated],
          activeProfileId: migrated.id,
        };
        localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(initial));
        return initial;
      }
    }
  } catch {
    // Ignore storage read errors
  }

  return { profiles: [], activeProfileId: null };
}

function persistState(next: StoredProfilesState) {
  try {
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore quota errors
  }
}

export interface UpsertProfileInput {
  id?: string;
  name?: string;
  icon?: ProfileIconKey;
  ip: string;
  port: number;
  token: string;
  hostname?: string;
}

export function useSettings() {
  const [state, setState] = useState<StoredProfilesState>(() => loadInitialState());

  const activeProfile =
    state.profiles.find((p) => p.id === state.activeProfileId) ?? state.profiles[0] ?? null;

  const selectProfile = useCallback((id: string) => {
    setState((prev) => {
      if (!prev.profiles.some((p) => p.id === id)) return prev;
      const next: StoredProfilesState = { ...prev, activeProfileId: id };
      persistState(next);
      return next;
    });
  }, []);

  const upsertProfile = useCallback((input: UpsertProfileInput): DeviceProfile => {
    const cleanIp = input.ip.trim();
    const cleanPort = Number(input.port) || 5050;
    const cleanToken = input.token.trim().toUpperCase();
    const cleanHostname = (input.hostname || '').trim();
    const customName = (input.name || '').trim();
    const chosenIcon = normalizeIcon(input.icon);

    let savedProfile!: DeviceProfile;

    setState((prev) => {
      // Edit mode by explicit ID, or deduplicate if adding an already-saved IP:port
      const existingIndex = input.id
        ? prev.profiles.findIndex((p) => p.id === input.id)
        : prev.profiles.findIndex((p) => p.ip === cleanIp && p.port === cleanPort);

      let nextProfiles: DeviceProfile[];

      if (existingIndex >= 0) {
        const existing = prev.profiles[existingIndex];
        const resolvedHost = cleanHostname || existing.hostname || '';
        const resolvedName =
          customName || existing.name || resolvedHost || cleanIp;

        savedProfile = {
          ...existing,
          name: resolvedName,
          icon: input.icon ? chosenIcon : existing.icon,
          ip: cleanIp,
          port: cleanPort,
          token: cleanToken,
          hostname: resolvedHost,
          lastConnectedAt: Date.now(),
        };
        nextProfiles = [...prev.profiles];
        nextProfiles[existingIndex] = savedProfile;
      } else {
        const resolvedName = customName || cleanHostname || cleanIp;
        savedProfile = {
          id: generateId(),
          name: resolvedName,
          icon: chosenIcon,
          ip: cleanIp,
          port: cleanPort,
          token: cleanToken,
          hostname: cleanHostname,
          cachedApps: [],
          lastConnectedAt: Date.now(),
        };
        nextProfiles = [...prev.profiles, savedProfile];
      }

      const next: StoredProfilesState = {
        profiles: nextProfiles,
        activeProfileId: savedProfile.id,
      };
      persistState(next);
      return next;
    });

    return savedProfile;
  }, []);

  const updateProfileMeta = useCallback(
    (
      id: string,
      patch: Partial<
        Pick<DeviceProfile, 'name' | 'icon' | 'hostname' | 'cachedApps' | 'lastConnectedAt'>
      >
    ) => {
      setState((prev) => {
        const idx = prev.profiles.findIndex((p) => p.id === id);
        if (idx < 0) return prev;
        const current = prev.profiles[idx];
        // If user hadn't set a custom name (name matched old hostname or IP), update name to new hostname too
        let nextName = patch.name !== undefined ? patch.name.trim() : current.name;
        if (
          patch.name === undefined &&
          patch.hostname &&
          (current.name === current.ip || current.name === current.hostname)
        ) {
          nextName = patch.hostname;
        }
        if (!nextName) {
          nextName = patch.hostname || current.hostname || current.ip;
        }

        const updated: DeviceProfile = {
          ...current,
          ...patch,
          name: nextName,
        };
        const nextProfiles = [...prev.profiles];
        nextProfiles[idx] = updated;
        const next: StoredProfilesState = { ...prev, profiles: nextProfiles };
        persistState(next);
        return next;
      });
    },
    []
  );

  const deleteProfile = useCallback((id: string) => {
    setState((prev) => {
      const remaining = prev.profiles.filter((p) => p.id !== id);
      const nextActive =
        prev.activeProfileId === id ? remaining[0]?.id ?? null : prev.activeProfileId;
      const next: StoredProfilesState = {
        profiles: remaining,
        activeProfileId: nextActive,
      };
      persistState(next);
      return next;
    });
  }, []);

  const settings: Settings = activeProfile
    ? {
        ip: activeProfile.ip,
        port: activeProfile.port,
        token: activeProfile.token,
        hostname: activeProfile.hostname,
      }
    : { ip: '', port: 5050, token: '', hostname: '' };

  return {
    settings,
    profiles: state.profiles,
    activeProfile,
    activeProfileId: activeProfile?.id ?? null,
    selectProfile,
    upsertProfile,
    updateProfileMeta,
    deleteProfile,
  };
}
