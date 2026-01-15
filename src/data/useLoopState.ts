/**
 * Loop state hook.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { PlanDocument } from "../app/state.js";
import {
  clearLoopState,
  DEFAULT_LOOP_STATE,
  loadLoopState,
  saveLoopState,
  type LoopState,
  type LoopTask,
  type TaskStatus,
} from "./loop-state.js";

export interface UseLoopStateResult {
  state: LoopState;
  isLoading: boolean;
  setPlan: (plan: PlanDocument, tasks: LoopTask[]) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<LoopTask>) => Promise<void>;
  toggleTaskStatus: (taskId: string) => Promise<void>;
  addTask: (task: LoopTask) => Promise<void>;
  removeTask: (taskId: string) => Promise<void>;
  clear: () => Promise<void>;
  progress: { completed: number; total: number };
}

const STATUS_ORDER: TaskStatus[] = ["pending", "in_progress", "completed"];

function getNextStatus(status: TaskStatus): TaskStatus {
  const index = STATUS_ORDER.indexOf(status);
  const next = index === -1 ? 0 : (index + 1) % STATUS_ORDER.length;
  return STATUS_ORDER[next];
}

export function useLoopState(): UseLoopStateResult {
  const [state, setState] = useState<LoopState>(DEFAULT_LOOP_STATE);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    loadLoopState()
      .then((loaded) => {
        if (isMounted) {
          setState(loaded);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const persist = useCallback(async (next: LoopState) => {
    setState(next);
    await saveLoopState(next);
  }, []);

  const setPlan = useCallback(
    async (plan: PlanDocument, tasks: LoopTask[]) => {
      const currentTaskId = tasks.find((task) => task.status === "in_progress")?.id ?? null;
      await persist({
        plan,
        tasks,
        currentTaskId,
        startedAt: new Date().toISOString(),
      });
    },
    [persist]
  );

  const updateTask = useCallback(
    async (taskId: string, updates: Partial<LoopTask>) => {
      const tasks = state.tasks.map((task) =>
        task.id === taskId ? { ...task, ...updates } : task
      );
      const currentTaskId =
        tasks.find((task) => task.status === "in_progress")?.id ?? null;
      await persist({ ...state, tasks, currentTaskId });
    },
    [persist, state]
  );

  const toggleTaskStatus = useCallback(
    async (taskId: string) => {
      const tasks = state.tasks.map((task) => {
        if (task.id !== taskId) return task;
        return { ...task, status: getNextStatus(task.status) };
      });
      const currentTaskId =
        tasks.find((task) => task.status === "in_progress")?.id ?? null;
      await persist({ ...state, tasks, currentTaskId });
    },
    [persist, state]
  );

  const addTask = useCallback(
    async (task: LoopTask) => {
      const tasks = [...state.tasks, task];
      await persist({ ...state, tasks });
    },
    [persist, state]
  );

  const removeTask = useCallback(
    async (taskId: string) => {
      const tasks = state.tasks.filter((task) => task.id !== taskId);
      const currentTaskId =
        tasks.find((task) => task.status === "in_progress")?.id ?? null;
      await persist({ ...state, tasks, currentTaskId });
    },
    [persist, state]
  );

  const clear = useCallback(async () => {
    await clearLoopState();
    setState(DEFAULT_LOOP_STATE);
  }, []);

  const progress = useMemo(() => {
    const total = state.tasks.length;
    const completed = state.tasks.filter((task) => task.status === "completed").length;
    return { completed, total };
  }, [state.tasks]);

  return {
    state,
    isLoading,
    setPlan,
    updateTask,
    toggleTaskStatus,
    addTask,
    removeTask,
    clear,
    progress,
  };
}
