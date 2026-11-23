import { useState } from 'react';
import { useSettings } from '../hooks/useSettings';
import SettingsModal from '../components/SettingsModal';
import { MonitorIcon, ShieldIcon } from '../components/ui/Icons';

export const SettingsPage = () => {
  const { settings, saveSettings, clearSettings } = useSettings();
  const [isOpen, setIsOpen] = useState(true); // Open by default on first visit

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-heading font-semibold text-foreground/90 tracking-tight">
              Configuración
            </h1>
            <p className="text-muted-foreground mt-1">
              Configura la IP de tu PC y el token de acceso para controlar remotamente.
            </p>
          </div>
          <button
            onClick={() => setIsOpen(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            <MonitorIcon className="w-4 h-4 mr-2" /> Abrir Configuración
          </button>
        </div>

        {/* Current settings display */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-8 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Configuración actual</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
              <div className="flex items-center gap-3">
                <MonitorIcon className="w-5 h-5 text-primary" />
                <span className="font-medium">IP del PC</span>
              </div>
              <span className="font-mono text-sm {settings.ip ? 'text-foreground' : 'text-muted-foreground'}">
                {settings.ip || 'No configurada'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
              <div className="flex items-center gap-3">
                <ShieldIcon className="w-5 h-5 text-primary" />
                <span className="font-medium">Token de acceso</span>
              </div>
              <span className="font-mono text-sm {settings.token ? 'text-foreground' : 'text-muted-foreground'}">
                {settings.token || 'No configurado'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
              <span className="font-medium">Estado de conexión</span>
              <span className="px-2 py-1 rounded text-xs font-medium {settings.ip && settings.token ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}">
                {settings.ip && settings.token ? 'Listo para conectar' : 'Configuración incompleta'}
              </span>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Instrucciones</h2>
          <ol className="list-decimal list-inside space-y-3 text-sm text-muted-foreground">
            <li>
              Asegúrate de que tu PC y tu móvil estén en la <strong>misma red WiFi</strong>.
            </li>
            <li>
              Ejecuta el backend en tu PC: <code className="bg-muted p-1 rounded">dotnet run</code>
              en la carpeta <code className="bg-muted p-1 rounded">backend/PCControl.Api</code>.
            </li>
            <li>
              Obtén la IP de tu PC con <code className="bg-muted p-1 rounded">ipconfig</code> (Windows) o
              <code className="bg-muted p-1 rounded">ifconfig</code> (Linux/Mac).
            </li>
            <li>
              El token debe coincidir con el valor en <code className="bg-muted p-1 rounded">appsettings.json</code>
              del backend (por defecto: <strong>FKALFV</strong>).
            </li>
          </ol>
        </div>

        {/* Settings Modal */}
        <SettingsModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          settings={settings}
          onSave={saveSettings}
        />

        {/* Clear settings button */}
        {settings.ip || settings.token ? (
          <button
            onClick={clearSettings}
            className="mt-6 px-4 py-2 text-sm text-destructive hover:text-destructive/90 transition-colors"
          >
            Borrar configuración
          </button>
        ) : null}
      </div>
    </div>
  );
};
