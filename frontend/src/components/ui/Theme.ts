export const colors = {
  // Dark mode palette - accessible and professional
  background: 'hsl(240 10% 3.9%)',
  foreground: 'hsl(210 40% 98%)',
  card: 'hsl(240 10% 4%)',
  cardForeground: 'hsl(210 40% 98%)',
  popover: 'hsl(240 10% 4%)',
  popoverForeground: 'hsl(210 40% 98%)',
  primary: 'hsl(262.1 83.3% 57.8%)', // Purple/blue - accessible
  primaryForeground: 'hsl(210 40% 98%)',
  secondary: 'hsl(210 40% 10%)',
  secondaryForeground: 'hsl(210 40% 98%)',
  muted: 'hsl(210 40% 6%)',
  mutedForeground: 'hsl(210 40% 70%)',
  accent: 'hsl(210 40% 12%)',
  accentForeground: 'hsl(210 40% 98%)',
  destructive: 'hsl(0 84.2% 60.2%)',
  destructiveForeground: 'hsl(210 40% 98%)',
  border: 'hsl(210 40% 15%)',
  input: 'hsl(210 40% 15%)',
  ring: 'hsl(262.1 83.3% 57.8%)',
};

export const spacing = {
  // Consistent spacing scale for touch targets
  1: '0.25rem',  // 4px
  2: '0.5rem',   // 8px
  3: '0.75rem',  // 12px
  4: '1rem',     // 16px
  5: '1.5rem',   // 24px
  6: '2rem',     // 32px
  7: '2.5rem',   // 40px
  8: '3rem',     // 48px
} as const;

export const borderRadius = {
  sm: '0.5rem',  // 8px
  DEFAULT: '0.75rem', // 12px
  lg: '1rem',    // 16px
  xl: '1.5rem',  // 24px
} as const;