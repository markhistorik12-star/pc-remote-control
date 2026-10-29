import { useState } from 'react';
import Header from './components/Header';
import PowerButtons from './components/PowerButtons';
import AppList from './components/AppList';
import SettingsModal from './components/SettingsModal';
import { useSettings } from './hooks/useSettings';
import { shutdown, restart, lock, openApp, closeApp } from './services/api';
import { AlertTriangleIcon, CheckCircleIcon } from './components/ui/Icons';

function App() {
  const { settings, saveSettings } = useSettings();
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handlePowerAction = async (action: 'shutdown' | 'restart' | 'lock') => {
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
    const result = await openApp(settings.ip, settings.token, appName);
    showToast(result?.message || 'Acción completada', result?.success ? 'success' : 'error');
  };

  const handleCloseApp = async (appName: string) => {
    const result = await closeApp(settings.ip, settings.token, appName);
    showToast(result?.message || 'Acción completada', result?.success ? 'success' : 'error');
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-md mx-auto">
        <Header onSettingsClick={() => setShowSettings(true)} />
        
        <main className="space-y-6">
          <PowerButtons onAction={handlePowerAction} disabled={!settings.ip || !settings.token} />
          <AppList onOpenApp={handleOpenApp} onCloseApp={handleCloseApp} disabled={!settings.ip || !settings.token} />
        </main>

        {!settings.ip || !settings.token ? (
          <div className="mt-8 p-5 rounded-2xl bg-muted/50 border border-border text-center animate-in fade-in slide-in-from-bottom-4 duration-300">
            <AlertTriangleIcon className="w-8 h-8 mx-auto text-muted-foreground mb-3" aria-hidden="true" />
            <h3 className="text-sm font-medium text-foreground mb-1">Configuración requerida</h3>
            <p className="text-sm text-muted-foreground">
              Toca el icono de ajustes para configurar la IP y el token
            </p>
          </div>
        ) : null}

        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          settings={settings}
          onSave={saveSettings}
        />

        {toast && (
          <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-right-4 fade-in duration-300">
            <div className={`
              flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl min-w-[280px] max-w-sm
              ${toast.type === 'success' 
                ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200' 
                : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
              }
            `} role="alert">
              {toast.type === 'success' ? (
                <CheckCircleIcon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
              ) : (
                <AlertTriangleIcon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
              )}
              <p className="text-sm font-medium flex-1">{toast.message}</p>
              <button
                onClick={() => setToast(null)}
                className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
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

export default App;