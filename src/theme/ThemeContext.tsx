import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Theme, ThemeColor, ThemeMode, buildTheme, themeColors } from './themes';

interface ThemeContextType {
  theme: Theme;
  themeColor: ThemeColor;
  themeMode: ThemeMode;
  isPremium: boolean;
  setThemeColor: (color: ThemeColor) => void;
  setThemeMode: (mode: ThemeMode) => void;
  toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [themeColor, setThemeColorState] = useState<ThemeColor>('rose');
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');
  const [isPremium, setIsPremium] = useState(false); // TODO: Connect to RevenueCat

  const setThemeColor = (color: ThemeColor) => {
    const colorData = themeColors[color];
    
    // Check premium status
    if (colorData.premium && !isPremium) {
      return; // Don't allow premium themes for non-premium users
    }
    
    setThemeColorState(color);
  };

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
  };

  const toggleDarkMode = () => {
    setThemeMode(themeMode === 'light' ? 'dark' : 'light');
  };

  const theme = buildTheme(themeColor, themeMode);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeColor,
        themeMode,
        isPremium,
        setThemeColor,
        setThemeMode,
        toggleDarkMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};