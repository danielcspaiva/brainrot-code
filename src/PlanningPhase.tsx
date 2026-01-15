/**
 * Planning Phase Component
 *
 * Shows real Claude output during the planning phase.
 * Displays streaming output as Claude analyzes the codebase
 * and generates the PRD.
 */

import { Box, Text, useInput } from "ink";
import { useState, useEffect, useMemo } from "react";
import { useThemeColors } from "./useTheme.js";
import { alertIcons, decorChars } from "./theme.js";
import {
  debugEvents,
  getRecentMessages,
  type DebugMessage,
} from "./debug-logger.js";
import type { RalphOutput } from "./use-ralph-loop-manager.js";
import type { LoopPhase, RalphPRD } from "./ralph-loop-manager.js";

// ============================================================================
// TYPES
// ============================================================================

export interface PlanningPhaseProps {
  featureDescription: string;
  phase: LoopPhase;
  output: RalphOutput[];
  prd: RalphPRD | null;
  error: string | null;
  onCancel: () => void;
  onPlanReady: () => void;
  hasFocus: boolean;
  dimensions: { width: number; height: number };
  debugMode?: boolean;
}

// ============================================================================
// SPINNER COMPONENT
// ============================================================================

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

function Spinner() {
  const [frame, setFrame] = useState(0);
  const colors = useThemeColors();

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((prev) => (prev + 1) % SPINNER_FRAMES.length);
    }, 80);
    return () => clearInterval(timer);
  }, []);

  return <Text color={colors.primary}>{SPINNER_FRAMES[frame]}</Text>;
}

// ============================================================================
// DEBUG PANEL HOOK & COMPONENT
// ============================================================================

function useDebugMessages(maxMessages: number = 20): DebugMessage[] {
  const [messages, setMessages] = useState<DebugMessage[]>(() =>
    getRecentMessages().slice(-maxMessages)
  );

  useEffect(() => {
    const handleMessage = (msg: DebugMessage) => {
      setMessages((prev) => [...prev.slice(-(maxMessages - 1)), msg]);
    };

    debugEvents.on("message", handleMessage);
    return () => {
      debugEvents.off("message", handleMessage);
    };
  }, [maxMessages]);

  return messages;
}

interface DebugPanelProps {
  width: number;
  height: number;
}

function DebugPanel({ width, height }: DebugPanelProps) {
  const colors = useThemeColors();
  const messages = useDebugMessages(height - 2);

  const categoryColor = (cat: string): string => {
    switch (cat) {
      case "ERROR":
        return colors.error;
      case "SPAWN":
        return colors.success;
      case "OUTPUT":
        return colors.primary;
      case "EVENT":
        return colors.accent;
      case "INIT":
        return colors.secondary;
      default:
        return colors.textMuted;
    }
  };

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={colors.secondary}
      width={width}
      height={height}
    >
      <Box paddingX={1}>
        <Text bold color={colors.secondary}>
          DEBUG LOG
        </Text>
      </Box>
      <Box flexDirection="column" paddingX={1} overflow="hidden">
        {messages.length === 0 ? (
          <Text dimColor italic>
            No debug messages yet...
          </Text>
        ) : (
          messages.map((msg, i) => (
            <Text key={i} wrap="truncate">
              <Text dimColor>[{msg.timestamp.slice(0, 8)}]</Text>
              <Text color={categoryColor(msg.category)}>[{msg.category}]</Text>
              <Text color={colors.textMuted}>
                {" "}{msg.message}{msg.data !== undefined ? `: ${typeof msg.data === "string" ? msg.data.slice(0, 50) : JSON.stringify(msg.data).slice(0, 50)}` : ""}
              </Text>
            </Text>
          ))
        )}
      </Box>
    </Box>
  );
}

// ============================================================================
// OUTPUT LINE COMPONENT
// ============================================================================

interface OutputLineProps {
  content: string;
  type: "stdout" | "stderr";
  maxWidth: number;
}

function OutputLine({ content, type, maxWidth }: OutputLineProps) {
  const colors = useThemeColors();
  const isError = type === "stderr";

  // Truncate long lines
  const displayContent =
    content.length > maxWidth ? content.slice(0, maxWidth - 3) + "..." : content;

  return (
    <Text color={isError ? colors.error : colors.textMuted} wrap="truncate">
      {displayContent}
    </Text>
  );
}

// ============================================================================
// PROGRESS INDICATOR
// ============================================================================

interface ProgressIndicatorProps {
  phase: LoopPhase;
  taskCount: number;
}

