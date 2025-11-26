export type ThemeColor = 'rose' | 'ocean' | 'purple' | 'emerald' | 'amber' | 'sunset';

export type ThemeMode = 'light' | 'dark';

export interface Theme {
  mode: ThemeMode;
  color: ThemeColor;
  primary: string;
  primaryLight: string;
  background: string;
  backgroundSecondary: string;
  card: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  divider: string;
  headerText: string;
  headerTextSecondary: string;
  headerOverlay: string;
  shadow: string;
}

export const themeColors: Record<ThemeColor, { primary: string; primaryLight: string; name: string; premium: boolean }> = {
  rose: {
    primary: '#F43F5E',
    primaryLight: '#FB7185',
    name: 'Rose',
    premium: false,
  },
  ocean: {
    primary: '#3B82F6',
    primaryLight: '#60A5FA',
    name: 'Ocean',
    premium: false,
  },
  purple: {
    primary: '#8B5CF6',
    primaryLight: '#A78BFA',
    name: 'Purple',
    premium: true,
  },
  emerald: {
    primary: '#10B981',
    primaryLight: '#34D399',
    name: 'Emerald',
    premium: true,
  },
  amber: {
    primary: '#F59E0B',
    primaryLight: '#FBBF24',
    name: 'Amber',
    premium: true,
  },
  sunset: {
    primary: '#F97316',
    primaryLight: '#FB923C',
    name: 'Sunset',
    premium: true,
  },
};

const lightMode = {
  background: '#F9FAFB',
  backgroundSecondary: '#F3F4F6',
  card: '#FFFFFF',
  text: '#111827',
  textSecondary: '#374151',
  textMuted: '#6B7280',
  border: 'rgba(0, 0, 0, 0.06)',
  divider: '#E5E7EB',
  headerText: '#FFFFFF',
  headerTextSecondary: 'rgba(255, 255, 255, 0.85)',
  headerOverlay: 'rgba(255, 255, 255, 0.2)',
  shadow: '#000000',
};

const darkMode = {
  background: '#0F172A',
  backgroundSecondary: '#1E293B',
  card: '#1E293B',
  text: '#F9FAFB',
  textSecondary: '#E5E7EB',
  textMuted: '#9CA3AF',
  border: 'rgba(255, 255, 255, 0.1)',
  divider: '#334155',
  headerText: '#FFFFFF',
  headerTextSecondary: 'rgba(255, 255, 255, 0.85)',
  headerOverlay: 'rgba(255, 255, 255, 0.15)',
  shadow: '#000000',
};

export function buildTheme(color: ThemeColor, mode: ThemeMode): Theme {
  const colorPalette = themeColors[color];
  const modeColors = mode === 'light' ? lightMode : darkMode;
  
  return {
    mode,
    color,
    primary: colorPalette.primary,
    primaryLight: colorPalette.primaryLight,
    ...modeColors,
  };
}

export const defaultTheme = buildTheme('rose', 'light');