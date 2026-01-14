/**
 * Theme System
 *
 * Centralized visual styling for a modern terminal aesthetic.
 * Provides consistent colors, typography, spacing, and visual constants.
 */

// ============================================================================
// COLOR PALETTE
// ============================================================================

/**
 * Primary color palette - semantic colors for consistent UI
 */
export const colors = {
  // Brand colors
  primary: "cyan",
  secondary: "magenta",
  accent: "yellow",

  // Semantic colors
  success: "green",
  warning: "yellow",
  error: "red",
  info: "cyan",

  // Neutrals
  text: "white",
  textMuted: "gray",
  textDim: "gray",
  border: "gray",
  borderFocus: "cyan",
  borderActive: "yellow",

  // Background indicators (used with dim/inverse text)
  bgHighlight: "cyan",
  bgWarning: "yellow",
  bgError: "red",
  bgSuccess: "green",
} as const;

/**
 * Status colors for loop/process states
 */
export const statusColors = {
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
} as const;

/**
 * Alert type colors
 */
export const alertColors = {
  question: "cyan",
  confirmation: "yellow",
  error: "red",
  permission: "magenta",
  info: "cyan",
  success: "green",
} as const;

/**
 * Game-specific colors
 */
export const gameColors = {
  player: "cyan",
  opponent: "magenta",
  item: "yellow",
  obstacle: "red",
  bonus: "green",
  neutral: "gray",
} as const;

/**
 * Position ranking colors (for leaderboards)
 */
export const rankColors = {
  first: "yellow",
  second: "white",
  third: "white",
  top3: "yellow",
  highlighted: "green",
  normal: undefined,
} as const;

// ============================================================================
// UNICODE CHARACTERS
// ============================================================================

/**
 * Box drawing characters for borders and frames
 */
export const boxChars = {
  // Light box drawing
  light: {
    topLeft: "┌",
    topRight: "┐",
    bottomLeft: "└",
    bottomRight: "┘",
    horizontal: "─",
    vertical: "│",
    teeDown: "┬",
    teeUp: "┴",
    teeRight: "├",
    teeLeft: "┤",
    cross: "┼",
  },
  // Heavy box drawing
  heavy: {
    topLeft: "┏",
    topRight: "┓",
    bottomLeft: "┗",
    bottomRight: "┛",
    horizontal: "━",
    vertical: "┃",
    teeDown: "┳",
    teeUp: "┻",
    teeRight: "┣",
    teeLeft: "┫",
    cross: "╋",
  },
  // Double line box drawing
  double: {
    topLeft: "╔",
    topRight: "╗",
    bottomLeft: "╚",
    bottomRight: "╝",
    horizontal: "═",
    vertical: "║",
    teeDown: "╦",
    teeUp: "╩",
    teeRight: "╠",
    teeLeft: "╣",
    cross: "╬",
  },
  // Rounded box drawing
  rounded: {
    topLeft: "╭",
    topRight: "╮",
    bottomLeft: "╰",
    bottomRight: "╯",
    horizontal: "─",
    vertical: "│",
    teeDown: "┬",
    teeUp: "┴",
    teeRight: "├",
    teeLeft: "┤",
    cross: "┼",
  },
} as const;

/**
 * Status indicator icons
 */
export const statusIcons = {
  idle: "○",
  running: "●",
  paused: "◐",
  completed: "✓",
  errored: "✗",
  waiting_for_input: "?",
  starting: "◔",
  stopping: "◔",
  stopped: "○",
  crashed: "✗",
} as const;

/**
 * Alert/notification icons
 */
export const alertIcons = {
  question: "?",
  confirmation: "!",
  error: "✗",
  permission: "⚿",
  info: "ℹ",
  success: "✓",
  warning: "⚠",
} as const;

/**
 * Navigation and action icons
 */
export const navIcons = {
  arrowRight: "▸",
  arrowLeft: "◂",
  arrowUp: "▴",
  arrowDown: "▾",
  bullet: "•",
  checkbox: "☐",
  checkboxChecked: "☑",
  radio: "○",
  radioSelected: "●",
  pointer: "›",
  chevronRight: "»",
  chevronLeft: "«",
} as const;

/**
 * Progress and loading indicators
 */
export const progressChars = {
  filled: "█",
  empty: "░",
  half: "▓",
  light: "▒",
  spinner: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
  dots: ["⠁", "⠂", "⠄", "⡀", "⢀", "⠠", "⠐", "⠈"],
  braille: ["⣾", "⣽", "⣻", "⢿", "⡿", "⣟", "⣯", "⣷"],
  clock: ["🕐", "🕑", "🕒", "🕓", "🕔", "🕕", "🕖", "🕗", "🕘", "🕙", "🕚", "🕛"],
} as const;

