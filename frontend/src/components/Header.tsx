import { SettingsIcon } from './ui/Icons';

interface HeaderProps {
  onSettingsClick: () => void;
}

export default function Header({ onSettingsClick }: HeaderProps) {
  return (
    <header className="flex justify-between items-center mb-8">
      <h1 className="text-2xl font-heading font-semibold text-foreground tracking-tight">
        PC Remote
      </h1>
      <button
        onClick={onSettingsClick}
        className="p-3 rounded-xl bg-card border border-border hover:bg-muted hover:border-primary/50 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label="Settings"
      >
        <SettingsIcon className="w-5 h-5 text-muted-foreground" />
      </button>
    </header>
  );
}