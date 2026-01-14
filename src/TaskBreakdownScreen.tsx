/**
 * Task Breakdown Screen
 *
 * Displays the generated task breakdown after PRD generation.
 * Shows ordered list of actionable tasks with complexity and dependencies.
 */

import { Box, Text, useInput } from "ink";
import { useState, useMemo } from "react";
import { useThemeColors } from "./useTheme.js";
import { alertIcons } from "./theme.js";
import type { LoopTask } from "./loop-state.js";

// ============================================================================
// TYPES
// ============================================================================

export interface TaskBreakdownScreenProps {
  /** Whether the component is visible */
  isVisible: boolean;
  /** Tasks to display */
  tasks: LoopTask[];
  /** Feature name/description */
  featureName: string;
  /** Callback when user continues */
  onContinue: () => void;
  /** Whether the component has focus */
  hasFocus: boolean;
  /** Terminal dimensions */
  dimensions?: { width: number; height: number };
}

// ============================================================================
// COMPLEXITY BADGE COMPONENT
// ============================================================================

interface ComplexityBadgeProps {
  complexity: "small" | "medium" | "large";
}

function ComplexityBadge({ complexity }: ComplexityBadgeProps) {
  const colors = useThemeColors();

  const badgeColor = {
    small: colors.success,
    medium: colors.warning,
    large: colors.error,
  }[complexity];

  const badgeText = {
    small: "S",
    medium: "M",
    large: "L",
  }[complexity];

  return (
    <Text color={badgeColor} bold>
      [{badgeText}]
    </Text>
  );
}

// ============================================================================
// TASK ITEM COMPONENT
// ============================================================================

interface TaskItemProps {
  task: LoopTask;
  isSelected: boolean;
  showDependencies: boolean;
}

function TaskItem({ task, isSelected, showDependencies }: TaskItemProps) {
  const colors = useThemeColors();

  // Extract task number from title (format: "1. Title here")
  const taskNumber = task.title.match(/^(\d+)\./)?.[1] ?? "";
  const titleWithoutNumber = task.title.replace(/^\d+\.\s*/, "");

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        {/* Selection indicator */}
        <Text color={isSelected ? colors.primary : colors.textMuted}>
          {isSelected ? ">" : " "}
        </Text>
        <Text> </Text>

        {/* Task number */}
        <Text color={colors.secondary} bold>
          {taskNumber}.
        </Text>
        <Text> </Text>

        {/* Task title */}
        <Text color={isSelected ? colors.text : colors.textMuted}>
          {titleWithoutNumber}
        </Text>
        <Text> </Text>

        {/* Complexity badge */}
        {task.complexity && <ComplexityBadge complexity={task.complexity} />}
      </Box>

      {/* Description */}
      {task.description && (
        <Box marginLeft={4}>
          <Text dimColor italic>
            {task.description}
          </Text>
        </Box>
      )}

      {/* Dependencies */}
      {showDependencies && task.dependsOn && task.dependsOn.length > 0 && (
        <Box marginLeft={4}>
          <Text dimColor>
            Depends on: {task.dependsOn.map((dep) => `#${dep.replace("task-", "")}`).join(", ")}
          </Text>
        </Box>
      )}
    </Box>
  );
}

// ============================================================================
// STATS SUMMARY COMPONENT
// ============================================================================

interface StatsSummaryProps {
  tasks: LoopTask[];
}