/**
 * Game-specific characters
 */
export const gameChars = {
  // General
  ball: "●",
  paddle: "█",
  block: "█",
  empty: " ",
  wall: "▓",

  // Snake
  snakeHead: "●",
  snakeBody: "○",
  food: "◆",

  // Tetris
  tetrominoFilled: "█",
  tetrominoGhost: "▒",
  tetrominoEmpty: "·",

  // Minesweeper
  mine: "✱",
  flag: "⚑",
  unknown: "■",
  revealed: "□",
} as const;

/**
 * Decorative elements
 */
export const decorChars = {
  sparkle: "✦",
  star: "★",
  starEmpty: "☆",
  heart: "♥",
  diamond: "◆",
  club: "♣",
  spade: "♠",
  music: "♪",
  sun: "☀",
  moon: "☽",
  lightning: "⚡",
  fire: "🔥",
  trophy: "🏆",
} as const;

// ============================================================================
// BORDER STYLES
// ============================================================================

/**
 * Pre-configured border styles for Ink components
 */
export const borderStyles = {
  default: "single",
  focused: "round",
  active: "double",
  alert: "round",
  panel: "single",
  card: "round",
  modal: "double",
} as const;

// ============================================================================
// SPACING
// ============================================================================

/**
 * Consistent spacing values
 */
export const spacing = {
  none: 0,
  xs: 1,
  sm: 1,
  md: 2,
  lg: 3,
  xl: 4,
} as const;

// ============================================================================
// ANIMATION / VISUAL FEEDBACK
// ============================================================================

/**
 * Get a spinner frame based on elapsed time
 */
export function getSpinnerFrame(
  elapsedMs: number,
  type: keyof typeof progressChars = "spinner"
): string {
  const chars = progressChars[type];
  if (Array.isArray(chars)) {
    const frameIndex = Math.floor(elapsedMs / 80) % chars.length;
    return chars[frameIndex] as string;
  }
  return chars as string;
}

/**
 * Create a progress bar string
 */
export function createProgressBar(
  percentage: number,
  width: number = 20,
  filled: string = progressChars.filled,
  empty: string = progressChars.empty
): string {
  const clampedPct = Math.max(0, Math.min(100, percentage));
  const filledCount = Math.round((clampedPct / 100) * width);
  const emptyCount = width - filledCount;
  return filled.repeat(filledCount) + empty.repeat(emptyCount);
}

/**
 * Create a horizontal divider line
 */
export function createDivider(
  width: number,
  style: keyof typeof boxChars = "light"
): string {
  return boxChars[style].horizontal.repeat(width);
}

/**
 * Create a box frame (top or bottom line with corners)
 */
export function createBoxLine(
  width: number,
  position: "top" | "bottom",
  style: keyof typeof boxChars = "light"
): string {
  const chars = boxChars[style];
  const innerWidth = Math.max(0, width - 2);
  if (position === "top") {
    return chars.topLeft + chars.horizontal.repeat(innerWidth) + chars.topRight;
  }
  return chars.bottomLeft + chars.horizontal.repeat(innerWidth) + chars.bottomRight;
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Get color for a status value
 */
export function getStatusColor(status: string): string {
  return statusColors[status as keyof typeof statusColors] ?? colors.textMuted;
}

/**
 * Get icon for a status value
 */
export function getStatusIcon(status: string): string {
  return statusIcons[status as keyof typeof statusIcons] ?? "?";
}

/**
 * Get color for an alert type
 */
export function getAlertColor(type: string): string {
  return alertColors[type as keyof typeof alertColors] ?? colors.info;
}

/**
 * Get icon for an alert type
 */
export function getAlertIcon(type: string): string {
  return alertIcons[type as keyof typeof alertIcons] ?? alertIcons.info;
}

/**
 * Get color for a rank position
 */
export function getRankColor(position: number, isHighlighted: boolean = false): string | undefined {
  if (isHighlighted) return rankColors.highlighted;
  if (position === 1) return rankColors.first;
  if (position <= 3) return rankColors.top3;
  return rankColors.normal;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + "…";
}

/**
 * Pad text to center within a width
 */
export function centerText(text: string, width: number): string {
  if (text.length >= width) return text;
  const padding = Math.floor((width - text.length) / 2);
  return " ".repeat(padding) + text + " ".repeat(width - text.length - padding);
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ColorKey = keyof typeof colors;
export type StatusColorKey = keyof typeof statusColors;
export type AlertColorKey = keyof typeof alertColors;
export type BoxStyle = keyof typeof boxChars;
export type BorderStyle = keyof typeof borderStyles;
