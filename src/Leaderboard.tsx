/**
 * Leaderboard Component
 *
 * Displays top 10 scores for a game with timestamps.
 */

import { Box, Text } from "ink";
import { type ScoreEntry, formatScoreDate } from "./high-scores.js";
import { useThemeColors, getThemedRankColor, useTheme } from "./useTheme.js";

interface LeaderboardProps {
  /** Game title to display */
  title: string;
  /** List of scores to display */
  scores: ScoreEntry[];
  /** Whether lower scores are better (for time-based games) */
  lowerIsBetter?: boolean;
  /** Format function for the score value */
  formatScore?: (score: number) => string;
  /** Highlight this score position (1-indexed) */
  highlightPosition?: number;
  /** Maximum entries to show */
  maxEntries?: number;
}

/**
 * Default score formatter
 */
function defaultFormatScore(score: number): string {
  return score.toLocaleString();
}

/**
 * Format time in mm:ss format
 */
export function formatTime(seconds: number): string {
  if (seconds >= 999) return "--:--";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Leaderboard display component
 */
export function Leaderboard({
  title,
  scores,
  lowerIsBetter: _lowerIsBetter = false,
  formatScore = defaultFormatScore,
  highlightPosition,
  maxEntries = 10,
}: LeaderboardProps) {
  const colors = useThemeColors();
  const { theme } = useTheme();
  const displayScores = scores.slice(0, maxEntries);
  const hasScores = displayScores.length > 0;

  return (
    <Box flexDirection="column" borderStyle="single" paddingX={1}>
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color={colors.primary}>
          {title}
        </Text>
      </Box>

      {!hasScores ? (
        <Box justifyContent="center" paddingY={1}>
          <Text dimColor>No scores yet</Text>
        </Box>
      ) : (
        <Box flexDirection="column">
          {/* Header */}
          <Box>
            <Text dimColor>
              {"#".padStart(2)} {"Score".padStart(8)} {"Date".padStart(10)}
            </Text>
          </Box>

          {/* Scores */}
          {displayScores.map((entry, index) => {
            const position = index + 1;
            const isHighlighted = highlightPosition === position;
            const positionStr = position.toString().padStart(2);
            const scoreStr = formatScore(entry.score).padStart(8);
            const dateStr = formatScoreDate(entry.timestamp).padStart(10);

            return (
              <Box key={index}>
                <Text
                  color={getThemedRankColor(theme, position, isHighlighted)}
                  bold={isHighlighted || position === 1}
                >
                  {positionStr} {scoreStr} {dateStr}
                  {isHighlighted ? " NEW!" : ""}
                </Text>
              </Box>
            );
          })}

          {/* Fill empty slots */}
          {displayScores.length < maxEntries && (
            <Box marginTop={1}>
              <Text dimColor>
                {maxEntries - displayScores.length} more slot
                {maxEntries - displayScores.length !== 1 ? "s" : ""} available
              </Text>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}

/**
 * Compact leaderboard for displaying in game HUD
 */
export function CompactLeaderboard({
  scores,
  formatScore = defaultFormatScore,
  maxEntries = 5,
}: {
  scores: ScoreEntry[];
  formatScore?: (score: number) => string;
  maxEntries?: number;
}) {
  const displayScores = scores.slice(0, maxEntries);

  if (displayScores.length === 0) {
    return null;
  }

  return (
    <Box flexDirection="column">
      <Text dimColor bold>
        Top Scores
      </Text>
      {displayScores.map((entry, index) => (
        <Text key={index} dimColor>
          {(index + 1).toString()}. {formatScore(entry.score)}
        </Text>
      ))}
    </Box>
  );
}

/**
 * New high score notification banner
 */
export function NewHighScoreBanner({
  position,
  score,
  formatScore = defaultFormatScore,
}: {
  position: number;
  score: number;
  formatScore?: (score: number) => string;
}) {
  const colors = useThemeColors();
  const positionText =
    position === 1
      ? "1st"
      : position === 2
        ? "2nd"
        : position === 3
          ? "3rd"
          : `${position}th`;

  return (
    <Box
      flexDirection="column"
      alignItems="center"
      borderStyle="double"
      borderColor={colors.success}
      paddingX={2}
      paddingY={1}
    >
      <Text bold color={colors.success}>
        NEW HIGH SCORE!
      </Text>
      <Text>
        <Text color={colors.accent} bold>
          {formatScore(score)}
        </Text>
      </Text>
      <Text>
        You ranked <Text color={colors.primary}>{positionText}</Text> place!
      </Text>
    </Box>
  );
}

export default Leaderboard;
