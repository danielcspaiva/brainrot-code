/**
 * Main Layout component that provides the split-pane layout for the app.
 * Combines terminal size tracking, layout state management, and the SplitPane component.
 */

import { Box, Text, useInput } from "ink";
import type { ReactNode } from "react";
import { SplitPane } from "./SplitPane.js";
import {
  useTerminalSize,
  MIN_WIDTH,
  MIN_HEIGHT,
} from "./use-terminal-size.js";
import { useLayoutState, type UseLayoutStateOptions } from "./use-layout-state.js";
import { navIcons } from "./theme.js";
import { useThemeColors } from "./useTheme.js";

export interface LayoutProps {
  /** Content for the game area (left/top pane) */
  gameArea: ReactNode;
  /** Content for the management area (right/bottom pane) */
  managementArea: ReactNode;
  /** Title for the game pane */
  gameTitle?: string;
  /** Title for the management pane */
  managementTitle?: string;
  /** Layout configuration options */
  layoutOptions?: UseLayoutStateOptions;
  /** Custom header content */
  header?: ReactNode;
  /** Custom footer content */
  footer?: ReactNode;
  /** Whether the layout handles keyboard input */
  handleInput?: boolean;
}

interface TooSmallWarningProps {
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
}

function TooSmallWarning({
  width,
  height,
  minWidth,
  minHeight,
}: TooSmallWarningProps) {
  const colors = useThemeColors();
  return (
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      padding={1}
    >
      <Text color={colors.warning} bold>
        Terminal too small
      </Text>
      <Text color={colors.textMuted}>
        Current: {width}x{height}
      </Text>
      <Text color={colors.textMuted}>
        Required: {minWidth}x{minHeight}
      </Text>
      <Text color={colors.warning}>Please resize your terminal</Text>
    </Box>
  );
}

interface LayoutHelpProps {
  direction: "horizontal" | "vertical";
  showSecondary: boolean;
  isSmall: boolean;
}

function LayoutHelp({ direction, showSecondary, isSmall }: LayoutHelpProps) {
  if (isSmall) {
    return (
      <Text dimColor>
        Tab: Focus | H: Toggle pane | R: Reset
      </Text>
    );
  }

  const resizeKeys =
    direction === "horizontal" ? "Alt+←/→: Resize" : "Alt+↑/↓: Resize";

  return (
    <Text dimColor>
      Tab: Focus | {resizeKeys} | D: Direction | H: {showSecondary ? "Hide" : "Show"}{" "}
      pane | R: Reset
    </Text>
  );
}

/**
 * Main layout component that provides a resizable split-pane interface.
 *
 * Features:
 * - Responsive to terminal size changes
 * - Graceful handling of small terminal windows
 * - Keyboard shortcuts for resizing and layout control
 * - Persisted layout state during session
 *
 * Keyboard shortcuts:
 * - Tab: Toggle focus between panes
 * - Alt+Arrow: Resize panes
 * - D: Toggle split direction
 * - H: Hide/show secondary pane
 * - R: Reset layout to defaults
 */
export function Layout({
  gameArea,
  managementArea,
  gameTitle = "Game",
  managementTitle = "Management",
  layoutOptions,
  header,
  footer,
  handleInput = true,
}: LayoutProps) {
  const terminalSize = useTerminalSize();
  const layout = useLayoutState(layoutOptions);
  const colors = useThemeColors();

  // Handle layout-specific keyboard shortcuts
  useInput(
    (input) => {
      if (!handleInput) return;

      // 'd' to toggle direction
      if (input === "d" || input === "D") {
        layout.toggleDirection();
        return;
      }

      // 'h' to toggle secondary pane
      if (input === "h" || input === "H") {
        layout.toggleSecondary();
        return;
      }

      // 'r' to reset layout
      if (input === "r" || input === "R") {
        layout.resetLayout();
        return;
      }
    },
    { isActive: handleInput }
  );

  // Show warning if terminal is too small
  if (terminalSize.isTooSmall) {
    return (
      <TooSmallWarning
        width={terminalSize.width}
        height={terminalSize.height}
        minWidth={MIN_WIDTH}
        minHeight={MIN_HEIGHT}
      />
    );
  }

  // Calculate available space for the split pane
  // Account for header (3 rows), footer (2 rows), and help text (1 row)
  const headerHeight = header ? 3 : 0;
  const footerHeight = footer ? 2 : 0;
  const helpHeight = 1;
  const availableHeight = Math.max(
    1,
    terminalSize.height - headerHeight - footerHeight - helpHeight
  );
  const availableWidth = terminalSize.width;

  // Create pane content with titles
  const firstPaneContent = (
    <Box flexDirection="column" width="100%" height="100%">
      <Box>
        <Text
          color={layout.state.focusedPane === 0 ? colors.primary : colors.textMuted}
          bold={layout.state.focusedPane === 0}
        >
          {layout.state.focusedPane === 0 ? `${navIcons.arrowRight} ` : "  "}
          {gameTitle}
        </Text>
      </Box>
      <Box flexGrow={1} flexDirection="column" overflow="hidden">
        {gameArea}
      </Box>
    </Box>
  );

  const secondPaneContent = (
    <Box flexDirection="column" width="100%" height="100%">
      <Box>
        <Text
          color={layout.state.focusedPane === 1 ? colors.primary : colors.textMuted}
          bold={layout.state.focusedPane === 1}
        >
          {layout.state.focusedPane === 1 ? `${navIcons.arrowRight} ` : "  "}
          {managementTitle}
        </Text>
      </Box>
      <Box flexGrow={1} flexDirection="column" overflow="hidden">
        {managementArea}
      </Box>
    </Box>
  );

  return (
    <Box flexDirection="column" width={terminalSize.width} height={terminalSize.height}>
      {/* Header */}
      {header && (
        <Box height={headerHeight} flexShrink={0}>
          {header}
        </Box>
      )}

      {/* Split pane content */}
      <Box flexGrow={1} height={availableHeight}>
        <SplitPane
          first={firstPaneContent}
          second={secondPaneContent}
          direction={layout.state.direction}
          splitRatio={layout.state.splitRatio}
          width={availableWidth}
          height={availableHeight}
          isResizing={layout.state.isResizing}
          showSecondary={layout.state.showSecondary}
          focusedPane={layout.state.focusedPane}
          onResize={layout.adjustSplitRatio}
          onToggleFocus={layout.toggleFocus}
          handleInput={handleInput}
        />
      </Box>

      {/* Footer */}
      {footer && (
        <Box height={footerHeight} flexShrink={0}>
          {footer}
        </Box>
      )}

      {/* Help text */}
      <Box height={helpHeight} flexShrink={0}>
        <LayoutHelp
          direction={layout.state.direction}
          showSecondary={layout.state.showSecondary}
          isSmall={terminalSize.isSmall}
        />
      </Box>
    </Box>
  );
}

/**
 * Export the layout state hook for external access to layout controls
 */
export { useLayoutState, useTerminalSize };
export type { UseLayoutStateOptions, UseLayoutStateResult } from "./use-layout-state.js";
export type { UseTerminalSizeResult } from "./use-terminal-size.js";
