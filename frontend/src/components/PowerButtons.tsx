import { PowerIcon, RestartIcon, LockIcon } from './ui/Icons';
import { colors, spacing, borderRadius } from './ui/Theme';

interface PowerButtonsProps {
  onAction: (action: 'shutdown' | 'restart' | 'lock') => void;
  disabled?: boolean;
}

const buttons = [
  { 
    action: 'shutdown' as const,
    label: 'Apagar',
    icon: PowerIcon,
    color: 'bg-destructive/95 hover:bg-destructive/90 active:bg-destructive/85',
    focusRing: 'focus-visible:ring-destructive/50',
    iconColor: 'text-destructive-foreground'
  },
  { 
    action: 'restart' as const,
    label: 'Reiniciar',
    icon: RestartIcon,
    color: 'bg-primary/95 hover:bg-primary/90 active:bg-primary/85',
    focusRing: 'focus-visible:ring-primary/50',
    iconColor: 'text-primary-foreground'
  },
  { 
    action: 'lock' as const,
    label: 'Bloquear',
    icon: LockIcon,
    color: 'bg-muted/80 hover:bg-muted/70 active:bg-muted/60',
    focusRing: 'focus-visible:ring-ring/50',
    iconColor: 'text-muted-foreground'
  },
] as const;

export default function PowerButtons({ onAction, disabled }: PowerButtonsProps) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:gap-4" role="group" aria-label="Power actions">
      {buttons.map(({ action, label, icon: Icon, color, focusRing, iconColor }) => (
        <button
          key={action}
          onClick={() => onAction(action)}
          disabled={disabled}
          className={`
            ${color} ${focusRing}
            text-white text-sm font-medium font-medium
            min-h-[56px] min-w-[56px] sm:min-h-[64px] sm:min-w-[64px]
            rounded-2xl
            flex flex-col items-center justify-center gap-2
            transition-all duration-200 ease-out
            disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none
            shadow-lg hover:shadow-xl active:scale-[0.98]
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
            ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
          `}
          aria-label={label}
        >
          <Icon className={`w-6 h-6 sm:w-7 sm:h-7 ${iconColor}`} aria-hidden="true" />
          <span className="text-xs sm:text-sm font-medium leading-tight">{label}</span>
        </button>
      ))}
    </div>
  );
}