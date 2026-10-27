import { useState } from 'react';

interface AppListProps {
  onOpenApp: (appName: string) => void;
  onCloseApp: (appName: string) => void;
  disabled?: boolean;
}

const commonApps = [
  'notepad',
  'calc',
  'mspaint',
  'cmd',
  'powershell',
  'explorer',
  'taskmgr',
  'control',
];

export default function AppList({ onOpenApp, onCloseApp, disabled }: AppListProps) {
  const [customApp, setCustomApp] = useState('');

  const handleOpen = (app: string) => {
    if (app.trim()) onOpenApp(app.trim());
  };

  const handleClose = (app: string) => {
    if (app.trim()) onCloseApp(app.trim());
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Applications</h2>
      
      <div className="flex flex-wrap gap-2 mb-4">
        {commonApps.map((app) => (
          <div key={app} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2">
            <span className="text-sm font-mono text-gray-700 dark:text-gray-300">{app}</span>
            <button
              onClick={() => handleOpen(app)}
              disabled={disabled}
              className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              Open
            </button>
            <button
              onClick={() => handleClose(app)}
              disabled={disabled}
              className="text-xs px-2 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
            >
              Close
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={customApp}
          onChange={(e) => setCustomApp(e.target.value)}
          placeholder="Enter app name (e.g., notepad.exe)"
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={disabled}
        />
        <button
          onClick={() => handleOpen(customApp)}
          disabled={disabled || !customApp.trim()}
          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          Open
        </button>
        <button
          onClick={() => handleClose(customApp)}
          disabled={disabled || !customApp.trim()}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          Close
        </button>
      </div>
    </div>
  );
}