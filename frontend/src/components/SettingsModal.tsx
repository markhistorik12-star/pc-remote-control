import { useState, useEffect, useRef } from 'react';
import type { Settings } from '../hooks/useSettings';
import { XIcon, CheckCircleIcon, AlertTriangleIcon, ShieldIcon, MonitorIcon } from './ui/Icons';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onSave: (ip: string, token: string) => void;
}

export default function SettingsModal({ isOpen, onClose, settings, onSave }: SettingsModalProps) {
  const [ip, setIp] = useState(settings.ip);
  const [token, setToken] = useState(settings.token);
  const [showToken, setShowToken] = useState(false);
  const [validation, setValidation] = useState<{ ip?: string; token?: string }>({});
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setIp(settings.ip);
    setToken(settings.token);
    setValidation({});
  }, [settings]);

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.body.style.overflow = 'hidden';
      // Focus first input after animation
      setTimeout(() => modalRef.current?.querySelector('input')?.focus(), 100);
    } else {
      document.body.style.overflow = '';
      previousActiveElement.current?.focus();
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const validateIp = (value: string): string | undefined => {
    if (!value.trim()) return 'La dirección IP es requerida';
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(value.trim())) return 'Formato IP inválido (ej: 192.168.1.100)';
    const parts = value.trim().split('.').map(Number);
    if (parts.some(p => p < 0 || p > 255)) return 'Cada parte debe estar entre 0 y 255';
    return undefined;
  };

  const validateToken = (value: string): string | undefined => {
    if (!value.trim()) return 'El token es requerido';
    if (value.trim().length !== 6) return 'El token debe tener 6 caracteres';
    if (!/^[A-Z0-9]{6}$/i.test(value.trim())) return 'Solo letras y números (6 caracteres)';
    return undefined;
  };

  const handleIpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setIp(value);
    setValidation(prev => ({ ...prev, ip: validateIp(value) }));
  };

  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setToken(value);
    setValidation(prev => ({ ...prev, token: validateToken(value) }));
  };

  const handleSave = () => {
    const ipError = validateIp(ip);
    const tokenError = validateToken(token);
    setValidation({ ip: ipError, token: tokenError });
    if (!ipError && !tokenError) {
      onSave(ip.trim(), token.trim());
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'Enter' && (e.target as HTMLInputElement).tagName === 'INPUT') {
      handleSave();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div
        ref={modalRef}
        className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 id="settings-title" className="text-xl font-heading font-semibold text-foreground">
            Configuración
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Cerrar configuración"
          >
            <XIcon className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label htmlFor="ip-input" className="block text-sm font-medium text-foreground mb-2">
              Dirección IP del PC
            </label>
            <div className="relative">
              <MonitorIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" aria-hidden="true" />
              <input
                id="ip-input"
                type="text"
                value={ip}
                onChange={handleIpChange}
                placeholder="192.168.1.100"
                autoComplete="off"
                spellCheck={false}
                className={`
                  w-full pl-11 pr-4 py-3 rounded-xl border bg-white dark:bg-slate-900
                  text-foreground placeholder:text-muted-foreground
                  transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:border-transparent
                  ${validation.ip ? 'border-destructive focus:ring-destructive' : 'border-border hover:border-primary/50'}
                  min-h-[48px]
                `}
              />
              {validation.ip && (
                <p className="mt-2 flex items-center gap-1.5 text-sm text-destructive" role="alert">
                  <AlertTriangleIcon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                  {validation.ip}
                </p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="token-input" className="block text-sm font-medium text-foreground mb-2">
              Token de acceso
            </label>
            <div className="relative">
              <ShieldIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" aria-hidden="true" />
              <input
                id="token-input"
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={handleTokenChange}
                placeholder="ABC123"
                autoComplete="off"
                spellCheck={false}
                className={`
                  w-full pl-11 pr-12 py-3 rounded-xl border bg-white dark:bg-slate-900
                  text-foreground placeholder:text-muted-foreground
                  transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:border-transparent
                  ${validation.token ? 'border-destructive focus:ring-destructive' : 'border-border hover:border-primary/50'}
                  min-h-[48px]
                  font-mono tracking-wider
                `}
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={showToken ? 'Ocultar token' : 'Mostrar token'}
                aria-pressed={showToken}
              >
                <CheckCircleIcon className="w-5 h-5" aria-hidden="true" />
              </button>
              {validation.token && (
                <p className="mt-2 flex items-center gap-1.5 text-sm text-destructive" role="alert">
                  <AlertTriangleIcon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                  {validation.token}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-border">
          <button
            onClick={onClose}
            className={`
              flex-1 px-5 py-3 rounded-xl text-sm font-medium text-foreground
              bg-muted hover:bg-muted/80 active:bg-muted/70
              transition-all duration-200
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
              min-h-[48px]
            `}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className={`
              flex-1 px-5 py-3 rounded-xl text-sm font-medium text-white
              bg-primary hover:bg-primary/90 active:bg-primary/80
              transition-all duration-200
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
              min-h-[48px]
            `}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}