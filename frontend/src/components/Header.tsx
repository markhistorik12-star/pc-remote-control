import { SettingsIcon } from './ui/Icons';
import { colors } from './ui/Theme';

interface HeaderProps {
  onSettingsClick: () => void;
}

export default function Header({ onSettingsClick }: HeaderProps) {
  return (
    <header className="flex justify-between items-center mb-6 sm:mb-8">
      <h1 className="text-2xl sm:text-3xl font-heading font-semibold text-foreground/90 tracking-tight">
        PC Remote
      </h1>
      <button
        onClick={onSettingsClick}
        className="p-3 rounded-xl bg-card/80 border border-border/50 hover:bg-muted/50 hover:border-primary/30 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label="Configuración"
      >
        <SettingsIcon className="w-5 h-5 text-muted-foreground/80" />
      </button>
    </header>
  );
}