/**
 * Theme Definitions
 *
 * Multiple visual themes for the terminal UI.
 * Each theme provides a complete color palette that maps to semantic colors.
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Theme color scheme identifier
 */
export type ThemeId = "default" | "dark" | "light" | "retro";

/**
 * Complete color palette for a theme
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
 * Status colors for loop/process states
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
 * Alert type colors
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
 * Game-specific colors
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
    primary: "cyan",
    secondary: "magenta",
    accent: "yellow",
    success: "green",
    warning: "yellow",
    error: "red",
    info: "cyan",
    text: "white",
    textMuted: "gray",
    textDim: "gray",
    border: "gray",
    borderFocus: "cyan",
    borderActive: "yellow",
    bgHighlight: "cyan",
    bgWarning: "yellow",
    bgError: "red",
    bgSuccess: "green",
  },
  statusColors: {
    idle: "gray",
    running: "green",
    paused: "yellow",
    completed: "cyan",
    errored: "red",
    waiting_for_input: "magenta",
    starting: "yellow",
    stopping: "yellow",
    stopped: "gray",
    crashed: "red",
  },
  alertColors: {
    question: "cyan",
    confirmation: "yellow",
    error: "red",
    permission: "magenta",
    info: "cyan",
    success: "green",
  },
  gameColors: {
    player: "cyan",
    opponent: "magenta",
    item: "yellow",
    obstacle: "red",
    bonus: "green",
    neutral: "gray",
  },
  rankColors: {
    first: "yellow",
    second: "white",
    third: "white",
    top3: "yellow",
    highlighted: "green",
    normal: undefined,
  },
};

// ============================================================================
// DARK THEME (Muted colors optimized for dark backgrounds)
// ============================================================================

const darkTheme: Theme = {
  id: "dark",
  name: "Dark",
  description: "Muted, eye-friendly colors for extended sessions",
  colors: {
    primary: "blueBright",
    secondary: "magentaBright",
    accent: "yellowBright",
    success: "greenBright",
    warning: "yellowBright",
    error: "redBright",
    info: "blueBright",
    text: "white",
    textMuted: "gray",
    textDim: "gray",
    border: "gray",
    borderFocus: "blueBright",
    borderActive: "yellowBright",
    bgHighlight: "blueBright",
    bgWarning: "yellowBright",
    bgError: "redBright",
    bgSuccess: "greenBright",
  },
  statusColors: {
    idle: "gray",
    running: "greenBright",
    paused: "yellowBright",
    completed: "blueBright",
    errored: "redBright",
    waiting_for_input: "magentaBright",
    starting: "yellowBright",
    stopping: "yellowBright",
    stopped: "gray",
    crashed: "redBright",
  },
  alertColors: {
    question: "blueBright",
    confirmation: "yellowBright",
    error: "redBright",
    permission: "magentaBright",
    info: "blueBright",
    success: "greenBright",
  },
  gameColors: {
    player: "blueBright",
    opponent: "magentaBright",
    item: "yellowBright",
    obstacle: "redBright",
    bonus: "greenBright",
    neutral: "gray",
  },
  rankColors: {
    first: "yellowBright",
    second: "white",
    third: "white",
    top3: "yellowBright",
    highlighted: "greenBright",
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
    primary: "blue",
    secondary: "magenta",
    accent: "yellow",
    success: "green",
    warning: "yellow",
    error: "red",
    info: "blue",
    text: "black",
    textMuted: "gray",
    textDim: "gray",
    border: "gray",
    borderFocus: "blue",
    borderActive: "yellow",
    bgHighlight: "blue",
    bgWarning: "yellow",
    bgError: "red",
    bgSuccess: "green",
  },
  statusColors: {
    idle: "gray",
    running: "green",
    paused: "yellow",
    completed: "blue",
    errored: "red",
    waiting_for_input: "magenta",
    starting: "yellow",
    stopping: "yellow",
    stopped: "gray",
    crashed: "red",
  },
  alertColors: {
    question: "blue",
    confirmation: "yellow",
    error: "red",
    permission: "magenta",
    info: "blue",
    success: "green",
  },
  gameColors: {
    player: "blue",
    opponent: "magenta",
    item: "yellow",
    obstacle: "red",
    bonus: "green",
    neutral: "gray",
  },
  rankColors: {
    first: "yellow",
    second: "black",
    third: "black",
    top3: "yellow",
    highlighted: "green",
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
    primary: "green",
    secondary: "greenBright",
    accent: "yellow",
    success: "greenBright",
    warning: "yellow",
    error: "red",
    info: "green",
    text: "greenBright",
    textMuted: "green",
    textDim: "green",
    border: "green",
    borderFocus: "greenBright",
    borderActive: "yellow",
    bgHighlight: "green",
    bgWarning: "yellow",
    bgError: "red",
    bgSuccess: "greenBright",
  },
  statusColors: {
    idle: "green",
    running: "greenBright",
    paused: "yellow",
    completed: "greenBright",
    errored: "red",
    waiting_for_input: "yellow",
    starting: "yellow",
    stopping: "yellow",
    stopped: "green",
    crashed: "red",
  },
  alertColors: {
    question: "greenBright",
    confirmation: "yellow",
    error: "red",
    permission: "yellow",
    info: "green",
    success: "greenBright",
  },
  gameColors: {
    player: "greenBright",
    opponent: "yellow",
    item: "yellow",
    obstacle: "red",
    bonus: "greenBright",
    neutral: "green",
  },
  rankColors: {
    first: "yellow",
    second: "greenBright",
    third: "greenBright",
    top3: "yellow",
    highlighted: "greenBright",
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
