import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkSubscription } from '../services/purchases';
import { Theme, ThemeColor, ThemeMode, ThemeModePreference, buildTheme, themeColors } from './themes';

interface ThemeContextType {
  theme: Theme;
  themeColor: ThemeColor;
  themeMode: ThemeModePreference;
  resolvedMode: ThemeMode;
  isPremium: boolean;
  setThemeColor: (color: ThemeColor) => void;
  setThemeMode: (mode: ThemeModePreference) => void;
  toggleDarkMode: () => void; // overrides system if currently system
  refreshPremiumStatus: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_COLOR_KEY = '@theme_color';
const THEME_MODE_KEY = '@theme_mode';

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null

  const [themeColor, setThemeColorState] = useState<ThemeColor>('rose');
  const [themeMode, setThemeModeState] = useState<ThemeModePreference>('system');
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const effectiveMode: ThemeMode =
  themeMode === 'system'
    ? (systemScheme === 'dark' ? 'dark' : 'light')
    : themeMode;


  useEffect(() => {
    loadPreferences();
    checkPremiumStatus();
  }, []);

  const loadPreferences = async () => {
    try {
      const [savedColor, savedMode] = await Promise.all([
        AsyncStorage.getItem(THEME_COLOR_KEY),
        AsyncStorage.getItem(THEME_MODE_KEY),
      ]);

      if (savedColor && isValidThemeColor(savedColor)) {
        setThemeColorState(savedColor as ThemeColor);
      }

      if (savedMode && (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system')) {
        setThemeModeState(savedMode as ThemeMode);
      }
    } catch (error) {
      console.error('Error loading theme preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkPremiumStatus = async () => {
    try {
      const hasPremium = await checkSubscription();
      setIsPremium(hasPremium);
    } catch (error) {
      console.error('Error checking premium status:', error);
      setIsPremium(false);
    }
  };

  const refreshPremiumStatus = async () => {
    await checkPremiumStatus();
  };

  const isValidThemeColor = (color: string): boolean => {
    return color in themeColors;
  };

  const setThemeColor = async (color: ThemeColor) => {
    const colorData = themeColors[color];

    if (!colorData) {
      console.error('Invalid theme color:', color);
      return;
    }

    if (colorData.premium && !isPremium) {
      console.warn('Premium theme requires subscription');
      return;
    }

    setThemeColorState(color);

    try {
      await AsyncStorage.setItem(THEME_COLOR_KEY, color);
    } catch (error) {
      console.error('Error saving theme color:', error);
    }
  };

  const setThemeMode = async (mode: ThemeModePreference) => {
  setThemeModeState(mode);
  try {
    await AsyncStorage.setItem(THEME_MODE_KEY, mode);
  } catch (error) {
    console.error('Error saving theme mode:', error);
  }
};

  // ✅ If user taps toggle while in system mode, it becomes a manual override
  const toggleDarkMode = () => {
    const next: ThemeMode = effectiveMode === 'dark' ? 'light' : 'dark';
    setThemeMode(next);
    AsyncStorage.setItem(THEME_MODE_KEY, next).catch(() => {});
  };

  const theme = buildTheme(themeColor, effectiveMode);

  if (isLoading) return null;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeColor,
        themeMode,
        resolvedMode: effectiveMode,
        isPremium,
        setThemeColor,
        setThemeMode,
        toggleDarkMode,
        refreshPremiumStatus,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
