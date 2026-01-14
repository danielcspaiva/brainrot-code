/**
 * Loop Management Panel
 *
 * Displays loop status, agent activity, duration, controls,
 * and recent activity log for Ralph loops.
 */

import { Box, Text } from "ink";
import { useState, useEffect, useCallback } from "react";
import type { RalphLoopState, RalphLoopStatus } from "./ralph-loop-parser.js";
import {
  colors,
  progressChars,
  getStatusColor,
  getStatusIcon,
} from "./theme.js";

export interface ActivityLogEntry {
  timestamp: Date;
  message: string;
  type: "info" | "action" | "warning" | "error";
}

export interface LoopManagementPanelProps {
  /** Ralph loop state from useRalphLoop hook */
  loopState: RalphLoopState;
  /** Whether user attention is needed */
  needsAttention: boolean;
  /** Human-readable status message */
  statusMessage: string;
  /** Formatted progress string */
  progressString: string | null;
  /** Process status (from Claude Code process) */
  processStatus: string;
  /** Callback when start is requested */
  onStart?: () => void;
  /** Callback when stop is requested */
  onStop?: () => void;
  /** Callback when pause is requested */
  onPause?: () => void;
  /** Callback when resume is requested */
  onResume?: () => void;
  /** Maximum activity log entries to show */
  maxLogEntries?: number;
}

/**
 * Format duration as human-readable string
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * Format timestamp for activity log
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Status indicator with icon and color
 */
function StatusIndicator({
  status,
  needsAttention,
}: {
  status: string;
  needsAttention: boolean;
}) {
  const color = needsAttention ? colors.secondary : getStatusColor(status);
  const icon = getStatusIcon(status);

  return (
    <Box>
      <Text color={color} bold>
        {icon}
      </Text>
      <Text color={color}> {status.toUpperCase().replace(/_/g, " ")}</Text>
      {needsAttention && (
        <Text color={colors.secondary} bold>
          {" "}
          (!)
        </Text>
      )}
    </Box>
  );
}

/**
 * Progress bar component
 */
function ProgressBar({
  percentage,
  width = 20,
}: {
  percentage: number;
  width?: number;
}) {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;

  return (
    <Text>
      <Text color={colors.success}>{progressChars.filled.repeat(filled)}</Text>
      <Text color={colors.textMuted}>{progressChars.empty.repeat(empty)}</Text>
      <Text dimColor> {percentage}%</Text>
    </Text>
  );
}

/**
 * Agent activity display
 */
function AgentActivityDisplay({
  loopState,
  statusMessage,
}: {
  loopState: RalphLoopState;
  statusMessage: string;
}) {
  const { agentActivity, progress } = loopState;

  return (
    <Box flexDirection="column">
      <Text dimColor>Current Activity:</Text>
      <Box marginLeft={1}>
        {agentActivity.isActive ? (
          <Box flexDirection="column">
            <Text color={colors.primary}>{statusMessage}</Text>
            {agentActivity.toolName && (
              <Text dimColor>Tool: {agentActivity.toolName}</Text>
            )}
          </Box>
        ) : (
          <Text dimColor>{statusMessage}</Text>
        )}
      </Box>

      {progress.description && (
        <Box marginTop={1}>
          <Text dimColor>Step: </Text>
          <Text>{progress.description}</Text>
        </Box>
      )}
    </Box>
  );
}

/**
 * Duration/elapsed time display
 */
function DurationDisplay({ startTime }: { startTime: Date | null }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startTime) {
      setElapsed(0);
      return;
    }

    // Update immediately
    setElapsed(Date.now() - startTime.getTime());

    // Update every second
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime.getTime());
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  if (!startTime) {
    return (
      <Box>
        <Text dimColor>Duration: </Text>
        <Text>--</Text>
      </Box>
    );
  }

  return (
    <Box>
      <Text dimColor>Duration: </Text>
      <Text color={colors.accent}>{formatDuration(elapsed)}</Text>
    </Box>
  );
}

