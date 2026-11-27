import { useEffect, useState } from 'react';

export type ThemeId =
  | 'amber'
  | 'ocean'
  | 'emerald'
  | 'amethyst'
  | 'crimson'
  | 'cyberpunk'
  | 'sunset'
  | 'nord'
  | 'latte';

export interface ThemeOption {
  id: ThemeId;
  name: string;
  subtitle: string;
  isLight?: boolean;
  swatches: {
    bg: string;
    card: string;
    primary: string;
    accent: string;
  };
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'amber',
    name: 'Ámbar Carbón',
    subtitle: 'Clásico cálido oscuro',
    swatches: { bg: '#131210', card: '#1B1A17', primary: '#E0A339', accent: '#6FCF97' },
  },
  {
    id: 'ocean',
    name: 'Océano Cian',
    subtitle: 'Azul profundo eléctrico',
    swatches: { bg: '#090E1A', card: '#111827', primary: '#38BDF8', accent: '#34D399' },
  },
  {
    id: 'emerald',
    name: 'Bosque Esmeralda',
    subtitle: 'Verde nocturno natural',
    swatches: { bg: '#081410', card: '#0F201A', primary: '#10B981', accent: '#6EE7B7' },
  },
  {
    id: 'amethyst',
    name: 'Amatista Real',
    subtitle: 'Índigo y violeta intenso',
    swatches: { bg: '#0E0A1A', card: '#17112B', primary: '#A855F7', accent: '#38BDF8' },
  },
  {
    id: 'crimson',
    name: 'Carmesí Gaming',
    subtitle: 'Grafito y rojo rubí',
    swatches: { bg: '#120A0C', card: '#1C1014', primary: '#F43F5E', accent: '#FB923C' },
  },
  {
    id: 'cyberpunk',
    name: 'Neón Cyberpunk',
    subtitle: 'Magenta vibrante y cian',
    swatches: { bg: '#0B0719', card: '#150E2E', primary: '#EC4899', accent: '#22D3EE' },
  },
  {
    id: 'sunset',
    name: 'Atardecer Coral',
    subtitle: 'Cobre cálido y dorado',
    swatches: { bg: '#160E0C', card: '#221613', primary: '#F97316', accent: '#FACC15' },
  },
  {
    id: 'nord',
    name: 'Ártico Nord',
    subtitle: 'Pizarra escandinava fría',
    swatches: { bg: '#1E2430', card: '#272F3F', primary: '#88C0D0', accent: '#A3BE8C' },
  },
  {
    id: 'latte',
    name: 'Claro Marfil',
    subtitle: 'Modo día limpio y suave',
    isLight: true,
    swatches: { bg: '#F5F3EE', card: '#FFFFFF', primary: '#2563EB', accent: '#059669' },
  },
];

const THEME_STORAGE_KEY = 'pcRemoteHubTheme';

function applyThemeToDom(themeId: ThemeId) {
  const root = document.documentElement;
  root.setAttribute('data-theme', themeId);
  const opt = THEME_OPTIONS.find((t) => t.id === themeId);
  root.style.colorScheme = opt?.isLight ? 'light' : 'dark';
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null;
      if (saved && THEME_OPTIONS.some((t) => t.id === saved)) {
        return saved;
      }
    } catch {
      // Ignore storage errors
    }
    return 'amber';
  });

  useEffect(() => {
    applyThemeToDom(theme);
  }, [theme]);

  const setTheme = (next: ThemeId) => {
    setThemeState(next);
    applyThemeToDom(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Ignore storage errors
    }
  };

  return { theme, setTheme, themes: THEME_OPTIONS };
}
