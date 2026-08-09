export const colors = {
  green: '#2d5016',
  greenLight: '#3d6a20',
  greenMuted: '#f0fdf4',
  greenBorder: '#bbf7d0',
  amber: '#d97706',
  amberMuted: '#fffbeb',
  amberBorder: '#fde68a',
  up: '#16a34a',
  down: '#dc2626',
  bg: '#f8fafc',
  card: '#ffffff',
  border: '#e5e7eb',
  divider: '#f3f4f6',
  inputBg: '#f3f4f6',
  text1: '#1f2937',
  text2: '#374151',
  text3: '#6b7280',
  text4: '#9ca3af',
  white: '#ffffff',
} as const;

export const confidenceColor = (pct: number): string => {
  if (pct >= 70) return colors.up;
  if (pct >= 40) return colors.amber;
  return colors.down;
};
