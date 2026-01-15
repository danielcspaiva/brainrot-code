/**
 * React Hook for Loop State Persistence
 *
 * Provides automatic loading and saving of loop state with React state management.
 * State changes are automatically persisted to `.ralph-tui/loop-state.json`.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  type LoopState,
  type LoopTask,
  type PrdContent,
  type TaskStatus,
  loadLoopState,
  saveLoopState,
  calculateProgress,
  createDefaultLoopState,
  hasActiveLoop,
  getProgressSummary,
} from "./loop-state.js";
import type { RalphLoopStatus } from "./ralph-loop-parser.js";

// ============================================================================
// TYPES
// ============================================================================

export interface UseLoopStateOptions {
  /** Working directory for state storage (defaults to process.cwd()) */
  cwd?: string;
  /** Debounce delay for auto-save in milliseconds (default: 500) */
  saveDebounceMs?: number;
  /** Whether to auto-load state on mount (default: true) */
  autoLoad?: boolean;
}

export interface UseLoopStateResult {
  /** Current loop state */
  state: LoopState;
  /** Whether state is currently loading */
  isLoading: boolean;
  /** Whether there's an active loop */
  hasLoop: boolean;
  /** Progress summary string */
  progressSummary: string;
  /** Reload state from disk */
  reload: () => Promise<void>;
  /** Set PRD and initialize tasks */
  setPrdAndTasks: (prd: PrdContent, tasks: LoopTask[]) => void;
  /** Update a specific task's status */
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
  /** Update the loop status */
  setLoopStatus: (status: RalphLoopStatus) => void;
  /** Set paused state */
  setPaused: (paused: boolean) => void;
  /** Clear/reset the loop state */
  clear: () => void;
  /** Manually trigger save */
  save: () => Promise<void>;
  /** Update arbitrary state fields */
  updateState: (updates: Partial<Omit<LoopState, "version">>) => void;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * Hook for managing loop state with automatic persistence
 */
export function useLoopState(
  options: UseLoopStateOptions = {}
): UseLoopStateResult {
  const {
    cwd = process.cwd(),
    saveDebounceMs = 500,
    autoLoad = true,
  } = options;

  const [state, setState] = useState<LoopState>(() =>
    createDefaultLoopState(cwd)
  );
  const [isLoading, setIsLoading] = useState(autoLoad);

  // Track if we need to save
  const pendingSaveRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced save function
  const scheduleSave = useCallback(() => {
    pendingSaveRef.current = true;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Schedule new save
    saveTimeoutRef.current = setTimeout(() => {
      if (pendingSaveRef.current) {
        setState((currentState) => {
          // Save async but don't wait
          void saveLoopState(currentState, cwd);
          pendingSaveRef.current = false;
          return currentState;
        });
      }
    }, saveDebounceMs);
  }, [cwd, saveDebounceMs]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      // Flush any pending save on unmount
      if (pendingSaveRef.current) {
        void saveLoopState(state, cwd);
      }
    };
    // Only run on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load state on mount
  useEffect(() => {
    if (autoLoad) {
      setIsLoading(true);
      loadLoopState(cwd)
        .then((loadedState) => {
          setState(loadedState);
          setIsLoading(false);
        })
        .catch(() => {
          setIsLoading(false);
        });
    }
  }, [autoLoad, cwd]);

  // Reload state from disk
  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      const loadedState = await loadLoopState(cwd);
      setState(loadedState);
    } finally {
      setIsLoading(false);
    }
  }, [cwd]);

  // Set PRD and tasks
  const setPrdAndTasks = useCallback(
    (prd: PrdContent, tasks: LoopTask[]) => {
      setState((current) => {
        const updated = {
          ...current,
          prd,
          tasks,
          progress: calculateProgress(tasks),
          updatedAt: new Date().toISOString(),
        };
        scheduleSave();
        return updated;
      });
    },
    [scheduleSave]
  );

  // Update task status
  const updateTaskStatus = useCallback(
    (taskId: string, status: TaskStatus) => {
      setState((current) => {
        const updatedTasks = current.tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                status,
                completedAt:
                  status === "completed"
                    ? new Date().toISOString()
                    : task.completedAt,
              }
            : task
        );

        const updated = {
          ...current,
          tasks: updatedTasks,
          progress: calculateProgress(updatedTasks),
          updatedAt: new Date().toISOString(),
        };
        scheduleSave();
        return updated;
      });
    },
    [scheduleSave]
  );

  // Update loop status
  const setLoopStatus = useCallback(
    (loopStatus: RalphLoopStatus) => {
      setState((current) => {
        const updated = {
          ...current,
          loopStatus,
          updatedAt: new Date().toISOString(),
        };
        scheduleSave();
        return updated;
      });
    },
    [scheduleSave]
  );

  // Set paused state
  const setPaused = useCallback(
    (isPaused: boolean) => {
      setState((current) => {
        const updated = {
          ...current,
          isPaused,
          updatedAt: new Date().toISOString(),
        };
        scheduleSave();
        return updated;
      });
    },
    [scheduleSave]
  );

  // Clear state
  const clear = useCallback(() => {
    const newState = createDefaultLoopState(cwd);
    setState(newState);
    scheduleSave();
  }, [cwd, scheduleSave]);

  // Manual save
  const save = useCallback(async () => {
    await saveLoopState(state, cwd);
    pendingSaveRef.current = false;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
  }, [state, cwd]);

  // Generic state update
  const updateState = useCallback(
    (updates: Partial<Omit<LoopState, "version">>) => {
      setState((current) => {
        const updated = {
          ...current,
          ...updates,
          // Deep merge progress if provided
          progress: updates.progress
            ? { ...current.progress, ...updates.progress }
            : current.progress,
          updatedAt: new Date().toISOString(),
        };
        scheduleSave();
        return updated;
      });
    },
    [scheduleSave]
  );

  return {
    state,
    isLoading,
    hasLoop: hasActiveLoop(state),
    progressSummary: getProgressSummary(state),
    reload,
    setPrdAndTasks,
    updateTaskStatus,
    setLoopStatus,
    setPaused,
    clear,
    save,
    updateState,
  };
}

// ============================================================================
// ADDITIONAL HOOKS
// ============================================================================

/**
 * Simple hook to check if a loop state file exists
 * Useful for conditional rendering (e.g., first-time vs returning user)
 */
export function useLoopStateExists(cwd: string = process.cwd()): {
  exists: boolean | null;
  isChecking: boolean;
} {
  const [exists, setExists] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    import("./loop-state.js")
      .then(({ loopStateExists }) => {
        setExists(loopStateExists(cwd));
        setIsChecking(false);
      })
      .catch(() => {
        setExists(false);
        setIsChecking(false);
      });
  }, [cwd]);

  return { exists, isChecking };
}
