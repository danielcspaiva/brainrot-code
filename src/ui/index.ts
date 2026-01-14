/**
 * UI Module Exports
 *
 * Central export point for all UI-related utilities, components,
 * and theme constants.
 */

// Theme system - colors, icons, characters, utilities
export {
  // Color palettes
  colors,
  statusColors,
  alertColors,
  gameColors,
  rankColors,
  // Unicode characters
  boxChars,
  statusIcons,
  alertIcons,
  navIcons,
  progressChars,
  gameChars,
  decorChars,
  // Border styles
  borderStyles,
  // Spacing
  spacing,
  // Utility functions
  getSpinnerFrame,
  createProgressBar,
  createDivider,
  createBoxLine,
  getStatusColor,
  getStatusIcon,
  getAlertColor,
  getAlertIcon,
  getRankColor,
  truncate,
  centerText,
  // Types
  type ColorKey,
  type StatusColorKey,
  type AlertColorKey,
  type BoxStyle,
  type BorderStyle,
} from "../theme.js";

// Styled components
export {
  Panel,
  Card,
  Badge,
  StatusIndicator,
  ProgressBar,
  Spinner,
  Divider,
  AlertBox,
  KeyHint,
  KeyHintsRow,
  Header,
  SectionHeader,
  EmptyState,
  ScoreDisplay,
  Countdown,
  ListItem,
  // Types
  type PanelProps,
  type CardProps,
  type BadgeProps,
  type StatusIndicatorProps,
  type ProgressBarProps,
  type SpinnerProps,
  type DividerProps,
  type AlertBoxProps,
  type KeyHintProps,
  type KeyHintsRowProps,
  type HeaderProps,
  type SectionHeaderProps,
  type EmptyStateProps,
  type ScoreDisplayProps,
  type CountdownProps,
  type ListItemProps,
} from "../styled-components.js";

// Hooks
export {
  useSpinner,
  useSpinnerFrame,
  type UseSpinnerOptions,
  type UseSpinnerResult,
  type SpinnerStyle,
} from "../use-spinner.js";

// Theme context and hooks
export {
  ThemeProvider,
  useTheme,
  useThemeColors,
  useStatusColors,
  useAlertColors,
  useGameColors,
  useRankColors,
  getThemedStatusColor,
  getThemedAlertColor,
  getThemedRankColor,
  type Theme,
  type ThemeId,
} from "../useTheme.js";

// Theme definitions
export {
  themes,
  getTheme,
  getThemeIds,
  getThemeInfo,
  isValidThemeId,
  type ThemeColors,
  type ThemeStatusColors,
  type ThemeAlertColors,
  type ThemeGameColors,
  type ThemeRankColors,
} from "../themes.js";