function ProgressIndicator({ phase, taskCount }: ProgressIndicatorProps) {
  const colors = useThemeColors();

  const stages = [
    { id: "analyzing", label: "Analyzing codebase", complete: phase !== "planning" || taskCount > 0 },
    { id: "generating", label: "Generating tasks", complete: phase === "plan_ready" },
    { id: "ready", label: "Plan ready", complete: phase === "plan_ready" },
  ];

  // Find current stage (first incomplete one)
  const currentStageIndex = stages.findIndex((s) => !s.complete);

  return (
    <Box flexDirection="column" marginBottom={1}>
      {stages.map((stage, index) => {
        const isCurrent = index === currentStageIndex;
        const isComplete = stage.complete;

        return (
          <Box key={stage.id}>
            <Text color={isComplete ? colors.success : isCurrent ? colors.primary : colors.textMuted}>
              {isComplete ? alertIcons.success : isCurrent ? <Spinner /> : "○"}{" "}
            </Text>
            <Text
              color={isComplete ? colors.success : isCurrent ? colors.text : colors.textMuted}
              bold={isCurrent}
            >
              {stage.label}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PlanningPhase({
  featureDescription,
  phase,
  output,
  prd,
  error,
  onCancel,
  onPlanReady,
  hasFocus,
  dimensions,
  debugMode = false,
}: PlanningPhaseProps) {
  const colors = useThemeColors();

  // In debug mode, split the screen vertically
  const mainHeight = debugMode ? Math.floor(dimensions.height * 0.5) : dimensions.height;
  const debugHeight = debugMode ? dimensions.height - mainHeight : 0;

  // Calculate visible output lines
  const maxOutputLines = Math.max(mainHeight - 16, 5);
  const contentWidth = Math.min(80, dimensions.width - 4);

  // Get recent output lines
  const recentOutput = useMemo(() => {
    // Split output by newlines and take most recent
    const allLines: { content: string; type: "stdout" | "stderr" }[] = [];
    for (const item of output) {
      const lines = item.content.split("\n").filter((l) => l.trim());
      for (const line of lines) {
        allLines.push({ content: line, type: item.type });
      }
    }
    return allLines.slice(-maxOutputLines);
  }, [output, maxOutputLines]);

  // Handle keyboard input
  useInput(
    (_input, key) => {
      if (key.escape) {
        onCancel();
        return;
      }
      if (key.return && phase === "plan_ready") {
        onPlanReady();
        return;
      }
    },
    { isActive: hasFocus }
  );

  const isPlanning = phase === "planning";
  const isPlanReady = phase === "plan_ready";
  const hasError = phase === "errored";

  return (
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      width="100%"
      height="100%"
    >
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color={colors.primary}>
          {decorChars.sparkle} Planning Phase {decorChars.sparkle}
        </Text>
      </Box>

      {/* Feature description */}
      <Box marginBottom={1} width={contentWidth}>
        <Text dimColor italic>
          Feature:{" "}
          {featureDescription.length > contentWidth - 10
            ? featureDescription.slice(0, contentWidth - 13) + "..."
            : featureDescription}
        </Text>
      </Box>

      {/* Main content box */}
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={hasError ? colors.error : colors.secondary}
        paddingX={2}
        paddingY={1}
        width={contentWidth}
      >
        {/* Progress indicator */}
        <ProgressIndicator phase={phase} taskCount={prd?.tasks.length ?? 0} />

        {/* Error display */}
        {hasError && error && (
          <Box marginY={1} flexDirection="column">
            <Text color={colors.error} bold>
              {alertIcons.error} Error:
            </Text>
            <Text color={colors.error}>{error}</Text>
          </Box>
        )}

        {/* Output display */}
        {isPlanning && !hasError && (
          <Box flexDirection="column" marginY={1}>
            <Text color={colors.accent} bold>
              Claude Output:
            </Text>
            <Box
              flexDirection="column"
              height={maxOutputLines}
              overflow="hidden"
            >
              {recentOutput.length === 0 ? (
                <Text dimColor italic>
                  Waiting for Claude...
                </Text>
              ) : (
                recentOutput.map((line, i) => (
                  <OutputLine
                    key={i}
                    content={line.content}
                    type={line.type}
                    maxWidth={contentWidth - 6}
                  />
                ))
              )}
            </Box>
          </Box>
        )}

        {/* Plan ready summary */}
        {isPlanReady && prd && (
          <Box flexDirection="column" marginY={1}>
            <Text color={colors.success} bold>
              {alertIcons.success} Plan Generated Successfully!
            </Text>
            <Box marginTop={1}>
              <Text color={colors.text}>
                <Text bold>{prd.name}</Text>
              </Text>
            </Box>
            <Box marginTop={1}>
              <Text color={colors.textMuted}>{prd.description}</Text>
            </Box>
            <Box marginTop={1}>
              <Text color={colors.secondary}>
                {prd.tasks.length} tasks identified
              </Text>
            </Box>
            <Box marginTop={1} flexDirection="column">
              <Text color={colors.accent} bold>
                Tasks:
              </Text>
              {prd.tasks.slice(0, 5).map((task, i) => (
                <Box key={task.id}>
                  <Text color={colors.textMuted}>
                    {i + 1}. {task.title}
                  </Text>
                  <Text
                    color={
                      task.complexity === "small"
                        ? colors.success
                        : task.complexity === "medium"
                          ? colors.warning
                          : colors.error
                    }
                  >
                    {" "}
                    [{task.complexity.charAt(0).toUpperCase()}]
                  </Text>
                </Box>
              ))}
              {prd.tasks.length > 5 && (
                <Text dimColor italic>
                  ... and {prd.tasks.length - 5} more tasks
                </Text>
              )}
            </Box>
          </Box>
        )}
      </Box>

      {/* Help text */}
      <Box marginTop={1}>
        {isPlanning && (
          <Text dimColor>
            <Spinner /> Analyzing codebase... Press Escape to cancel
          </Text>
        )}
        {isPlanReady && (
          <Text color={colors.success}>
            Press Enter to continue | Escape to cancel
          </Text>
        )}
        {hasError && (
          <Text color={colors.warning}>Press Escape to go back</Text>
        )}
      </Box>

      {/* Debug panel - only shown when debug mode is enabled */}
      {debugMode && debugHeight > 0 && (
        <Box marginTop={1}>
          <DebugPanel width={dimensions.width - 4} height={debugHeight} />
        </Box>
      )}
    </Box>
  );
}

export default PlanningPhase;
