interface PowerButtonsProps {
  onAction: (action: 'shutdown' | 'restart' | 'lock') => void;
  disabled?: boolean;
}

export default function PowerButtons({ onAction, disabled }: PowerButtonsProps) {
  const buttons = [
    { action: 'shutdown' as const, label: 'Shutdown', icon: '⏻', color: 'bg-red-500 hover:bg-red-600' },
    { action: 'restart' as const, label: 'Restart', icon: '⟳', color: 'bg-blue-500 hover:bg-blue-600' },
    { action: 'lock' as const, label: 'Lock', icon: '🔒', color: 'bg-gray-500 hover:bg-gray-600' },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {buttons.map(({ action, label, icon, color }) => (
        <button
          key={action}
          onClick={() => onAction(action)}
          disabled={disabled}
          className={`${color} text-white py-4 px-6 rounded-xl font-semibold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex flex-col items-center gap-2`}
        >
          <span className="text-3xl">{icon}</span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}