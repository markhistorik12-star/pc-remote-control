import type { ProfileIconKey } from '../hooks/useSettings';
import { MonitorIcon, LaptopIcon, GamepadIcon, ServerIcon } from './ui/Icons';

export const PROFILE_ICON_OPTIONS: Array<{
  key: ProfileIconKey;
  label: string;
}> = [
  { key: 'desktop', label: 'Escritorio' },
  { key: 'laptop', label: 'Portátil' },
  { key: 'gaming', label: 'Gaming' },
  { key: 'work', label: 'Trabajo' },
];

const TONE_MAP: Record<ProfileIconKey, string> = {
  desktop: 'bg-primary/15 text-primary border-primary/30',
  laptop: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  gaming: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  work: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
};

export function ProfileIconGlyph({
  icon,
  className = 'w-5 h-5',
}: {
  icon: ProfileIconKey;
  className?: string;
}) {
  switch (icon) {
    case 'laptop':
      return <LaptopIcon className={className} />;
    case 'gaming':
      return <GamepadIcon className={className} />;
    case 'work':
      return <ServerIcon className={className} />;
    default:
      return <MonitorIcon className={className} />;
  }
}

export default function ProfileAvatar({
  icon,
  size = 'md',
}: {
  icon: ProfileIconKey;
  size?: 'sm' | 'md';
}) {
  const box = size === 'sm' ? 'w-8 h-8 rounded-lg' : 'w-10 h-10 rounded-xl';
  const glyph = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <div
      className={`${box} border flex items-center justify-center flex-shrink-0 ${
        TONE_MAP[icon] || TONE_MAP.desktop
      }`}
    >
      <ProfileIconGlyph icon={icon} className={glyph} />
    </div>
  );
}
