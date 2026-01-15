/**
 * Side Panel Component
 *
 * Shows task list and current activity in a side panel.
 * Only visible when terminal is wide enough (user-configurable threshold).
 */

import { Box, Text } from "ink";
import { useMemo, useState, useEffect, useRef } from "react";
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
  /** Current tool being used (e.g., "Read", "Write", "Bash") */
  currentTool?: string | null;
  /** Panel width */
  width: number;
  /** Panel height */
  height: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format elapsed time as HH:MM:SS or MM:SS depending on duration
 */
function formatElapsedTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Get icon for a tool name
 */
function getToolIcon(toolName: string | null | undefined): string {
  if (!toolName) return "";
  switch (toolName.toLowerCase()) {
    case "read":
      return "\u{1F4D6}"; // Open book
    case "write":
      return "\u{1F4DD}"; // Memo
    case "edit":
      return "\u270F\uFE0F"; // Pencil
    case "bash":
      return "\u{1F4BB}"; // Laptop
    case "grep":
      return "\u{1F50D}"; // Magnifying glass
    case "glob":
      return "\u{1F4C2}"; // Folder
    case "task":
      return "\u{1F916}"; // Robot
    default:
      return "\u2699\uFE0F"; // Gear
  }
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
// HEARTBEAT INDICATOR COMPONENT
// ============================================================================

const HEARTBEAT_THRESHOLD_MS = 10000; // 10 seconds
const HEARTBEAT_MESSAGES = [
  "Still working...",
  "Processing...",
  "Working on it...",
  "In progress...",
];

interface HeartbeatIndicatorProps {
  elapsedMs: number;
  colors: ReturnType<typeof useThemeColors>;
}

function HeartbeatIndicator({ elapsedMs, colors }: HeartbeatIndicatorProps) {
  // Only show heartbeat after threshold
  if (elapsedMs < HEARTBEAT_THRESHOLD_MS) {
    return null;
  }

  // Rotate through messages every 5 seconds
  const messageIndex = Math.floor((elapsedMs / 5000) % HEARTBEAT_MESSAGES.length);
  const message = HEARTBEAT_MESSAGES[messageIndex];

  // Pulsing dot animation (alternates every second)
  const pulseState = Math.floor(elapsedMs / 1000) % 2 === 0;
  const dot = pulseState ? "\u25CF" : "\u25CB"; // Filled vs empty circle

  return (
    <Box marginTop={1}>
      <Text color={colors.info}>
        {dot} {message}
      </Text>
    </Box>
  );
}

// ============================================================================
// ELAPSED TIME COMPONENT
// ============================================================================

interface ElapsedTimeDisplayProps {
  startedAt: Date | null | undefined;
  colors: ReturnType<typeof useThemeColors>;
}

function ElapsedTimeDisplay({ startedAt, colors }: ElapsedTimeDisplayProps) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (startedAt) {
      // Calculate initial elapsed time
      const startTime = startedAt.getTime();
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
  }, [startedAt]);

  if (!startedAt) {
    return null;
  }

  return (
    <Box flexDirection="column">
      <Box>
        <Text dimColor>Elapsed: </Text>
        <Text color={colors.accent} bold>{formatElapsedTime(elapsedMs)}</Text>
      </Box>
      <HeartbeatIndicator elapsedMs={elapsedMs} colors={colors} />
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
  currentTool,
  width,
  height,
}: SidePanelProps) {
  const colors = useThemeColors();

  // Calculate how many tasks we can show
  const maxVisibleTasks = useMemo(() => {
    // Reserve space for: header (2), divider (1), activity section (8 with elapsed), padding
    return Math.max(3, height - 12);
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

  const toolIcon = getToolIcon(currentTool);

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
            {/* Tool indicator */}
            {currentTool && (
              <Box marginBottom={1}>
                <Text color={colors.primary}>
                  {toolIcon} <Text bold>{currentTool}</Text>
                </Text>
              </Box>
            )}

            {/* Activity description */}
            <Text color={colors.text}>
              {currentActivity.length > width - 4
                ? currentActivity.slice(0, width - 7) + "..."
                : currentActivity}
            </Text>

            {/* Elapsed time with heartbeat */}
            <Box marginTop={1}>
              <ElapsedTimeDisplay startedAt={activityStartedAt} colors={colors} />
            </Box>
          </Box>
        ) : (
          <Text dimColor>Waiting for activity...</Text>
        )}
      </Box>
    </Box>
  );
}

export default SidePanel;
