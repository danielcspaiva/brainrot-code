/**
 * Status Bar Minimal
 *
 * Compact status bar showing loop progress and essential hotkeys.
 * Used at the bottom of the screen during the game loop.
 */

import { Box, Text } from "ink";
import { useMemo } from "react";
import { useThemeColors } from "./useTheme.js";
import { statusIcons, alertIcons, progressChars } from "./theme.js";

// ============================================================================
// TYPES
// ============================================================================

export type LoopStatus =
  | "idle"
  | "running"
  | "paused"
  | "waiting"
  | "completed"
  | "errored";

export interface StatusBarMinimalProps {
  /** Current loop status */
  status: LoopStatus;
  /** Current task description (e.g., "Creating theme context") */
  currentTask?: string;
  /** Current task number */
  taskNumber?: number;
  /** Total number of tasks */
  totalTasks?: number;
  /** Progress percentage (0-100) */
  progress: number;
  /** Whether attention is needed */
  needsAttention?: boolean;
  /** Terminal width */
  width: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getStatusColor(
  status: LoopStatus,
  needsAttention: boolean,
  colors: ReturnType<typeof useThemeColors>
): string {
  if (needsAttention) return colors.warning;

  switch (status) {
    case "running":
      return colors.success;
    case "waiting":
      return colors.warning;
    case "completed":
      return colors.success;
    case "errored":
      return colors.error;
    case "paused":
      return colors.info;
    default:
      return colors.textMuted;
  }
}

function getStatusIcon(status: LoopStatus, needsAttention: boolean): string {
  if (needsAttention) return alertIcons.warning || "\u26A0";

  switch (status) {
    case "running":
      return statusIcons.running || "\u25CF";
    case "waiting":
      return statusIcons.waiting_for_input || "\u26A0";
    case "completed":
      return statusIcons.completed || "\u2713";
    case "errored":
      return statusIcons.errored || "\u2717";
    case "paused":
      return statusIcons.paused || "\u275A\u275A";
    default:
      return statusIcons.idle || "\u25CB";
  }
}

function getStatusLabel(status: LoopStatus, needsAttention: boolean): string {
  if (needsAttention) return "WAITING";

  switch (status) {
    case "running":
      return "RUNNING";
    case "waiting":
      return "WAITING";
    case "completed":
      return "COMPLETE";
    case "errored":
      return "ERROR";
    case "paused":
      return "PAUSED";
    default:
      return "IDLE";
  }
}

// ============================================================================
// PROGRESS BAR COMPONENT
// ============================================================================

interface MiniProgressBarProps {
  percentage: number;
  width: number;
  color: string;
  emptyColor: string;
}

function MiniProgressBar({
  percentage,
  width,
  color,
  emptyColor,
}: MiniProgressBarProps) {
  const clampedPct = Math.max(0, Math.min(100, percentage));
  const filled = Math.round((clampedPct / 100) * width);
  const empty = width - filled;

  return (
    <Text>
      <Text color={color}>{progressChars.filled.repeat(filled)}</Text>
      <Text color={emptyColor}>{progressChars.empty.repeat(empty)}</Text>
      <Text dimColor> {Math.round(clampedPct)}%</Text>
    </Text>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function StatusBarMinimal({
  status,
  currentTask,
  taskNumber,
  totalTasks,
  progress,
  needsAttention = false,
  width,
}: StatusBarMinimalProps) {
  const colors = useThemeColors();

  const statusColor = useMemo(
    () => getStatusColor(status, needsAttention, colors),
    [status, needsAttention, colors]
  );

  const statusIcon = useMemo(
    () => getStatusIcon(status, needsAttention),
    [status, needsAttention]
  );

  const statusLabel = useMemo(
    () => getStatusLabel(status, needsAttention),
    [status, needsAttention]
  );

  // Calculate progress bar width based on available space
  const progressBarWidth = useMemo(() => {
    // Status (~12) + Task info (~30) + Progress bar + percentage (~8) + hotkeys (~10) + separators (~6)
    const usedWidth = 70;
    return Math.max(10, Math.min(20, width - usedWidth));
  }, [width]);

  // Build task description
  const taskDescription = useMemo(() => {
    if (!currentTask) return null;
    if (taskNumber && totalTasks) {
      return `Task ${taskNumber}/${totalTasks}: ${currentTask}`;
    }
    return currentTask;
  }, [currentTask, taskNumber, totalTasks]);

  // Truncate task description if too long
  const truncatedTask = useMemo(() => {
    if (!taskDescription) return null;
    const maxLen = Math.max(20, width - 60);
    if (taskDescription.length > maxLen) {
      return taskDescription.slice(0, maxLen - 3) + "...";
    }
    return taskDescription;
  }, [taskDescription, width]);

  return (
    <Box
      borderStyle="single"
      borderColor={colors.border}
      paddingX={1}
      width={width}
      justifyContent="space-between"
    >
      {/* Left side: Status + Task */}
      <Box>
        {/* Status indicator */}
        <Text color={statusColor} bold>
          {statusIcon} {statusLabel}
        </Text>

        {/* Task description */}
        {truncatedTask && (
          <Text>
            <Text dimColor> | </Text>
            <Text>{truncatedTask}</Text>
          </Text>
        )}
      </Box>

      {/* Right side: Progress + Hotkey */}
      <Box>
        {/* Progress bar */}
        <MiniProgressBar
          percentage={progress}
          width={progressBarWidth}
          color={statusColor}
          emptyColor={colors.textMuted}
        />

        {/* Hotkey hint */}
        <Text dimColor>
          {" | "}
          <Text color={colors.primary}>L</Text>: Logs
        </Text>
      </Box>
    </Box>
  );
}

export default StatusBarMinimal;
