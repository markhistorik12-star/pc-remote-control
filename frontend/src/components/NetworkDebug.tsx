import { useState } from 'react';
import { useSettings } from '../hooks/useSettings';

export const NetworkDebug = () => {
  const [results, setResults] = useState<{
    testName: string;
    success: boolean;
    data?: any;
    error?: string;
    timestamp: string;
  }[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const { settings } = useSettings();

  const addResult = (
    testName: string,
    success: boolean,
    data: any = null,
    error: string | undefined = undefined
  ) => {
    setResults((prev) => [
      { testName, success, data, error, timestamp: new Date().toISOString() },
      ...prev.slice(0, 20),
    ]);
  };

  const runAllTests = async () => {
    if (!settings.ip || !settings.token) {
      addResult('Configuración', false, null, 'IP y Token requeridos en Configuración');
      setIsTesting(false);
      return;
    }

    setIsTesting(true);
    const baseUrl = `http://${settings.ip}:5000`;
    const headers = {
      Authorization: `Bearer ${settings.token}`,
      'Content-Type': 'application/json',
    };

    // 1. Test basic health (no auth)
    try {
      addResult(
        'Health Check',
        true,
        await fetch(`${baseUrl}/health`, { method: 'GET' }).then((r) => r.json())
      );
    } catch (e: any) {
      addResult('Health Check', false, null, e.message);
    }

    // 2. Test auth
    try {
      addResult(
        'Auth Test',
        true,
        await fetch(`${baseUrl}/api/debug/test-auth`, { headers }).then((r) => r.json())
      );
    } catch (e: any) {
      addResult('Auth Test', false, null, e.message);
    }

    // 3. Test echo
    try {
      addResult(
        'Echo Test',
        true,
        await fetch(`${baseUrl}/api/debug/echo/network-debug`, { headers }).then((r) =>
          r.json()
        )
      );
    } catch (e: any) {
      addResult('Echo Test', false, null, e.message);
    }

    // 4. Test real API endpoint
    try {
      const response = await fetch(`${baseUrl}/api/debug/health`, {
        headers,
      });
      addResult('Debug Health', response.ok, null, response.ok ? undefined : `HTTP ${response.status}`);
    } catch (e: any) {
      addResult('Debug Health', false, null, e.message);
    }

    setIsTesting(false);
  };

  return (
    <div className="bg-card/90 border border-border/50 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">🔍 Network Debug</h3>
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            !settings.ip || !settings.token ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'
          }`}
        >
          {settings.ip && settings.token ? 'Listo' : 'Sin configurar'}
        </span>
      </div>

      {!settings.ip || !settings.token ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
          <p className="text-sm text-yellow-800">
            ⚠️ Ve a Configuración y guarda la IP del PC y el Token antes de probar.
          </p>
        </div>
      ) : null}

      <button
        onClick={runAllTests}
        disabled={isTesting || !settings.ip || !settings.token}
        className="px-4 py-2 bg-primary text-white rounded-lg mb-4 disabled:opacity-50"
      >
        {isTesting ? 'Probando...' : 'Run All Tests'}
      </button>

      <div className="space-y-2">
        {results.map((result, i) => (
          <div
            key={i}
            className={`p-2 rounded border ${
              result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
            }`}
          >
            <div className="font-medium">{result.testName}</div>
            <div className="text-xs mt-1">
              {result.success ? (
                <span className="text-green-700">✅ Success</span>
              ) : (
                <span className="text-red-700">❌ Failed: {result.error}</span>
              )}
            </div>
            {result.data && (
              <pre className="text-xs mt-1 bg-white p-1 rounded overflow-x-auto">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            )}
            <div className="text-xs text-gray-500 mt-1">{result.timestamp}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
