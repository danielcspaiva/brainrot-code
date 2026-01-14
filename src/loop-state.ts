/**
 * Loop State Persistence
 *
 * Provides persistent storage for loop state including PRD content, tasks, and progress.
 * State is stored in `.ralph-tui/loop-state.json` in the current working directory.
 */

import { join } from "node:path";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import type { RalphLoopStatus } from "./ralph-loop-parser.js";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Task status within the loop
 */
export type TaskStatus = "pending" | "in_progress" | "completed" | "skipped";

/**
 * Individual task in the loop
 */
export interface LoopTask {
  /** Unique task identifier */
  id: string;
  /** Task title */
  title: string;
  /** Task description */
  description?: string;
  /** Current task status */
  status: TaskStatus;
  /** ISO timestamp when task was completed */
  completedAt?: string;
  /** Task complexity */
  complexity?: "small" | "medium" | "large";
  /** Task dependencies (other task IDs) */
  dependsOn?: string[];
}

/**
 * PRD content structure
 */
export interface PrdContent {
  /** Feature/PRD name */
  name: string;
  /** Feature description */
  description?: string;
  /** Branch name for the feature */
  branchName?: string;
  /** Full PRD text content if available */
  content?: string;
  /** Raw PRD data */
  raw?: unknown;
}

/**
 * Loop progress tracking
 */
export interface LoopProgress {
  /** Total number of tasks */
  totalTasks: number;
  /** Number of completed tasks */
  completedTasks: number;
  /** Current task ID being worked on */
  currentTaskId?: string;
  /** Progress percentage (0-100) */
  percentage: number;
}

/**
 * Complete loop state structure
 */
