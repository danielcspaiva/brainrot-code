/**
 * Pre-Start Review Screen
 *
 * Displays a review of the generated PRD and tasks before starting the loop.
 * Allows users to confirm and start, or go back to edit tasks.
 */

import { Box, Text, useInput } from "ink";
import { useState, useMemo, useCallback } from "react";
import { useThemeColors } from "./useTheme.js";
import { decorChars, navIcons, alertIcons } from "./theme.js";
import type { LoopTask } from "./loop-state.js";
import type { GeneratedPrd } from "./PrdGenerationScreen.js";

// ============================================================================
// TYPES
// ============================================================================

export interface PreStartReviewScreenProps {
  /** Whether the component is visible */
  isVisible: boolean;
  /** Generated PRD data */
  generatedPrd: GeneratedPrd;
  /** Feature name/description */
  featureName: string;
  /** Callback when user clicks Start Loop */
  onStart: () => void;
  /** Callback when user clicks Edit Tasks */
  onEditTasks: () => void;
  /** Whether the component has focus */
  hasFocus: boolean;
  /** Terminal dimensions */
  dimensions?: { width: number; height: number };
}

interface ActionButton {
  id: "start" | "edit";
  label: string;
  icon: string;
  description: string;
  hotkey: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const actionButtons: ActionButton[] = [
  {
    id: "start",
    label: "Start Loop",
    icon: navIcons.arrowRight,
    description: "Begin working on these tasks",
    hotkey: "Enter",
  },
  {
    id: "edit",
    label: "Edit Tasks",
    icon: navIcons.chevronRight,
    description: "Review and modify the task breakdown",
    hotkey: "E",
  },
];

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
// COMPLEXITY STATS COMPONENT
// ============================================================================

interface ComplexityStatsProps {
  tasks: LoopTask[];
}

function ComplexityStats({ tasks }: ComplexityStatsProps) {
  const colors = useThemeColors();

  const stats = useMemo(() => {
    const small = tasks.filter((t) => t.complexity === "small").length;
    const medium = tasks.filter((t) => t.complexity === "medium").length;
    const large = tasks.filter((t) => t.complexity === "large").length;

    // Calculate estimated complexity score (S=1, M=2, L=3)
    const complexityScore = small * 1 + medium * 2 + large * 3;
    let estimatedComplexity: "Low" | "Medium" | "High";
    let complexityColor: string;

    if (complexityScore <= tasks.length) {
      estimatedComplexity = "Low";
      complexityColor = colors.success;
    } else if (complexityScore <= tasks.length * 2) {
      estimatedComplexity = "Medium";
      complexityColor = colors.warning;
    } else {
      estimatedComplexity = "High";
      complexityColor = colors.error;
    }

    return {
      small,
      medium,
      large,
      total: tasks.length,
      estimatedComplexity,
      complexityColor,
    };
  }, [tasks, colors]);

  return (
    <Box flexDirection="column" marginY={1}>
      {/* Task count */}
      <Box marginBottom={1}>
        <Text color={colors.textMuted}>Tasks: </Text>
        <Text bold color={colors.primary}>
          {stats.total}
        </Text>
      </Box>

      {/* Complexity breakdown */}
      <Box marginBottom={1}>
        <Text color={colors.textMuted}>Breakdown: </Text>
        <Text color={colors.success}>{stats.small} small</Text>
        <Text color={colors.textMuted}> | </Text>
        <Text color={colors.warning}>{stats.medium} medium</Text>
        <Text color={colors.textMuted}> | </Text>
        <Text color={colors.error}>{stats.large} large</Text>
      </Box>

      {/* Estimated complexity */}
      <Box>
        <Text color={colors.textMuted}>Estimated complexity: </Text>
        <Text bold color={stats.complexityColor}>
          {stats.estimatedComplexity}
        </Text>
      </Box>
    </Box>
  );
}

// ============================================================================
// TASK PREVIEW LIST COMPONENT
// ============================================================================

interface TaskPreviewListProps {
  tasks: LoopTask[];
  maxItems?: number;
}

function TaskPreviewList({ tasks, maxItems = 5 }: TaskPreviewListProps) {
  const colors = useThemeColors();
  const visibleTasks = tasks.slice(0, maxItems);
  const remainingCount = tasks.length - visibleTasks.length;

  return (
    <Box flexDirection="column" marginY={1}>
      <Box marginBottom={1}>
        <Text bold color={colors.accent}>
          Task Preview:
        </Text>
      </Box>

      {visibleTasks.map((task) => {
        // Extract task number from title
        const taskNumber = task.title.match(/^(\d+)\./)?.[1] ?? "";
        const titleWithoutNumber = task.title.replace(/^\d+\.\s*/, "");

        return (
          <Box key={task.id}>
            <Text color={colors.textMuted}>{navIcons.bullet} </Text>
            <Text color={colors.secondary} bold>
              {taskNumber}.
            </Text>
            <Text> </Text>
            <Text color={colors.text}>
              {titleWithoutNumber.length > 40
                ? titleWithoutNumber.slice(0, 40) + "..."
                : titleWithoutNumber}
            </Text>
            <Text> </Text>
            {task.complexity && (
              <ComplexityBadge complexity={task.complexity} />
            )}
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

// ============================================================================
// ACTION BUTTONS COMPONENT
// ============================================================================

interface ActionButtonsProps {
  buttons: ActionButton[];
  selectedIndex: number;
}

function ActionButtons({ buttons, selectedIndex }: ActionButtonsProps) {
  const colors = useThemeColors();

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
            <Text dimColor> [{button.hotkey}]</Text>
            {isSelected && <Text dimColor> - {button.description}</Text>}
          </Box>
        );
      })}
    </Box>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PreStartReviewScreen({
  isVisible,
  generatedPrd,
  featureName,
  onStart,
  onEditTasks,
  hasFocus,
  dimensions,
}: PreStartReviewScreenProps) {
  const colors = useThemeColors();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const handleSelect = useCallback(() => {
    const selectedAction = actionButtons[selectedIndex];
    if (selectedAction) {
      if (selectedAction.id === "start") {
        onStart();
      } else {
        onEditTasks();
      }
    }
  }, [selectedIndex, onStart, onEditTasks]);

  // Calculate box dimensions (must be before early return to follow React hooks rules)
  const boxWidth = useMemo(() => {
    if (dimensions?.width) {
      return Math.min(70, dimensions.width - 4);
    }
    return 70;
  }, [dimensions?.width]);

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
        setSelectedIndex((prev) =>
          Math.min(actionButtons.length - 1, prev + 1)
        );
        return;
      }

      // Select action with Enter
      if (key.return) {
        handleSelect();
        return;
      }

      // Quick select - E for edit
      if (input === "e" || input === "E") {
        onEditTasks();
        return;
      }

      // Quick select - S for start (alternative to Enter)
      if (input === "s" || input === "S") {
        onStart();
        return;
      }
    },
    { isActive: hasFocus && isVisible }
  );

  if (!isVisible) {
    return null;
  }

  const tasks = generatedPrd.taskBreakdown;

  return (
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      width="100%"
      height="100%"
    >
      {/* Main review card */}
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
            {decorChars.sparkle} Ready to Start {decorChars.sparkle}
          </Text>
        </Box>

        {/* Feature name */}
        <Box justifyContent="center" marginBottom={1}>
          <Text bold color={colors.primary}>
            {featureName.length > boxWidth - 8
              ? featureName.slice(0, boxWidth - 11) + "..."
              : featureName}
          </Text>
        </Box>

        {/* Divider */}
        <Box marginY={1}>
          <Text dimColor>{"─".repeat(boxWidth - 6)}</Text>
        </Box>

        {/* Complexity stats */}
        <ComplexityStats tasks={tasks} />

        {/* Task preview list */}
        <TaskPreviewList tasks={tasks} maxItems={5} />

        {/* Divider */}
        <Box marginY={1}>
          <Text dimColor>{"─".repeat(boxWidth - 6)}</Text>
        </Box>

        {/* Action section */}
        <Box flexDirection="column">
          <Text bold color={colors.accent}>
            {alertIcons.info} Review complete. What would you like to do?
          </Text>
          <ActionButtons
            buttons={actionButtons}
            selectedIndex={selectedIndex}
          />
        </Box>

        {/* Navigation hints */}
        <Box marginTop={1} justifyContent="center">
          <Text dimColor>↑↓: Navigate | Enter/S: Start | E: Edit Tasks</Text>
        </Box>
      </Box>
    </Box>
  );
}

export default PreStartReviewScreen;
