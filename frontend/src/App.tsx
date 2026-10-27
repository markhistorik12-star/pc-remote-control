import { useState } from 'react';
import Header from './components/Header';
import PowerButtons from './components/PowerButtons';
import AppList from './components/AppList';
import SettingsModal from './components/SettingsModal';
import { useSettings } from './hooks/useSettings';
import { shutdown, restart, lock, openApp, closeApp } from './services/api';

function App() {
  const { settings, saveSettings } = useSettings();
  const [showSettings, setShowSettings] = useState(false);

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
    alert(result?.message || 'Action completed');
  };

  const handleOpenApp = async (appName: string) => {
    const result = await openApp(settings.ip, settings.token, appName);
    alert(result?.message || 'Action completed');
  };

  const handleCloseApp = async (appName: string) => {
    const result = await closeApp(settings.ip, settings.token, appName);
    alert(result?.message || 'Action completed');
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <Header onSettingsClick={() => setShowSettings(true)} />
      
      <main className="max-w-md mx-auto space-y-6">
        <PowerButtons onAction={handlePowerAction} disabled={!settings.ip || !settings.token} />
        <AppList onOpenApp={handleOpenApp} onCloseApp={handleCloseApp} disabled={!settings.ip || !settings.token} />
      </main>

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSave={saveSettings}
      />
    </div>
  );
}

export default App;