/**
 * Controls display (shows available keyboard shortcuts)
 */
function ControlsDisplay({
  processStatus,
  loopStatus,
}: {
  processStatus: string;
  loopStatus: RalphLoopStatus;
}) {
  const canStart =
    processStatus === "idle" ||
    processStatus === "stopped" ||
    processStatus === "crashed";
  const canStop = processStatus === "running";
  const isPaused = loopStatus === "paused";

  return (
    <Box flexDirection="column">
      <Text dimColor bold>
        Controls:
      </Text>
      <Box marginLeft={1} flexDirection="column">
        {canStart && (
          <Text>
            <Text color={colors.success}>Ctrl+S</Text>
            <Text dimColor> Start loop</Text>
          </Text>
        )}
        {canStop && (
          <Text>
            <Text color={colors.error}>Ctrl+S</Text>
            <Text dimColor> Stop loop</Text>
          </Text>
        )}
        {isPaused && (
          <Text>
            <Text color={colors.warning}>Ctrl+R</Text>
            <Text dimColor> Resume loop</Text>
          </Text>
        )}
      </Box>
    </Box>
  );
}

/**
 * Activity log entry component
 */
function LogEntry({ entry }: { entry: ActivityLogEntry }) {
  const logColors: Record<ActivityLogEntry["type"], string> = {
    info: colors.text,
    action: colors.primary,
    warning: colors.warning,
    error: colors.error,
  };

  return (
    <Box>
      <Text dimColor>[{formatTime(entry.timestamp)}]</Text>
      <Text color={logColors[entry.type]}> {entry.message}</Text>
    </Box>
  );
}

/**
 * Recent activity log display
 */
