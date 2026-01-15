import { useState, useEffect, useCallback, useRef } from "react";
import {
  RalphLoop,
  type RalphLoopStatus,
  type PRDDocument,
  type PRDTask,
  type IterationResult,
  type RalphLoopOptions,
} from "../claude/ralph-loop.js";

export interface UseRalphLoopOptions {
  /** Maximum output lines to retain (default: 1000) */
  maxOutputLines?: number;
  /** Auto-start loop after loading PRD */
  autoStart?: boolean;
}

export interface UseRalphLoopResult {
  /** Current loop status */
  status: RalphLoopStatus;
  /** Loaded PRD document */
  prd: PRDDocument | null;
  /** Current iteration number */
  iteration: number;
  /** Maximum iterations configured */
  maxIterations: number;
  /** Current task being worked on */
  currentTask: PRDTask | null;
  /** Completed tasks */
  completedTasks: PRDTask[];
  /** Pending tasks */
  pendingTasks: PRDTask[];
  /** Output from Claude */
  output: string[];
  /** Last error */
  error: { message: string; phase: string } | null;
  /** Progress percentage (0-100) */
  progress: number;
  /** Load a PRD file */
  loadPRD: (options: RalphLoopOptions) => Promise<PRDTask[]>;
  /** Run a single iteration */
  runIteration: () => Promise<IterationResult | null>;
  /** Run the complete loop */
  runLoop: () => Promise<void>;
  /** Pause the loop */
  pause: () => void;
  /** Resume the loop */
  resume: () => void;
  /** Stop the loop */
  stop: () => Promise<void>;
  /** Kill the loop immediately */
  kill: () => void;
  /** Send input to Claude */
  sendInput: (input: string) => void;
  /** Update a task's status */
  updateTask: (taskId: string, status: PRDTask["status"]) => Promise<void>;
  /** Clear output buffer */
  clearOutput: () => void;
  /** Check if loop is running */
  isRunning: boolean;
  /** Check if all tasks are complete */
  isComplete: boolean;
}

/**
 * React hook for managing a Ralph loop.
 * Provides state tracking and control over the Ralph loop lifecycle.
 */
export function useRalphLoop(
  options: UseRalphLoopOptions = {}
): UseRalphLoopResult {
  const { maxOutputLines = 1000, autoStart = false } = options;

  const loopRef = useRef<RalphLoop | null>(null);
  const [status, setStatus] = useState<RalphLoopStatus>("idle");
  const [prd, setPRD] = useState<PRDDocument | null>(null);
  const [iteration, setIteration] = useState(0);
  const [maxIterations, setMaxIterations] = useState(10);
  const [currentTask, setCurrentTask] = useState<PRDTask | null>(null);
  const [output, setOutput] = useState<string[]>([]);
  const [error, setError] = useState<{ message: string; phase: string } | null>(
    null
  );

  // Initialize loop on mount
  useEffect(() => {
    const loop = new RalphLoop();
    loopRef.current = loop;

    // Subscribe to events
    loop.onStatus((newStatus) => {
      setStatus(newStatus);
    });

    loop.onPRDLoaded((loadedPRD) => {
      setPRD({ ...loadedPRD });
      setIteration(loadedPRD.iteration);
      setMaxIterations(loadedPRD.maxIterations);
      const current = loadedPRD.tasks.find(
        (t) => t.id === loadedPRD.currentTask
      );
      setCurrentTask(current ?? null);
    });

    loop.onIterationStart(({ iteration: iter, currentTask: task }) => {
      setIteration(iter);
      setCurrentTask(task);
    });

    loop.onIterationComplete((result) => {
      setIteration(result.iteration);
      // Update PRD state
      if (loopRef.current?.prd) {
        setPRD({ ...loopRef.current.prd });
        const current = loopRef.current.currentTask;
        setCurrentTask(current);
      }
    });

    loop.onTaskUpdated(() => {
      // Update PRD state when a task changes
      if (loopRef.current?.prd) {
        setPRD({ ...loopRef.current.prd });
      }
    });

    loop.onOutput((data) => {
      setOutput((prev) => {
        const newLines = data.split("\n").filter(Boolean);
        const newOutput = [...prev, ...newLines];
        if (newOutput.length > maxOutputLines) {
          return newOutput.slice(-maxOutputLines);
        }
        return newOutput;
      });
    });

    loop.onError((err) => {
      setError(err);
    });

    // Cleanup on unmount
    return () => {
      if (loop.isRunning) {
        loop.kill();
      }
    };
  }, [maxOutputLines]);

  const loadPRD = useCallback(
    async (loopOptions: RalphLoopOptions) => {
      if (!loopRef.current) {
        throw new Error("Loop not initialized");
      }
      setError(null);
      setOutput([]);
      const tasks = await loopRef.current.loadPRD(loopOptions);

      // Auto-start if configured
      if (autoStart) {
        void loopRef.current.runLoop();
      }

      return tasks;
    },
    [autoStart]
  );

  const runIteration = useCallback(async () => {
    if (!loopRef.current) {
      return null;
    }
    setError(null);
    return loopRef.current.runIteration();
  }, []);

  const runLoop = useCallback(async () => {
    if (!loopRef.current) {
      return;
    }
    setError(null);
    await loopRef.current.runLoop();
  }, []);

  const pause = useCallback(() => {
    loopRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    loopRef.current?.resume();
  }, []);

  const stop = useCallback(async () => {
    if (loopRef.current) {
      await loopRef.current.stop();
    }
  }, []);

  const kill = useCallback(() => {
    loopRef.current?.kill();
  }, []);

  const sendInput = useCallback((input: string) => {
    loopRef.current?.sendInput(input);
  }, []);

  const updateTask = useCallback(
    async (taskId: string, taskStatus: PRDTask["status"]) => {
      if (!loopRef.current) {
        throw new Error("Loop not initialized");
      }
      await loopRef.current.updateTask(taskId, taskStatus);
      // Refresh PRD state
      if (loopRef.current.prd) {
        setPRD({ ...loopRef.current.prd });
      }
    },
    []
  );

  const clearOutput = useCallback(() => {
    setOutput([]);
    setError(null);
  }, []);

  // Derived state
  const completedTasks = prd?.tasks.filter((t) => t.status === "completed") ?? [];
  const pendingTasks = prd?.tasks.filter((t) => t.status === "pending") ?? [];
  const totalTasks = prd?.tasks.length ?? 0;
  const progress = totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0;
  const isRunning = status === "running" || status === "waiting_for_input";
  const isComplete = prd?.tasks.every((t) => t.status === "completed") ?? false;

  return {
    status,
    prd,
    iteration,
    maxIterations,
    currentTask,
    completedTasks,
    pendingTasks,
    output,
    error,
    progress,
    loadPRD,
    runIteration,
    runLoop,
    pause,
    resume,
    stop,
    kill,
    sendInput,
    updateTask,
    clearOutput,
    isRunning,
    isComplete,
  };
}

// Re-export types for convenience
export type {
  RalphLoopStatus,
  PRDDocument,
  PRDTask,
  IterationResult,
  RalphLoopOptions,
} from "../claude/ralph-loop.js";
