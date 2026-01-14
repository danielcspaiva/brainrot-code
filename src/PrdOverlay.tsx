/**
 * PRD Overlay Component
 *
 * Full-screen overlay that displays the PRD and task list.
 * Triggered by pressing P key (or configurable hotkey).
 * Shows feature name, start time, progress bar, and task list with status indicators.
 */

import { Box, Text, useInput } from "ink";
import { useState, useMemo, useCallback } from "react";
import { useThemeColors } from "./useTheme.js";
import { navIcons, decorChars, progressChars, createProgressBar, alertIcons } from "./theme.js";
import type { LoopState, LoopTask } from "./loop-state.js";

// ============================================================================
// TYPES
// ============================================================================

export type PrdOverlayAction = "close" | "resume" | "new_loop" | "full_prd";

export interface PrdOverlayProps {
  /** Whether the overlay is visible */
  isVisible: boolean;
  /** The current loop state */
  loopState: LoopState;
  /** Callback when user selects an action */
  onAction: (action: PrdOverlayAction) => void;
  /** Callback when overlay is closed */
  onClose: () => void;
  /** Whether the component has focus */
  hasFocus: boolean;
  /** Terminal dimensions for centering */
  dimensions?: { width: number; height: number };
}

interface ActionButton {
  id: PrdOverlayAction;
  label: string;
  hotkey: string;
  icon: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const actionButtons: ActionButton[] = [
  {
    id: "close",
    label: "Close",
    hotkey: "Esc",
    icon: navIcons.arrowLeft,
  },
  {
    id: "resume",
    label: "Resume",
    hotkey: "R",
    icon: navIcons.arrowRight,
  },
  {
    id: "new_loop",
    label: "New Loop",
    hotkey: "N",
    icon: decorChars.sparkle,
  },
  {
    id: "full_prd",
    label: "Full PRD Details",
    hotkey: "F",
    icon: navIcons.chevronRight,
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatElapsedTime(startedAt: string): string {
  const start = new Date(startedAt);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;

  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

function getTaskStatusIcon(status: string): { icon: string; color: string } {
  switch (status) {
    case "completed":
      return { icon: alertIcons.success, color: "green" };
    case "in_progress":
      return { icon: progressChars.half, color: "yellow" };
    case "pending":
      return { icon: navIcons.checkbox, color: "gray" };
    case "skipped":
      return { icon: navIcons.arrowRight, color: "gray" };
    default:
      return { icon: navIcons.checkbox, color: "gray" };
  }
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface ProgressHeaderProps {
  loopState: LoopState;
  colors: ReturnType<typeof useThemeColors>;
}

function ProgressHeader({ loopState, colors }: ProgressHeaderProps) {
  const progressBar = useMemo(
    () => createProgressBar(loopState.progress.percentage, 25),
    [loopState.progress.percentage]
  );

  const elapsedTime = useMemo(
    () => loopState.startedAt ? formatElapsedTime(loopState.startedAt) : "--",
    [loopState.startedAt]
  );

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Feature name */}
      {loopState.prd && (
        <Box marginBottom={1}>
          <Text color={colors.secondary} bold>
            {decorChars.sparkle} {loopState.prd.name}
          </Text>
        </Box>
      )}

      {/* Progress bar and stats row */}
      <Box>
        <Text color={colors.textMuted}>Progress: </Text>
        <Text color={colors.success}>{progressBar}</Text>
        <Text color={colors.text}> {loopState.progress.percentage}%</Text>
        <Text color={colors.textMuted}> | </Text>
        <Text color={colors.textMuted}>Started: </Text>
        <Text color={colors.info}>{elapsedTime} ago</Text>
      </Box>

      {/* Task count summary */}
      <Box marginTop={1}>
        <Text color={colors.success}>
          {loopState.progress.completedTasks} completed
        </Text>
        <Text color={colors.textMuted}> / </Text>
        <Text color={colors.text}>
          {loopState.progress.totalTasks} total
        </Text>
      </Box>
    </Box>
  );
}

interface TaskListProps {
  tasks: LoopTask[];
  colors: ReturnType<typeof useThemeColors>;
  selectedIndex: number;
  maxVisible: number;
  scrollOffset: number;
}

function TaskList({ tasks, colors, selectedIndex, maxVisible, scrollOffset }: TaskListProps) {
  const visibleTasks = tasks.slice(scrollOffset, scrollOffset + maxVisible);

  if (tasks.length === 0) {
    return (
      <Box marginY={1}>
        <Text dimColor italic>No tasks available</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {/* Scroll indicator - top */}
      {scrollOffset > 0 && (
        <Box justifyContent="center" marginBottom={1}>
          <Text dimColor>... {scrollOffset} more above ...</Text>
        </Box>
      )}

      {/* Task items */}
      {visibleTasks.map((task, index) => {
        const actualIndex = index + scrollOffset;
        const isSelected = actualIndex === selectedIndex;
        const { icon, color } = getTaskStatusIcon(task.status);

        // Extract task number from title
        const taskNumber = task.title.match(/^(\d+)\./)?.[1] ?? String(actualIndex + 1);
        const titleWithoutNumber = task.title.replace(/^\d+\.\s*/, "");

        return (
          <Box key={task.id} flexDirection="column" marginBottom={0}>
            <Box>
              {/* Selection indicator */}
              <Text color={isSelected ? colors.primary : colors.textMuted}>
                {isSelected ? navIcons.pointer : " "}
              </Text>
              <Text> </Text>

              {/* Status icon */}
              <Text color={color}>{icon}</Text>
              <Text> </Text>

              {/* Task number */}
              <Text color={colors.secondary} bold>
                {taskNumber}.
              </Text>
              <Text> </Text>

              {/* Task title */}
              <Text
                color={
                  task.status === "completed"
                    ? colors.textMuted
                    : task.status === "in_progress"
                    ? colors.warning
                    : colors.text
                }
                strikethrough={task.status === "completed"}
              >
                {titleWithoutNumber.length > 45
                  ? titleWithoutNumber.slice(0, 45) + "..."
                  : titleWithoutNumber}
              </Text>
            </Box>
          </Box>
        );
      })}

      {/* Scroll indicator - bottom */}
      {scrollOffset + maxVisible < tasks.length && (
        <Box justifyContent="center" marginTop={1}>
          <Text dimColor>... {tasks.length - scrollOffset - maxVisible} more below ...</Text>
        </Box>
      )}
    </Box>
  );
}

interface ActionBarProps {
  buttons: ActionButton[];
  colors: ReturnType<typeof useThemeColors>;
}

function ActionBar({ buttons, colors }: ActionBarProps) {
  return (
    <Box marginTop={1} justifyContent="center" gap={2}>
      {buttons.map((button) => (
        <Box key={button.id}>
          <Text color={colors.textMuted}>[</Text>
          <Text color={colors.accent} bold>
            {button.hotkey}
          </Text>
          <Text color={colors.textMuted}>] </Text>
          <Text color={colors.text}>
            {button.icon} {button.label}
          </Text>
        </Box>
      ))}
    </Box>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PrdOverlay({
  isVisible,
  loopState,
  onAction,
  onClose,
  hasFocus,
  dimensions,
}: PrdOverlayProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const colors = useThemeColors();

  // Calculate visible height for scrolling
  const maxVisibleTasks = Math.max((dimensions?.height ?? 20) - 16, 5);

  // Calculate scroll offset for viewport
  const scrollOffset = useMemo(() => {
    if (selectedIndex < Math.floor(maxVisibleTasks / 2)) {
      return 0;
    }
    if (selectedIndex > loopState.tasks.length - Math.ceil(maxVisibleTasks / 2)) {
      return Math.max(0, loopState.tasks.length - maxVisibleTasks);
    }
    return selectedIndex - Math.floor(maxVisibleTasks / 2);
  }, [selectedIndex, maxVisibleTasks, loopState.tasks.length]);

  const handleAction = useCallback(
    (action: PrdOverlayAction) => {
      if (action === "close") {
        onClose();
      } else {
        onAction(action);
      }
    },
    [onAction, onClose]
  );

  // Handle keyboard input
  useInput(
    (input, key) => {
      if (!hasFocus || !isVisible) return;

      // Close overlay
      if (key.escape || input === "p" || input === "P") {
        onClose();
        return;
      }

      // Navigate tasks
      if (key.upArrow || input === "k" || input === "K") {
        setSelectedIndex((prev) => Math.max(0, prev - 1));
        return;
      }
      if (key.downArrow || input === "j" || input === "J") {
        setSelectedIndex((prev) => Math.min(loopState.tasks.length - 1, prev + 1));
        return;
      }

      // Action hotkeys
      if (input === "r" || input === "R") {
        handleAction("resume");
        return;
      }
      if (input === "n" || input === "N") {
        handleAction("new_loop");
        return;
      }
      if (input === "f" || input === "F") {
        handleAction("full_prd");
        return;
      }
    },
    { isActive: hasFocus && isVisible }
  );

  // Calculate box dimensions
  const boxWidth = useMemo(() => {
    if (dimensions?.width) {
      return Math.min(75, dimensions.width - 4);
    }
    return 75;
  }, [dimensions?.width]);

  if (!isVisible) {
    return null;
  }

  // Check if there's any loop data to display
  const hasLoopData = loopState.prd !== null || loopState.tasks.length > 0;

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
          <Text color={colors.primary} bold>
            {decorChars.star} PRD Overview {decorChars.star}
          </Text>
        </Box>

        {/* Divider */}
        <Box marginBottom={1}>
          <Text dimColor>{"─".repeat(boxWidth - 6)}</Text>
        </Box>

        {hasLoopData ? (
          <>
            {/* Progress header with feature name, time, and progress bar */}
            <ProgressHeader loopState={loopState} colors={colors} />

            {/* Divider */}
            <Box marginY={1}>
              <Text dimColor>{"─".repeat(boxWidth - 6)}</Text>
            </Box>

            {/* Task list section header */}
            <Box marginBottom={1}>
              <Text bold color={colors.accent}>
                {alertIcons.info} Task List
              </Text>
            </Box>

            {/* Task list with scrolling */}
            <TaskList
              tasks={loopState.tasks}
              colors={colors}
              selectedIndex={selectedIndex}
              maxVisible={maxVisibleTasks}
              scrollOffset={scrollOffset}
            />
          </>
        ) : (
          <Box flexDirection="column" alignItems="center" marginY={2}>
            <Text dimColor italic>No active loop</Text>
            <Text dimColor>Start a new loop to see PRD and tasks here.</Text>
          </Box>
        )}

        {/* Divider */}
        <Box marginY={1}>
          <Text dimColor>{"─".repeat(boxWidth - 6)}</Text>
        </Box>

        {/* Action bar */}
        <ActionBar buttons={actionButtons} colors={colors} />

        {/* Navigation hints */}
        <Box marginTop={1} justifyContent="center">
          <Text dimColor>↑↓: Navigate tasks | P or Esc: Close</Text>
        </Box>
      </Box>
    </Box>
  );
}

export default PrdOverlay;
