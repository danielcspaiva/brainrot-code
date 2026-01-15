/**
 * Styled Components
 *
 * Reusable UI components with consistent modern terminal styling.
 * These components provide a cohesive visual language throughout the app.
 */

import { Box, Text } from "ink";
import type { ReactNode } from "react";
import {
  boxChars,
  navIcons,
  progressChars,
  statusIcons,
  alertIcons,
  spacing,
  getSpinnerFrame,
} from "./theme.js";
import { useThemeColors, useStatusColors, useAlertColors } from "./useTheme.js";

// ============================================================================
// PANEL COMPONENT
// ============================================================================

export interface PanelProps {
  /** Panel title */
  title?: string;
  /** Panel content */
  children: ReactNode;
  /** Border style */
  borderStyle?: "single" | "round" | "double" | "bold" | "classic";
  /** Border color */
  borderColor?: string;
  /** Whether this panel is focused */
  isFocused?: boolean;
  /** Panel width */
  width?: number | string;
  /** Panel height */
  height?: number | string;
  /** Horizontal padding */
  paddingX?: number;
  /** Vertical padding */
  paddingY?: number;
}

/**
 * Panel component with title and styled border
 */
export function Panel({
  title,
  children,
  borderStyle = "round",
  borderColor,
  isFocused = false,
  width,
  height,
  paddingX = 1,
  paddingY = 0,
}: PanelProps) {
  const colors = useThemeColors();
  const effectiveBorderColor =
    borderColor ?? (isFocused ? colors.borderFocus : colors.border);

  return (
    <Box
      flexDirection="column"
      borderStyle={borderStyle}
      borderColor={effectiveBorderColor}
      width={width}
      height={height}
      paddingX={paddingX}
      paddingY={paddingY}
    >
      {title && (
        <Box marginBottom={spacing.xs}>
          <Text bold color={isFocused ? colors.primary : colors.text}>
            {isFocused ? `${navIcons.arrowRight} ` : "  "}
            {title}
          </Text>
        </Box>
      )}
      {children}
    </Box>
  );
}

// ============================================================================
// CARD COMPONENT
// ============================================================================

export interface CardProps {
  /** Card title */
  title?: string;
  /** Card subtitle/description */
  subtitle?: string;
  /** Card content */
  children?: ReactNode;
  /** Whether this card is selected */
  isSelected?: boolean;
  /** Whether this card is highlighted (focused) */
  isHighlighted?: boolean;
  /** Card width */
  width?: number;
}

/**
 * Card component for selectable items (like game selector)
 */
export function Card({
  title,
  subtitle,
  children,
  isSelected = false,
  isHighlighted = false,
  width,
}: CardProps) {
  const colors = useThemeColors();
  const borderColor = isHighlighted
    ? colors.primary
    : isSelected
      ? colors.accent
      : colors.border;
  const titleColor = isHighlighted
    ? colors.primary
    : isSelected
      ? colors.accent
      : colors.text;

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={borderColor}
      paddingX={spacing.xs}
      width={width}
    >
      {title && (
        <Box>
          <Text bold color={titleColor}>
            {isHighlighted ? `${navIcons.arrowRight} ` : "  "}
            {title}
          </Text>
        </Box>
      )}
      {subtitle && (
        <Text dimColor wrap="truncate">
          {subtitle}
        </Text>
      )}
      {children}
    </Box>
  );
}

// ============================================================================
// BADGE COMPONENT
// ============================================================================

export interface BadgeProps {
  /** Badge text */
  children: ReactNode;
  /** Badge color variant */
  variant?: "default" | "success" | "warning" | "error" | "info" | "primary";
  /** Whether the badge is bold */
  bold?: boolean;
}

/**
 * Badge component for status indicators and labels
 */
export function Badge({
  children,
  variant = "default",
  bold = false,
}: BadgeProps) {
  const colors = useThemeColors();
  const badgeVariantColors: Record<
    NonNullable<BadgeProps["variant"]>,
    string
  > = {
    default: colors.textMuted,
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
    info: colors.info,
    primary: colors.primary,
  };
  const color = badgeVariantColors[variant];

  return (
    <Text color={color} bold={bold}>
      [{children}]
    </Text>
  );
}

