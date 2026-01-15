/**
 * Main App component for BrainRot CLI v2 - OpenTUI
 *
 * Implements the application state machine:
 * - INIT: Load config, check Claude CLI
 * - PRD_INPUT: User enters/loads PRD
 * - LOOP_RUNNING: Ralph loop executing, game playable
 * - PAUSED: Loop paused (user input needed)
 * - COMPLETE: All tasks done
 * - ERROR: Error state with recovery options
 */

import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import { useState, useCallback } from "react";
import { Layout, ClaudePanel, GamePanel, StatusBar } from "./components/index.js";

/** Application state machine states */
export type AppState =
  | "INIT"
  | "PRD_INPUT"
  | "LOOP_RUNNING"
  | "PAUSED"
  | "COMPLETE"
  | "ERROR";

/** Focus targets for keyboard navigation */
export type FocusTarget = "claude" | "game";

/** Application context for child components */
export interface AppContext {
  state: AppState;
  focus: FocusTarget;
  error: string | null;
}

/** State display configuration */
const STATE_INFO: Record<AppState, { label: string; color: string }> = {
  INIT: { label: "Initializing...", color: "#888888" },
  PRD_INPUT: { label: "Enter PRD", color: "#FFFF00" },
  LOOP_RUNNING: { label: "Loop Running", color: "#00FF00" },
  PAUSED: { label: "Paused", color: "#FFA500" },
  COMPLETE: { label: "Complete", color: "#00FFFF" },
  ERROR: { label: "Error", color: "#FF0000" },
};

export default function App() {
  const { width, height } = useTerminalDimensions();
  const [appState, setAppState] = useState<AppState>("INIT");
  const [focus, setFocus] = useState<FocusTarget>("claude");
  const [error, setError] = useState<string | null>(null);

  // Handle global keyboard shortcuts
  useKeyboard(
    useCallback(
      (key) => {
        // Exit on ESC or Ctrl+C
        if (key.name === "escape" || (key.ctrl && key.name === "c")) {
          process.exit(0);
        }

        // Tab to switch focus between panes
        if (key.name === "tab") {
          setFocus((prev) => (prev === "claude" ? "game" : "claude"));
        }

        // State transitions for demo/testing
        if (key.ctrl && key.name === "n") {
          // Ctrl+N: Move to next state (for testing state machine)
          setAppState((prev) => {
            switch (prev) {
              case "INIT":
                return "PRD_INPUT";
              case "PRD_INPUT":
                return "LOOP_RUNNING";
              case "LOOP_RUNNING":
                return "PAUSED";
              case "PAUSED":
                return "LOOP_RUNNING";
              case "COMPLETE":
                return "INIT";
              case "ERROR":
                return "INIT";
              default:
                return prev;
            }
          });
        }

        // Ctrl+E: Toggle error state (for testing)
        if (key.ctrl && key.name === "e") {
          if (appState === "ERROR") {
            setError(null);
            setAppState("INIT");
          } else {
            setError("Test error message");
            setAppState("ERROR");
          }
        }
      },
      [appState]
    )
  );

  const stateInfo = STATE_INFO[appState];

  return (
    <Layout
      focus={focus}
      leftPanel={
        <ClaudePanel
          hasFocus={focus === "claude"}
          error={error}
        />
      }
      rightPanel={
        <GamePanel
          hasFocus={focus === "game"}
        />
      }
      statusBar={
        <StatusBar
          stateLabel={stateInfo.label}
          stateColor={stateInfo.color}
          focus={focus}
          dimensions={{ width, height }}
        />
      }
    />
  );
}
