/**
 * Side Panel Component
 *
 * Shows task list and current activity in a side panel.
 * Only visible when terminal is wide enough (user-configurable threshold).
 */

import { Box, Text } from "ink";
import { useMemo } from "react";
import { useThemeColors } from "./useTheme.js";
import { navIcons } from "./theme.js";

// ============================================================================
// TYPES
// ============================================================================

export interface Task {
  id: string;
  title: string;
  status: "pending" | "in_progress" | "completed";
}

export interface SidePanelProps {
  /** List of tasks */
  tasks: Task[];
  /** Current activity description */
  currentActivity?: string;
  /** When the current task started */
  activityStartedAt?: Date | null;
  /** Panel width */
  width: number;
  /** Panel height */
  height: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatTimeAgo(date: Date | null | undefined): string {
  if (!date) return "";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "just now";
  if (diffMins === 1) return "1m ago";
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours === 1) return "1h ago";
  return `${diffHours}h ago`;
}

function getStatusIcon(status: Task["status"]): string {
  switch (status) {
    case "completed":
      return "\u2713"; // checkmark
    case "in_progress":
      return "\u25CF"; // filled circle
    case "pending":
    default:
      return "\u25CB"; // empty circle
  }
}

// ============================================================================
// TASK ITEM COMPONENT
// ============================================================================

interface TaskItemProps {
  task: Task;
  index: number;
  colors: ReturnType<typeof useThemeColors>;
}

function TaskItem({ task, index, colors }: TaskItemProps) {
  const icon = getStatusIcon(task.status);
  const color =
    task.status === "completed"
      ? colors.success
      : task.status === "in_progress"
        ? colors.primary
        : colors.textMuted;

  return (
    <Box>
      <Text color={color}>
        {icon} {index + 1}. {task.title}
      </Text>
    </Box>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SidePanel({
  tasks,
  currentActivity,
  activityStartedAt,
  width,
  height,
}: SidePanelProps) {
  const colors = useThemeColors();

  // Calculate how many tasks we can show
  const maxVisibleTasks = useMemo(() => {
    // Reserve space for: header (2), divider (1), activity section (5), padding
    return Math.max(3, height - 10);
  }, [height]);

  // Get visible tasks (prioritize in_progress and nearby tasks)
  const visibleTasks = useMemo(() => {
    if (tasks.length <= maxVisibleTasks) {
      return tasks;
    }

    // Find the in_progress task index
    const inProgressIdx = tasks.findIndex((t) => t.status === "in_progress");
    if (inProgressIdx < 0) {
      // No in_progress task, show first N tasks
      return tasks.slice(0, maxVisibleTasks);
    }

    // Center around the in_progress task
    const halfWindow = Math.floor(maxVisibleTasks / 2);
    let start = Math.max(0, inProgressIdx - halfWindow);
    const end = Math.min(tasks.length, start + maxVisibleTasks);
    start = Math.max(0, end - maxVisibleTasks);

    return tasks.slice(start, end);
  }, [tasks, maxVisibleTasks]);

  const timeAgo = formatTimeAgo(activityStartedAt);

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={colors.border}
      paddingX={1}
      width={width}
      height={height}
    >
      {/* Tasks header */}
      <Box marginBottom={1}>
        <Text bold color={colors.text}>
          {navIcons.bullet} TASKS
        </Text>
      </Box>

      {/* Divider */}
      <Box marginBottom={1}>
        <Text dimColor>{"─".repeat(Math.max(0, width - 4))}</Text>
      </Box>

      {/* Task list */}
      <Box flexDirection="column" flexGrow={1}>
        {visibleTasks.map((task) => {
          // Find original index in tasks array
          const originalIdx = tasks.findIndex((t) => t.id === task.id);
          return (
            <TaskItem
              key={task.id}
              task={task}
              index={originalIdx}
              colors={colors}
            />
          );
        })}

        {tasks.length > maxVisibleTasks && (
          <Box marginTop={1}>
            <Text dimColor>
              ... and {tasks.length - maxVisibleTasks} more
            </Text>
          </Box>
        )}
      </Box>

      {/* Divider */}
      <Box marginY={1}>
        <Text dimColor>{"─".repeat(Math.max(0, width - 4))}</Text>
      </Box>

      {/* Current activity section */}
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold color={colors.text}>
            {"\u{1F504}"} CURRENT ACTIVITY
          </Text>
        </Box>

        <Box marginBottom={1}>
          <Text dimColor>{"─".repeat(Math.max(0, width - 4))}</Text>
        </Box>

        {currentActivity ? (
          <Box flexDirection="column">
            <Text color={colors.text}>
              {currentActivity.length > width - 4
                ? currentActivity.slice(0, width - 7) + "..."
                : currentActivity}
            </Text>
            {timeAgo && (
              <Box marginTop={1}>
                <Text dimColor>Started: {timeAgo}</Text>
              </Box>
            )}
          </Box>
        ) : (
          <Text dimColor>Waiting for activity...</Text>
        )}
      </Box>
    </Box>
  );
}

export default SidePanel;
