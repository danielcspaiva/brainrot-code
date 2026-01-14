/**
 * Status Bar Component
 *
 * Persistent status bar showing loop status, game info,
 * and keyboard shortcut hints at a glance.
 */

import { Box, Text } from "ink";
import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { useThemeColors, useStatusColors } from "./useTheme.js";
import { statusIcons, alertIcons, truncate } from "./theme.js";
import type { LoopTask, LoopProgress } from "./loop-state.js";

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
// LOOP INFO CONTEXT
// ============================================================================

/**
 * Loop information state for the status bar
 */
export interface LoopInfoState {
  /** Current task being worked on */
  currentTask: LoopTask | null;
  /** Loop progress info */
  progress: LoopProgress | null;
  /** ISO timestamp when the loop started */
  startedAt: string | null;
  /** Running token usage total for the loop */
  tokenUsage: number;
}

/**
 * Loop info context value
 */
interface LoopInfoContextValue {
  /** Loop info state */
  loopInfo: LoopInfoState;
  /** Update loop info */
  setLoopInfo: (info: Partial<LoopInfoState>) => void;
  /** Clear loop info */
  clearLoopInfo: () => void;
  /** Add to token usage */
  addTokenUsage: (tokens: number) => void;
}

const initialLoopInfo: LoopInfoState = {
  currentTask: null,
  progress: null,
  startedAt: null,
  tokenUsage: 0,
};

const LoopInfoContext = createContext<LoopInfoContextValue>({
  loopInfo: initialLoopInfo,
  setLoopInfo: () => {},
  clearLoopInfo: () => {},
  addTokenUsage: () => {},
});

/**
 * Provider for loop info context
 */
export function LoopInfoProvider({ children }: { children: ReactNode }) {
  const [loopInfo, setLoopInfoInternal] = useState<LoopInfoState>(initialLoopInfo);

  const setLoopInfo = useCallback((updates: Partial<LoopInfoState>) => {
    setLoopInfoInternal((prev) => ({ ...prev, ...updates }));
  }, []);

  const clearLoopInfo = useCallback(() => {
    setLoopInfoInternal(initialLoopInfo);
  }, []);

  const addTokenUsage = useCallback((tokens: number) => {
    setLoopInfoInternal((prev) => ({
      ...prev,
      tokenUsage: prev.tokenUsage + tokens,
    }));
  }, []);

  return (
    <LoopInfoContext.Provider value={{ loopInfo, setLoopInfo, clearLoopInfo, addTokenUsage }}>
      {children}
    </LoopInfoContext.Provider>
  );
}

/**
 * Hook to access loop info context
 */
export function useLoopInfo() {
  return useContext(LoopInfoContext);
}

// ============================================================================
// TIME FORMATTING HELPERS
// ============================================================================

/**
 * Format milliseconds to HH:MM format
 */
function formatElapsedTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

/**
 * Format token count for display
 */
function formatTokens(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`;
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return tokens.toString();
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
 * Loop info section - shows current task, progress, time elapsed, and token usage
 */
function LoopInfoSection() {
  const colors = useThemeColors();
  const { loopInfo } = useLoopInfo();
  const [elapsedMs, setElapsedMs] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update elapsed time every second when loop is running
  useEffect(() => {
    if (loopInfo.startedAt) {
      // Calculate initial elapsed time
      const startTime = new Date(loopInfo.startedAt).getTime();
      setElapsedMs(Date.now() - startTime);

      // Update every second
      intervalRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startTime);
      }, 1000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
    setElapsedMs(0);
    return undefined;
  }, [loopInfo.startedAt]);

  // Don't show anything if there's no loop info
  if (!loopInfo.progress && !loopInfo.currentTask && !loopInfo.startedAt) {
    return null;
  }

  const progress = loopInfo.progress;
  const currentTask = loopInfo.currentTask;

  // Extract task number from current task title (format: "1. Title here")
  const taskNumber = currentTask?.title.match(/^(\d+)\./)?.[1] ?? null;
  const taskTitle = currentTask?.title.replace(/^\d+\.\s*/, "") ?? null;
  const truncatedTitle = taskTitle ? truncate(taskTitle, 25) : null;

  return (
    <Box gap={1}>
      {/* Current task number and truncated title */}
      {currentTask && (
        <Box>
          <Text color={colors.secondary} bold>
            Task {taskNumber}:
          </Text>
          <Text color={colors.text}> {truncatedTitle}</Text>
        </Box>
      )}

      {/* Progress: X/Y tasks completed */}
      {progress && progress.totalTasks > 0 && (
        <Box>
          <Text dimColor>[</Text>
          <Text color={colors.success}>{progress.completedTasks}</Text>
          <Text dimColor>/</Text>
          <Text color={colors.text}>{progress.totalTasks}</Text>
          <Text dimColor>]</Text>
        </Box>
      )}

      {/* Time elapsed */}
      {loopInfo.startedAt && (
        <Box>
          <Text dimColor>⏱</Text>
          <Text color={colors.accent}>{formatElapsedTime(elapsedMs)}</Text>
        </Box>
      )}

      {/* Token usage */}
      {loopInfo.tokenUsage > 0 && (
        <Box>
          <Text dimColor>⚡</Text>
          <Text color={colors.info}>{formatTokens(loopInfo.tokenUsage)}</Text>
        </Box>
      )}
    </Box>
  );
}

/**
 * Main Status Bar component
 * Shows loop status, loop info, current game/score, and keyboard hints in 1-2 lines
 */
export function StatusBar({ loopStatus, needsAttention, condensed = true }: StatusBarProps) {
  const { gameState } = useGameStatus();
  const { loopInfo } = useLoopInfo();
  const isPlaying = gameState.status === "playing" || gameState.status === "paused";
  const hasLoopInfo = loopInfo.progress || loopInfo.currentTask || loopInfo.startedAt;

  if (condensed) {
    // Single line layout
    return (
      <Box flexDirection="row" justifyContent="space-between" width="100%">
        <Box>
          <LoopStatusSection loopStatus={loopStatus} needsAttention={needsAttention} />
          {/* Show loop info when available */}
          {hasLoopInfo && (
            <>
              <Separator />
              <LoopInfoSection />
            </>
          )}
          {/* Show game info when playing a game */}
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
        <Box>
          <LoopStatusSection loopStatus={loopStatus} needsAttention={needsAttention} />
          {hasLoopInfo && (
            <>
              <Separator />
              <LoopInfoSection />
            </>
          )}
        </Box>
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
