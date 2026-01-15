/**
 * Ralph Loop Manager
 *
 * Manages the Ralph autonomous coding loop lifecycle:
 * - Planning phase (analyze codebase, generate PRD)
 * - Task execution (iterate through tasks)
 * - Progress tracking (PRD.md and progress.txt)
 */

import { spawn as nodeSpawn, type ChildProcess } from "node:child_process";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { EventEmitter } from "node:events";
import {
  debugLog,
  logSpawnDetails,
  logProcessEvent,
  logClaudeDiagnostics,
} from "./debug-logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface RalphTask {
  id: string;
  title: string;
  description?: string;
  acceptanceCriteria?: string[];
  complexity: "small" | "medium" | "large";
  dependsOn?: string[];
  passes: boolean;
}

export interface RalphPRD {
  name: string;
  description: string;
  tasks: RalphTask[];
}

export interface ProgressEntry {
  timestamp: string;
  taskId: string;
  action: string;
  details?: string;
}

export type LoopPhase =
  | "idle"
  | "planning"
  | "plan_ready"
  | "executing"
  | "task_complete"
  | "retrying"
  | "paused"
  | "completed"
  | "errored";

export type LoopMode = "human_in_loop" | "afk";

export interface LoopState {
  phase: LoopPhase;
  mode: LoopMode;
  prd: RalphPRD | null;
  currentTaskIndex: number;
  retryCount: number;
  progress: ProgressEntry[];
  iterationCount: number;
  maxIterations: number;
  startedAt: Date | null;
  error: string | null;
}

export const RALPH_EVENTS = {
  PHASE_CHANGE: "phase_change",
  TASK_START: "task_start",
  TASK_COMPLETE: "task_complete",
  TASK_FAIL: "task_fail",
  LOOP_COMPLETE: "loop_complete",
  OUTPUT: "output",
  ERROR: "error",
  PRD_READY: "prd_ready",
} as const;

// ============================================================================
// PROMPTS
// ============================================================================

const PLANNING_PROMPT = (featureDescription: string) => `
Analyze this codebase and create a detailed PRD (Product Requirements Document) for the following feature:

${featureDescription}

You must output a valid JSON object with this exact structure (no markdown, no code blocks, just raw JSON):
{
  "name": "Short feature name",
  "description": "Detailed description of what this feature does",
  "tasks": [
    {
      "id": "task-1",
      "title": "Clear task title",
      "description": "What needs to be done",
      "acceptanceCriteria": ["Criterion 1", "Criterion 2"],
      "complexity": "small|medium|large",
      "dependsOn": [],
      "passes": false
    }
  ]
}

Guidelines for task breakdown:
- Each task should be completable in one focused coding session
- Tasks should be ordered by dependency (tasks with no dependencies first)
- Use "small" for simple changes (1-2 files), "medium" for moderate changes (3-5 files), "large" for complex changes (5+ files)
- Be specific about what files/functions need to be created or modified
- Keep tasks focused and atomic

IMPORTANT: Output ONLY the JSON object, nothing else.
`;

const TASK_EXECUTION_PROMPT = (prdPath: string, progressPath: string) => `
@${prdPath} @${progressPath}

1. Read the PRD and progress file.
2. Find the next incomplete task (passes: false) and implement it.
3. Run any relevant tests and type checks.
4. Commit your changes with a descriptive message.
5. Update progress.txt with what you did.
6. Mark the task as passes: true in the PRD file.

ONLY DO ONE TASK AT A TIME.
If all tasks are complete, output exactly: <promise>COMPLETE</promise>
`;

// ============================================================================
// RALPH LOOP MANAGER
// ============================================================================

export class RalphLoopManager extends EventEmitter {
  private state: LoopState;
  private workDir: string;
  private ralphDir: string;
  private currentProcess: ChildProcess | null = null;

  constructor(workDir: string = process.cwd()) {
    super();
    this.workDir = workDir;
    this.ralphDir = join(workDir, ".ralph-tui");
    this.state = this.createInitialState();
  }

