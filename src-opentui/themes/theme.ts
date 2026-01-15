/**
 * Theme System
 *
 * Centralized visual styling for OpenTUI terminal aesthetic.
 * Provides consistent colors, typography, spacing, and visual constants.
 * Colors are defined as hex values for OpenTUI compatibility.
 */

// ============================================================================
// HEX COLOR PALETTE
// ============================================================================

/**
 * Color name to hex mapping for OpenTUI
 * OpenTUI uses hex colors instead of named terminal colors
 */
export const hexColors = {
  // Basic colors
  black: "#000000",
  red: "#FF0000",
  green: "#00FF00",
  yellow: "#FFFF00",
  blue: "#0000FF",
  magenta: "#FF00FF",
  cyan: "#00FFFF",
  white: "#FFFFFF",
  gray: "#808080",

  // Bright variants
  blackBright: "#404040",
  redBright: "#FF6666",
  greenBright: "#66FF66",
  yellowBright: "#FFFF66",
  blueBright: "#6666FF",
  magentaBright: "#FF66FF",
  cyanBright: "#66FFFF",
  whiteBright: "#FFFFFF",
  grayBright: "#A0A0A0",
} as const;

/**
 * Convert a terminal color name to hex
 */
export function colorToHex(color: string): string {
  return hexColors[color as keyof typeof hexColors] ?? color;
}

// ============================================================================
// UNICODE CHARACTERS
// ============================================================================

/**
 * Box drawing characters for borders and frames
 */
export const boxChars = {
  // Light box drawing
  light: {
    topLeft: "\u250C",
    topRight: "\u2510",
    bottomLeft: "\u2514",
    bottomRight: "\u2518",
    horizontal: "\u2500",
    vertical: "\u2502",
    teeDown: "\u252C",
    teeUp: "\u2534",
    teeRight: "\u251C",
    teeLeft: "\u2524",
    cross: "\u253C",
  },
  // Heavy box drawing
  heavy: {
    topLeft: "\u250F",
    topRight: "\u2513",
    bottomLeft: "\u2517",
    bottomRight: "\u251B",
    horizontal: "\u2501",
    vertical: "\u2503",
    teeDown: "\u2533",
    teeUp: "\u253B",
    teeRight: "\u2523",
    teeLeft: "\u252B",
    cross: "\u254B",
  },
  // Double line box drawing
  double: {
    topLeft: "\u2554",
    topRight: "\u2557",
    bottomLeft: "\u255A",
    bottomRight: "\u255D",
    horizontal: "\u2550",
    vertical: "\u2551",
    teeDown: "\u2566",
    teeUp: "\u2569",
    teeRight: "\u2560",
    teeLeft: "\u2563",
    cross: "\u256C",
  },
  // Rounded box drawing
  rounded: {
    topLeft: "\u256D",
    topRight: "\u256E",
    bottomLeft: "\u2570",
    bottomRight: "\u256F",
    horizontal: "\u2500",
    vertical: "\u2502",
    teeDown: "\u252C",
    teeUp: "\u2534",
    teeRight: "\u251C",
    teeLeft: "\u2524",
    cross: "\u253C",
  },
} as const;

/**
 * Status indicator icons
 */
export const statusIcons = {
  idle: "\u25CB", // ○
  running: "\u25CF", // ●
  paused: "\u25D0", // ◐
  completed: "\u2713", // ✓
  errored: "\u2717", // ✗
  waiting_for_input: "?",
  starting: "\u25D4", // ◔
  stopping: "\u25D4", // ◔
  stopped: "\u25CB", // ○
  crashed: "\u2717", // ✗
} as const;

/**
 * Alert/notification icons
 */
export const alertIcons = {
  question: "?",
  confirmation: "!",
  error: "\u2717", // ✗
  permission: "\u26BF", // ⚿
  info: "\u2139", // ℹ
  success: "\u2713", // ✓
  warning: "\u26A0", // ⚠
} as const;

/**
 * Navigation and action icons
 */
export const navIcons = {
  arrowRight: "\u25B8", // ▸
  arrowLeft: "\u25C2", // ◂
  arrowUp: "\u25B4", // ▴
  arrowDown: "\u25BE", // ▾
  bullet: "\u2022", // •
  checkbox: "\u2610", // ☐
  checkboxChecked: "\u2611", // ☑
  radio: "\u25CB", // ○
  radioSelected: "\u25CF", // ●
  pointer: "\u203A", // ›
  chevronRight: "\u00BB", // »
  chevronLeft: "\u00AB", // «
} as const;

/**
 * Progress and loading indicators
 */
export const progressChars = {
  filled: "\u2588", // █
  empty: "\u2591", // ░
  half: "\u2593", // ▓
  light: "\u2592", // ▒
  spinner: [
    "\u280B",
    "\u2819",
    "\u2839",
    "\u2838",
    "\u283C",
    "\u2834",
    "\u2826",
    "\u2827",
    "\u2807",
    "\u280F",
  ],
  dots: [
    "\u2801",
    "\u2802",
    "\u2804",
    "\u2840",
    "\u2880",
    "\u2820",
    "\u2810",
    "\u2808",
  ],
  braille: [
    "\u28FE",
    "\u28FD",
    "\u28FB",
    "\u28BF",
    "\u287F",
    "\u28DF",
    "\u28EF",
    "\u28F7",
  ],
  clock: [
    "\uD83D\uDD50",
    "\uD83D\uDD51",
    "\uD83D\uDD52",
    "\uD83D\uDD53",
    "\uD83D\uDD54",
    "\uD83D\uDD55",
    "\uD83D\uDD56",
    "\uD83D\uDD57",
    "\uD83D\uDD58",
    "\uD83D\uDD59",
    "\uD83D\uDD5A",
    "\uD83D\uDD5B",
  ],
} as const;

/**
 * Game-specific characters
 */
export const gameChars = {
  // General
  ball: "\u25CF", // ●
  paddle: "\u2588", // █
  block: "\u2588", // █
  empty: " ",
  wall: "\u2593", // ▓

  // Snake
  snakeHead: "\u25CF", // ●
  snakeBody: "\u25CB", // ○
  food: "\u25C6", // ◆

  // Tetris
  tetrominoFilled: "\u2588", // █
  tetrominoGhost: "\u2592", // ▒
  tetrominoEmpty: "\u00B7", // ·

  // Minesweeper
  mine: "\u2731", // ✱
  flag: "\u2691", // ⚑
  unknown: "\u25A0", // ■
  revealed: "\u25A1", // □
} as const;

/**
 * Decorative elements
 */
export const decorChars = {
  sparkle: "\u2726", // ✦
  star: "\u2605", // ★
  starEmpty: "\u2606", // ☆
  heart: "\u2665", // ♥
  diamond: "\u25C6", // ◆
  club: "\u2663", // ♣
  spade: "\u2660", // ♠
  music: "\u266A", // ♪
  sun: "\u2600", // ☀
  moon: "\u263D", // ☽
  lightning: "\u26A1", // ⚡
  fire: "\uD83D\uDD25", // 🔥
  trophy: "\uD83C\uDFC6", // 🏆
} as const;

// ============================================================================
// BORDER STYLES
// ============================================================================

/**
 * Border style names for OpenTUI components
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
  return (
    chars.bottomLeft + chars.horizontal.repeat(innerWidth) + chars.bottomRight
  );
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + "\u2026"; // …
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

export type HexColorKey = keyof typeof hexColors;
export type BoxStyle = keyof typeof boxChars;
export type BorderStyle = keyof typeof borderStyles;
