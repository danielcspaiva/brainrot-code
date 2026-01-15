/**
 * SplitPane component for creating resizable split layouts in the terminal.
 * Supports horizontal (left/right) and vertical (top/bottom) splits.
 */

import { Box, Text, useInput } from "ink";
import { useMemo, memo, type ReactNode } from "react";
import type { SplitDirection } from "./use-layout-state.js";
import { boxChars, navIcons } from "./theme.js";
import { useThemeColors } from "./useTheme.js";

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

const Divider = memo(function Divider({ direction, width, height, isResizing }: DividerProps) {
  const colors = useThemeColors();
  const color = isResizing ? colors.primary : colors.border;

  // Memoize the divider content to prevent recreating arrays on every render
  const dividerContent = useMemo(() => {
    if (direction === "horizontal") {
      // Vertical divider (one column wide, full height)
      const dividerChar = isResizing
        ? boxChars.heavy.vertical
        : boxChars.light.vertical;
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
      const dividerChar = isResizing
        ? boxChars.heavy.horizontal
        : boxChars.light.horizontal;
      return (
        <Box width={width} height={1}>
          <Text color={color}>{dividerChar.repeat(width)}</Text>
        </Box>
      );
    }
  }, [direction, width, height, isResizing, color]);

  return dividerContent;
});

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
  const colors = useThemeColors();

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

  // Calculate pane dimensions - memoized to prevent recalculation on every render
  // Note: This hook must be called unconditionally before any early returns
  const dimensions = useMemo(() => {
    let firstW: number, firstH: number;
    let secondW: number, secondH: number;

    if (direction === "horizontal") {
      // Horizontal split: left | right
      // Reserve 1 column for divider
      const usableWidth = Math.max(0, width - 1);
      firstW = Math.floor(usableWidth * splitRatio);
      secondW = usableWidth - firstW;
      firstH = height;
      secondH = height;
    } else {
      // Vertical split: top / bottom
      // Reserve 1 row for divider
      const usableHeight = Math.max(0, height - 1);
      firstH = Math.floor(usableHeight * splitRatio);
      secondH = usableHeight - firstH;
      firstW = width;
      secondW = width;
    }

    // Ensure minimum dimensions
    return {
      firstWidth: Math.max(0, firstW),
      firstHeight: Math.max(0, firstH),
      secondWidth: Math.max(0, secondW),
      secondHeight: Math.max(0, secondH),
    };
  }, [direction, width, height, splitRatio]);

  // If secondary is hidden, just render first pane
  if (!showSecondary) {
    return (
      <Box width={width} height={height}>
        {first}
      </Box>
    );
  }

  const { firstWidth, firstHeight, secondWidth, secondHeight } = dimensions;

  const firstPaneBorderColor =
    focusedPane === 0 ? colors.borderFocus : colors.border;
  const secondPaneBorderColor =
    focusedPane === 1 ? colors.borderFocus : colors.border;

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

export const Pane = memo(function Pane({
  title,
  children,
  isFocused = false,
  width,
  height,
}: PaneProps) {
  const colors = useThemeColors();
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
});