// ============================================================================
// STATUS INDICATOR COMPONENT
// ============================================================================

export interface StatusIndicatorProps {
  /** Status value */
  status: string;
  /** Whether attention is needed */
  needsAttention?: boolean;
  /** Show status text */
  showLabel?: boolean;
}

/**
 * Status indicator with icon and optional label
 */
export function StatusIndicator({
  status,
  needsAttention = false,
  showLabel = true,
}: StatusIndicatorProps) {
  const colors = useThemeColors();
  const statusColors = useStatusColors();
  const color = needsAttention
    ? colors.secondary
    : (statusColors[status as keyof typeof statusColors] ?? colors.textMuted);
  const icon = statusIcons[status as keyof typeof statusIcons] ?? "?";

  return (
    <Box>
      <Text color={color} bold>
        {icon}
      </Text>
      {showLabel && (
        <Text color={color}> {status.toUpperCase().replace(/_/g, " ")}</Text>
      )}
      {needsAttention && (
        <Text color={colors.secondary} bold>
          {" "}
          (!)
        </Text>
      )}
    </Box>
  );
}

// ============================================================================
// PROGRESS BAR COMPONENT
// ============================================================================

export interface ProgressBarProps {
  /** Progress percentage (0-100) */
  percentage: number;
  /** Bar width in characters */
  width?: number;
  /** Show percentage label */
  showLabel?: boolean;
  /** Color of the filled portion */
  filledColor?: string;
  /** Color of the empty portion */
  emptyColor?: string;
}

/**
 * Progress bar with customizable appearance
 */
export function ProgressBar({
  percentage,
  width = 20,
  showLabel = true,
  filledColor,
  emptyColor,
}: ProgressBarProps) {
  const colors = useThemeColors();
  const effectiveFilledColor = filledColor ?? colors.success;
  const effectiveEmptyColor = emptyColor ?? colors.textMuted;
  const clampedPct = Math.max(0, Math.min(100, percentage));
  const filled = Math.round((clampedPct / 100) * width);
  const empty = width - filled;

  return (
    <Text>
      <Text color={effectiveFilledColor}>
        {progressChars.filled.repeat(filled)}
      </Text>
      <Text color={effectiveEmptyColor}>
        {progressChars.empty.repeat(empty)}
      </Text>
      {showLabel && <Text dimColor> {Math.round(clampedPct)}%</Text>}
    </Text>
  );
}

// ============================================================================
// SPINNER COMPONENT
// ============================================================================

export interface SpinnerProps {
  /** Elapsed time in milliseconds for animation */
  elapsedMs: number;
  /** Spinner style */
  style?: "spinner" | "dots" | "braille";
  /** Spinner color */
  color?: string;
  /** Optional label */
  label?: string;
}

/**
 * Animated spinner component
 */
export function Spinner({
  elapsedMs,
  style = "spinner",
  color,
  label,
}: SpinnerProps) {
  const colors = useThemeColors();
  const effectiveColor = color ?? colors.primary;
  const frame = getSpinnerFrame(elapsedMs, style);

  return (
    <Box>
      <Text color={effectiveColor}>{frame}</Text>
      {label && <Text> {label}</Text>}
    </Box>
  );
}

// ============================================================================
// DIVIDER COMPONENT
// ============================================================================

export interface DividerProps {
  /** Divider width */
  width?: number;
  /** Divider style */
  style?: "light" | "heavy" | "double" | "dashed";
  /** Divider color */
  color?: string;
  /** Optional label in the middle */
  label?: string;
}

/**
 * Horizontal divider line
 */
