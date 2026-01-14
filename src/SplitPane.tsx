/**
 * SplitPane component for creating resizable split layouts in the terminal.
 * Supports horizontal (left/right) and vertical (top/bottom) splits.
 */

import { Box, Text, useInput } from "ink";
import type { ReactNode } from "react";
import type { SplitDirection } from "./use-layout-state.js";
import { colors, boxChars, navIcons } from "./theme.js";

export interface SplitPaneProps {
  /** First pane content (left/top) */
  first: ReactNode;
  /** Second pane content (right/bottom) */
  second: ReactNode;
  /** Split direction */
  direction: SplitDirection;
  /** Split ratio (0.0 - 1.0) */
  splitRatio: number;
  /** Available width in columns */
  width: number;
  /** Available height in rows */
  height: number;
  /** Whether the split is currently being resized */
  isResizing?: boolean;
  /** Whether to show the secondary pane */
  showSecondary?: boolean;
  /** Which pane is focused (0 or 1) */
  focusedPane?: 0 | 1;
  /** Callback when resize keys are pressed */
  onResize?: (delta: number) => void;
  /** Callback when focus toggle is requested */
  onToggleFocus?: () => void;
  /** Whether this component handles input */
  handleInput?: boolean;
  /** Step size for resize operations */
  resizeStep?: number;
}

interface DividerProps {
  direction: SplitDirection;
  width: number;
  height: number;
  isResizing: boolean;
}

function Divider({ direction, width, height, isResizing }: DividerProps) {
  const color = isResizing ? colors.primary : colors.border;

  if (direction === "horizontal") {
    // Vertical divider (one column wide, full height)
    const dividerChar = isResizing ? boxChars.heavy.vertical : boxChars.light.vertical;
    return (
      <Box flexDirection="column" width={1} height={height}>
        {Array.from({ length: height }).map((_, i) => (
          <Text key={i} color={color}>
            {dividerChar}
          </Text>
        ))}
      </Box>
    );
  } else {
    // Horizontal divider (full width, one row)
    const dividerChar = isResizing ? boxChars.heavy.horizontal : boxChars.light.horizontal;
    return (
      <Box width={width} height={1}>
        <Text color={color}>{dividerChar.repeat(width)}</Text>
      </Box>
    );
  }
}

/**
 * SplitPane component that creates a resizable split layout.
 *
 * In horizontal mode: first pane on left, second on right
 * In vertical mode: first pane on top, second on bottom
 *
 * Use keyboard shortcuts to resize:
 * - Alt+Left/Alt+Up: Make first pane smaller
 * - Alt+Right/Alt+Down: Make first pane larger
 * - Tab: Toggle focus between panes
 */
export function SplitPane({
  first,
  second,
  direction,
  splitRatio,
  width,
  height,
  isResizing = false,
  showSecondary = true,
  focusedPane = 0,
  onResize,
  onToggleFocus,
  handleInput = true,
  resizeStep = 0.05,
}: SplitPaneProps) {
  // Handle keyboard input for resizing
  useInput(
    (_input, key) => {
      if (!handleInput) return;

      // Tab to toggle focus
      if (key.tab && onToggleFocus) {
        onToggleFocus();
        return;
      }

      // Alt + arrow keys to resize
      if (key.meta && onResize) {
        if (direction === "horizontal") {
          if (key.leftArrow) {
            onResize(-resizeStep);
          } else if (key.rightArrow) {
            onResize(resizeStep);
          }
        } else {
          if (key.upArrow) {
            onResize(-resizeStep);
          } else if (key.downArrow) {
            onResize(resizeStep);
          }
        }
      }
    },
    { isActive: handleInput }
  );

  // If secondary is hidden, just render first pane
  if (!showSecondary) {
    return (
      <Box width={width} height={height}>
        {first}
      </Box>
    );
  }

  // Calculate pane dimensions
  let firstWidth: number, firstHeight: number;
  let secondWidth: number, secondHeight: number;

  if (direction === "horizontal") {
    // Horizontal split: left | right
    // Reserve 1 column for divider
    const usableWidth = Math.max(0, width - 1);
    firstWidth = Math.floor(usableWidth * splitRatio);
    secondWidth = usableWidth - firstWidth;
    firstHeight = height;
    secondHeight = height;
  } else {
    // Vertical split: top / bottom
    // Reserve 1 row for divider
    const usableHeight = Math.max(0, height - 1);
    firstHeight = Math.floor(usableHeight * splitRatio);
    secondHeight = usableHeight - firstHeight;
    firstWidth = width;
    secondWidth = width;
  }

  // Ensure minimum dimensions
  firstWidth = Math.max(0, firstWidth);
  firstHeight = Math.max(0, firstHeight);
  secondWidth = Math.max(0, secondWidth);
  secondHeight = Math.max(0, secondHeight);

  const firstPaneBorderColor = focusedPane === 0 ? colors.borderFocus : colors.border;
  const secondPaneBorderColor = focusedPane === 1 ? colors.borderFocus : colors.border;

  return (
    <Box
      flexDirection={direction === "horizontal" ? "row" : "column"}
      width={width}
      height={height}
    >
      {/* First pane */}
      <Box
        width={firstWidth}
        height={firstHeight}
        borderStyle="single"
        borderColor={firstPaneBorderColor}
        overflow="hidden"
      >
        {first}
      </Box>

      {/* Divider */}
      <Divider
        direction={direction}
        width={direction === "horizontal" ? 1 : width}
        height={direction === "horizontal" ? height : 1}
        isResizing={isResizing}
      />

      {/* Second pane */}
      <Box
        width={secondWidth}
        height={secondHeight}
        borderStyle="single"
        borderColor={secondPaneBorderColor}
        overflow="hidden"
      >
        {second}
      </Box>
    </Box>
  );
}

/**
 * Pane wrapper component with a title and optional border highlighting.
 */
export interface PaneProps {
  /** Pane title */
  title?: string;
  /** Pane content */
  children: ReactNode;
  /** Whether this pane is focused */
  isFocused?: boolean;
  /** Width in columns */
  width?: number;
  /** Height in rows */
  height?: number;
}

export function Pane({
  title,
  children,
  isFocused = false,
  width,
  height,
}: PaneProps) {
  const titleColor = isFocused ? colors.primary : colors.textMuted;

  return (
    <Box flexDirection="column" width={width} height={height}>
      {title && (
        <Box>
          <Text color={titleColor} bold={isFocused}>
            {isFocused ? `${navIcons.arrowRight} ` : "  "}
            {title}
          </Text>
        </Box>
      )}
      <Box flexGrow={1} flexDirection="column">
        {children}
      </Box>
    </Box>
  );
}
