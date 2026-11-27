import type { ReactNode } from 'react';

// Iconos propios de cada aplicación: cada uno es un "tile" con su color y dibujo.
type P = { className?: string };

function Tile({ bg, children, className = '' }: { bg: string; children: ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <rect width="40" height="40" rx="10" fill={bg} />
      {children}
    </svg>
  );
}

export const NotepadTile = (p: P) => (
  <Tile bg="#2B3A4A" {...p}>
    <rect x="10" y="8" width="20" height="25" rx="2.5" fill="#E9E4D4" />
    <rect x="10" y="8" width="20" height="5" rx="2" fill="#5AA9E6" />
    <path d="M14 18h12M14 22h12M14 26h7" stroke="#8A8472" strokeWidth="1.6" strokeLinecap="round" />
  </Tile>
);

export const CalcTile = (p: P) => (
  <Tile bg="#26332B" {...p}>
    <rect x="10" y="8" width="20" height="25" rx="3" fill="#161C18" stroke="#6FCF97" strokeWidth="1.4" />
    <rect x="13" y="11" width="14" height="6" rx="1.5" fill="#6FCF97" />
    {[0, 1, 2].map((r) =>
      [0, 1, 2].map((c) => (
        <circle key={`${r}${c}`} cx={15 + c * 5} cy={22 + r * 4.2} r="1.5" fill="#B8E6C9" />
      ))
    )}
  </Tile>
);

export const PaintTile = (p: P) => (
  <Tile bg="#3A2A33" {...p}>
    <path
      d="M20 8c-7 0-12 4.7-12 11 0 5 3.800 8.500 8.500 8.500 2 0 2.500-1.300 1.700-2.600-.9-1.500.1-3.400 1.900-3.400H27c2.800 0 5-1.800 5-4.700C32 11.600 27 8 20 8z"
      fill="#F2D6B3"
    />
    <circle cx="14" cy="17" r="2" fill="#E5534B" />
    <circle cx="19" cy="13" r="2" fill="#F2C94C" />
    <circle cx="25" cy="14" r="2" fill="#4C9AE5" />
    <circle cx="13.500" cy="22.500" r="2" fill="#56B87A" />
  </Tile>
);

export const CmdTile = (p: P) => (
  <Tile bg="#111111" {...p}>
    <rect x="7" y="9" width="26" height="22" rx="3" fill="none" stroke="#3C3C3C" strokeWidth="1.5" />
    <path d="M12 16l5 4-5 4" fill="none" stroke="#E8E8E8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M20 25h8" stroke="#E8E8E8" strokeWidth="2" strokeLinecap="round" />
  </Tile>
);

export const PowerShellTile = (p: P) => (
  <Tile bg="#14284A" {...p}>
    <path d="M9 12.500c0-.8.700-1.500 1.500-1.500h21.500c.9 0 1.500.8 1.300 1.700l-3.800 16c-.2.800-.9 1.300-1.700 1.300H8z" fill="#2B5FA8" />
    <path d="M15 16l7 5-7 5" fill="none" stroke="#fff" strokeWidth="2.200" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M23 26h6" stroke="#fff" strokeWidth="2.200" strokeLinecap="round" />
  </Tile>
);

export const ExplorerTile = (p: P) => (
  <Tile bg="#3A3220" {...p}>
    <path d="M7 14c0-1.100.9-2 2-2h7l3 3h12c1.100 0 2 .9 2 2v11c0 1.100-.9 2-2 2H9c-1.100 0-2-.9-2-2z" fill="#E6B84A" />
    <path d="M7 19h26v10c0 1.100-.9 2-2 2H9c-1.100 0-2-.9-2-2z" fill="#F4CF6E" />
  </Tile>
);

export const TaskMgrTile = (p: P) => (
  <Tile bg="#1E2E33" {...p}>
    <rect x="7" y="9" width="26" height="22" rx="3" fill="#10191C" stroke="#3D8F9E" strokeWidth="1.4" />
    <path d="M10 25l5-6 4 3 5-8 6 6" fill="none" stroke="#5CD0E0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Tile>
);

export const ControlTile = (p: P) => (
  <Tile bg="#2C2C38" {...p}>
    <g stroke="#9DA3D6" strokeWidth="2" strokeLinecap="round">
      <path d="M10 14h20M10 20h20M10 26h20" />
    </g>
    <circle cx="25" cy="14" r="3" fill="#C9CDF5" />
    <circle cx="14" cy="20" r="3" fill="#C9CDF5" />
    <circle cx="23" cy="26" r="3" fill="#C9CDF5" />
  </Tile>
);

export const SteamTile = (p: P) => (
  <Tile bg="#16222F" {...p}>
    <circle cx="20" cy="20" r="12" fill="#2A475E" />
    <circle cx="25" cy="16" r="4.500" fill="none" stroke="#C7D5E0" strokeWidth="2" />
    <circle cx="14.500" cy="24.500" r="3" fill="none" stroke="#C7D5E0" strokeWidth="2" />
    <path d="M16.800 23.200l5.200-4.200" stroke="#C7D5E0" strokeWidth="2.200" strokeLinecap="round" />
  </Tile>
);

export const BraveTile = (p: P) => (
  <Tile bg="#3A2118" {...p}>
    <path d="M20 7l9 3.200 2.300 5.200-1.800 11L20 33l-9.500-6.600-1.800-11L11 10.200z" fill="#FB542B" />
    <path d="M20 14.500l4 1.500-1.500 3-2.500 1.200-2.500-1.200L16 16z" fill="#fff" />
    <path d="M17.500 24.500l2.500 1.500 2.500-1.500" fill="none" stroke="#fff" strokeWidth="1.800" strokeLinecap="round" strokeLinejoin="round" />
  </Tile>
);

export const SpotifyTile = (p: P) => (
  <Tile bg="#132A1C" {...p}>
    <circle cx="20" cy="20" r="12" fill="#1DB954" />
    <g fill="none" stroke="#132A1C" strokeLinecap="round">
      <path d="M13 16.5c4.5-1.4 9.8-1 14 1.2" strokeWidth="2.2" />
      <path d="M14.2 20.5c3.7-1.1 8.1-.8 11.5 1" strokeWidth="1.9" />
      <path d="M15.4 24.3c3-.8 6.4-.6 9.1.8" strokeWidth="1.6" />
    </g>
  </Tile>
);
