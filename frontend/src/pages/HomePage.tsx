import { useState } from 'react';
import { useSettings } from '../hooks/useSettings';
import { useApi } from '../hooks/useApi';
import { useErrorHandler, handleApiError } from '../hooks/useErrorHandler';
import PowerButtons from '../components/PowerButtons';
import AppList from '../components/AppList';
import { ErrorToast } from '../components/ErrorDisplay';
import { MonitorIcon, ShieldIcon } from '../components/ui/Icons';

export const HomePage = () => {
  const { settings } = useSettings();
  const api = useApi();
  const { addError } = useErrorHandler();
  const [status, setStatus] = useState<'idle' | 'connected' | 'error'>('idle');
  const [lastMessage, setLastMessage] = useState<string>('');

  const isConfigured = !!settings.ip && !!settings.token;

  const runAction = async (action: 'shutdown' | 'restart' | 'lock') => {
    if (!isConfigured) {
      setStatus('error');
      setLastMessage('Configura IP y Token primero en la página de Configuración');
      addError('config', 'Configuración Incompleta', 'Configura IP y Token primero en la página de Configuración');
      return;
    }

    setStatus('idle');
    try {
      let result;
      switch (action) {
        case 'shutdown':
          result = await api.post('/api/shutdown');
          break;
        case 'restart':
          result = await api.post('/api/restart');
          break;
        case 'lock':
          result = await api.post('/api/lock');
          break;
      }

      if (result.success) {
        setStatus('connected');
        setLastMessage(`✅ ${action} ejecutado correctamente`);
      } else {
        setStatus('error');
        setLastMessage(`❌ Error: ${result.message}`);
        handleApiError(
          new Error(result.message),
          `POST /api/${action}`,
          addError,
          result.errorDetails
        );
      }
    } catch (error: any) {
      setStatus('error');
      setLastMessage(`❌ No se pudo conectar: ${error.message}`);
      handleApiError(error, `POST /api/${action}`, addError);
    }
  };

  const runAppAction = async (appName: string, action: 'open' | 'close') => {
    if (!isConfigured) {
      setStatus('error');
      setLastMessage('Configura IP y Token primero en la página de Configuración');
      addError('config', 'Configuración Incompleta', 'Configura IP y Token primero en la página de Configuración');
      return;
    }

    setStatus('idle');
    try {
      let result;
      if (action === 'open') {
        result = await api.post('/api/apps/open', { appName });
      } else {
        result = await api.post('/api/apps/close', { appName });
      }

      if (result.success) {
        setStatus('connected');
        setLastMessage(`✅ ${appName} ${action === 'open' ? 'abierto' : 'cerrado'}`);
      } else {
        setStatus('error');
        setLastMessage(`❌ Error: ${result.message}`);
        handleApiError(
          new Error(result.message),
          `POST /api/apps/${action}`,
          addError,
          result.errorDetails
        );
      }
    } catch (error: any) {
      setStatus('error');
      setLastMessage(`❌ No se pudo conectar: ${error.message}`);
      handleApiError(error, `POST /api/apps/${action}`, addError);
    }
  };

  const testConnection = async () => {
    if (!isConfigured) {
      setStatus('error');
      setLastMessage('Configura IP y Token primero');
      addError('config', 'Configuración Incompleta', 'Configura IP y Token primero');
      return;
    }

    setStatus('idle');
    try {
      const result = await api.get('/health');
      if (result.success) {
        setStatus('connected');
        setLastMessage('✅ Conexión exitosa con el PC');
      } else {
        setStatus('error');
        setLastMessage(`❌ ${result.message}`);
        handleApiError(
          new Error(result.message),
          'GET /health',
          addError,
          result.errorDetails
        );
      }
    } catch (error: any) {
      setStatus('error');
      setLastMessage(`❌ No se pudo conectar: ${error.message}`);
      handleApiError(error, 'GET /health', addError);
    }
  };

  return (
    <>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground/90 tracking-tight">
              PC Remote
            </h1>
            <p className="text-muted-foreground mt-1">
              Controla tu PC desde tu dispositivo móvil
            </p>
          </div>
          <div className="flex gap-3 mt-4 sm:mt-0">
            <button
              onClick={testConnection}
              disabled={!isConfigured}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <MonitorIcon className="w-4 h-4 mr-2" /> Test Conexión
            </button>
          </div>
        </div>

        {/* Connection status card */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-8 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                status === 'connected' ? 'bg-green-100' : status === 'error' ? 'bg-red-100' : 'bg-yellow-100'
              }`}>
                {status === 'connected' ? (
                  <MonitorIcon className="w-5 h-5 text-green-700" />
                ) : status === 'error' ? (
                  <ShieldIcon className="w-5 h-5 text-red-700" />
                ) : (
                  <MonitorIcon className="w-5 h-5 text-yellow-700" />
                )}
              </div>
              <div>
                <h2 className="font-semibold text-foreground">
                  {isConfigured ? (status === 'connected' ? 'Conectado' : 'Desconectado') : 'Sin configurar'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {isConfigured ? `${settings.ip}:5000` : 'Configura IP y Token en Configuración'}
                </p>
              </div>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                status === 'connected'
                  ? 'bg-green-100 text-green-700'
                  : status === 'error'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {status === 'connected' ? 'Online' : status === 'error' ? 'Error' : 'Inactivo'}
            </span>
          </div>
          {lastMessage && (
            <p className="mt-4 text-sm {status === 'error' ? 'text-red-600' : 'text-green-600'}">
              {lastMessage}
            </p>
          )}
        </div>

        {/* Configuration warning */}
        {!isConfigured && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 mb-8">
            <div className="flex items-start gap-3">
              <ShieldIcon className="w-5 h-5 text-yellow-700 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-800">Configuración requerida</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Ve a la página de <strong>Configuración</strong> e ingresa la IP de tu PC y el token de acceso
                  antes de usar los botones de control.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Power buttons */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Control de energía</h2>
          <PowerButtons
            onAction={runAction}
            disabled={!isConfigured}
          />
        </div>

        {/* App list */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Aplicaciones</h2>
          <AppList
            onOpenApp={(appName) => runAppAction(appName, 'open')}
            onCloseApp={(appName) => runAppAction(appName, 'close')}
            disabled={!isConfigured}
          />
        </div>
      </div>
    <ErrorToast />
    </>
  );
};
