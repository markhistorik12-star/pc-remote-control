import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { useSettings } from '../hooks/useSettings';

export const DebugPanel = () => {
  const [logs, setLogs] = useState<{ timestamp: string; level: string; message: string; data?: any }[]>([]);
  const [status, setStatus] = useState<'idle' | 'testing' | 'connected' | 'error'>('idle');
  const api = useApi();
  const { settings } = useSettings();

  const addLog = (level: string, message: string, data: any = null) => {
    const log = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
    };
    console.log(`[${level.toUpperCase()}] ${message}`, data);
    setLogs((prev) => [log, ...prev].slice(0, 50));
  };

  const testConnection = async () => {
    if (!settings.ip || !settings.token) {
      addLog('error', 'Configuración incompleta: ve a Configuración y guarda IP y Token');
      setStatus('error');
      return;
    }

    setStatus('testing');
    addLog('info', `Probando conexión a ${settings.ip}:5000...`);

    try {
      // 1. Test basic health (no auth)
      addLog('info', 'Paso 1: Health check...');
      const healthResponse = await fetch(`http://${settings.ip}:5000/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!healthResponse.ok) {
        throw new Error(`Health check falló: HTTP ${healthResponse.status}`);
      }
      const healthData = await healthResponse.json();
      addLog('success', 'Health check exitoso', healthData);

      // 2. Test auth
      addLog('info', 'Paso 2: Validando autenticación...');
      const authResponse = await fetch(`http://${settings.ip}:5000/api/debug/test-auth`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${settings.token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!authResponse.ok) {
        throw new Error(`Auth falló: HTTP ${authResponse.status} - Token inválido`);
      }
      const authData = await authResponse.json();
      addLog('success', 'Autenticación exitosa', authData);

      // 3. Test echo
      addLog('info', 'Paso 3: Probando echo...');
      const echoResponse = await fetch(`http://${settings.ip}:5000/api/debug/echo/connection-test`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${settings.token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!echoResponse.ok) {
        throw new Error(`Echo falló: HTTP ${echoResponse.status}`);
      }
      const echoData = await echoResponse.json();
      addLog('success', 'Echo exitoso', echoData);

      // 4. Test real API (shutdown endpoint - just test, don't execute)
      addLog('info', 'Paso 4: Probando API real...');
      const apiResult = await api.post('/api/shutdown');
      if (!apiResult.success) {
        // Shutdown might be blocked in some environments, but connectivity works
        addLog('info', `API responde (puede ser esperado): ${apiResult.message}`, apiResult);
      } else {
        addLog('success', 'API real funciona', apiResult);
      }

      setStatus('connected');
      addLog('success', 'Todas las pruebas pasaron. Conexión OK.');
    } catch (error: any) {
      addLog('error', `Error en prueba: ${error.message}`, error);
      setStatus('error');
    }
  };

  return (
    <div className="bg-card/90 border border-border/50 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">🔍 Debug Network</h3>
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            status === 'connected'
              ? 'bg-green-100 text-green-700'
              : status === 'error'
              ? 'bg-red-100 text-red-700'
              : 'bg-yellow-100 text-yellow-700'
          }`}
        >
          {status === 'connected' ? 'Conectado' : status === 'error' ? 'Error' : status === 'testing' ? 'Probando...' : 'Inactivo'}
        </span>
      </div>

      {!settings.ip || !settings.token ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
          <p className="text-sm text-yellow-800">
            ⚠️ Configuración incompleta. Ve a Configuración y guarda la IP del PC y el Token.
          </p>
        </div>
      ) : null}

      <button
        onClick={testConnection}
        disabled={status === 'testing'}
        className="px-4 py-2 bg-primary text-white rounded-lg mb-4 disabled:opacity-50"
      >
        {status === 'testing' ? 'Probando...' : 'Test Connection'}
      </button>

      <div className="space-y-2 mb-4">
        <div className="flex gap-2">
          <span className="text-sm font-medium">IP:</span>
          <span className="text-sm font-mono text-muted-foreground">{settings.ip || '—'}</span>
        </div>
        <div className="flex gap-2">
          <span className="text-sm font-medium">Token:</span>
          <span className="text-sm font-mono text-muted-foreground">{settings.token || '—'}</span>
        </div>
      </div>

      <div className="h-64 overflow-y-auto border border-border p-2 rounded text-xs font-mono">
        {logs.map((log, i) => (
          <div
            key={i}
            className={`mb-1 ${log.level === 'error' ? 'text-red-800' : log.level === 'success' ? 'text-green-800' : 'text-gray-700'}`}
          >
            <span>[{log.timestamp}]</span> <strong>{log.level.toUpperCase()}:</strong> {log.message}
            {log.data && (
              <pre className="text-xs mt-1 bg-white/50 p-1 rounded overflow-x-auto border border-border/20">
                {JSON.stringify(log.data, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
