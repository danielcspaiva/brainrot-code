/**
 * Theme Definitions
 *
 * Multiple visual themes for the OpenTUI terminal UI.
 * Each theme provides a complete color palette using hex colors.
 */

import { hexColors, statusIcons } from "./theme.js";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Theme color scheme identifier
 */
export type ThemeId = "default" | "dark" | "light" | "retro";

/**
 * Complete color palette for a theme (hex values)
 */
export interface ThemeColors {
  // Brand colors
  primary: string;
  secondary: string;
  accent: string;

  // Semantic colors
  success: string;
  warning: string;
  error: string;
  info: string;

  // Neutrals
  text: string;
  textMuted: string;
  textDim: string;
  border: string;
  borderFocus: string;
  borderActive: string;

  // Background indicators (used with dim/inverse text)
  bgHighlight: string;
  bgWarning: string;
  bgError: string;
  bgSuccess: string;
}

/**
 * Status colors for loop/process states (hex values)
 */
export interface ThemeStatusColors {
  idle: string;
  running: string;
  paused: string;
  completed: string;
  errored: string;
  waiting_for_input: string;
  starting: string;
  stopping: string;
  stopped: string;
  crashed: string;
}

/**
 * Alert type colors (hex values)
 */
export interface ThemeAlertColors {
  question: string;
  confirmation: string;
  error: string;
  permission: string;
  info: string;
  success: string;
}

/**
 * Game-specific colors (hex values)
 */
export interface ThemeGameColors {
  player: string;
  opponent: string;
  item: string;
  obstacle: string;
  bonus: string;
  neutral: string;
}

/**
 * Position ranking colors (for leaderboards)
 */
export interface ThemeRankColors {
  first: string;
  second: string;
  third: string;
  top3: string;
  highlighted: string;
  normal: string | undefined;
}

/**
 * Complete theme definition
 */
export interface Theme {
  id: ThemeId;
  name: string;
  description: string;
  colors: ThemeColors;
  statusColors: ThemeStatusColors;
  alertColors: ThemeAlertColors;
  gameColors: ThemeGameColors;
  rankColors: ThemeRankColors;
}

// ============================================================================
// DEFAULT THEME (Cyan/Magenta/Yellow - Modern Terminal)
// ============================================================================

const defaultTheme: Theme = {
  id: "default",
  name: "Default",
  description:
    "Modern terminal aesthetic with cyan, magenta, and yellow accents",
  colors: {
    primary: hexColors.cyan,
    secondary: hexColors.magenta,
    accent: hexColors.yellow,
    success: hexColors.green,
    warning: hexColors.yellow,
    error: hexColors.red,
    info: hexColors.cyan,
    text: hexColors.white,
    textMuted: hexColors.gray,
    textDim: hexColors.gray,
    border: hexColors.gray,
    borderFocus: hexColors.cyan,
    borderActive: hexColors.yellow,
    bgHighlight: hexColors.cyan,
    bgWarning: hexColors.yellow,
    bgError: hexColors.red,
    bgSuccess: hexColors.green,
  },
  statusColors: {
    idle: hexColors.gray,
    running: hexColors.green,
    paused: hexColors.yellow,
    completed: hexColors.cyan,
    errored: hexColors.red,
    waiting_for_input: hexColors.magenta,
    starting: hexColors.yellow,
    stopping: hexColors.yellow,
    stopped: hexColors.gray,
    crashed: hexColors.red,
  },
  alertColors: {
    question: hexColors.cyan,
    confirmation: hexColors.yellow,
    error: hexColors.red,
    permission: hexColors.magenta,
    info: hexColors.cyan,
    success: hexColors.green,
  },
  gameColors: {
    player: hexColors.cyan,
    opponent: hexColors.magenta,
    item: hexColors.yellow,
    obstacle: hexColors.red,
    bonus: hexColors.green,
    neutral: hexColors.gray,
  },
  rankColors: {
    first: hexColors.yellow,
    second: hexColors.white,
    third: hexColors.white,
    top3: hexColors.yellow,
    highlighted: hexColors.green,
    normal: undefined,
  },
};

