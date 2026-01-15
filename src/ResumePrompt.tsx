/**
 * Resume Prompt Component
 *
 * Shown to returning users who have an unfinished loop.
 * Offers options to resume, start new, or quit.
 */

import { Box, Text, useInput } from "ink";
import { useMemo } from "react";
import { useThemeColors } from "./useTheme.js";

// ============================================================================
// TYPES
// ============================================================================

export interface ResumePromptProps {
  /** Feature name from the previous loop */
  featureName: string;
  /** Number of completed tasks */
  completedTasks: number;
  /** Total number of tasks */
  totalTasks: number;
  /** When the loop was last active */
  lastActiveAt?: Date | null;
  /** Callback for resuming the loop */
  onResume: () => void;
  /** Callback for starting a new loop */
  onNewLoop: () => void;
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

function formatTimeAgo(date: Date | null | undefined): string {
  if (!date) return "unknown";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "just now";
  if (diffMins === 1) return "1 minute ago";
  if (diffMins < 60) return `${diffMins} minutes ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours === 1) return "1 hour ago";
  if (diffHours < 24) return `${diffHours} hours ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "1 day ago";
  return `${diffDays} days ago`;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ResumePrompt({
  featureName,
  completedTasks,
  totalTasks,
  lastActiveAt,
  onResume,
  onNewLoop,
  onQuit,
  hasFocus,
  dimensions,
}: ResumePromptProps) {
  const colors = useThemeColors();

  // Handle keyboard input
  useInput(
    (input) => {
      if (!hasFocus) return;

      if (input === "r" || input === "R") {
        onResume();
      } else if (input === "n" || input === "N") {
        onNewLoop();
      } else if (input === "q" || input === "Q") {
        onQuit();
      }
    },
    { isActive: hasFocus }
  );

  const cardWidth = useMemo(() => {
    return Math.min(55, dimensions.width - 8);
  }, [dimensions.width]);

  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const timeAgo = formatTimeAgo(lastActiveAt);

  return (
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      width="100%"
      height="100%"
    >
      {/* Logo */}
      <Box marginBottom={2}>
        <Text bold color={colors.primary}>
          BRAINROT
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
        {/* Welcome message */}
        <Box marginBottom={1}>
          <Text color={colors.success}>Welcome back!</Text>
        </Box>

        {/* Previous loop info */}
        <Box flexDirection="column" marginBottom={1}>
          <Text>You have an unfinished loop:</Text>
          <Text color={colors.text} bold>
            "{featureName.length > cardWidth - 10
              ? featureName.slice(0, cardWidth - 13) + "..."
              : featureName}"
          </Text>
          <Text dimColor>
            Progress: {completedTasks}/{totalTasks} tasks ({progress}%)
          </Text>
          <Text dimColor>
            Last active: {timeAgo}
          </Text>
        </Box>

        {/* Divider */}
        <Box marginY={1}>
          <Text dimColor>{"─".repeat(cardWidth - 6)}</Text>
        </Box>

        {/* Action options */}
        <Box flexDirection="column">
          <Text>
            <Text color={colors.primary}>[R]</Text> Resume
          </Text>
          <Text>
            <Text color={colors.primary}>[N]</Text> New Loop
          </Text>
          <Text>
            <Text color={colors.primary}>[Q]</Text> Quit
          </Text>
        </Box>
      </Box>

      {/* Footer */}
      <Box
        position="absolute"
        marginTop={dimensions.height - 2}
        borderStyle="single"
        borderColor={colors.border}
        paddingX={2}
        width={dimensions.width - 4}
      >
        <Text dimColor>
          <Text color={colors.primary}>?</Text>: Help |{" "}
          <Text color={colors.primary}>Ctrl+C</Text>: Quit
        </Text>
      </Box>
    </Box>
  );
}

export default ResumePrompt;
