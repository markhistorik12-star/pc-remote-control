import { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import PowerButtons from './components/PowerButtons';
import AppList from './components/AppList';
import SettingsModal from './components/SettingsModal';
import { useSettings } from './hooks/useSettings';
import { shutdown, restart, lock, openApp, closeApp, testConnection } from './services/api';
import { AlertTriangleIcon, CheckCircleIcon } from './components/ui/Icons';

export default function App() {
  const { settings, saveSettings } = useSettings();
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'checking' | 'connected' | 'disconnected'>('idle');

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const checkConnection = useCallback(async (ip: string, token: string) => {
    if (!ip || !token) {
      setConnectionStatus('idle');
      return;
    }
    setConnectionStatus('checking');
    try {
      const res = await testConnection(ip, token);
      if (res.success) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('disconnected');
      }
    } catch {
      setConnectionStatus('disconnected');
    }
  }, []);

  useEffect(() => {
    if (settings.ip && settings.token) {
      checkConnection(settings.ip, settings.token);
    } else {
      setConnectionStatus('idle');
    }
  }, [settings.ip, settings.token, checkConnection]);

  const handleSaveSettings = async (ip: string, token: string) => {
    saveSettings(ip, token);
    const result = await testConnection(ip, token);
    if (result.success) {
      setConnectionStatus('connected');
      showToast(result.message || 'Conexión exitosa con el PC', 'success');
    } else {
      setConnectionStatus('disconnected');
      showToast(result.message || 'No se pudo conectar con el PC', 'error');
    }
  };

  const handlePowerAction = async (action: 'shutdown' | 'restart' | 'lock') => {
    if (!settings.ip || !settings.token) {
      showToast('Configura IP y Token primero', 'error');
      setShowSettings(true);
      return;
    }

    let result;
    switch (action) {
      case 'shutdown':
        result = await shutdown(settings.ip, settings.token);
        break;
      case 'restart':
        result = await restart(settings.ip, settings.token);
        break;
      case 'lock':
        result = await lock(settings.ip, settings.token);
        break;
    }
    showToast(result?.message || 'Acción completada', result?.success ? 'success' : 'error');
  };

  const handleOpenApp = async (appName: string) => {
    if (!settings.ip || !settings.token) {
      showToast('Configura IP y Token primero', 'error');
      setShowSettings(true);
      return;
    }
    const result = await openApp(settings.ip, settings.token, appName);
    showToast(result?.message || 'Acción completada', result?.success ? 'success' : 'error');
  };

  const handleCloseApp = async (appName: string) => {
    if (!settings.ip || !settings.token) {
      showToast('Configura IP y Token primero', 'error');
      setShowSettings(true);
      return;
    }
    const result = await closeApp(settings.ip, settings.token, appName);
    showToast(result?.message || 'Acción completada', result?.success ? 'success' : 'error');
  };

  const isConfigured = Boolean(settings.ip && settings.token);

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6">
      <div className="max-w-md mx-auto">
        <Header onSettingsClick={() => setShowSettings(true)} />

        {/* Connection status badge */}
        {isConfigured && (
          <div className="flex items-center justify-between px-4 py-2.5 mb-5 rounded-xl bg-card border border-border text-xs">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  connectionStatus === 'connected'
                    ? 'bg-green-500 animate-pulse'
                    : connectionStatus === 'checking'
                    ? 'bg-yellow-500 animate-bounce'
                    : 'bg-red-500'
                }`}
              />
              <span className="font-mono text-muted-foreground">{settings.ip}:5000</span>
            </div>
            <button
              onClick={() => checkConnection(settings.ip, settings.token)}
              className="text-primary hover:underline font-medium"
            >
              {connectionStatus === 'connected'
                ? 'Conectado'
                : connectionStatus === 'checking'
                ? 'Comprobando...'
                : 'Reconectar'}
            </button>
          </div>
        )}

        <main className="space-y-6">
          <PowerButtons onAction={handlePowerAction} disabled={!isConfigured} />
          <AppList onOpenApp={handleOpenApp} onCloseApp={handleCloseApp} disabled={!isConfigured} />
        </main>

        {!isConfigured && (
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="w-full mt-8 p-5 rounded-2xl bg-card border border-border text-center hover:border-primary/50 transition-colors block cursor-pointer"
          >
            <AlertTriangleIcon className="w-8 h-8 mx-auto text-amber-500 mb-3" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-foreground mb-1">Configuración requerida</h3>
            <p className="text-xs text-muted-foreground">
              Toca aquí para ingresar la IP de tu PC y el Token
            </p>
          </button>
        )}

        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          settings={settings}
          onSave={handleSaveSettings}
        />

        {toast && (
          <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-right-4 fade-in duration-300">
            <div
              className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl min-w-[280px] max-w-sm border ${
                toast.type === 'success'
                  ? 'bg-green-950/90 border-green-700 text-green-200'
                  : 'bg-red-950/90 border-red-700 text-red-200'
              }`}
              role="alert"
            >
              {toast.type === 'success' ? (
                <CheckCircleIcon className="w-5 h-5 flex-shrink-0 text-green-400" aria-hidden="true" />
              ) : (
                <AlertTriangleIcon className="w-5 h-5 flex-shrink-0 text-red-400" aria-hidden="true" />
              )}
              <p className="text-sm font-medium flex-1">{toast.message}</p>
              <button
                onClick={() => setToast(null)}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Cerrar notificación"
              >
                <span className="w-4 h-4">✕</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
