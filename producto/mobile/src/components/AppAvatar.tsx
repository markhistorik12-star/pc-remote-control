import { useEffect, useState } from 'react';

interface AppAvatarProps {
  name: string;
  iconUrl?: string | null;
  sizeClass?: string;
}

const fallbackGradients = [
  'from-sky-500/80 to-blue-700/80',
  'from-violet-500/80 to-indigo-700/80',
  'from-emerald-500/80 to-teal-700/80',
  'from-amber-500/80 to-orange-700/80',
  'from-rose-500/80 to-pink-700/80',
  'from-cyan-500/80 to-blue-600/80',
];

function pickGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return fallbackGradients[Math.abs(hash) % fallbackGradients.length];
}

export default function AppAvatar({ name, iconUrl, sizeClass = 'w-11 h-11' }: AppAvatarProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [iconUrl]);

  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() || '')
      .join('') || 'AP';

  if (iconUrl && !failed) {
    return (
      <div
        className={`${sizeClass} rounded-xl bg-muted/75 border border-border p-1.5 flex items-center justify-center flex-shrink-0 shadow-inner`}
      >
        <img
          src={iconUrl}
          alt=""
          onError={() => setFailed(true)}
          className="w-full h-full object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)]"
          loading="lazy"
          decoding="async"
        />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-xl bg-gradient-to-br ${pickGradient(
        name
      )} border border-white/15 flex items-center justify-center text-xs font-bold text-white shadow-inner flex-shrink-0`}
    >
      {initials}
    </div>
  );
}