// ============================================================================
// DARK THEME (Bright colors for dark backgrounds)
// ============================================================================

const darkTheme: Theme = {
  id: "dark",
  name: "Dark",
  description: "Bright colors optimized for dark backgrounds",
  colors: {
    primary: hexColors.blueBright,
    secondary: hexColors.magentaBright,
    accent: hexColors.yellowBright,
    success: hexColors.greenBright,
    warning: hexColors.yellowBright,
    error: hexColors.redBright,
    info: hexColors.blueBright,
    text: hexColors.white,
    textMuted: hexColors.gray,
    textDim: hexColors.gray,
    border: hexColors.gray,
    borderFocus: hexColors.blueBright,
    borderActive: hexColors.yellowBright,
    bgHighlight: hexColors.blueBright,
    bgWarning: hexColors.yellowBright,
    bgError: hexColors.redBright,
    bgSuccess: hexColors.greenBright,
  },
  statusColors: {
    idle: hexColors.gray,
    running: hexColors.greenBright,
    paused: hexColors.yellowBright,
    completed: hexColors.blueBright,
    errored: hexColors.redBright,
    waiting_for_input: hexColors.magentaBright,
    starting: hexColors.yellowBright,
    stopping: hexColors.yellowBright,
    stopped: hexColors.gray,
    crashed: hexColors.redBright,
  },
  alertColors: {
    question: hexColors.blueBright,
    confirmation: hexColors.yellowBright,
    error: hexColors.redBright,
    permission: hexColors.magentaBright,
    info: hexColors.blueBright,
    success: hexColors.greenBright,
  },
  gameColors: {
    player: hexColors.blueBright,
    opponent: hexColors.magentaBright,
    item: hexColors.yellowBright,
    obstacle: hexColors.redBright,
    bonus: hexColors.greenBright,
    neutral: hexColors.gray,
  },
  rankColors: {
    first: hexColors.yellowBright,
    second: hexColors.white,
    third: hexColors.white,
    top3: hexColors.yellowBright,
    highlighted: hexColors.greenBright,
    normal: undefined,
  },
};

// ============================================================================
// LIGHT THEME (High contrast for light terminal backgrounds)
// ============================================================================

const lightTheme: Theme = {
  id: "light",
  name: "Light",
  description: "High contrast colors for light terminal backgrounds",
  colors: {
    primary: hexColors.blue,
    secondary: hexColors.magenta,
    accent: "#CC9900", // Darker yellow for visibility
    success: "#008800", // Darker green for visibility
    warning: "#CC9900",
    error: "#CC0000",
    info: hexColors.blue,
    text: hexColors.black,
    textMuted: hexColors.gray,
    textDim: hexColors.gray,
    border: hexColors.gray,
    borderFocus: hexColors.blue,
    borderActive: "#CC9900",
    bgHighlight: hexColors.blue,
    bgWarning: "#CC9900",
    bgError: "#CC0000",
    bgSuccess: "#008800",
  },
  statusColors: {
    idle: hexColors.gray,
    running: "#008800",
    paused: "#CC9900",
    completed: hexColors.blue,
    errored: "#CC0000",
    waiting_for_input: hexColors.magenta,
    starting: "#CC9900",
    stopping: "#CC9900",
    stopped: hexColors.gray,
    crashed: "#CC0000",
  },
  alertColors: {
    question: hexColors.blue,
    confirmation: "#CC9900",
    error: "#CC0000",
    permission: hexColors.magenta,
    info: hexColors.blue,
    success: "#008800",
  },
  gameColors: {
    player: hexColors.blue,
    opponent: hexColors.magenta,
    item: "#CC9900",
    obstacle: "#CC0000",
    bonus: "#008800",
    neutral: hexColors.gray,
  },
  rankColors: {
    first: "#CC9900",
    second: hexColors.black,
    third: hexColors.black,
    top3: "#CC9900",
    highlighted: "#008800",
    normal: undefined,
  },
};