  private createInitialState(): LoopState {
    return {
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
    };
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  getState(): LoopState {
    return { ...this.state };
  }

  setMode(mode: LoopMode): void {
    this.state.mode = mode;
  }

  setMaxIterations(max: number): void {
    this.state.maxIterations = max;
  }

  /**
   * Start the planning phase - analyze codebase and generate PRD
   */
  async startPlanning(featureDescription: string): Promise<void> {
    debugLog("SPAWN", "startPlanning called", featureDescription);
    this.setPhase("planning");
    this.state.startedAt = new Date();

    try {
      // Run diagnostics first
      logClaudeDiagnostics();

      // Ensure .ralph-tui directory exists
      debugLog("SPAWN", "Creating ralph directory", this.ralphDir);
      await mkdir(this.ralphDir, { recursive: true });

      // Spawn Claude to generate PRD
      const prompt = PLANNING_PROMPT(featureDescription);
      debugLog("SPAWN", "Generated planning prompt", prompt.length + " chars");
      debugLog("SPAWN", "Calling runClaudeOnce...");

      const output = await this.runClaudeOnce(prompt, true);
      debugLog("SPAWN", "runClaudeOnce completed", output.length + " chars output");

      // Save raw output for debugging
      const rawOutputPath = join(this.ralphDir, "raw-output.txt");
      await writeFile(rawOutputPath, output);
      debugLog("PARSE", "Saved raw output to", rawOutputPath);

      // Parse PRD from output (looks for JSON in code blocks or raw)
      debugLog("PARSE", "Attempting to parse PRD from output...");
      const prd = this.parsePRD(output);

      if (!prd) {
        debugLog("ERROR", "Failed to parse PRD - check raw output at", rawOutputPath);
        debugLog("ERROR", "Output preview (last 500 chars)", output.slice(-500));
        throw new Error("Failed to parse PRD from Claude output");
      }

      debugLog("PARSE", "PRD parsed successfully", { name: prd.name, taskCount: prd.tasks.length });
      this.state.prd = prd;

      // Write PRD to file
      await this.writePRDFile(prd);
      await this.writeProgressFile([]);

      this.setPhase("plan_ready");
      this.emit(RALPH_EVENTS.PRD_READY, prd);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      debugLog("ERROR", "startPlanning failed", errorMsg);
      this.state.error = errorMsg;
      this.setPhase("errored");
      this.emit(RALPH_EVENTS.ERROR, this.state.error);
    }
  }

  /**
   * Start executing tasks from the PRD
   */
  async startExecution(): Promise<void> {
    if (!this.state.prd) {
      throw new Error("No PRD available. Run planning first.");
    }

    this.setPhase("executing");
    this.state.currentTaskIndex = this.findNextIncompleteTask();

    if (this.state.currentTaskIndex === -1) {
      this.setPhase("completed");
      this.emit(RALPH_EVENTS.LOOP_COMPLETE);
      return;
    }

    await this.executeNextTask();
  }

  /**
   * Execute the next incomplete task
   */
  async executeNextTask(): Promise<void> {
    if (!this.state.prd) return;

    const taskIndex = this.findNextIncompleteTask();
    if (taskIndex === -1) {
      this.setPhase("completed");
      this.emit(RALPH_EVENTS.LOOP_COMPLETE);
      return;
    }

    this.state.currentTaskIndex = taskIndex;
    const task = this.state.prd.tasks[taskIndex];

    this.emit(RALPH_EVENTS.TASK_START, task);
    this.state.iterationCount++;

    if (this.state.iterationCount > this.state.maxIterations) {
      this.state.error = `Max iterations (${this.state.maxIterations}) reached`;
      this.setPhase("errored");
      this.emit(RALPH_EVENTS.ERROR, this.state.error);
      return;
    }

    try {
      const prdPath = join(this.ralphDir, "PRD.md");
      const progressPath = join(this.ralphDir, "progress.txt");
      const prompt = TASK_EXECUTION_PROMPT(prdPath, progressPath);

      const output = await this.runClaudeOnce(prompt, false);

      // Check for completion signal
      if (output.includes("<promise>COMPLETE</promise>")) {
        this.setPhase("completed");
        this.emit(RALPH_EVENTS.LOOP_COMPLETE);
        return;
      }

      // Mark task as complete and continue
      this.state.prd.tasks[taskIndex].passes = true;
      await this.writePRDFile(this.state.prd);

      this.addProgressEntry(task.id, "completed", `Completed: ${task.title}`);
      this.emit(RALPH_EVENTS.TASK_COMPLETE, task);

      this.state.retryCount = 0;

      // In AFK mode, continue to next task
      if (this.state.mode === "afk") {
        // Small delay between tasks
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await this.executeNextTask();
      } else {
        this.setPhase("task_complete");
      }
    } catch (error) {
      this.handleTaskError(error);
    }
  }

  /**
   * Continue execution after human confirmation (in human-in-loop mode)
   */
  async continueExecution(): Promise<void> {
    if (this.state.phase === "task_complete") {
      this.setPhase("executing");
      await this.executeNextTask();
    } else if (this.state.phase === "paused") {
      this.setPhase("executing");
      await this.executeNextTask();
    }
  }

  /**
   * Pause the loop
   */
  pause(): void {
    if (this.state.phase === "executing") {
      this.setPhase("paused");
      if (this.currentProcess) {
        this.currentProcess.kill("SIGTERM");
        this.currentProcess = null;
      }
    }
  }

  /**
   * Stop the loop completely
   */
  stop(): void {
    if (this.currentProcess) {
      this.currentProcess.kill("SIGKILL");
      this.currentProcess = null;
    }
    this.state = this.createInitialState();
    this.setPhase("idle");
  }

  /**
   * Retry the current failed task
   */
  async retryTask(): Promise<void> {
    if (this.state.phase === "errored" && this.state.retryCount < 1) {
      this.state.retryCount++;
      this.state.error = null;
      this.setPhase("retrying");
      await this.executeNextTask();
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private setPhase(phase: LoopPhase): void {
    this.state.phase = phase;
    this.emit(RALPH_EVENTS.PHASE_CHANGE, phase);
  }

  private findNextIncompleteTask(): number {
    if (!this.state.prd) return -1;
    return this.state.prd.tasks.findIndex((task) => !task.passes);
  }

  private async runClaudeOnce(
    prompt: string,
    isPlanning: boolean
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const args = isPlanning
        ? ["--permission-mode", "acceptEdits", "-p", prompt]
        : ["--dangerously-skip-permissions", "-p", prompt];

      debugLog("SPAWN", "Preparing to spawn Claude process");
      logSpawnDetails("claude", args, this.workDir);

      try {
        // Use "ignore" for stdin to avoid Ink raw mode issues
        // Claude Code uses Ink internally which requires TTY for raw mode
        this.currentProcess = nodeSpawn("claude", args, {
          cwd: this.workDir,
          env: process.env,
          stdio: ["ignore", "pipe", "pipe"],
        });

        debugLog("SPAWN", "Process spawned", this.currentProcess?.pid ?? "no PID");
        debugLog("SPAWN", "stdout stream exists?", !!this.currentProcess?.stdout);
        debugLog("SPAWN", "stderr stream exists?", !!this.currentProcess?.stderr);
      } catch (spawnError) {
        debugLog("ERROR", "Failed to spawn process", spawnError instanceof Error ? spawnError.message : String(spawnError));
        reject(spawnError);
        return;
      }

      // Listen for spawn event to confirm process actually started
      this.currentProcess.on("spawn", () => {
        debugLog("SPAWN", "SPAWN EVENT FIRED - process is running!");
      });

      // Heartbeat to check if process is still alive
      const heartbeat = setInterval(() => {
        if (this.currentProcess && !this.currentProcess.killed) {
          debugLog("SPAWN", "Heartbeat - process still alive", this.currentProcess.pid);
        } else {
          debugLog("SPAWN", "Heartbeat - process dead or killed");
          clearInterval(heartbeat);
        }
      }, 5000);

      let stdout = "";
      let stderr = "";
      let outputChunkCount = 0;

      this.currentProcess.stdout?.on("data", (data: Buffer) => {
        const chunk = data.toString();
        stdout += chunk;
        outputChunkCount++;
        // Simple progress indicator - just show bytes received
        this.emit(RALPH_EVENTS.OUTPUT, { type: "stdout", content: `Processing... (${Math.round(stdout.length / 1024)}KB received)` });
      });

      this.currentProcess.stderr?.on("data", (data: Buffer) => {
        const chunk = data.toString();
        stderr += chunk;
        logProcessEvent("stderr", `${chunk.length} bytes: ${chunk.slice(0, 100)}`);
        this.emit(RALPH_EVENTS.OUTPUT, { type: "stderr", content: chunk });
      });

      this.currentProcess.on("error", (err) => {
        clearInterval(heartbeat);
        logProcessEvent("error", err);
        debugLog("ERROR", "Process error event fired", err.message);
        this.currentProcess = null;
        reject(err);
      });

      this.currentProcess.on("exit", (code, signal) => {
        clearInterval(heartbeat);
        debugLog("SPAWN", "Process exited", { code, signal, stdoutLen: stdout.length, stderrLen: stderr.length, chunks: outputChunkCount });
        this.currentProcess = null;
        if (code === 0) {
          debugLog("SPAWN", "Process completed successfully");
          resolve(stdout);
        } else {
          debugLog("ERROR", "Process failed", { code, stderr: stderr.slice(0, 200) });
          reject(new Error(`Claude exited with code ${code}: ${stderr}`));
        }
      });

      // Also listen for close event
      this.currentProcess.on("close", (code, signal) => {
        debugLog("SPAWN", "Process close event", { code, signal });
      });
    });
  }

  private parsePRD(output: string): RalphPRD | null {
    try {
      // First try: Look for JSON in markdown code blocks (most common)
      const codeBlockMatch = output.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        const jsonStr = codeBlockMatch[1].trim();
        debugLog("PARSE", "Found code block, attempting to parse", jsonStr.slice(0, 100));
        const parsed = JSON.parse(jsonStr);
        if (parsed.tasks && Array.isArray(parsed.tasks)) {
          debugLog("PARSE", "Successfully parsed PRD from code block");
          return parsed as RalphPRD;
        }
      }

      // Second try: Look for raw JSON with "tasks" array
      const jsonMatch = output.match(/\{[\s\S]*"tasks"\s*:\s*\[[\s\S]*\][\s\S]*\}/);
      if (jsonMatch) {
        debugLog("PARSE", "Found raw JSON, attempting to parse");
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.tasks && Array.isArray(parsed.tasks)) {
          debugLog("PARSE", "Successfully parsed PRD from raw JSON");
          return parsed as RalphPRD;
        }
      }

      debugLog("ERROR", "No valid PRD JSON found in output");
      return null;
    } catch (error) {
      debugLog("ERROR", "JSON parse error", error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  private async writePRDFile(prd: RalphPRD): Promise<void> {
    const content = `# PRD: ${prd.name}

${prd.description}

## Tasks

${prd.tasks
  .map(
    (task, i) => `
### ${i + 1}. ${task.title}
- **ID**: ${task.id}
- **Complexity**: ${task.complexity}
- **Status**: ${task.passes ? "COMPLETE" : "PENDING"}
${task.description ? `- **Description**: ${task.description}` : ""}
${task.acceptanceCriteria ? `- **Acceptance Criteria**:\n${task.acceptanceCriteria.map((c) => `  - ${c}`).join("\n")}` : ""}
${task.dependsOn?.length ? `- **Depends On**: ${task.dependsOn.join(", ")}` : ""}
`
  )
  .join("\n")}

---
_Generated by Ralph Loop Manager_
`;
    await writeFile(join(this.ralphDir, "PRD.md"), content, "utf-8");

    // Also write JSON version for parsing
    await writeFile(
      join(this.ralphDir, "prd.json"),
      JSON.stringify(prd, null, 2),
      "utf-8"
    );
  }

  private async writeProgressFile(entries: ProgressEntry[]): Promise<void> {
    const content =
      entries.length === 0
        ? "# Progress Log\n\nNo tasks completed yet.\n"
        : `# Progress Log

${entries.map((e) => `[${e.timestamp}] Task ${e.taskId}: ${e.action}${e.details ? ` - ${e.details}` : ""}`).join("\n")}
`;
    await writeFile(join(this.ralphDir, "progress.txt"), content, "utf-8");
  }

  private addProgressEntry(
    taskId: string,
    action: string,
    details?: string
  ): void {
    const entry: ProgressEntry = {
      timestamp: new Date().toISOString(),
      taskId,
      action,
      details,
    };
    this.state.progress.push(entry);
    // Fire and forget - don't block
    this.writeProgressFile(this.state.progress).catch(console.error);
  }

  private handleTaskError(error: unknown): void {
    const errorMsg = error instanceof Error ? error.message : String(error);

    if (this.state.retryCount < 1) {
      // Auto-retry once
      this.state.retryCount++;
      this.setPhase("retrying");
      this.addProgressEntry(
        this.state.prd?.tasks[this.state.currentTaskIndex]?.id ?? "unknown",
        "retry",
        errorMsg
      );
      // Delay before retry
      setTimeout(() => {
        this.executeNextTask().catch(console.error);
      }, 2000);
    } else {
      this.state.error = errorMsg;
      this.setPhase("errored");
      this.emit(RALPH_EVENTS.ERROR, errorMsg);
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let instance: RalphLoopManager | null = null;

export function getRalphLoopManager(workDir?: string): RalphLoopManager {
  if (!instance) {
    instance = new RalphLoopManager(workDir);
  }
  return instance;
}

export function resetRalphLoopManager(): void {
  if (instance) {
    instance.stop();
    instance = null;
  }
}