export function Divider({
  width = 40,
  style = "light",
  color,
  label,
}: DividerProps) {
  const colors = useThemeColors();
  const effectiveColor = color ?? colors.border;
  const char =
    style === "dashed"
      ? "╌"
      : boxChars[
          style === "heavy" ? "heavy" : style === "double" ? "double" : "light"
        ].horizontal;

  if (label) {
    const labelWithPadding = ` ${label} `;
    const sideWidth = Math.max(
      0,
      Math.floor((width - labelWithPadding.length) / 2)
    );
    return (
      <Text color={effectiveColor}>
        {char.repeat(sideWidth)}
        <Text dimColor>{labelWithPadding}</Text>
        {char.repeat(width - sideWidth - labelWithPadding.length)}
      </Text>
    );
  }

  return <Text color={effectiveColor}>{char.repeat(width)}</Text>;
}

// ============================================================================
// ALERT BOX COMPONENT
// ============================================================================

export interface AlertBoxProps {
  /** Alert type */
  type?: "info" | "success" | "warning" | "error" | "question" | "permission";
  /** Alert title */
  title?: string;
  /** Alert message */
  children: ReactNode;
  /** Additional actions/hints */
  hint?: string;
}

/**
 * Alert box for notifications and messages
 */
export function AlertBox({
  type = "info",
  title,
  children,
  hint,
}: AlertBoxProps) {
  const colors = useThemeColors();
  const alertColors = useAlertColors();
  const color = alertColors[type as keyof typeof alertColors] ?? colors.info;
  const icon = alertIcons[type as keyof typeof alertIcons] ?? alertIcons.info;

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={color}
      paddingX={spacing.md}
      paddingY={spacing.xs}
    >
      <Box>
        <Text bold color={color}>
          [{icon}] {title ?? type.toUpperCase()}
        </Text>
      </Box>
      <Box marginTop={spacing.xs}>
        <Text color={color}>{children}</Text>
      </Box>
      {hint && (
        <Box marginTop={spacing.xs}>
          <Text dimColor>{hint}</Text>
        </Box>
      )}
    </Box>
  );
}

// ============================================================================
// KEYBOARD HINT COMPONENT
// ============================================================================

export interface KeyHintProps {
  /** The key combination */
  keyName: string;
  /** Description of what the key does */
  action: string;
  /** Key color */
  keyColor?: string;
}

/**
 * Keyboard shortcut hint
 */
export function KeyHint({ keyName, action, keyColor }: KeyHintProps) {
  const colors = useThemeColors();
  const effectiveKeyColor = keyColor ?? colors.primary;
  return (
    <Text>
      <Text color={effectiveKeyColor}>{keyName}</Text>
      <Text dimColor>: {action}</Text>
    </Text>
  );
}

// ============================================================================
// KEYBOARD HINTS ROW COMPONENT
// ============================================================================

export interface KeyHintsRowProps {
  /** Array of key hints */
  hints: Array<{ key: string; action: string }>;
  /** Separator between hints */
  separator?: string;
}

/**
 * Row of keyboard hints
 */
export function KeyHintsRow({ hints, separator = " | " }: KeyHintsRowProps) {
  const colors = useThemeColors();
  return (
    <Text dimColor>
      {hints.map((hint, index) => (
        <Text key={hint.key}>
          {index > 0 && separator}
          <Text color={colors.primary}>{hint.key}</Text>
          <Text>: {hint.action}</Text>
        </Text>
      ))}
    </Text>
  );
}

// ============================================================================
// HEADER COMPONENT
// ============================================================================

export interface HeaderProps {
  /** Main title */
  title: string;
  /** Subtitle/tagline */
  subtitle?: string;
  /** Border color */
  borderColor?: string;
}

/**
 * App header with title and optional subtitle
 */
export function Header({ title, subtitle, borderColor }: HeaderProps) {
  const colors = useThemeColors();
  const effectiveBorderColor = borderColor ?? colors.primary;
  return (
    <Box
      borderStyle="round"
      borderColor={effectiveBorderColor}
      paddingX={spacing.md}
    >
      <Text bold color={effectiveBorderColor}>
        {title}
      </Text>
      {subtitle && (
        <>
          <Text> - </Text>
          <Text>{subtitle}</Text>
        </>
      )}
    </Box>
  );
}

// ============================================================================
// SECTION HEADER COMPONENT
// ============================================================================

