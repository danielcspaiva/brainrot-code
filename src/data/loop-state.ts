/**
 * Loop state persistence.
 */

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { ensureDataDir, getDataFilePath } from "./paths.js";
import type { PlanDocument, PlanTask } from "../app/state.js";

export type TaskStatus = "pending" | "in_progress" | "completed";

export interface LoopTask extends PlanTask {
  status: TaskStatus;
}

export interface LoopState {
  plan: PlanDocument | null;
  tasks: LoopTask[];
  currentTaskId: string | null;
  startedAt: string | null;
}

const LOOP_STATE_FILE = getDataFilePath("loop-state.json");

export const DEFAULT_LOOP_STATE: LoopState = {
  plan: null,
  tasks: [],
  currentTaskId: null,
  startedAt: null,
};

export async function loadLoopState(): Promise<LoopState> {
  try {
    if (!existsSync(LOOP_STATE_FILE)) {
      return DEFAULT_LOOP_STATE;
    }

    const content = await readFile(LOOP_STATE_FILE, "utf-8");
    const parsed = JSON.parse(content) as LoopState;
    return {
      plan: parsed.plan ?? null,
      tasks: parsed.tasks ?? [],
      currentTaskId: parsed.currentTaskId ?? null,
      startedAt: parsed.startedAt ?? null,
    };
  } catch {
    return DEFAULT_LOOP_STATE;
  }
}

export async function saveLoopState(state: LoopState): Promise<void> {
  await ensureDataDir();
  await writeFile(LOOP_STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
}

export async function clearLoopState(): Promise<void> {
  await saveLoopState(DEFAULT_LOOP_STATE);
}

export function loopStateExists(): boolean {
  return existsSync(LOOP_STATE_FILE);
}
