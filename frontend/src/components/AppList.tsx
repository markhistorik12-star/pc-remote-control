import { useState } from 'react';
import { PlayIcon, XIcon, AppIcon, ChevronDownIcon, FileTextIcon, TerminalIcon, MonitorIcon, ShieldIcon } from './ui/Icons';


interface AppListProps {
  onOpenApp: (appName: string) => void;
  onCloseApp: (appName: string) => void;
  disabled?: boolean;
}

const commonApps = [
  { name: 'notepad', label: 'Bloc de notas', icon: FileTextIcon },
  { name: 'calc', label: 'Calculadora', icon: AppIcon },
  { name: 'mspaint', label: 'Paint', icon: AppIcon },
  { name: 'cmd', label: 'Símbolo del sistema', icon: TerminalIcon },
  { name: 'powershell', label: 'PowerShell', icon: TerminalIcon },
  { name: 'explorer', label: 'Explorador', icon: MonitorIcon },
  { name: 'taskmgr', label: 'Administrador', icon: MonitorIcon },
  { name: 'control', label: 'Panel de control', icon: ShieldIcon },
];

export default function AppList({ onOpenApp, onCloseApp, disabled }: AppListProps) {
  const [customApp, setCustomApp] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const handleOpen = (app: string) => {
    if (app.trim()) onOpenApp(app.trim());
  };

  const handleClose = (app: string) => {
    if (app.trim()) onCloseApp(app.trim());
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customApp.trim()) {
      onOpenApp(customApp.trim());
      setCustomApp('');
      setShowCustom(false);
    }
  };

  return (
    <div className="bg-card/90 border border-border/50 rounded-2xl shadow-lg p-5 sm:p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-heading font-semibold text-foreground/90">Aplicaciones</h2>
        <button
          type="button"
          onClick={() => setShowCustom(!showCustom)}
          disabled={disabled}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground/80 bg-muted/50 hover:bg-muted/30 transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-expanded={showCustom}
        >
          <AppIcon className="w-4 h-4" aria-hidden="true" />
          <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${showCustom ? 'rotate-180' : ''}`} aria-hidden="true" />
          Añadir aplicación
        </button>
      </div>

      <div className="space-y-2 mb-5">
        {commonApps.map(({ name, label, icon: Icon }) => (
          <div 
            key={name} 
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/30 hover:bg-muted/10 transition-colors duration-200 border border-border/30"
          >
            <Icon className="w-5 h-5 text-muted-foreground/60 flex-shrink-0" aria-hidden="true" />
            <span className="text-sm font-medium text-foreground/80 flex-1 truncate">{label}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpen(name)}
                disabled={disabled}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-primary/90 hover:bg-primary/80 active:bg-primary/70 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-h-[36px] min-w-[36px]"
                aria-label={`Abrir ${label}`}
              >
                <PlayIcon className="w-3 h-3" aria-hidden="true" />
                <span className="hidden sm:inline">Abrir</span>
              </button>
              <button
                onClick={() => handleClose(name)}
                disabled={disabled}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted/50 hover:bg-muted/20 active:bg-muted/10 text-foreground/80 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[36px] min-w-[36px]"
                aria-label={`Cerrar ${label}`}
              >
                <XIcon className="w-3 h-3" aria-hidden="true" />
                <span className="hidden sm:inline">Cerrar</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {showCustom && (
        <form onSubmit={handleCustomSubmit} className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex gap-2">
            <label htmlFor="custom-app" className="sr-only">Nombre de la aplicación</label>
            <input
              type="text"
              id="custom-app"
              value={customApp}
              onChange={(e) => setCustomApp(e.target.value)}
              placeholder="Ej: notepad.exe, chrome, code..."
              disabled={disabled}
              className="flex-1 px-4 py-3 rounded-xl border border-border/50 bg-background/50 text-foreground/90 placeholder:text-muted-foreground/50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:border-transparent disabled:opacity-40 disabled:cursor-not-allowed min-h-[48px]"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="submit"
              disabled={disabled || !customApp.trim()}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium text-white bg-accent/90 hover:bg-accent/80 active:bg-accent/70 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 min-h-[48px] min-w-[48px]"
              aria-label="Abrir aplicación personalizada"
            >
              <PlayIcon className="w-4 h-4" aria-hidden="true" />
              <span>Abrir</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}