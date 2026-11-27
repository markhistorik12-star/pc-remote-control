import { useState, useEffect } from 'react';

type LogEntry = {
  timestamp: string;
  type: string;
  url: string;
  method: string;
  headers: HeadersInit | undefined;
  status: number | string;
  error?: string;
};

export const DebugLogs = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  // Hook para interceptar todas las peticiones HTTP
  useEffect(() => {
    if (!isRecording) return;
    
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      const url = args[0];
      const options = args[1] || {};
      
      // Log every fetch call
      const logEntry = {
        timestamp: new Date().toISOString(),
        type: 'fetch',
        url: String(url),
        method: options.method || 'GET',
        headers: options.headers,
        status: 'pending'
      };
      
      setLogs(prev => [logEntry, ...prev].slice(0, 100));
      console.log('[FETCH LOG]', logEntry);
      
      return originalFetch.apply(this, args).then(response => {
        // Update log with response
        const responseLog = { ...logEntry, status: response.status };
        setLogs(prev => prev.map(l => l.timestamp === logEntry.timestamp ? responseLog : l));
        return response;
      }).catch(error => {
        const errorLog = { ...logEntry, status: 'error', error: error.message };
        setLogs(prev => prev.map(l => l.timestamp === logEntry.timestamp ? errorLog : l));
        throw error;
      });
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [isRecording]);

  const clearLogs = () => setLogs([]);
  const toggleRecording = () => setIsRecording(!isRecording);

  return (
    <div className="bg-card/90 border border-border/50 rounded-2xl p-4">
      <h3 className="text-lg font-semibold mb-3">📝 HTTP Request Logger</h3>
      
      <button 
        onClick={toggleRecording}
        className="px-4 py-2 bg-secondary text-white rounded-lg mb-4"
      >
        {isRecording ? 'Stop Recording' : 'Start Recording'}
      </button>
      
      <button 
        onClick={clearLogs}
        className="px-4 py-2 bg-muted text-white rounded-lg mb-4 ml-2"
      >
        Clear Logs
      </button>
      
      <div className="h-64 overflow-y-auto border border-border p-2 rounded text-xs font-mono">
        {logs.map((log, i) => (
          <div key={i} className={`mb-1 ${log.status === 'error' ? 'text-red-800' : log.status === '200' ? 'text-green-800' : 'text-yellow-600'}`}>
            <span>[{log.timestamp}]</span> <strong>{log.method}</strong> {log.url}
            {log.headers && <div className="text-gray-600">Headers: {JSON.stringify(log.headers)}</div>}
            {log.status !== 'pending' && <div>Status: {log.status}</div>}
            {log.error && <div className="text-red-600">Error: {log.error}</div>}
          </div>
        ))}
      </div>
    </div>
  );
};