function StatsSummary({ tasks }: StatsSummaryProps) {
  const colors = useThemeColors();

  const stats = useMemo(() => {
    const small = tasks.filter((t) => t.complexity === "small").length;
    const medium = tasks.filter((t) => t.complexity === "medium").length;
    const large = tasks.filter((t) => t.complexity === "large").length;
    return { small, medium, large, total: tasks.length };
  }, [tasks]);

  return (
    <Box flexDirection="row" gap={2}>
      <Text color={colors.text}>
        {stats.total} tasks:
      </Text>
      <Text color={colors.success}>
        {stats.small} small
      </Text>
      <Text color={colors.warning}>
        {stats.medium} medium
      </Text>
      <Text color={colors.error}>
        {stats.large} large
      </Text>
    </Box>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TaskBreakdownScreen({
  isVisible,
  tasks,
  featureName,
  onContinue,
  hasFocus,
  dimensions,
}: TaskBreakdownScreenProps) {
  const colors = useThemeColors();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showDependencies, setShowDependencies] = useState(true);

  // Calculate visible height for scrolling
  const maxVisibleTasks = Math.max((dimensions?.height ?? 20) - 12, 5);

  // Calculate scroll offset for viewport
  const scrollOffset = useMemo(() => {
    if (selectedIndex < Math.floor(maxVisibleTasks / 2)) {
      return 0;
    }
    if (selectedIndex > tasks.length - Math.ceil(maxVisibleTasks / 2)) {
      return Math.max(0, tasks.length - maxVisibleTasks);
    }
    return selectedIndex - Math.floor(maxVisibleTasks / 2);
  }, [selectedIndex, maxVisibleTasks, tasks.length]);

  const visibleTasks = tasks.slice(scrollOffset, scrollOffset + maxVisibleTasks);

  // Handle keyboard input
  useInput(
    (input, key) => {
      // Navigate tasks with arrow keys
      if (key.upArrow) {
        setSelectedIndex((prev) => Math.max(0, prev - 1));
        return;
      }
      if (key.downArrow) {
        setSelectedIndex((prev) => Math.min(tasks.length - 1, prev + 1));
        return;
      }

      // Toggle dependency display
      if (input === "d" || input === "D") {
        setShowDependencies((prev) => !prev);
        return;
      }

      // Continue with Enter
      if (key.return) {
        onContinue();
        return;
      }
    },
    { isActive: hasFocus && isVisible }
  );

  if (!isVisible) {
    return null;
  }

  const contentWidth = Math.min(70, (dimensions?.width ?? 80) - 6);

  return (
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      width="100%"
      height="100%"
    >
      {/* Title */}
      <Box marginBottom={1}>
        <Text bold color={colors.primary}>
          {alertIcons.success} Task Breakdown Generated
        </Text>
      </Box>

      {/* Feature name */}
      <Box marginBottom={1}>
        <Text dimColor italic>
          {featureName.length > 50 ? featureName.slice(0, 50) + "..." : featureName}
        </Text>
      </Box>

      {/* Stats summary */}
      <Box marginBottom={1}>
        <StatsSummary tasks={tasks} />
      </Box>

      {/* Main content box */}
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={colors.secondary}
        paddingX={2}
        paddingY={1}
        width={contentWidth}
      >
        {/* Scroll indicator */}
        {scrollOffset > 0 && (
          <Box justifyContent="center" marginBottom={1}>
            <Text dimColor>... {scrollOffset} more above ...</Text>
          </Box>
        )}

        {/* Task list */}
        {visibleTasks.map((task, index) => (
          <TaskItem
            key={task.id}
            task={task}
            isSelected={index + scrollOffset === selectedIndex}
            showDependencies={showDependencies}
          />
        ))}

        {/* Scroll indicator */}
        {scrollOffset + maxVisibleTasks < tasks.length && (
          <Box justifyContent="center" marginTop={1}>
            <Text dimColor>... {tasks.length - scrollOffset - maxVisibleTasks} more below ...</Text>
          </Box>
        )}
      </Box>

      {/* Help text */}
      <Box marginTop={1} flexDirection="column" alignItems="center">
        <Text dimColor>
          Arrow keys: Navigate | D: Toggle dependencies | Enter: Continue
        </Text>
      </Box>

      {/* Continue prompt */}
      <Box marginTop={1}>
        <Text color={colors.success}>
          Press Enter to start working on these tasks
        </Text>
      </Box>
    </Box>
  );
}

export default TaskBreakdownScreen;
