import { useEffect, useState, useCallback } from 'react';
import { getSteamAccounts, getAppIconUrl, type AppItem, type SteamAccount } from '../services/api';
import AppAvatar from './AppAvatar';
import { XIcon, RefreshCwIcon, PlayIcon } from './ui/Icons';

interface SteamAccountModalProps {
  isOpen: boolean;
  steamApp: AppItem | null;
  onClose: () => void;
  ip: string;
  port: number;
  token: string;
  onSelectAccount: (account: SteamAccount) => Promise<void>;
  onOpenDefault: () => void;
}

const avatarPalette = [
  'from-sky-500 to-blue-700',
  'from-indigo-500 to-violet-700',
  'from-emerald-500 to-teal-700',
  'from-amber-500 to-orange-700',
  'from-rose-500 to-pink-700',
  'from-cyan-500 to-sky-700',
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'ST';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function SteamAccountModal({
  isOpen,
  steamApp,
  onClose,
  ip,
  port,
  token,
  onSelectAccount,
  onOpenDefault,
}: SteamAccountModalProps) {
  const [accounts, setAccounts] = useState<SteamAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [launchingId, setLaunchingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    if (!ip || !token) return;
    setLoading(true);
    setError(null);
    const res = await getSteamAccounts(ip, port, token);
    if (res.success) {
      setAccounts(res.accounts);
      if (res.accounts.length === 0) {
        setError('No hay cuentas guardadas en Steam en este PC.');
      }
    } else {
      setError(res.message || 'Error al consultar cuentas de Steam.');
    }
    setLoading(false);
  }, [ip, port, token]);

  useEffect(() => {
    if (isOpen) loadAccounts();
  }, [isOpen, loadAccounts]);

  if (!isOpen) return null;

  const handleSelect = async (account: SteamAccount) => {
    if (launchingId) return;
    setLaunchingId(account.steamId);
    try {
      await onSelectAccount(account);
      onClose();
    } finally {
      setLaunchingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="steam-modal-title"
    >
      <div
        className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-[#1b2838] to-[#2a475e]/40 border-b border-border">
          <div className="flex items-center gap-3">
            <AppAvatar
              name="Steam"
              iconUrl={steamApp && ip && token ? getAppIconUrl(ip, port, token, steamApp.id) : null}
            />
            <div>
              <h2 id="steam-modal-title" className="text-base font-semibold text-foreground">
                Cuentas de Steam
              </h2>
              <p className="text-xs text-muted-foreground">Elige con qué perfil iniciar</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={loadAccounts}
              disabled={loading}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60"
            >
              <RefreshCwIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2.5">
          {loading && accounts.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Buscando perfiles...</div>
          ) : error ? (
            <div className="py-6 px-4 rounded-xl bg-muted/40 border border-border text-center text-xs text-muted-foreground">
              {error}
            </div>
          ) : (
            accounts.map((account, idx) => {
              const gradient = avatarPalette[idx % avatarPalette.length];
              const isLaunching = launchingId === account.steamId;
              return (
                <button
                  key={account.steamId}
                  type="button"
                  onClick={() => handleSelect(account)}
                  disabled={Boolean(launchingId)}
                  className={`w-full flex items-center gap-3.5 p-3 rounded-xl border text-left transition-all disabled:opacity-50 ${
                    account.isAutoLogin
                      ? 'bg-[#2a475e]/30 border-sky-500/40'
                      : 'bg-background/50 border-border hover:bg-muted/40'
                  }`}
                >
                  <div
                    className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}
                  >
                    {getInitials(account.personaName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {account.personaName}
                      </span>
                      {account.isAutoLogin && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                          Última
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-mono text-muted-foreground truncate mt-0.5">
                      @{account.accountName}
                    </p>
                  </div>
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/15 text-primary">
                    {isLaunching ? (
                      <RefreshCwIcon className="w-4 h-4 animate-spin" />
                    ) : (
                      <PlayIcon className="w-4 h-4" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="px-4 py-3 border-t border-border bg-background/30 flex justify-between items-center">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenDefault();
            }}
            className="text-xs font-medium text-muted-foreground hover:text-foreground px-2 py-1.5"
          >
            Abrir Steam normal
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium bg-muted text-foreground"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
