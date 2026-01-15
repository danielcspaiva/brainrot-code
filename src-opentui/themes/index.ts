/**
 * Theme System Exports
 *
 * Centralized exports for the OpenTUI theme system.
 */

// Theme constants and utilities
export {
  hexColors,
  colorToHex,
  boxChars,
  statusIcons,
  alertIcons,
  navIcons,
  progressChars,
  gameChars,
  decorChars,
  borderStyles,
  spacing,
  getSpinnerFrame,
  createProgressBar,
  createDivider,
  createBoxLine,
  truncate,
  centerText,
  type HexColorKey,
  type BoxStyle,
  type BorderStyle,
} from "./theme.js";

// Theme definitions and registry
export {
  themes,
  getTheme,
  getThemeIds,
  getThemeInfo,
  isValidThemeId,
  getStatusColor,
  getStatusIcon,
  getAlertColor,
  getRankColor,
  type ThemeId,
  type Theme,
  type ThemeColors,
  type ThemeStatusColors,
  type ThemeAlertColors,
  type ThemeGameColors,
  type ThemeRankColors,
} from "./themes.js";

// React context and hooks
export {
  ThemeProvider,
  ThemeContext,
  useTheme,
  useThemeColors,
  useStatusColors,
  useAlertColors,
  useGameColors,
  useRankColors,
  getThemedStatusColor,
  getThemedAlertColor,
  getThemedRankColor,
  type ThemeProviderProps,
  type ThemeContextValue,
} from "./useTheme.js";
