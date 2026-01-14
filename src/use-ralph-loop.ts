/**
 * React hook for Ralph Loop status parsing
 *
 * Integrates with useClaudeCode to parse output and provide
 * structured Ralph loop state for UI consumption.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import type { ClaudeCodeOutput } from "./use-claude-code.js";
import {
  type RalphLoopState,
  type RalphLoopStatus,
  createInitialState,
  parseOutput,
  needsUserAttention,
  getStatusMessage,
  getProgressString,
} from "./ralph-loop-parser.js";

export interface UseRalphLoopOptions {
  /** Maximum number of recent outputs to keep in history */
  maxHistorySize?: number;
  /** Whether to auto-detect loop start from output */
  autoDetectStart?: boolean;
}

export interface UseRalphLoopResult {
  /** Current Ralph loop state */
  state: RalphLoopState;
  /** Whether user attention is needed */
  needsAttention: boolean;
  /** Human-readable status message */
  statusMessage: string;
  /** Formatted progress string (e.g., "3/10" or "75%") */
  progressString: string | null;
  /** Process new output from Claude Code */
  processOutput: (output: ClaudeCodeOutput) => void;
  /** Process multiple outputs at once */
  processOutputs: (outputs: ClaudeCodeOutput[]) => void;
  /** Reset the loop state */
  reset: () => void;
  /** Manually set the loop status */
  setStatus: (status: RalphLoopStatus) => void;
  /** Clear user attention state */
  clearAttention: () => void;
}

export function useRalphLoop(
  options: UseRalphLoopOptions = {}
): UseRalphLoopResult {
  const { autoDetectStart = true } = options;

  const [state, setState] = useState<RalphLoopState>(createInitialState);

  // Process a single output
  const processOutput = useCallback(
    (output: ClaudeCodeOutput) => {
      setState((currentState) => {
        // Only process stdout for status parsing (stderr is for errors)
        if (output.type === "stderr") {
          // For stderr, just mark as errored if we detect error patterns
          const errorState = parseOutput(output.content, currentState);
          if (errorState.userAttention.type === "error") {
            return {
              ...errorState,
              status: "errored" as RalphLoopStatus,
            };
          }
          return currentState;
        }

        const newState = parseOutput(output.content, currentState);

        // Auto-detect loop start if enabled
        if (autoDetectStart && currentState.status === "idle") {
          if (
            newState.agentActivity.isActive ||
            newState.progress.currentStep > 0
          ) {
            return {
              ...newState,
              status: "running",
            };
          }
        }

        return newState;
      });
    },
    [autoDetectStart]
  );

  // Process multiple outputs
  const processOutputs = useCallback(
    (outputs: ClaudeCodeOutput[]) => {
      for (const output of outputs) {
        processOutput(output);
      }
    },
    [processOutput]
  );

  // Reset to initial state
  const reset = useCallback(() => {
    setState(createInitialState());
  }, []);

  // Manually set status
  const setStatus = useCallback((status: RalphLoopStatus) => {
    setState((current) => ({
      ...current,
      status,
      lastUpdated: new Date(),
    }));
  }, []);

  // Clear user attention
  const clearAttention = useCallback(() => {
    setState((current) => ({
      ...current,
      userAttention: {
        needed: false,
        reason: null,
        type: null,
        prompt: null,
      },
      lastUpdated: new Date(),
    }));
  }, []);

  // Computed values
  const needsAttention = useMemo(() => needsUserAttention(state), [state]);
  const statusMessage = useMemo(() => getStatusMessage(state), [state]);
  const progressString = useMemo(() => getProgressString(state), [state]);

  return {
    state,
    needsAttention,
    statusMessage,
    progressString,
    processOutput,
    processOutputs,
    reset,
    setStatus,
    clearAttention,
  };
}

/**
 * Hook that automatically processes Claude Code output
 * and maintains Ralph loop state
 */
export function useRalphLoopWithClaudeOutput(
  outputs: ClaudeCodeOutput[],
  options: UseRalphLoopOptions = {}
): UseRalphLoopResult {
  const ralphLoop = useRalphLoop(options);

  // Process new outputs when they arrive
  useEffect(() => {
    if (outputs.length > 0) {
      // Process only the most recent output to avoid reprocessing
      const latestOutput = outputs[outputs.length - 1];
      ralphLoop.processOutput(latestOutput);
    }
    // We only want to run when outputs array length changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outputs.length]);

  return ralphLoop;
}
