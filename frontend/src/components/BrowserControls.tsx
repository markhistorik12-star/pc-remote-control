import { useState } from 'react';
import type { BrowserAction } from '../services/api';
import { BraveTile } from './ui/AppIcons';
import { XIcon } from './ui/Icons';

interface BrowserControlsProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (query: string) => void;
  onAction: (action: BrowserAction) => void;
  disabled?: boolean;
}

const quickSites = [
  { label: 'YouTube', query: 'https://www.youtube.com' },
  { label: 'Google', query: 'https://www.google.com' },
  { label: 'Twitch', query: 'https://www.twitch.tv' },
];

export default function BrowserControls({
  isOpen,
  onClose,
  onNavigate,
  onAction,
  disabled,
}: BrowserControlsProps) {
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    onNavigate(trimmed);
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
      aria-labelledby="brave-remote-title"
    >
      <div
        className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BraveTile className="w-9 h-9 flex-shrink-0" />
            <div>
              <h2 id="brave-remote-title" className="text-base font-heading font-semibold text-foreground">
                Control de Brave
              </h2>
              <p className="text-xs text-muted-foreground">Navega y controla pestañas</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar control de Brave"
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <XIcon className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Search / URL bar */}
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
            className="flex-1 min-w-0 px-3.5 h-11 rounded-xl border border-border bg-background/60 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-30"
          />
          <button
            type="submit"
            disabled={disabled || !query.trim()}
            className="px-4 h-11 rounded-xl text-sm font-semibold bg-primary text-primary-foreground active:brightness-90 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Ir
          </button>
        </form>

        {/* Quick links */}
        <div className="flex flex-wrap gap-2">
          {quickSites.map((site) => (
            <button
              key={site.label}
              type="button"
              onClick={() => onNavigate(site.query)}
              disabled={disabled}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-muted/60 hover:bg-muted active:bg-muted/80 text-foreground/90 border border-border/60 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {site.label}
            </button>
          ))}
        </div>

        {/* Navigation row: Back, Reload, Forward */}
        <div className="grid grid-cols-3 rounded-xl border border-border divide-x divide-border overflow-hidden bg-background/40">
          <button type="button" onClick={() => onAction('back')} disabled={disabled} className={btnClass}>
            ← Atrás
          </button>
          <button type="button" onClick={() => onAction('reload')} disabled={disabled} className={btnClass}>
            ↻ Recargar
          </button>
          <button type="button" onClick={() => onAction('forward')} disabled={disabled} className={btnClass}>
            Adelante →
          </button>
        </div>

        {/* Tabs row: Prev, Next, Reopen, Close */}
        <div className="grid grid-cols-4 rounded-xl border border-border divide-x divide-border overflow-hidden bg-background/40">
          <button type="button" onClick={() => onAction('prev-tab')} disabled={disabled} className={btnClass}>
            ‹ Pestaña
          </button>
          <button type="button" onClick={() => onAction('next-tab')} disabled={disabled} className={btnClass}>
            Pestaña ›
          </button>
          <button type="button" onClick={() => onAction('reopen-tab')} disabled={disabled} className={btnClass}>
            ↺ Reabrir
          </button>
          <button
            type="button"
            onClick={() => onAction('close-tab')}
            disabled={disabled}
            className="py-3 px-2 text-xs font-medium text-destructive active:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-center"
          >
            ✕ Pestaña
          </button>
        </div>

        {/* Zoom row: Out, Reset, In */}
        <div className="grid grid-cols-3 rounded-xl border border-border divide-x divide-border overflow-hidden bg-background/40">
          <button type="button" onClick={() => onAction('zoom-out')} disabled={disabled} className={btnClass}>
            Zoom −
          </button>
          <button type="button" onClick={() => onAction('zoom-reset')} disabled={disabled} className={btnClass}>
            100%
          </button>
          <button type="button" onClick={() => onAction('zoom-in')} disabled={disabled} className={btnClass}>
            Zoom +
          </button>
        </div>
      </div>
    </div>
  );
}