export interface SectionHeaderProps {
  /** Section title */
  title: string;
  /** Whether this section is active/focused */
  isActive?: boolean;
}

/**
 * Section header with focus indicator
 */
export function SectionHeader({ title, isActive = false }: SectionHeaderProps) {
  const colors = useThemeColors();
  return (
    <Box marginBottom={spacing.xs}>
      <Text
        color={isActive ? colors.primary : colors.textMuted}
        bold={isActive}
      >
        {isActive ? `${navIcons.arrowRight} ` : "  "}
        {title}
      </Text>
    </Box>
  );
}

// ============================================================================
// EMPTY STATE COMPONENT
// ============================================================================

export interface EmptyStateProps {
  /** Message to display */
  message: string;
  /** Optional hint */
  hint?: string;
}

/**
 * Empty state placeholder
 */
export function EmptyState({ message, hint }: EmptyStateProps) {
  const colors = useThemeColors();
  return (
    <Box flexDirection="column" padding={spacing.md}>
      <Text color={colors.accent}>{message}</Text>
      {hint && <Text dimColor>{hint}</Text>}
    </Box>
  );
}

// ============================================================================
// SCORE DISPLAY COMPONENT
// ============================================================================

export interface ScoreDisplayProps {
  /** Label for the score */
  label: string;
  /** Score value */
  value: number | string;
  /** Score color */
  color?: string;
  /** Format as number with commas */
  formatNumber?: boolean;
}

/**
 * Score display with label and value
 */
export function ScoreDisplay({
  label,
  value,
  color,
  formatNumber = true,
}: ScoreDisplayProps) {
  const colors = useThemeColors();
  const effectiveColor = color ?? colors.primary;
  const displayValue =
    formatNumber && typeof value === "number" ? value.toLocaleString() : value;

  return (
    <Box>
      <Text color={effectiveColor}>{label}: </Text>
      <Text bold color={effectiveColor}>
        {displayValue}
      </Text>
    </Box>
  );
}

// ============================================================================
// COUNTDOWN COMPONENT
// ============================================================================

export interface CountdownProps {
  /** Seconds remaining */
  seconds: number;
  /** Label */
  label?: string;
  /** Warning threshold (seconds) */
  warningThreshold?: number;
  /** Critical threshold (seconds) */
  criticalThreshold?: number;
}

/**
 * Countdown timer with color warnings
 */
export function Countdown({
  seconds,
  label = "Time",
  warningThreshold = 30,
  criticalThreshold = 10,
}: CountdownProps) {
  const colors = useThemeColors();
  const color =
    seconds <= criticalThreshold
      ? colors.error
      : seconds <= warningThreshold
        ? colors.warning
        : colors.text;

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const display = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

  return (
    <Box>
      <Text dimColor>{label}: </Text>
      <Text color={color} bold={seconds <= criticalThreshold}>
        {display}
      </Text>
    </Box>
  );
}

// ============================================================================
// LIST ITEM COMPONENT
// ============================================================================

export interface ListItemProps {
  /** Item content */
  children: ReactNode;
  /** Whether this item is selected */
  isSelected?: boolean;
  /** Bullet style */
  bullet?: "dot" | "arrow" | "checkbox" | "number";
  /** Number for numbered lists */
  number?: number;
}

/**
 * List item with various bullet styles
 */
export function ListItem({
  children,
  isSelected = false,
  bullet = "dot",
  number,
}: ListItemProps) {
  const colors = useThemeColors();
  const color = isSelected ? colors.primary : undefined;

  let bulletChar: string;
  switch (bullet) {
    case "arrow":
      bulletChar = isSelected ? navIcons.arrowRight : navIcons.bullet;
      break;
    case "checkbox":
      bulletChar = isSelected ? navIcons.checkboxChecked : navIcons.checkbox;
      break;
    case "number":
      bulletChar = `${number ?? 1}.`;
      break;
    default:
      bulletChar = navIcons.bullet;
  }

  return (
    <Box>
      <Text color={color}>{bulletChar} </Text>
      <Text color={color}>{children}</Text>
    </Box>
  );
}
