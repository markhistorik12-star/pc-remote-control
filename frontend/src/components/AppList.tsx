import type { ComponentType } from 'react';
import {
  NotepadTile, CalcTile, PaintTile, CmdTile, PowerShellTile,
  ExplorerTile, TaskMgrTile, ControlTile, SteamTile, BraveTile,
} from './ui/AppIcons';

interface AppListProps {
  onOpenApp: (appName: string) => void;
  onCloseApp: (appName: string) => void;
  disabled?: boolean;
}

const commonApps: { name: string; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { name: 'notepad', label: 'Bloc de notas', icon: NotepadTile },
  { name: 'calc', label: 'Calculadora', icon: CalcTile },
  { name: 'mspaint', label: 'Paint', icon: PaintTile },
  { name: 'cmd', label: 'Símbolo del sistema', icon: CmdTile },
  { name: 'powershell', label: 'PowerShell', icon: PowerShellTile },
  { name: 'explorer', label: 'Explorador', icon: ExplorerTile },
  { name: 'taskmgr', label: 'Administrador', icon: TaskMgrTile },
  { name: 'control', label: 'Panel de control', icon: ControlTile },
  { name: 'steam', label: 'Steam', icon: SteamTile },
  { name: 'brave', label: 'Brave', icon: BraveTile },
];

export default function AppList({ onOpenApp, onCloseApp, disabled }: AppListProps) {
  return (
    <section>
      <h2 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3 px-1">
        Aplicaciones
      </h2>

      <ul className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
        {commonApps.map(({ name, label, icon: Icon }) => (
          <li key={name} className="flex items-center gap-3 pl-3 pr-2 py-2.5">
            <Icon className="w-10 h-10 flex-shrink-0" />
            <span className="text-[15px] text-foreground flex-1 truncate">{label}</span>
            <button
              onClick={() => onOpenApp(name)}
              disabled={disabled}
              aria-label={`Abrir ${label}`}
              className="px-3.5 h-9 rounded-lg text-[13px] font-semibold bg-primary text-primary-foreground active:brightness-90 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Abrir
            </button>
            <button
              onClick={() => onCloseApp(name)}
              disabled={disabled}
              aria-label={`Cerrar ${label}`}
              className="px-3.5 h-9 rounded-lg text-[13px] font-medium border border-border text-muted-foreground active:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Cerrar
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