function ActivityLog({ entries }: { entries: ActivityLogEntry[] }) {
  if (entries.length === 0) {
    return (
      <Box flexDirection="column">
        <Text dimColor bold>
          Activity Log:
        </Text>
        <Box marginLeft={1}>
          <Text dimColor>No activity yet</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text dimColor bold>
        Activity Log:
      </Text>
      <Box marginLeft={1} flexDirection="column">
        {entries.map((entry, idx) => (
          <LogEntry key={idx} entry={entry} />
        ))}
      </Box>
    </Box>
  );
}

/**
 * Hook to manage activity log from loop state changes
 */
export function useActivityLog(
  loopState: RalphLoopState,
  processStatus: string,
  maxEntries: number = 10
): ActivityLogEntry[] {
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [lastStatus, setLastStatus] = useState<string>(loopState.status);
  const [lastProcessStatus, setLastProcessStatus] =
    useState<string>(processStatus);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const addEntry = useCallback(
    (message: string, type: ActivityLogEntry["type"] = "info") => {
      setEntries((prev) => {
        const newEntry: ActivityLogEntry = {
          timestamp: new Date(),
          message,
          type,
        };
        const updated = [...prev, newEntry];
        // Keep only the last maxEntries
        return updated.slice(-maxEntries);
      });
    },
    [maxEntries]
  );

  // Track process status changes
  useEffect(() => {
    if (processStatus !== lastProcessStatus) {
      switch (processStatus) {
        case "starting":
          addEntry("Starting Claude Code process...", "info");
          break;
        case "running":
          if (lastProcessStatus === "starting") {
            addEntry("Claude Code process started", "action");
          }
          break;
        case "stopped":
          addEntry("Claude Code process stopped", "info");
          break;
        case "crashed":
          addEntry("Claude Code process crashed!", "error");
          break;
      }
      setLastProcessStatus(processStatus);
    }
  }, [processStatus, lastProcessStatus, addEntry]);

  // Track loop status changes
  useEffect(() => {
    if (loopState.status !== lastStatus) {
      switch (loopState.status) {
        case "running":
          if (lastStatus === "idle" || lastStatus === "paused") {
            addEntry("Loop started", "action");
          }
          break;
        case "paused":
          addEntry("Loop paused", "warning");
          break;
        case "completed":
          addEntry("Loop completed successfully", "action");
          break;
        case "errored":
          addEntry("Loop encountered an error", "error");
          break;
        case "waiting_for_input":
          addEntry("Waiting for user input", "warning");
          break;
      }
      setLastStatus(loopState.status);
    }
  }, [loopState.status, lastStatus, addEntry]);

  // Track agent actions
  useEffect(() => {
    const currentAction = loopState.agentActivity.currentAction;
    if (currentAction && currentAction !== lastAction) {
      addEntry(currentAction, "action");
      setLastAction(currentAction);
    }
  }, [loopState.agentActivity.currentAction, lastAction, addEntry]);

  return entries;
}

/**
 * Main Loop Management Panel component
 */
export function LoopManagementPanel({
  loopState,
  needsAttention,
  statusMessage,
  progressString,
  processStatus,
  maxLogEntries = 8,
}: LoopManagementPanelProps) {
  // Track start time for duration display
  const [startTime, setStartTime] = useState<Date | null>(null);

  // Manage activity log
  const activityLog = useActivityLog(loopState, processStatus, maxLogEntries);

  // Update start time when loop starts
  useEffect(() => {
    if (
      loopState.status === "running" &&
      startTime === null &&
      processStatus === "running"
    ) {
      setStartTime(new Date());
    } else if (
      loopState.status === "completed" ||
      loopState.status === "errored" ||
      processStatus === "stopped" ||
      processStatus === "crashed"
    ) {
      // Keep the start time for duration display after completion
    } else if (loopState.status === "idle" && processStatus === "idle") {
      setStartTime(null);
    }
  }, [loopState.status, processStatus, startTime]);

  return (
    <Box flexDirection="column" padding={1} height="100%">
      {/* Header with status indicator */}
      <Box marginBottom={1}>
        <Text bold color={colors.primary}>
          Loop Status
        </Text>
      </Box>

      {/* Status and progress section */}
      <Box flexDirection="column" marginBottom={1}>
        <StatusIndicator
          status={
            processStatus === "running" ? loopState.status : processStatus
          }
          needsAttention={needsAttention}
        />

        {/* Progress bar and info */}
        {loopState.progress.percentage !== null && (
          <Box marginTop={1}>
            <ProgressBar percentage={loopState.progress.percentage} />
          </Box>
        )}

        {progressString && (
          <Box>
            <Text dimColor>Progress: </Text>
            <Text color={colors.primary}>{progressString}</Text>
          </Box>
        )}
      </Box>

      {/* Agent activity section */}
      <Box marginBottom={1}>
        <AgentActivityDisplay
          loopState={loopState}
          statusMessage={statusMessage}
        />
      </Box>

      {/* Duration display */}
      <Box marginBottom={1}>
        <DurationDisplay
          startTime={processStatus === "running" ? startTime : null}
        />
      </Box>

      {/* Controls section */}
      <Box marginBottom={1}>
        <ControlsDisplay
          processStatus={processStatus}
          loopStatus={loopState.status}
        />
      </Box>

      {/* User attention alert */}
      {needsAttention && loopState.userAttention.reason && (
        <Box
          marginBottom={1}
          borderStyle="round"
          borderColor={colors.secondary}
          paddingX={1}
        >
          <Box flexDirection="column">
            <Text color={colors.secondary} bold>
              Attention Required
            </Text>
            <Text color={colors.secondary}>{loopState.userAttention.reason}</Text>
            {loopState.userAttention.prompt && (
              <Text dimColor>{loopState.userAttention.prompt}</Text>
            )}
          </Box>
        </Box>
      )}

      {/* Activity log - takes remaining space */}
      <Box flexDirection="column" flexGrow={1}>
        <ActivityLog entries={activityLog} />
      </Box>
    </Box>
  );
}

export default LoopManagementPanel;
