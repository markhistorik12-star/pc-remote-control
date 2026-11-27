import { PowerIcon, RestartIcon, LockIcon, MoonIcon } from './ui/Icons';

interface PowerButtonsProps {
  onAction: (action: 'shutdown' | 'restart' | 'lock' | 'suspend') => void;
  disabled?: boolean;
}

const buttons = [
  { action: 'shutdown' as const, label: 'Apagar', icon: PowerIcon, tone: 'text-destructive' },
  { action: 'restart' as const, label: 'Reiniciar', icon: RestartIcon, tone: 'text-primary' },
  { action: 'suspend' as const, label: 'Suspender', icon: MoonIcon, tone: 'text-indigo-400' },
  { action: 'lock' as const, label: 'Bloquear', icon: LockIcon, tone: 'text-accent' },
];

export default function PowerButtons({ onAction, disabled }: PowerButtonsProps) {
  return (
    <div
      className="grid grid-cols-4 rounded-2xl border border-border bg-card divide-x divide-border overflow-hidden"
      role="group"
      aria-label="Acciones de energía"
    >
      {buttons.map(({ action, label, icon: Icon, tone }) => (
        <button
          key={action}
          type="button"
          onClick={() => onAction(action)}
          disabled={disabled}
          aria-label={label}
          className="py-4 flex flex-col items-center gap-1.5 active:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Icon className={`w-6 h-6 ${tone}`} aria-hidden="true" />
          <span className="text-xs text-foreground/80">{label}</span>
        </button>
      ))}
    </div>
  );
}
