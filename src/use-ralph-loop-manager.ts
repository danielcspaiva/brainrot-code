/**
 * React hook for Ralph Loop Manager
 *
 * Provides a React-friendly interface to the Ralph loop manager,
 * with state updates and callbacks for UI integration.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getRalphLoopManager,
  RalphLoopManager,
  RALPH_EVENTS,
  type LoopState,
  type LoopPhase,
  type LoopMode,
  type RalphPRD,
  type RalphTask,
} from "./ralph-loop-manager.js";
import { debugLog } from "./debug-logger.js";

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
  const intentionalStopRef = useRef(false);
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

  // Initialize manager (use singleton to survive re-mounts)
  useEffect(() => {
    debugLog("EVENT", "useRalphLoopManager effect running - getting manager singleton");
    const manager = getRalphLoopManager(workDir);
    managerRef.current = manager;

    // Subscribe to events
    const handlePhaseChange = (phase: LoopPhase) => {
      debugLog("EVENT", "Phase changed", phase);
      setState((prev) => ({ ...prev, phase }));
    };

    const handlePrdReady = (prd: RalphPRD) => {
      debugLog("EVENT", "PRD ready", { name: prd.name, taskCount: prd.tasks.length });
      setState((prev) => ({ ...prev, prd }));
    };

    const handleTaskStart = (task: RalphTask) => {
      debugLog("EVENT", "Task started", task.title);
      setState((prev) => ({
        ...prev,
        currentTaskIndex: prev.prd?.tasks.findIndex((t) => t.id === task.id) ?? -1,
      }));
    };

    const handleTaskComplete = (task: RalphTask) => {
      debugLog("EVENT", "Task completed", task.title);
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
      debugLog("EVENT", `Output received (${data.type})`, data.content.length + " chars");
      setOutput((prev) => [
        ...prev,
        { type: data.type, content: data.content, timestamp: new Date() },
      ]);
    };

    const handleError = (error: string) => {
      debugLog("ERROR", "Error event received", error);
      setState((prev) => ({ ...prev, error }));
    };

    manager.on(RALPH_EVENTS.PHASE_CHANGE, handlePhaseChange);
    manager.on(RALPH_EVENTS.PRD_READY, handlePrdReady);
    manager.on(RALPH_EVENTS.TASK_START, handleTaskStart);
    manager.on(RALPH_EVENTS.TASK_COMPLETE, handleTaskComplete);
    manager.on(RALPH_EVENTS.OUTPUT, handleOutput);
    manager.on(RALPH_EVENTS.ERROR, handleError);

    // Cleanup - only stop if intentional (user pressed cancel/escape)
    // Don't stop on effect re-run due to component re-mounting
    return () => {
      debugLog("EVENT", "useRalphLoopManager cleanup called", { intentional: intentionalStopRef.current });
      manager.removeAllListeners();
      if (intentionalStopRef.current) {
        debugLog("EVENT", "Intentional stop - killing process");
        manager.stop();
      } else {
        debugLog("EVENT", "Effect cleanup (not intentional) - preserving process");
      }
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
    debugLog("EVENT", "startPlanning callback invoked", featureDescription);
    debugLog("EVENT", "Manager exists?", !!managerRef.current);
    debugLog("EVENT", "Manager state", managerRef.current?.getState().phase ?? "no manager");
    setOutput([]);
    debugLog("EVENT", "Calling manager.startPlanning...");
    await managerRef.current?.startPlanning(featureDescription);
    debugLog("EVENT", "manager.startPlanning completed");
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
    intentionalStopRef.current = true;
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
