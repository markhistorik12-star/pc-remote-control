import { useState, useEffect } from 'react';

export interface Settings {
  ip: string;
  token: string;
}

const STORAGE_KEY = 'pcRemoteSettings';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>({ ip: '', token: '' });

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setSettings(JSON.parse(stored));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  const saveSettings = (ip: string, token: string) => {
    const newSettings = { ip, token };
    setSettings(newSettings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
  };

  const clearSettings = () => {
    setSettings({ ip: '', token: '' });
    localStorage.removeItem(STORAGE_KEY);
  };

  return { settings, saveSettings, clearSettings };
}