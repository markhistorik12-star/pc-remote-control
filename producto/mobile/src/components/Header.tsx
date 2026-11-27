import { DevicesIcon, PaletteIcon, PlusIcon } from './ui/Icons';

interface HeaderProps {
  activeProfileName?: string;
  profileCount: number;
  onOpenThemes: () => void;
  onOpenProfiles: () => void;
  onAddDevice: () => void;
}

export default function Header({
  activeProfileName,
  profileCount,
  onOpenThemes,
  onOpenProfiles,
  onAddDevice,
}: HeaderProps) {
  return (
    <header className="flex justify-between items-end mb-4 pt-2 gap-3">
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.18em] text-primary mb-0.5 truncate">
          {activeProfileName ? `Equipo activo · ${activeProfileName}` : 'Control remoto universal'}
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight truncate">
          PC Remote Hub
        </h1>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          type="button"
          onClick={onOpenThemes}
          className="w-10 h-10 flex items-center justify-center rounded-xl border border-border bg-card text-muted-foreground active:bg-muted transition-colors"
          aria-label="Temas de colores"
        >
          <PaletteIcon className="w-4 h-4 text-primary" />
        </button>
        <button
          type="button"
          onClick={onOpenProfiles}
          className="h-10 px-2.5 flex items-center gap-1.5 rounded-xl border border-border bg-card active:bg-muted transition-colors"
          aria-label="Mis dispositivos"
        >
          <DevicesIcon className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">{profileCount}</span>
        </button>
        <button
          type="button"
          onClick={onAddDevice}
          className="w-10 h-10 flex items-center justify-center rounded-xl border border-primary/40 bg-primary/15 text-primary active:bg-primary/25 transition-colors"
          aria-label="Agregar nuevo dispositivo"
        >
          <PlusIcon className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
