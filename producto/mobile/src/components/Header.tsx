import { DevicesIcon, PlusIcon } from './ui/Icons';

interface HeaderProps {
  activeProfileName?: string;
  profileCount: number;
  onOpenProfiles: () => void;
  onAddDevice: () => void;
}

export default function Header({
  activeProfileName,
  profileCount,
  onOpenProfiles,
  onAddDevice,
}: HeaderProps) {
  return (
    <header className="flex justify-between items-end mb-4 pt-2 gap-3">
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.18em] text-primary mb-0.5 truncate">
          {activeProfileName ? `Equipo activo · ${activeProfileName}` : 'Control remoto universal'}
        </p>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">PC Remote Hub</h1>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={onOpenProfiles}
          className="h-11 px-3 flex items-center gap-2 rounded-xl border border-border bg-card active:bg-muted transition-colors"
          aria-label="Mis dispositivos"
        >
          <DevicesIcon className="w-5 h-5 text-primary" />
          <span className="text-xs font-semibold text-foreground">{profileCount}</span>
        </button>
        <button
          type="button"
          onClick={onAddDevice}
          className="w-11 h-11 flex items-center justify-center rounded-xl border border-primary/40 bg-primary/15 text-primary active:bg-primary/25 transition-colors"
          aria-label="Agregar nuevo dispositivo"
        >
          <PlusIcon className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
