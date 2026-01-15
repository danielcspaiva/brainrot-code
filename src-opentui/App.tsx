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
import { useState, useCallback, useMemo } from "react";
import {
  Layout,
  ClaudePanel,
  GamePanel,
  StatusBar,
  ErrorBoundary,
  ErrorDisplay,
  GameSelector,
} from "./components/index.js";
import {
  type AppError,
  type RecoveryAction,
  createAppError,
} from "./errors/index.js";
import { ThemeProvider, useTheme } from "./themes/index.js";
import { getGameById, type GameRegistryEntry } from "./games/index.js";
import type { GameStateUpdate } from "./game-types.js";

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
  error: AppError | null;
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

/**
 * Inner App component that uses theme context
 */
function AppContent() {
  const { width, height } = useTerminalDimensions();
  const [appState, setAppState] = useState<AppState>("INIT");
  const [focus, setFocus] = useState<FocusTarget>("claude");
  const [error, setError] = useState<AppError | null>(null);
  const [previousState, setPreviousState] = useState<AppState>("INIT");

  // Game state
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [showGameSelector, setShowGameSelector] = useState(false);
  const [gameState, setGameState] = useState<GameStateUpdate | null>(null);

  // Theme
  const { themeId, nextTheme, theme } = useTheme();

  // Get selected game entry
  const selectedGame: GameRegistryEntry | undefined = useMemo(() => {
    if (!selectedGameId) return undefined;
    return getGameById(selectedGameId);
  }, [selectedGameId]);

  // Handle error boundary catches
  const handleBoundaryError = useCallback(
    (boundaryError: AppError) => {
      setPreviousState(appState);
      setError(boundaryError);
      setAppState("ERROR");
    },
    [appState]
  );

  // Handle recovery actions from error display
  const handleRecoveryAction = useCallback(
    (action: RecoveryAction) => {
      switch (action) {
        case "dismiss":
          setError(null);
          setAppState(previousState);
          break;
        case "retry":
          setError(null);
          setAppState(previousState);
          break;
        case "restart":
          setError(null);
          setAppState("INIT");
          break;
        case "reload_config":
          setError(null);
          setAppState("INIT");
          break;
        case "reload_prd":
          setError(null);
          setAppState("PRD_INPUT");
          break;
        case "kill_process":
          setError(null);
          setAppState("INIT");
          break;
      }
    },
    [previousState]
  );

  // Handle game selection
  const handleGameSelect = useCallback((gameId: string) => {
    setSelectedGameId(gameId);
    setShowGameSelector(false);
    setGameState(null);
  }, []);

  // Handle game exit
  const handleGameExit = useCallback(() => {
    setSelectedGameId(null);
    setGameState(null);
  }, []);

  // Handle game state changes
  const handleGameStateChange = useCallback((update: GameStateUpdate) => {
    setGameState(update);
  }, []);

  // Handle global keyboard shortcuts
  useKeyboard(
    useCallback(
      (key) => {
        // Don't process global shortcuts if game selector is open
        if (showGameSelector) return;

        // Exit on Ctrl+C
        if (key.ctrl && key.name === "c") {
          process.exit(0);
        }

        // ESC to close game selector or exit game, or exit app if nothing to close
        if (key.name === "escape") {
          if (selectedGameId) {
            // Exit current game to return to game selector prompt
            handleGameExit();
          } else {
            // Exit app
            process.exit(0);
          }
          return;
        }

        // Tab to switch focus between panes
        if (key.name === "tab") {
          setFocus((prev) => (prev === "claude" ? "game" : "claude"));
        }

        // G key: Open game selector (when game panel is focused)
        if (
          key.name === "g" &&
          !key.ctrl &&
          !key.alt &&
          !key.shift &&
          focus === "game"
        ) {
          setShowGameSelector(true);
        }

        // T key: Cycle theme
        if (key.name === "t" && !key.ctrl && !key.alt && !key.shift) {
          nextTheme();
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
            setAppState(previousState);
          } else {
            setPreviousState(appState);
            setError(
              createAppError("unknown", "Test error message", {
                severity: "error",
                details: "This is a test error triggered with Ctrl+E",
                recoveryActions: ["retry", "dismiss"],
              })
            );
            setAppState("ERROR");
          }
        }
      },
      [
        appState,
        previousState,
        focus,
        showGameSelector,
        selectedGameId,
        nextTheme,
        handleGameExit,
      ]
    )
  );

  const stateInfo = STATE_INFO[appState];

  // Calculate game panel dimensions (rough estimate - accounting for borders and padding)
  const gameDimensions = useMemo(() => {
    // Estimate: right panel is ~40% of width minus borders/padding
    const panelWidth = Math.floor(width * 0.4) - 4;
    // Estimate: full height minus status bar and borders
    const panelHeight = height - 4;
    return {
      width: Math.max(20, panelWidth),
      height: Math.max(10, panelHeight),
    };
  }, [width, height]);

  // Render game component if selected
  const gameComponent = useMemo(() => {
    if (!selectedGame) return undefined;

    const GameComponent = selectedGame.component;
    return (
      <GameComponent
        hasFocus={focus === "game" && !showGameSelector}
        dimensions={gameDimensions}
        onExit={handleGameExit}
        onGameStateChange={handleGameStateChange}
        autoPauseEnabled={true}
      />
    );
  }, [
    selectedGame,
    focus,
    showGameSelector,
    gameDimensions,
    handleGameExit,
    handleGameStateChange,
  ]);

  // When in error state, show error overlay
  if (appState === "ERROR" && error) {
    return (
      <box flexDirection="column" width="100%" height="100%">
        <box
          flexGrow={1}
          padding={2}
          justifyContent="center"
          alignItems="center"
        >
          <ErrorDisplay
            error={error}
            showDetails={true}
            onRecoveryAction={handleRecoveryAction}
            hasFocus={true}
          />
        </box>
        <StatusBar
          stateLabel={stateInfo.label}
          stateColor={stateInfo.color}
          focus={focus}
          dimensions={{ width, height }}
          themeId={themeId}
        />
      </box>
    );
  }

  // Game selector overlay
  if (showGameSelector) {
    return (
      <box flexDirection="column" width="100%" height="100%">
        <box flexGrow={1}>
          <GameSelector
            hasFocus={true}
            onSelect={handleGameSelect}
            onClose={() => setShowGameSelector(false)}
            currentGameId={selectedGameId}
          />
        </box>
        <StatusBar
          stateLabel={stateInfo.label}
          stateColor={stateInfo.color}
          focus={focus}
          dimensions={{ width, height }}
          themeId={themeId}
        />
      </box>
    );
  }

  return (
    <ErrorBoundary onError={handleBoundaryError}>
      <Layout
        focus={focus}
        leftPanel={
          <ClaudePanel
            hasFocus={focus === "claude"}
            error={error?.message ?? null}
          />
        }
        rightPanel={
          <GamePanel
            hasFocus={focus === "game"}
            game={gameComponent}
            gameName={selectedGame?.info.name}
            score={gameState?.score ?? undefined}
          />
        }
        statusBar={
          <StatusBar
            stateLabel={stateInfo.label}
            stateColor={stateInfo.color}
            focus={focus}
            dimensions={{ width, height }}
            gameName={selectedGame?.info.name}
            gameScore={gameState?.score ?? undefined}
            gameStatus={gameState?.status ?? undefined}
            themeId={themeId}
          />
        }
      />
    </ErrorBoundary>
  );
}

/**
 * Main App component with ThemeProvider wrapper
 */
export default function App() {
  return (
    <ThemeProvider initialTheme="default">
      <AppContent />
    </ThemeProvider>
  );
}
