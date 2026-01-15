/**
 * Theme registry.
 */

export type ThemeId = "default" | "dark" | "light" | "retro";

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  text: string;
  textMuted: string;
  border: string;
  borderFocus: string;
  borderActive: string;
  panelBg: string;
  statusBg: string;
}

export interface Theme {
  id: ThemeId;
  name: string;
  description: string;
  colors: ThemeColors;
}

const defaultTheme: Theme = {
  id: "default",
  name: "Default",
  description: "Modern terminal with cyan and magenta accents",
  colors: {
    primary: "#00FFFF",
    secondary: "#FF00FF",
    accent: "#FFFF00",
    success: "#00FF00",
    warning: "#FFFF00",
    error: "#FF0000",
    text: "#FFFFFF",
    textMuted: "#AAAAAA",
    border: "#444444",
    borderFocus: "#00FFFF",
    borderActive: "#FFFF00",
    panelBg: "#000000",
    statusBg: "#222222",
  },
};

const darkTheme: Theme = {
  id: "dark",
  name: "Dark",
  description: "Bright colors tuned for dark terminals",
  colors: {
    primary: "#6666FF",
    secondary: "#FF66FF",
    accent: "#FFFF66",
    success: "#66FF66",
    warning: "#FFFF66",
    error: "#FF6666",
    text: "#FFFFFF",
    textMuted: "#AAAAAA",
    border: "#555555",
    borderFocus: "#6666FF",
    borderActive: "#FFFF66",
    panelBg: "#000000",
    statusBg: "#1E1E1E",
  },
};

const lightTheme: Theme = {
  id: "light",
  name: "Light",
  description: "High contrast for light terminals",
  colors: {
    primary: "#0000FF",
    secondary: "#CC00CC",
    accent: "#CC9900",
    success: "#008800",
    warning: "#CC9900",
    error: "#CC0000",
    text: "#000000",
    textMuted: "#666666",
    border: "#888888",
    borderFocus: "#0000FF",
    borderActive: "#CC9900",
    panelBg: "#FFFFFF",
    statusBg: "#DDDDDD",
  },
};

const retroTheme: Theme = {
  id: "retro",
  name: "Retro",
  description: "Green phosphor style",
  colors: {
    primary: "#00FF00",
    secondary: "#66FF66",
    accent: "#FFFF00",
    success: "#66FF66",
    warning: "#FFFF00",
    error: "#FF0000",
    text: "#66FF66",
    textMuted: "#00CC00",
    border: "#00CC00",
    borderFocus: "#66FF66",
    borderActive: "#FFFF00",
    panelBg: "#000000",
    statusBg: "#003300",
  },
};

export const themes: Record<ThemeId, Theme> = {
  default: defaultTheme,
  dark: darkTheme,
  light: lightTheme,
  retro: retroTheme,
};

export function getTheme(id: ThemeId): Theme {
  return themes[id] ?? themes.default;
}

export function getThemeIds(): ThemeId[] {
  return Object.keys(themes) as ThemeId[];
}

export function getNextThemeId(current: ThemeId): ThemeId {
  const ids = getThemeIds();
  const index = ids.indexOf(current);
  const nextIndex = index === -1 ? 0 : (index + 1) % ids.length;
  return ids[nextIndex];
}
