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

  // Get display info for current state
  const getStateInfo = () => {
    switch (appState) {
      case "INIT":
        return { label: "Initializing...", color: "#888888" };
      case "PRD_INPUT":
        return { label: "Enter PRD", color: "#FFFF00" };
      case "LOOP_RUNNING":
        return { label: "Loop Running", color: "#00FF00" };
      case "PAUSED":
        return { label: "Paused", color: "#FFA500" };
      case "COMPLETE":
        return { label: "Complete", color: "#00FFFF" };
      case "ERROR":
        return { label: "Error", color: "#FF0000" };
    }
  };

  const stateInfo = getStateInfo();

  return (
    <box
      style={{
        flexDirection: "column",
        width: "100%",
        height: "100%",
      }}
    >
      {/* Main content area - placeholder for split-pane layout */}
      <box
        style={{
          flexDirection: "row",
          flexGrow: 1,
          gap: 1,
        }}
      >
        {/* Claude Panel placeholder */}
        <box
          title="Claude"
          style={{
            border: true,
            borderStyle: focus === "claude" ? "double" : "single",
            borderColor: focus === "claude" ? "#00FF00" : "#444444",
            flexGrow: 1,
            flexDirection: "column",
            padding: 1,
          }}
        >
          <text fg="#00FF00">BrainRot CLI v2 - OpenTUI</text>
          <text fg="#888888">Claude Code output will appear here</text>
          {error && <text fg="#FF0000">Error: {error}</text>}
        </box>

        {/* Game Panel placeholder */}
        <box
          title="Game"
          style={{
            border: true,
            borderStyle: focus === "game" ? "double" : "single",
            borderColor: focus === "game" ? "#00FF00" : "#444444",
            width: Math.floor(width * 0.4),
            flexDirection: "column",
            padding: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <text fg="#888888">Game panel</text>
          <text fg="#666666">Select a game to play</text>
        </box>
      </box>

      {/* Status bar */}
      <box
        style={{
          height: 1,
          flexDirection: "row",
          backgroundColor: "#222222",
          justifyContent: "space-between",
          paddingLeft: 1,
          paddingRight: 1,
        }}
      >
        <text fg={stateInfo.color}>[{stateInfo.label}]</text>
        <text fg="#888888">
          Focus: {focus} | {width}x{height}
        </text>
        <text fg="#666666">Tab: Switch | Ctrl+N: Next State | ESC: Exit</text>
      </box>
    </box>
  );
}
