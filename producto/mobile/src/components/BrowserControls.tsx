import { useState } from 'react';
import { getAppIconUrl, type AppItem, type BrowserAction } from '../services/api';
import AppAvatar from './AppAvatar';
import { XIcon } from './ui/Icons';

interface BrowserControlsProps {
  isOpen: boolean;
  browser: AppItem | null;
  ip: string;
  port: number;
  token: string;
  onClose: () => void;
  onNavigate: (query: string, browserId?: string) => void;
  onAction: (action: BrowserAction, browserId?: string) => void;
  disabled?: boolean;
}

const quickSites = [
  { label: 'YouTube', query: 'https://www.youtube.com' },
  { label: 'Google', query: 'https://www.google.com' },
  { label: 'Twitch', query: 'https://www.twitch.tv' },
  { label: 'Netflix', query: 'https://www.netflix.com' },
];

export default function BrowserControls({
  isOpen,
  browser,
  ip,
  port,
  token,
  onClose,
  onNavigate,
  onAction,
  disabled,
}: BrowserControlsProps) {
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  const browserName = browser?.name || 'Navegador';
  const browserId = browser?.id;
  const iconUrl = browser && ip && token ? getAppIconUrl(ip, port, token, browser.id) : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    onNavigate(trimmed, browserId);
    setQuery('');
  };

  const btnClass =
    'py-3 px-2 text-xs font-medium text-foreground/85 active:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-center';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="universal-browser-title"
    >
      <div
        className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <AppAvatar name={browserName} iconUrl={iconUrl} sizeClass="w-10 h-10" />
            <div className="min-w-0">
              <h2 id="universal-browser-title" className="text-base font-semibold text-foreground truncate">
                Control de {browserName}
              </h2>
              <p className="text-xs text-muted-foreground">Búsqueda, pestañas y zoom</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar control del navegador"
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar o abrir URL (ej: youtube.com)"
            disabled={disabled}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            className="flex-1 min-w-0 px-3.5 h-11 rounded-xl border border-border bg-background/60 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button
            type="submit"
            disabled={disabled || !query.trim()}
            className="px-4 h-11 rounded-xl text-sm font-semibold bg-primary text-primary-foreground active:brightness-90 disabled:opacity-30"
          >
            Ir
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          {quickSites.map((site) => (
            <button
              key={site.label}
              type="button"
              onClick={() => onNavigate(site.query, browserId)}
              disabled={disabled}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted/60 active:bg-muted text-foreground/90 border border-border/60"
            >
              {site.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 rounded-xl border border-border divide-x divide-border overflow-hidden bg-background/40">
          <button type="button" onClick={() => onAction('back', browserId)} disabled={disabled} className={btnClass}>
            ← Atrás
          </button>
          <button type="button" onClick={() => onAction('reload', browserId)} disabled={disabled} className={btnClass}>
            ↻ Recargar
          </button>
          <button type="button" onClick={() => onAction('forward', browserId)} disabled={disabled} className={btnClass}>
            Adelante →
          </button>
        </div>

        <div className="grid grid-cols-4 rounded-xl border border-border divide-x divide-border overflow-hidden bg-background/40">
          <button type="button" onClick={() => onAction('prev-tab', browserId)} disabled={disabled} className={btnClass}>
            ‹ Pestaña
          </button>
          <button type="button" onClick={() => onAction('next-tab', browserId)} disabled={disabled} className={btnClass}>
            Pestaña ›
          </button>
          <button type="button" onClick={() => onAction('reopen-tab', browserId)} disabled={disabled} className={btnClass}>
            ↺ Reabrir
          </button>
          <button
            type="button"
            onClick={() => onAction('close-tab', browserId)}
            disabled={disabled}
            className="py-3 px-2 text-xs font-medium text-destructive active:bg-muted transition-colors text-center"
          >
            ✕ Pestaña
          </button>
        </div>

        <div className="grid grid-cols-3 rounded-xl border border-border divide-x divide-border overflow-hidden bg-background/40">
          <button type="button" onClick={() => onAction('zoom-out', browserId)} disabled={disabled} className={btnClass}>
            Zoom −
          </button>
          <button type="button" onClick={() => onAction('zoom-reset', browserId)} disabled={disabled} className={btnClass}>
            100%
          </button>
          <button type="button" onClick={() => onAction('zoom-in', browserId)} disabled={disabled} className={btnClass}>
            Zoom +
          </button>
        </div>
      </div>
    </div>
  );
}
