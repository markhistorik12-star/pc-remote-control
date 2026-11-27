import { SettingsIcon } from './ui/Icons';

interface HeaderProps {
  onSettingsClick: () => void;
}

export default function Header({ onSettingsClick }: HeaderProps) {
  return (
    <header className="flex justify-between items-end mb-6 pt-2">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-primary mb-0.5">Control remoto</p>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">PC Remote</h1>
      </div>
      <button
        onClick={onSettingsClick}
        className="w-11 h-11 flex items-center justify-center rounded-xl border border-border bg-card active:bg-muted"
        aria-label="Configuración"
      >
        <SettingsIcon className="w-5 h-5 text-muted-foreground" />
      </button>
    </header>
  );
}
