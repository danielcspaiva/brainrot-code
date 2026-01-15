/**
 * Theme context and helpers.
 */

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { getNextThemeId, getTheme, type Theme, type ThemeId } from "./themes.js";
import { useConfig } from "../data/ConfigProvider.js";

export interface ThemeState {
  theme: Theme;
  themeId: ThemeId;
  setThemeId: (id: ThemeId) => void;
  nextTheme: () => void;
}

const ThemeContext = createContext<ThemeState | null>(null);

export interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { config, isLoading } = useConfig();
  const initialTheme = (config.theme?.scheme ?? "default") as ThemeId;
  const [themeId, setThemeId] = useState<ThemeId>(initialTheme);

  useEffect(() => {
    if (!isLoading) {
      setThemeId((config.theme?.scheme ?? "default") as ThemeId);
    }
  }, [config.theme?.scheme, isLoading]);

  const theme = useMemo(() => getTheme(themeId), [themeId]);

  const nextTheme = () => {
    setThemeId((prev) => getNextThemeId(prev));
  };

  return (
    <ThemeContext.Provider value={{ theme, themeId, setThemeId, nextTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeState {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}

export function useThemeColors() {
  return useTheme().theme.colors;
}
