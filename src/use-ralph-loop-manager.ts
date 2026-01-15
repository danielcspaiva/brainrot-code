/**
 * React hook for Ralph Loop Manager
 *
 * Provides a React-friendly interface to the Ralph loop manager,
 * with state updates and callbacks for UI integration.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  RalphLoopManager,
  RALPH_EVENTS,
  type LoopState,
  type LoopPhase,
  type LoopMode,
  type RalphPRD,
  type RalphTask,
} from "./ralph-loop-manager.js";

export interface RalphOutput {
  type: "stdout" | "stderr";
  content: string;
  timestamp: Date;
}

export interface UseRalphLoopManagerResult {
  // State
  state: LoopState;
  prd: RalphPRD | null;
  currentTask: RalphTask | null;
  output: RalphOutput[];
  isRunning: boolean;
  isPlanReady: boolean;
  isComplete: boolean;
  hasError: boolean;

  // Actions
  startPlanning: (featureDescription: string) => Promise<void>;
  startExecution: () => Promise<void>;
  continueExecution: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  retryTask: () => Promise<void>;
  setMode: (mode: LoopMode) => void;
  setMaxIterations: (max: number) => void;
  clearOutput: () => void;

  // Progress info
  completedTasks: number;
  totalTasks: number;
  progressPercent: number;
}

export function useRalphLoopManager(
  workDir?: string
): UseRalphLoopManagerResult {
  const managerRef = useRef<RalphLoopManager | null>(null);
  const [state, setState] = useState<LoopState>({
    phase: "idle",
    mode: "afk",
    prd: null,
    currentTaskIndex: -1,
    retryCount: 0,
    progress: [],
    iterationCount: 0,
    maxIterations: 50,
    startedAt: null,
    error: null,
  });
  const [output, setOutput] = useState<RalphOutput[]>([]);

  // Initialize manager
  useEffect(() => {
    const manager = new RalphLoopManager(workDir);
    managerRef.current = manager;

    // Subscribe to events
    const handlePhaseChange = (phase: LoopPhase) => {
      setState((prev) => ({ ...prev, phase }));
    };

    const handlePrdReady = (prd: RalphPRD) => {
      setState((prev) => ({ ...prev, prd }));
    };

    const handleTaskStart = (task: RalphTask) => {
      setState((prev) => ({
        ...prev,
        currentTaskIndex: prev.prd?.tasks.findIndex((t) => t.id === task.id) ?? -1,
      }));
    };

    const handleTaskComplete = (task: RalphTask) => {
      setState((prev) => {
        if (!prev.prd) return prev;
        const updatedTasks = prev.prd.tasks.map((t) =>
          t.id === task.id ? { ...t, passes: true } : t
        );
        return {
          ...prev,
          prd: { ...prev.prd, tasks: updatedTasks },
        };
      });
    };

    const handleOutput = (data: { type: "stdout" | "stderr"; content: string }) => {
      setOutput((prev) => [
        ...prev,
        { type: data.type, content: data.content, timestamp: new Date() },
      ]);
    };

    const handleError = (error: string) => {
      setState((prev) => ({ ...prev, error }));
    };

    manager.on(RALPH_EVENTS.PHASE_CHANGE, handlePhaseChange);
    manager.on(RALPH_EVENTS.PRD_READY, handlePrdReady);
    manager.on(RALPH_EVENTS.TASK_START, handleTaskStart);
    manager.on(RALPH_EVENTS.TASK_COMPLETE, handleTaskComplete);
    manager.on(RALPH_EVENTS.OUTPUT, handleOutput);
    manager.on(RALPH_EVENTS.ERROR, handleError);

    // Cleanup
    return () => {
      manager.removeAllListeners();
      manager.stop();
    };
  }, [workDir]);

  // Sync state from manager
  useEffect(() => {
    const interval = setInterval(() => {
      if (managerRef.current) {
        const currentState = managerRef.current.getState();
        setState(currentState);
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Actions
  const startPlanning = useCallback(async (featureDescription: string) => {
    setOutput([]);
    await managerRef.current?.startPlanning(featureDescription);
  }, []);

  const startExecution = useCallback(async () => {
    await managerRef.current?.startExecution();
  }, []);

  const continueExecution = useCallback(async () => {
    await managerRef.current?.continueExecution();
  }, []);

  const pause = useCallback(() => {
    managerRef.current?.pause();
  }, []);

  const stop = useCallback(() => {
    managerRef.current?.stop();
    setOutput([]);
  }, []);

  const retryTask = useCallback(async () => {
    await managerRef.current?.retryTask();
  }, []);

  const setMode = useCallback((mode: LoopMode) => {
    managerRef.current?.setMode(mode);
    setState((prev) => ({ ...prev, mode }));
  }, []);

  const setMaxIterations = useCallback((max: number) => {
    managerRef.current?.setMaxIterations(max);
    setState((prev) => ({ ...prev, maxIterations: max }));
  }, []);

  const clearOutput = useCallback(() => {
    setOutput([]);
  }, []);

  // Derived state
  const currentTask =
    state.prd && state.currentTaskIndex >= 0
      ? state.prd.tasks[state.currentTaskIndex]
      : null;

  const completedTasks = state.prd?.tasks.filter((t) => t.passes).length ?? 0;
  const totalTasks = state.prd?.tasks.length ?? 0;
  const progressPercent =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const isRunning = ["planning", "executing", "retrying"].includes(state.phase);
  const isPlanReady = state.phase === "plan_ready";
  const isComplete = state.phase === "completed";
  const hasError = state.phase === "errored";

  return {
    state,
    prd: state.prd,
    currentTask,
    output,
    isRunning,
    isPlanReady,
    isComplete,
    hasError,
    startPlanning,
    startExecution,
    continueExecution,
    pause,
    stop,
    retryTask,
    setMode,
    setMaxIterations,
    clearOutput,
    completedTasks,
    totalTasks,
    progressPercent,
  };
}
