/**
 * Status Bar Component
 *
 * Persistent status bar showing loop status, game info,
 * and keyboard shortcut hints at a glance.
 */

import { Box, Text } from "ink";
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { useThemeColors, useStatusColors } from "./useTheme.js";
import { statusIcons, alertIcons } from "./theme.js";

// ============================================================================
// GAME STATUS CONTEXT
// ============================================================================

/**
 * Current game state information for the status bar
 */
export interface CurrentGameState {
  /** Game ID if playing */
  gameId: string | null;
  /** Display name of the game */
  gameName: string | null;
  /** Current score */
  score: number | null;
  /** Game status */
  status: "playing" | "paused" | "game_over" | "menu" | null;
  /** High score for comparison */
  highScore: number | null;
}

/**
 * Game status context value
 */
interface GameStatusContextValue {
  /** Current game state */
  gameState: CurrentGameState;
  /** Update game state */
  setGameState: (state: Partial<CurrentGameState>) => void;
  /** Clear game state (when exiting game) */
  clearGameState: () => void;
}

const initialGameState: CurrentGameState = {
  gameId: null,
  gameName: null,
  score: null,
  status: null,
  highScore: null,
};

const GameStatusContext = createContext<GameStatusContextValue>({
  gameState: initialGameState,
  setGameState: () => {},
  clearGameState: () => {},
});

/**
 * Provider for game status context
 */
export function GameStatusProvider({ children }: { children: ReactNode }) {
  const [gameState, setGameStateInternal] = useState<CurrentGameState>(initialGameState);

  const setGameState = useCallback((updates: Partial<CurrentGameState>) => {
    setGameStateInternal((prev) => ({ ...prev, ...updates }));
  }, []);

  const clearGameState = useCallback(() => {
    setGameStateInternal(initialGameState);
  }, []);

  return (
    <GameStatusContext.Provider value={{ gameState, setGameState, clearGameState }}>
      {children}
    </GameStatusContext.Provider>
  );
}

/**
 * Hook to access game status context
 */
export function useGameStatus() {
  return useContext(GameStatusContext);
}

// ============================================================================
// STATUS BAR COMPONENT
// ============================================================================

export interface StatusBarProps {
  /** Loop/process status */
  loopStatus: string;
  /** Whether loop needs user attention */
  needsAttention: boolean;
  /** Condensed mode - single line */
  condensed?: boolean;
}

/**
 * Loop status indicator section
 */
function LoopStatusSection({
  loopStatus,
  needsAttention,
}: {
  loopStatus: string;
  needsAttention: boolean;
}) {
  const statusColors = useStatusColors();
  const colors = useThemeColors();

  const statusColor = statusColors[loopStatus as keyof typeof statusColors] ?? colors.textMuted;
  const icon = statusIcons[loopStatus as keyof typeof statusIcons] ?? "?";

  return (
    <Box>
      <Text color={statusColor} bold>
        {icon}
      </Text>
      <Text color={statusColor}> {loopStatus.toUpperCase().replace(/_/g, " ")}</Text>
      {needsAttention && (
        <Text color={colors.secondary} bold>
          {" "}
          {alertIcons.warning}
        </Text>
      )}
    </Box>
  );
}

/**
 * Game info section
 */
function GameInfoSection({
  gameName,
  score,
  status,
  highScore,
}: {
  gameName: string | null;
  score: number | null;
  status: "playing" | "paused" | "game_over" | "menu" | null;
  highScore: number | null;
}) {
  const colors = useThemeColors();

  if (!gameName) {
    return null;
  }

  const statusText =
    status === "paused" ? " [PAUSED]" : status === "game_over" ? " [GAME OVER]" : "";
  const statusColor = status === "paused" ? colors.warning : status === "game_over" ? colors.error : undefined;

  const isNewHighScore = score !== null && highScore !== null && score > highScore;

  return (
    <Box>
      <Text color={colors.primary} bold>
        {gameName}
      </Text>
      {score !== null && (
        <>
          <Text dimColor>: </Text>
          <Text color={isNewHighScore ? colors.success : colors.accent} bold={isNewHighScore}>
            {score}
          </Text>
          <Text dimColor> pts</Text>
        </>
      )}
      {statusText && <Text color={statusColor}>{statusText}</Text>}
    </Box>
  );
}

/**
 * Keyboard hints section
 */
function KeyHintsSection({ isPlaying }: { isPlaying: boolean }) {
  const colors = useThemeColors();

  // Different hints based on context
  const hints = isPlaying
    ? [
        { key: "P", action: "Pause" },
        { key: "Esc", action: "Exit" },
        { key: "Tab", action: "Focus" },
      ]
    : [
        { key: "Tab", action: "Focus" },
        { key: "Ctrl+S", action: "Loop" },
        { key: "Ctrl+,", action: "Settings" },
      ];

  return (
    <Box>
      {hints.map((hint, idx) => (
        <Box key={hint.key}>
          {idx > 0 && <Text dimColor> | </Text>}
          <Text color={colors.accent}>{hint.key}</Text>
          <Text dimColor>: {hint.action}</Text>
        </Box>
      ))}
    </Box>
  );
}

/**
 * Separator between sections
 */
function Separator() {
  return <Text dimColor> │ </Text>;
}

/**
 * Main Status Bar component
 * Shows loop status, current game/score, and keyboard hints in 1-2 lines
 */
export function StatusBar({ loopStatus, needsAttention, condensed = true }: StatusBarProps) {
  const { gameState } = useGameStatus();
  const isPlaying = gameState.status === "playing" || gameState.status === "paused";

  if (condensed) {
    // Single line layout
    return (
      <Box flexDirection="row" justifyContent="space-between" width="100%">
        <Box>
          <LoopStatusSection loopStatus={loopStatus} needsAttention={needsAttention} />
          {gameState.gameName && (
            <>
              <Separator />
              <GameInfoSection
                gameName={gameState.gameName}
                score={gameState.score}
                status={gameState.status}
                highScore={gameState.highScore}
              />
            </>
          )}
        </Box>
        <KeyHintsSection isPlaying={isPlaying} />
      </Box>
    );
  }

  // Two-line layout (more spacious)
  return (
    <Box flexDirection="column">
      <Box flexDirection="row" justifyContent="space-between" width="100%">
        <LoopStatusSection loopStatus={loopStatus} needsAttention={needsAttention} />
        {gameState.gameName && (
          <GameInfoSection
            gameName={gameState.gameName}
            score={gameState.score}
            status={gameState.status}
            highScore={gameState.highScore}
          />
        )}
      </Box>
      <Box justifyContent="flex-end" width="100%">
        <KeyHintsSection isPlaying={isPlaying} />
      </Box>
    </Box>
  );
}

export default StatusBar;
