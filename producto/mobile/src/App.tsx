import { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import PowerButtons from './components/PowerButtons';
import AppList from './components/AppList';
import AppCatalogModal from './components/AppCatalogModal';
import BrowserControls from './components/BrowserControls';
import SteamAccountModal from './components/SteamAccountModal';
import PairingModal, { type PairingSubmitPayload } from './components/PairingModal';
import ProfilesModal from './components/ProfilesModal';
import ThemeModal from './components/ThemeModal';
import ProfileAvatar, { ProfileIconGlyph } from './components/ProfileAvatar';
import { useSettings, type DeviceProfile } from './hooks/useSettings';
import { useTheme } from './hooks/useTheme';
import {
  checkHealth,
  verifyConnection,
  shutdown,
  restart,
  lock,
  suspend,
  getSelectedApps,
  openApp,
  closeApp,
  browserNavigate,
  browserAction,
  getSteamAccounts,
  launchSteamAccount,
  type AppItem,
  type BrowserAction,
  type SteamAccount,
} from './services/api';
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  WifiIcon,
  PlusIcon,
  EditIcon,
} from './components/ui/Icons';

export default function App() {
  const {
    profiles,
    activeProfile,
    activeProfileId,
    selectProfile,
    upsertProfile,
    updateProfileMeta,
    deleteProfile,
  } = useSettings();

  const { theme, setTheme, themes } = useTheme();
  const [apps, setApps] = useState<AppItem[]>(() => activeProfile?.cachedApps ?? []);
  const [loadingApps, setLoadingApps] = useState(false);

  const [showThemes, setShowThemes] = useState(false);
  const [showProfiles, setShowProfiles] = useState(false);
  const [pairingState, setPairingState] = useState<{
    open: boolean;
    mode: 'add' | 'edit';
    editingProfile: DeviceProfile | null;
  }>({ open: false, mode: 'add', editingProfile: null });

  const [showCatalog, setShowCatalog] = useState(false);
  const [activeBrowser, setActiveBrowser] = useState<AppItem | null>(null);
  const [activeSteamApp, setActiveSteamApp] = useState<AppItem | null>(null);
  const [pendingAction, setPendingAction] = useState<'shutdown' | 'suspend' | null>(null);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    'idle' | 'checking' | 'connected' | 'disconnected'
  >('idle');

  const syncSeqRef = useRef(0);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 3500);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const openAddDeviceModal = () => {
    setShowProfiles(false);
    setPairingState({ open: true, mode: 'add', editingProfile: null });
  };

  const openEditProfileModal = (profile: DeviceProfile) => {
    setShowProfiles(false);
    setPairingState({ open: true, mode: 'edit', editingProfile: profile });
  };

  const refreshAppsAndHealth = useCallback(
    async (profile: DeviceProfile) => {
      if (!profile.ip || !profile.token) {
        setConnectionStatus('idle');
        return;
      }
      const seq = ++syncSeqRef.current;
      setConnectionStatus('checking');
      setLoadingApps(true);

      const health = await checkHealth(profile.ip, profile.port, profile.token);
      if (seq !== syncSeqRef.current) return;

      if (!health.success) {
        setConnectionStatus('disconnected');
        setLoadingApps(false);
        return;
      }

      setConnectionStatus('connected');

      const selected = await getSelectedApps(profile.ip, profile.port, profile.token);
      if (seq !== syncSeqRef.current) return;

      if (selected.success) {
        setApps(selected.apps);
        updateProfileMeta(profile.id, {
          hostname: health.hostname || profile.hostname,
          cachedApps: selected.apps,
          lastConnectedAt: Date.now(),
        });
      } else if (health.hostname && health.hostname !== profile.hostname) {
        updateProfileMeta(profile.id, {
          hostname: health.hostname,
          lastConnectedAt: Date.now(),
        });
      }

      setLoadingApps(false);
    },
    [updateProfileMeta]
  );

  // Switch active profile cleanly without bleeding apps/modals from another PC
  useEffect(() => {
    setActiveBrowser(null);
    setActiveSteamApp(null);
    setPendingAction(null);

    if (activeProfile) {
      setApps(activeProfile.cachedApps ?? []);
      refreshAppsAndHealth(activeProfile);
    } else {
      syncSeqRef.current++;
      setApps([]);
      setConnectionStatus('idle');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfile?.id, activeProfile?.ip, activeProfile?.port, activeProfile?.token]);

  const handleSelectProfile = (profile: DeviceProfile) => {
    if (profile.id === activeProfileId) return;
    selectProfile(profile.id);
    showToast(`Cambiado a ${profile.name}`, 'success');
  };

  const handleDeleteProfile = (profile: DeviceProfile) => {
    deleteProfile(profile.id);
    showToast(`Perfil "${profile.name}" eliminado`, 'success');
  };

  const handlePairingSubmit = async (payload: PairingSubmitPayload): Promise<boolean> => {
    if (payload.skipVerify) {
      const saved = upsertProfile({
        id: payload.id,
        name: payload.name,
        icon: payload.icon,
        ip: payload.ip,
        port: payload.port,
        token: payload.token,
        hostname: payload.hostname,
      });
      showToast(`Perfil "${saved.name}" guardado`, 'success');
      return true;
    }

    const res = await verifyConnection(payload.ip, payload.port, payload.token);
    if (!res.success) {
      return false;
    }

    const resolvedHost = res.hostname || payload.hostname || '';
    const saved = upsertProfile({
      id: payload.id,
      name: payload.name,
      icon: payload.icon,
      ip: payload.ip,
      port: payload.port,
      token: payload.token,
      hostname: resolvedHost,
    });

    setConnectionStatus('connected');
    showToast(res.message || `Conectado a ${saved.name}`, 'success');

    const selected = await getSelectedApps(saved.ip, saved.port, saved.token);
    if (selected.success) {
      setApps(selected.apps);
      updateProfileMeta(saved.id, { cachedApps: selected.apps });
    }
    return true;
  };

  const executePowerAction = async (action: 'shutdown' | 'restart' | 'lock' | 'suspend') => {
    if (!activeProfile) return;
    const { ip, port, token } = activeProfile;
    const res =
      action === 'shutdown'
        ? await shutdown(ip, port, token)
        : action === 'restart'
        ? await restart(ip, port, token)
        : action === 'suspend'
        ? await suspend(ip, port, token)
        : await lock(ip, port, token);

    showToast(res.message, res.success ? 'success' : 'error');
  };

  const handlePowerAction = async (action: 'shutdown' | 'restart' | 'lock' | 'suspend') => {
    if (!activeProfile) {
      openAddDeviceModal();
      return;
    }
    if (action === 'shutdown' || action === 'suspend') {
      setPendingAction(action);
      return;
    }
    await executePowerAction(action);
  };

  const handleConfirmPower = async () => {
    if (!pendingAction) return;
    const act = pendingAction;
    setPendingAction(null);
    await executePowerAction(act);
  };

  const handleOpenApp = async (app: AppItem) => {
    if (!activeProfile) {
      openAddDeviceModal();
      return;
    }

    if (app.kind === 'steam') {
      const steamRes = await getSteamAccounts(
        activeProfile.ip,
        activeProfile.port,
        activeProfile.token
      );
      if (steamRes.success && steamRes.accounts.length > 0) {
        setActiveSteamApp(app);
        return;
      }
    }

    const res = await openApp(activeProfile.ip, activeProfile.port, activeProfile.token, app.id);
    showToast(res.message, res.success ? 'success' : 'error');

    if (res.success && app.kind === 'browser') {
      setActiveBrowser(app);
    }
  };

  const handleCloseApp = async (app: AppItem) => {
    if (!activeProfile) {
      openAddDeviceModal();
      return;
    }
    const res = await closeApp(activeProfile.ip, activeProfile.port, activeProfile.token, app.id);
    showToast(res.message, res.success ? 'success' : 'error');
    if (res.success && activeBrowser?.id === app.id) {
      setActiveBrowser(null);
    }
  };

  const handleBrowserNavigate = async (query: string, browserId?: string) => {
    if (!activeProfile) return;
    const res = await browserNavigate(
      activeProfile.ip,
      activeProfile.port,
      activeProfile.token,
      browserId,
      query
    );
    showToast(res.message, res.success ? 'success' : 'error');
  };

  const handleBrowserAction = async (action: BrowserAction, browserId?: string) => {
    if (!activeProfile) return;
    const res = await browserAction(
      activeProfile.ip,
      activeProfile.port,
      activeProfile.token,
      browserId,
      action
    );
    showToast(res.message, res.success ? 'success' : 'error');
  };

  const handleSelectSteamAccount = async (account: SteamAccount) => {
    if (!activeProfile) return;
    const res = await launchSteamAccount(
      activeProfile.ip,
      activeProfile.port,
      activeProfile.token,
      account.accountName
    );
    showToast(res.message, res.success ? 'success' : 'error');
  };

  const handleOpenSteamDefault = async () => {
    if (!activeSteamApp || !activeProfile) return;
    const res = await openApp(
      activeProfile.ip,
      activeProfile.port,
      activeProfile.token,
      activeSteamApp.id
    );
    showToast(res.message, res.success ? 'success' : 'error');
  };

  const isConfigured = Boolean(activeProfile?.ip && activeProfile?.token);

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6">
      <div className="max-w-md mx-auto">
        <Header
          activeProfileName={activeProfile?.name}
          profileCount={profiles.length}
          onOpenThemes={() => setShowThemes(true)}
          onOpenProfiles={() => setShowProfiles(true)}
          onAddDevice={openAddDeviceModal}
        />

        {/* Quick device switcher bar */}
        {profiles.length > 0 && (
          <div
            className="flex items-center gap-2 overflow-x-auto pb-2 mb-3 no-scrollbar"
            role="tablist"
            aria-label="Perfiles de dispositivos"
          >
            {profiles.map((profile) => {
              const selected = profile.id === activeProfile?.id;
              return (
                <button
                  key={profile.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => handleSelectProfile(profile)}
                  className={`flex items-center gap-2 px-3 h-9 rounded-xl border text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-colors ${
                    selected
                      ? 'border-primary bg-primary/15 text-foreground'
                      : 'border-border bg-card text-muted-foreground active:bg-muted'
                  }`}
                >
                  <ProfileIconGlyph
                    icon={profile.icon}
                    className={`w-3.5 h-3.5 ${selected ? 'text-primary' : 'text-muted-foreground'}`}
                  />
                  <span className="max-w-[130px] truncate">{profile.name}</span>
                  {selected && (
                    <span
                      className={`w-2 h-2 rounded-full ${
                        connectionStatus === 'connected'
                          ? 'bg-green-500'
                          : connectionStatus === 'checking'
                          ? 'bg-yellow-500 animate-pulse'
                          : 'bg-red-500'
                      }`}
                    />
                  )}
                </button>
              );
            })}
            <button
              type="button"
              onClick={openAddDeviceModal}
              className="flex items-center gap-1 px-2.5 h-9 rounded-xl border border-dashed border-border bg-card/50 text-xs font-medium text-muted-foreground whitespace-nowrap flex-shrink-0 active:bg-muted"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span>Nuevo</span>
            </button>
          </div>
        )}

        {activeProfile ? (
          <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 mb-5 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 min-w-0">
              <ProfileAvatar icon={activeProfile.icon} size="sm" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      connectionStatus === 'connected'
                        ? 'bg-green-500 animate-pulse'
                        : connectionStatus === 'checking'
                        ? 'bg-yellow-500 animate-bounce'
                        : 'bg-red-500'
                    }`}
                  />
                  <span className="text-sm font-semibold text-foreground truncate">
                    {activeProfile.name}
                  </span>
                </div>
                <p className="text-[11px] font-mono text-muted-foreground truncate">
                  {activeProfile.hostname &&
                  activeProfile.hostname.toLowerCase() !== activeProfile.name.toLowerCase()
                    ? `${activeProfile.hostname} · `
                    : ''}
                  {activeProfile.ip}:{activeProfile.port}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => openEditProfileModal(activeProfile)}
                className="w-8 h-8 rounded-lg border border-border bg-background/50 flex items-center justify-center text-muted-foreground active:bg-muted"
                aria-label="Editar perfil activo"
              >
                <EditIcon className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => refreshAppsAndHealth(activeProfile)}
                className="px-2.5 h-8 rounded-lg text-xs font-semibold bg-primary/15 text-primary border border-primary/30 active:bg-primary/25"
              >
                {connectionStatus === 'connected'
                  ? 'Sincronizar'
                  : connectionStatus === 'checking'
                  ? 'Conectando...'
                  : 'Reconectar'}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={openAddDeviceModal}
            className="w-full mb-6 p-5 rounded-2xl bg-card border border-primary/40 text-left flex items-center gap-4 active:bg-muted transition-colors"
          >
            <div className="w-12 h-12 rounded-2xl bg-primary/15 text-primary border border-primary/30 flex items-center justify-center flex-shrink-0">
              <WifiIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Agregar tu primer PC</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Toca aquí para crear un perfil por Wi-Fi, código QR o IP manual
              </p>
            </div>
          </button>
        )}

        <main className="space-y-6">
          <PowerButtons onAction={handlePowerAction} disabled={!isConfigured} />
          <AppList
            apps={apps}
            ip={activeProfile?.ip || ''}
            port={activeProfile?.port || 5050}
            token={activeProfile?.token || ''}
            loading={loadingApps}
            disabled={!isConfigured}
            onOpenApp={handleOpenApp}
            onCloseApp={handleCloseApp}
            onOpenBrowserRemote={(browser) => setActiveBrowser(browser)}
            onOpenCatalog={() => setShowCatalog(true)}
          />
        </main>

        <ThemeModal
          isOpen={showThemes}
          onClose={() => setShowThemes(false)}
          currentTheme={theme}
          themes={themes}
          onSelectTheme={(id) => setTheme(id)}
        />

        <ProfilesModal
          isOpen={showProfiles}
          onClose={() => setShowProfiles(false)}
          profiles={profiles}
          activeProfileId={activeProfileId}
          onSelectProfile={handleSelectProfile}
          onAddProfile={openAddDeviceModal}
          onEditProfile={openEditProfileModal}
          onDeleteProfile={handleDeleteProfile}
        />

        <PairingModal
          isOpen={pairingState.open}
          mode={pairingState.mode}
          editingProfile={pairingState.editingProfile}
          hintIp={activeProfile?.ip}
          onClose={() =>
            setPairingState((prev) => ({ ...prev, open: false, editingProfile: null }))
          }
          onConnect={handlePairingSubmit}
        />

        <AppCatalogModal
          isOpen={showCatalog}
          onClose={() => setShowCatalog(false)}
          ip={activeProfile?.ip || ''}
          port={activeProfile?.port || 5050}
          token={activeProfile?.token || ''}
          onSaved={(updated) => {
            setApps(updated);
            if (activeProfile) {
              updateProfileMeta(activeProfile.id, { cachedApps: updated });
            }
            showToast('Tus aplicaciones fueron actualizadas', 'success');
          }}
        />

        <BrowserControls
          isOpen={Boolean(activeBrowser)}
          browser={activeBrowser}
          ip={activeProfile?.ip || ''}
          port={activeProfile?.port || 5050}
          token={activeProfile?.token || ''}
          onClose={() => setActiveBrowser(null)}
          onNavigate={handleBrowserNavigate}
          onAction={handleBrowserAction}
          disabled={!isConfigured}
        />

        <SteamAccountModal
          isOpen={Boolean(activeSteamApp)}
          steamApp={activeSteamApp}
          onClose={() => setActiveSteamApp(null)}
          ip={activeProfile?.ip || ''}
          port={activeProfile?.port || 5050}
          token={activeProfile?.token || ''}
          onSelectAccount={handleSelectSteamAccount}
          onOpenDefault={handleOpenSteamDefault}
        />

        {pendingAction && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm"
            onClick={() => setPendingAction(null)}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="bg-card border border-border rounded-2xl shadow-2xl max-w-sm w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-3">
                <AlertTriangleIcon
                  className={`w-6 h-6 flex-shrink-0 ${
                    pendingAction === 'shutdown' ? 'text-destructive' : 'text-indigo-400'
                  }`}
                />
                <h2 className="text-lg font-bold text-foreground">
                  {pendingAction === 'shutdown'
                    ? `¿Apagar ${activeProfile?.name || 'el PC'}?`
                    : `¿Suspender ${activeProfile?.name || 'el PC'}?`}
                </h2>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                {pendingAction === 'shutdown'
                  ? 'El equipo se apagará inmediatamente. ¿Deseas continuar?'
                  : 'El equipo entrará en modo suspensión. ¿Deseas continuar?'}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setPendingAction(null)}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-medium text-foreground bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPower}
                  className={`flex-1 px-4 py-3 rounded-xl text-sm font-semibold text-white ${
                    pendingAction === 'shutdown' ? 'bg-destructive' : 'bg-indigo-600'
                  }`}
                >
                  {pendingAction === 'shutdown' ? 'Sí, apagar' : 'Sí, suspender'}
                </button>
              </div>
            </div>
          </div>
        )}

        {toast && (
          <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-50 flex justify-center sm:justify-end pointer-events-none">
            <div
              className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl max-w-sm w-full border ${
                toast.type === 'success'
                  ? 'bg-green-950/95 border-green-700 text-green-200'
                  : 'bg-red-950/95 border-red-700 text-red-200'
              }`}
              role="alert"
            >
              {toast.type === 'success' ? (
                <CheckCircleIcon className="w-5 h-5 flex-shrink-0 text-green-400" />
              ) : (
                <AlertTriangleIcon className="w-5 h-5 flex-shrink-0 text-red-400" />
              )}
              <p className="text-sm font-medium flex-1">{toast.message}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