export interface LoopState {
  /** State format version for migrations */
  version: number;
  /** Unique session identifier */
  sessionId: string;
  /** PRD content */
  prd: PrdContent | null;
  /** All tasks in the loop */
  tasks: LoopTask[];
  /** Loop progress summary */
  progress: LoopProgress;
  /** Current loop status */
  loopStatus: RalphLoopStatus;
  /** ISO timestamp when loop was started */
  startedAt: string;
  /** ISO timestamp of last update */
  updatedAt: string;
  /** Whether the loop is paused */
  isPaused: boolean;
  /** Working directory for the loop */
  cwd: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Directory for ralph-tui state files */
const RALPH_TUI_DIR = ".ralph-tui";

/** Loop state file name */
const LOOP_STATE_FILE = "loop-state.json";

/** Current state format version */
const STATE_VERSION = 1;

// ============================================================================
// PATH HELPERS
// ============================================================================

/**
 * Get the ralph-tui directory path
 */
export function getLoopStateDir(cwd: string = process.cwd()): string {
  return join(cwd, RALPH_TUI_DIR);
}

/**
 * Get the loop state file path
 */
export function getLoopStateFilePath(cwd: string = process.cwd()): string {
  return join(getLoopStateDir(cwd), LOOP_STATE_FILE);
}

// ============================================================================
// DEFAULT STATE
// ============================================================================

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a default/initial loop state
 */
export function createDefaultLoopState(cwd: string = process.cwd()): LoopState {
  return {
    version: STATE_VERSION,
    sessionId: generateSessionId(),
    prd: null,
    tasks: [],
    progress: {
      totalTasks: 0,
      completedTasks: 0,
      percentage: 0,
    },
    loopStatus: "idle",
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isPaused: false,
    cwd,
  };
}

// ============================================================================
// FILE OPERATIONS
// ============================================================================

/**
 * Ensure the ralph-tui directory exists
 */
async function ensureLoopStateDir(cwd: string = process.cwd()): Promise<void> {
  const dir = getLoopStateDir(cwd);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

/**
 * Check if loop state file exists
 */
export function loopStateExists(cwd: string = process.cwd()): boolean {
  return existsSync(getLoopStateFilePath(cwd));
}

/**
 * Load loop state from disk
 * Returns default state if file doesn't exist or is invalid
 */
export async function loadLoopState(cwd: string = process.cwd()): Promise<LoopState> {
  const filePath = getLoopStateFilePath(cwd);

  try {
    if (!existsSync(filePath)) {
      return createDefaultLoopState(cwd);
    }

    const content = await readFile(filePath, "utf-8");
    const state = JSON.parse(content) as Partial<LoopState>;

    // Validate and migrate if needed
    if (!state.version || state.version < STATE_VERSION) {
      // Future: add migration logic here
      // For now, merge with defaults
    }

    // Ensure all required fields are present
    const defaultState = createDefaultLoopState(cwd);
    return {
      ...defaultState,
      ...state,
      // Ensure nested objects are properly merged
      progress: {
        ...defaultState.progress,
        ...state.progress,
      },
      // Update the cwd to current
      cwd,
    };
  } catch {
    // If file is corrupted or unreadable, return defaults
    return createDefaultLoopState(cwd);
  }
}

/**
 * Save loop state to disk
 */
export async function saveLoopState(
  state: LoopState,
  cwd: string = process.cwd()
): Promise<void> {
  try {
    await ensureLoopStateDir(cwd);

    const stateToSave: LoopState = {
      ...state,
      version: STATE_VERSION,
      updatedAt: new Date().toISOString(),
    };

    const filePath = getLoopStateFilePath(cwd);
    await writeFile(filePath, JSON.stringify(stateToSave, null, 2), "utf-8");
  } catch (error) {
    // Log error but don't throw - state saving should be non-blocking
    console.error("Failed to save loop state:", error);
  }
}

/**
 * Update specific fields in loop state and save
 */
export async function updateLoopState(
  updates: Partial<Omit<LoopState, "version">>,
  cwd: string = process.cwd()
): Promise<LoopState> {
  const current = await loadLoopState(cwd);
  const updated: LoopState = {
    ...current,
    ...updates,
    // Deep merge progress if provided
    progress: updates.progress
      ? { ...current.progress, ...updates.progress }
      : current.progress,
    updatedAt: new Date().toISOString(),
  };
  await saveLoopState(updated, cwd);
  return updated;
}

// ============================================================================
// STATE HELPERS
// ============================================================================

/**
 * Calculate progress from tasks
 */
export function calculateProgress(tasks: LoopTask[]): LoopProgress {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const currentTask = tasks.find((t) => t.status === "in_progress");

  return {
    totalTasks,
    completedTasks,
    currentTaskId: currentTask?.id,
    percentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
  };
}

/**
 * Update a specific task's status and recalculate progress
 */
export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
  cwd: string = process.cwd()
): Promise<LoopState> {
  const state = await loadLoopState(cwd);

  const updatedTasks = state.tasks.map((task) =>
    task.id === taskId
      ? {
          ...task,
          status,
          completedAt: status === "completed" ? new Date().toISOString() : task.completedAt,
        }
      : task
  );

  return updateLoopState(
    {
      tasks: updatedTasks,
      progress: calculateProgress(updatedTasks),
    },
    cwd
  );
}

/**
 * Set PRD content and initialize tasks
 */
export async function setPrdAndTasks(
  prd: PrdContent,
  tasks: LoopTask[],
  cwd: string = process.cwd()
): Promise<LoopState> {
  return updateLoopState(
    {
      prd,
      tasks,
      progress: calculateProgress(tasks),
    },
    cwd
  );
}

/**
 * Clear/reset loop state
 */
export async function clearLoopState(cwd: string = process.cwd()): Promise<LoopState> {
  const newState = createDefaultLoopState(cwd);
  await saveLoopState(newState, cwd);
  return newState;
}

/**
 * Check if there's an active loop (has tasks or PRD)
 */
export function hasActiveLoop(state: LoopState): boolean {
  return state.prd !== null || state.tasks.length > 0;
}

/**
 * Get a human-readable summary of loop progress
 */
export function getProgressSummary(state: LoopState): string {
  const { progress, prd } = state;

  if (!prd && progress.totalTasks === 0) {
    return "No active loop";
  }

  const taskProgress = progress.totalTasks > 0
    ? `${progress.completedTasks}/${progress.totalTasks} tasks`
    : "No tasks";

  const percentage = progress.totalTasks > 0
    ? ` (${progress.percentage}%)`
    : "";

  return `${taskProgress}${percentage}`;
}
