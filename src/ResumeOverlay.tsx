/**
 * Resume Overlay Component
 *
 * Full-screen modal that displays when previous loop data exists on startup.
 * Shows previous progress and offers options to Resume, Start New, or View History.
 */

import { Box, Text, useInput } from "ink";
import { useState, useMemo, useCallback } from "react";
import { useThemeColors } from "./useTheme.js";
import { navIcons, decorChars, progressChars, createProgressBar } from "./theme.js";
import type { LoopState, LoopTask } from "./loop-state.js";

// ============================================================================
// TYPES
// ============================================================================

export type ResumeAction = "resume" | "new" | "history";

export interface ResumeOverlayProps {
  /** Whether the overlay is visible */
  isVisible: boolean;
  /** The previous loop state to display */
  loopState: LoopState;
  /** Callback when user selects an action */
  onAction: (action: ResumeAction) => void;
  /** Whether the component has focus */
  hasFocus: boolean;
  /** Terminal dimensions for centering */
  dimensions?: { width: number; height: number };
}

interface ActionButton {
  id: ResumeAction;
  label: string;
  icon: string;
  description: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const actionButtons: ActionButton[] = [
  {
    id: "resume",
    label: "Resume Loop",
    icon: navIcons.arrowRight,
    description: "Continue where you left off",
  },
  {
    id: "new",
    label: "Start New Loop",
    icon: decorChars.sparkle,
    description: "Begin a fresh session",
  },
  {
    id: "history",
    label: "View History",
    icon: navIcons.chevronRight,
    description: "See past sessions and stats",
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getTaskStatusCounts(tasks: LoopTask[]): {
  completed: number;
  inProgress: number;
  pending: number;
  total: number;
} {
  return {
    completed: tasks.filter((t) => t.status === "completed").length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    pending: tasks.filter((t) => t.status === "pending").length,
    total: tasks.length,
  };
}

function formatTimeSince(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  }
  if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  }
  if (diffMins > 0) {
    return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  }
  return "Just now";
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface ProgressSummaryProps {
  loopState: LoopState;
  colors: ReturnType<typeof useThemeColors>;
}

function ProgressSummary({ loopState, colors }: ProgressSummaryProps) {
  const taskCounts = useMemo(
    () => getTaskStatusCounts(loopState.tasks),
    [loopState.tasks]
  );
  const progressBar = useMemo(
    () => createProgressBar(loopState.progress.percentage, 20),
    [loopState.progress.percentage]
  );

  return (
    <Box flexDirection="column" marginY={1}>
      {/* PRD Name */}
      {loopState.prd && (
        <Box marginBottom={1}>
          <Text color={colors.textMuted}>Project: </Text>
          <Text bold color={colors.primary}>
            {loopState.prd.name}
          </Text>
        </Box>
      )}

      {/* Progress Bar */}
      <Box marginBottom={1}>
        <Text color={colors.textMuted}>Progress: </Text>
        <Text color={colors.success}>{progressBar}</Text>
        <Text color={colors.text}> {loopState.progress.percentage}%</Text>
      </Box>

      {/* Task Status Summary */}
      <Box>
        <Text color={colors.textMuted}>Tasks: </Text>
        <Text color={colors.success}>
          {taskCounts.completed} completed
        </Text>
        <Text color={colors.textMuted}> | </Text>
        {taskCounts.inProgress > 0 && (
          <>
            <Text color={colors.warning}>
              {taskCounts.inProgress} in progress
            </Text>
            <Text color={colors.textMuted}> | </Text>
          </>
        )}
        <Text color={colors.textMuted}>
          {taskCounts.pending} remaining
        </Text>
      </Box>

      {/* Last Updated */}
      <Box marginTop={1}>
        <Text dimColor italic>
          Last updated: {formatTimeSince(loopState.updatedAt)}
        </Text>
      </Box>
    </Box>
  );
}

interface TaskListPreviewProps {
  tasks: LoopTask[];
  colors: ReturnType<typeof useThemeColors>;
  maxItems?: number;
}

function TaskListPreview({ tasks, colors, maxItems = 5 }: TaskListPreviewProps) {
  const visibleTasks = useMemo(() => {
    // Show completed tasks first, then in-progress, then pending
    const sorted = [...tasks].sort((a, b) => {
      const order = { completed: 0, in_progress: 1, pending: 2, skipped: 3 };
      return order[a.status] - order[b.status];
    });
    return sorted.slice(0, maxItems);
  }, [tasks, maxItems]);

  const remainingCount = tasks.length - visibleTasks.length;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return { icon: navIcons.checkboxChecked, color: colors.success };
      case "in_progress":
        return { icon: progressChars.half, color: colors.warning };
      case "pending":
        return { icon: navIcons.checkbox, color: colors.textMuted };
      default:
        return { icon: navIcons.checkbox, color: colors.textMuted };
    }
  };