// ============================================================================
// RETRO THEME (Classic green phosphor terminal / Amber CRT)
// ============================================================================

const retroTheme: Theme = {
  id: "retro",
  name: "Retro",
  description: "Classic green phosphor terminal aesthetic",
  colors: {
    primary: hexColors.green,
    secondary: hexColors.greenBright,
    accent: hexColors.yellow,
    success: hexColors.greenBright,
    warning: hexColors.yellow,
    error: hexColors.red,
    info: hexColors.green,
    text: hexColors.greenBright,
    textMuted: hexColors.green,
    textDim: hexColors.green,
    border: hexColors.green,
    borderFocus: hexColors.greenBright,
    borderActive: hexColors.yellow,
    bgHighlight: hexColors.green,
    bgWarning: hexColors.yellow,
    bgError: hexColors.red,
    bgSuccess: hexColors.greenBright,
  },
  statusColors: {
    idle: hexColors.green,
    running: hexColors.greenBright,
    paused: hexColors.yellow,
    completed: hexColors.greenBright,
    errored: hexColors.red,
    waiting_for_input: hexColors.yellow,
    starting: hexColors.yellow,
    stopping: hexColors.yellow,
    stopped: hexColors.green,
    crashed: hexColors.red,
  },
  alertColors: {
    question: hexColors.greenBright,
    confirmation: hexColors.yellow,
    error: hexColors.red,
    permission: hexColors.yellow,
    info: hexColors.green,
    success: hexColors.greenBright,
  },
  gameColors: {
    player: hexColors.greenBright,
    opponent: hexColors.yellow,
    item: hexColors.yellow,
    obstacle: hexColors.red,
    bonus: hexColors.greenBright,
    neutral: hexColors.green,
  },
  rankColors: {
    first: hexColors.yellow,
    second: hexColors.greenBright,
    third: hexColors.greenBright,
    top3: hexColors.yellow,
    highlighted: hexColors.greenBright,
    normal: undefined,
  },
};

// ============================================================================
// THEME REGISTRY
// ============================================================================

/**
 * All available themes
 */
export const themes: Record<ThemeId, Theme> = {
  default: defaultTheme,
  dark: darkTheme,
  light: lightTheme,
  retro: retroTheme,
};

/**
 * Get a theme by ID
 */
export function getTheme(id: ThemeId): Theme {
  return themes[id] ?? themes.default;
}

/**
 * Get all available theme IDs
 */
export function getThemeIds(): ThemeId[] {
  return Object.keys(themes) as ThemeId[];
}

/**
 * Get theme info for display (name and description)
 */
export function getThemeInfo(id: ThemeId): {
  name: string;
  description: string;
} {
  const theme = getTheme(id);
  return { name: theme.name, description: theme.description };
}

/**
 * Check if a string is a valid theme ID
 */
export function isValidThemeId(id: string): id is ThemeId {
  return id in themes;
}

/**
 * Get status color for a given status
 */
export function getStatusColor(theme: Theme, status: string): string {
  return (
    theme.statusColors[status as keyof ThemeStatusColors] ?? theme.colors.textMuted
  );
}

/**
 * Get status icon for a given status
 */
export function getStatusIcon(status: string): string {
  return statusIcons[status as keyof typeof statusIcons] ?? "?";
}

/**
 * Get alert color for a given alert type
 */
export function getAlertColor(theme: Theme, type: string): string {
  return (
    theme.alertColors[type as keyof ThemeAlertColors] ?? theme.colors.info
  );
}

/**
 * Get rank color for a position
 */
export function getRankColor(
  theme: Theme,
  position: number,
  isHighlighted: boolean = false
): string | undefined {
  if (isHighlighted) return theme.rankColors.highlighted;
  if (position === 1) return theme.rankColors.first;
  if (position <= 3) return theme.rankColors.top3;
  return theme.rankColors.normal;
}
