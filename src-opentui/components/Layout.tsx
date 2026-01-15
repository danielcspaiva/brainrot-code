/**
 * Layout component for BrainRot CLI v2
 *
 * Implements a split-pane layout with:
 * - Left panel: Claude Code output (ClaudePanel)
 * - Right panel: Game display (GamePanel)
 * - Resizable with keyboard controls (Alt+arrows)
 * - Collapsible panels
 */

import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import { useState, useCallback, type ReactNode } from "react";

export interface LayoutProps {
  /** Currently focused pane */
  focus: "claude" | "game";
  /** Left panel content */
  leftPanel: ReactNode;
  /** Right panel content */
  rightPanel: ReactNode;
  /** Status bar content */
  statusBar: ReactNode;
}

/** Minimum panel width in percentage */
const MIN_PANEL_WIDTH = 20;
/** Maximum panel width in percentage */
const MAX_PANEL_WIDTH = 80;
/** Width adjustment step per keypress */
const WIDTH_STEP = 5;

export default function Layout({
  focus,
  leftPanel,
  rightPanel,
  statusBar,
}: LayoutProps) {
  const { width } = useTerminalDimensions();

  // Split ratio (percentage for left panel)
  const [splitRatio, setSplitRatio] = useState(60);

  // Panel visibility
  const [leftVisible, setLeftVisible] = useState(true);
  const [rightVisible, setRightVisible] = useState(true);

  // Handle resize keyboard shortcuts
  useKeyboard(
    useCallback(
      (key) => {
        // Alt+Left: Decrease left panel width
        if (key.alt && key.name === "left") {
          setSplitRatio((prev) =>
            Math.max(MIN_PANEL_WIDTH, prev - WIDTH_STEP)
          );
        }

        // Alt+Right: Increase left panel width
        if (key.alt && key.name === "right") {
          setSplitRatio((prev) =>
            Math.min(MAX_PANEL_WIDTH, prev + WIDTH_STEP)
          );
        }

        // H key: Toggle panel visibility based on focus
        if (key.name === "h" && !key.ctrl && !key.alt && !key.shift) {
          if (focus === "claude") {
            setLeftVisible((prev) => !prev);
          } else {
            setRightVisible((prev) => !prev);
          }
        }

        // Alt+H: Reset layout
        if (key.alt && key.name === "h") {
          setSplitRatio(60);
          setLeftVisible(true);
          setRightVisible(true);
        }
      },
      [focus]
    )
  );

  // Calculate panel widths
  const bothVisible = leftVisible && rightVisible;
  const leftWidth = bothVisible
    ? Math.floor((width * splitRatio) / 100)
    : leftVisible
      ? width
      : 0;
  const rightWidth = bothVisible
    ? width - leftWidth - 1 // -1 for gap
    : rightVisible
      ? width
      : 0;

  return (
    <box
      style={{
        flexDirection: "column",
        width: "100%",
        height: "100%",
      }}
    >
      {/* Main content area - split pane */}
      <box
        style={{
          flexDirection: "row",
          flexGrow: 1,
          gap: bothVisible ? 1 : 0,
        }}
      >
        {/* Left panel (Claude) */}
        {leftVisible && (
          <box
            style={{
              width: leftWidth,
              flexDirection: "column",
            }}
          >
            {leftPanel}
          </box>
        )}

        {/* Right panel (Game) */}
        {rightVisible && (
          <box
            style={{
              width: rightWidth,
              flexDirection: "column",
            }}
          >
            {rightPanel}
          </box>
        )}
      </box>

      {/* Status bar */}
      {statusBar}
    </box>
  );
}