  if (tasks.length === 0) {
    return (
      <Box marginY={1}>
        <Text dimColor italic>No tasks recorded</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" marginY={1}>
      <Box marginBottom={1}>
        <Text bold color={colors.accent}>
          Task Overview:
        </Text>
      </Box>
      {visibleTasks.map((task) => {
        const { icon, color } = getStatusIcon(task.status);
        return (
          <Box key={task.id}>
            <Text color={color}>{icon} </Text>
            <Text color={task.status === "completed" ? colors.textMuted : colors.text}>
              {task.title}
            </Text>
          </Box>
        );
      })}
      {remainingCount > 0 && (
        <Box marginTop={1}>
          <Text dimColor italic>
            ... and {remainingCount} more task{remainingCount > 1 ? "s" : ""}
          </Text>
        </Box>
      )}
    </Box>
  );
}

interface ActionButtonsProps {
  buttons: ActionButton[];
  selectedIndex: number;
  colors: ReturnType<typeof useThemeColors>;
}

function ActionButtons({ buttons, selectedIndex, colors }: ActionButtonsProps) {
  return (
    <Box flexDirection="column" marginTop={1}>
      {buttons.map((button, index) => {
        const isSelected = index === selectedIndex;
        return (
          <Box key={button.id} marginY={0}>
            <Text
              color={isSelected ? colors.primary : colors.textMuted}
              bold={isSelected}
            >
              {isSelected ? navIcons.pointer : " "}{" "}
            </Text>
            <Text
              color={isSelected ? colors.primary : colors.text}
              bold={isSelected}
            >
              {button.icon} {button.label}
            </Text>
            {isSelected && (
              <Text dimColor> - {button.description}</Text>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ResumeOverlay({
  isVisible,
  loopState,
  onAction,
  hasFocus,
  dimensions,
}: ResumeOverlayProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const colors = useThemeColors();

  const handleSelect = useCallback(() => {
    const selectedAction = actionButtons[selectedIndex];
    if (selectedAction) {
      onAction(selectedAction.id);
    }
  }, [selectedIndex, onAction]);

  // Handle keyboard input
  useInput(
    (input, key) => {
      if (!hasFocus || !isVisible) return;

      // Navigate up
      if (key.upArrow || input === "k" || input === "K") {
        setSelectedIndex((prev) => Math.max(0, prev - 1));
        return;
      }

      // Navigate down
      if (key.downArrow || input === "j" || input === "J") {
        setSelectedIndex((prev) => Math.min(actionButtons.length - 1, prev + 1));
        return;
      }

      // Select action
      if (key.return || input === " ") {
        handleSelect();
        return;
      }

      // Quick select with number keys
      if (input === "1") {
        onAction("resume");
        return;
      }
      if (input === "2") {
        onAction("new");
        return;
      }
      if (input === "3") {
        onAction("history");
        return;
      }
    },
    { isActive: hasFocus && isVisible }
  );

  // Calculate box dimensions
  const boxWidth = useMemo(() => {
    if (dimensions?.width) {
      return Math.min(65, dimensions.width - 4);
    }
    return 65;
  }, [dimensions?.width]);

  if (!isVisible) {
    return null;
  }

  return (
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      width="100%"
      height="100%"
    >
      {/* Main overlay card */}
      <Box
        flexDirection="column"
        borderStyle="double"
        borderColor={colors.primary}
        paddingX={2}
        paddingY={1}
        width={boxWidth}
      >
        {/* Header */}
        <Box justifyContent="center" marginBottom={1}>
          <Text color={colors.secondary} bold>
            {decorChars.sparkle} Welcome Back! {decorChars.sparkle}
          </Text>
        </Box>

        {/* Subtitle */}
        <Box justifyContent="center" marginBottom={1}>
          <Text dimColor>You have a previous session to resume</Text>
        </Box>

        {/* Divider */}
        <Box marginY={1}>
          <Text dimColor>{"─".repeat(boxWidth - 6)}</Text>
        </Box>

        {/* Progress Summary */}
        <ProgressSummary loopState={loopState} colors={colors} />

        {/* Task List Preview */}
        <TaskListPreview tasks={loopState.tasks} colors={colors} />

        {/* Divider */}
        <Box marginY={1}>
          <Text dimColor>{"─".repeat(boxWidth - 6)}</Text>
        </Box>

        {/* Action Buttons */}
        <Box flexDirection="column">
          <Text bold color={colors.accent}>
            What would you like to do?
          </Text>
          <ActionButtons
            buttons={actionButtons}
            selectedIndex={selectedIndex}
            colors={colors}
          />
        </Box>

        {/* Navigation hints */}
        <Box marginTop={1} justifyContent="center">
          <Text dimColor>
            ↑↓: Navigate | Enter: Select | 1-3: Quick select
          </Text>
        </Box>
      </Box>
    </Box>
  );
}

export default ResumeOverlay;
