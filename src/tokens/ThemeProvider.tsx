import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme, type Theme } from './theme';

type Scheme = 'light' | 'dark';

type ThemeContextValue = {
  theme: Theme;
  scheme: Scheme;
  setOverride: (s: Scheme | null) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [override, setOverride] = useState<Scheme | null>(null);

  // Light leads. The system value only wins when it says dark explicitly, so
  // an undefined scheme resolves to light rather than to whatever the platform
  // happens to default to.
  const scheme: Scheme = override ?? (system === 'dark' ? 'dark' : 'light');

  const value = useMemo(
    () => ({
      theme: scheme === 'dark' ? darkTheme : lightTheme,
      scheme,
      setOverride,
    }),
    [scheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside a ThemeProvider');
  return ctx;
}
