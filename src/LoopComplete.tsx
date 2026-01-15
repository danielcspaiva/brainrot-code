/**
 * Loop Complete Screen
 *
 * Summary screen shown when the loop finishes.
 * Shows feature completion stats and game session stats.
 */

import { Box, Text, useInput } from "ink";
import { useMemo } from "react";
import { useThemeColors } from "./useTheme.js";

// ============================================================================
// TYPES
// ============================================================================

export interface GameSessionStats {
  gameId: string;
  gameName: string;
  gamesPlayed: number;
  bestScore: number;
}

export interface LoopCompleteProps {
  /** Feature name */
  featureName: string;
  /** Number of tasks completed */
  tasksCompleted: number;
  /** Total number of tasks */
  totalTasks: number;
  /** Loop duration in milliseconds */
  durationMs: number;
  /** Number of files changed */
  filesChanged?: number;
  /** Game stats for this session */
  gameStats?: GameSessionStats[];
  /** Callback for starting a new loop */
  onNewLoop: () => void;
  /** Callback for continuing to play games */
  onKeepPlaying: () => void;
  /** Callback for quitting */
  onQuit: () => void;
  /** Whether the component has focus */
  hasFocus: boolean;
  /** Terminal dimensions */
  dimensions: { width: number; height: number };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

function getGameIcon(gameId: string): string {
  switch (gameId) {
    case "snake":
      return "\u{1F40D}";
    case "pong":
      return "\u{1F3D3}";
    case "tetris":
      return "\u{1F9F1}";
    case "minesweeper":
      return "\u{1F4A3}";
    default:
      return "\u{1F3AE}";
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function LoopComplete({
  featureName,
  tasksCompleted,
  totalTasks,
  durationMs,
  filesChanged,
  gameStats = [],
  onNewLoop,
  onKeepPlaying,
  onQuit,
  hasFocus,
  dimensions,
}: LoopCompleteProps) {
  const colors = useThemeColors();

  // Handle keyboard input
  useInput(
    (input) => {
      if (!hasFocus) return;

      if (input === "n" || input === "N") {
        onNewLoop();
      } else if (input === "g" || input === "G") {
        onKeepPlaying();
      } else if (input === "q" || input === "Q") {
        onQuit();
      }
    },
    { isActive: hasFocus }
  );

  const cardWidth = useMemo(() => {
    return Math.min(55, dimensions.width - 8);
  }, [dimensions.width]);

  const duration = formatDuration(durationMs);

  return (
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      width="100%"
      height="100%"
    >
      {/* Success icon */}
      <Box marginBottom={1}>
        <Text color={colors.success} bold>
          {"\u2705"} LOOP COMPLETE
        </Text>
      </Box>

      {/* Main card */}
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={colors.border}
        paddingX={2}
        paddingY={1}
        width={cardWidth}
      >
        {/* Feature name */}
        <Box marginBottom={1}>
          <Text bold color={colors.text}>
            Feature: {featureName.length > cardWidth - 15
              ? featureName.slice(0, cardWidth - 18) + "..."
              : featureName}
          </Text>
        </Box>

        {/* Divider */}
        <Box marginBottom={1}>
          <Text dimColor>{"─".repeat(cardWidth - 6)}</Text>
        </Box>

        {/* Stats */}
        <Box flexDirection="column" marginBottom={1}>
          <Text>
            Tasks completed: <Text color={colors.success}>{tasksCompleted}/{totalTasks}</Text>
          </Text>
          <Text>
            Duration: <Text color={colors.text}>{duration}</Text>
          </Text>
          {filesChanged !== undefined && (
            <Text>
              Files changed: <Text color={colors.text}>{filesChanged}</Text>
            </Text>
          )}
        </Box>

        {/* Game stats section */}
        {gameStats.length > 0 && (
          <>
            <Box marginY={1}>
              <Text dimColor>{"─".repeat(cardWidth - 6)}</Text>
            </Box>

            <Box marginBottom={1}>
              <Text dimColor>Game stats this session:</Text>
            </Box>

            {gameStats.map((stat) => (
              <Box key={stat.gameId}>
                <Text>
                  {getGameIcon(stat.gameId)} {stat.gameName}:{" "}
                  <Text dimColor>
                    {stat.gamesPlayed} game{stat.gamesPlayed !== 1 ? "s" : ""}, best: {stat.bestScore}
                  </Text>
                </Text>
              </Box>
            ))}
          </>
        )}
      </Box>

      {/* Action buttons */}
      <Box marginTop={2}>
        <Text>
          <Text color={colors.primary}>[N]</Text>
          <Text> New Loop    </Text>
          <Text color={colors.primary}>[G]</Text>
          <Text> Keep Playing    </Text>
          <Text color={colors.primary}>[Q]</Text>
          <Text> Quit</Text>
        </Text>
      </Box>
    </Box>
  );
}

export default LoopComplete;
