import * as fs from "node:fs/promises";
import * as path from "node:path";
import { EventEmitter } from "node:events";
import { ClaudeProcess, type ClaudeSpawnOptions } from "./process.js";

// PRD Task structure as defined in the PRD
export interface PRDTask {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed";
  /** Iteration number when the task was completed */
  iteration: number | null;
}

// PRD document structure as defined in the PRD
export interface PRDDocument {
  title: string;
  tasks: PRDTask[];
  currentTask: string | null;
  iteration: number;
  maxIterations: number;
}

export type RalphLoopStatus =
  | "idle"
  | "loading_prd"
  | "running"
  | "waiting_for_input"
  | "paused"
  | "complete"
  | "error";

export interface IterationResult {
  iteration: number;
  tasksCompleted: string[];
  output: string;
  success: boolean;
  errorMessage?: string;
}

// Event names for Ralph loop
export const RALPH_EVENTS = {
  STATUS: "status",
  PRD_LOADED: "prd_loaded",
  ITERATION_START: "iteration_start",
  ITERATION_COMPLETE: "iteration_complete",
  TASK_UPDATED: "task_updated",
  OUTPUT: "output",
  ERROR: "error",
  COMPLETE: "complete",
} as const;

export interface RalphLoopOptions {
  /** Path to prd.json file */
  prdPath: string;
  /** Working directory for Claude Code */
  cwd?: string;
  /** Max iterations (overrides prd.json if set) */
  maxIterations?: number;
  /** Claude spawn options */
  claudeOptions?: Omit<ClaudeSpawnOptions, "cwd">;
}

/**
 * Orchestrates a Ralph loop - running Claude Code iteratively against a PRD.
 *
 * The Ralph loop pattern:
 * 1. Load prd.json and parse tasks
 * 2. Run iterations until all tasks are complete or max iterations reached
 * 3. Each iteration sends the PRD to Claude and tracks task completion
 * 4. Updates prd.json with task status after each iteration
 */
export class RalphLoop extends EventEmitter {
  private _status: RalphLoopStatus = "idle";
  private _prd: PRDDocument | null = null;
  private _iteration = 0;
  private _maxIterations = 10;
  private _claudeProcess: ClaudeProcess | null = null;
  private _currentOutput = "";
  private _prdPath = "";
  private _cwd = "";
  private _claudeOptions: Omit<ClaudeSpawnOptions, "cwd"> = {};
  private _isPaused = false;

  get status(): RalphLoopStatus {
    return this._status;
  }

  get prd(): PRDDocument | null {
    return this._prd;
  }

  get iteration(): number {
    return this._iteration;
  }

  get maxIterations(): number {
    return this._maxIterations;
  }

  get currentTask(): PRDTask | null {
    if (!this._prd || !this._prd.currentTask) return null;
    return this._prd.tasks.find((t) => t.id === this._prd!.currentTask) ?? null;
  }

  get completedTasks(): PRDTask[] {
    return this._prd?.tasks.filter((t) => t.status === "completed") ?? [];
  }

  get pendingTasks(): PRDTask[] {
    return this._prd?.tasks.filter((t) => t.status === "pending") ?? [];
  }

  get isRunning(): boolean {
    return this._status === "running" || this._status === "waiting_for_input";
  }

  private setStatus(status: RalphLoopStatus): void {
    this._status = status;
    this.emit(RALPH_EVENTS.STATUS, status);
  }

  /**
   * Load and parse a prd.json file
   * @param prdPath Path to the prd.json file
   */
  async loadPRD(options: RalphLoopOptions): Promise<PRDTask[]> {
    this.setStatus("loading_prd");

    this._prdPath = path.resolve(options.prdPath);
    this._cwd = options.cwd ?? path.dirname(this._prdPath);
    this._claudeOptions = options.claudeOptions ?? {};

    try {
      const content = await fs.readFile(this._prdPath, "utf-8");
      const prd = JSON.parse(content) as PRDDocument;

      // Validate PRD structure
      if (!prd.title || !Array.isArray(prd.tasks)) {
        throw new Error("Invalid prd.json: missing title or tasks array");
      }

      // Set defaults if missing
      prd.iteration = prd.iteration ?? 0;
      prd.maxIterations = options.maxIterations ?? prd.maxIterations ?? 10;
      prd.currentTask = prd.currentTask ?? prd.tasks[0]?.id ?? null;

      // Validate tasks
      for (const task of prd.tasks) {
        if (!task.id || !task.title) {
          throw new Error(`Invalid task: missing id or title`);
        }
        task.status = task.status ?? "pending";
        task.description = task.description ?? "";
        task.iteration = task.iteration ?? null;
      }

      this._prd = prd;
      this._iteration = prd.iteration;
      this._maxIterations = prd.maxIterations;

      this.emit(RALPH_EVENTS.PRD_LOADED, prd);
      this.setStatus("idle");

      return prd.tasks;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load prd.json";
      this.emit(RALPH_EVENTS.ERROR, { message, phase: "loading" });
      this.setStatus("error");
      throw err;
    }
  }

  /**
   * Save the current PRD state back to prd.json
   */
  private async savePRD(): Promise<void> {
    if (!this._prd) return;

    try {
      const content = JSON.stringify(this._prd, null, 2);
      await fs.writeFile(this._prdPath, content, "utf-8");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save prd.json";
      this.emit(RALPH_EVENTS.ERROR, { message, phase: "saving" });
    }
  }

  /**
   * Build the prompt for Claude Code based on current PRD state
   */
  private buildPrompt(): string {
    if (!this._prd) return "";

    const completedTasks = this._prd.tasks
      .filter((t) => t.status === "completed")
      .map((t) => `- [x] ${t.title}`)
      .join("\n");

    const pendingTasks = this._prd.tasks
      .filter((t) => t.status !== "completed")
      .map((t) => `- [ ] ${t.title}: ${t.description}`)
      .join("\n");

    const currentTask = this.currentTask;

    return `You are working on: ${this._prd.title}

Iteration ${this._iteration + 1} of ${this._maxIterations}

## Completed Tasks
${completedTasks || "(none)"}

## Pending Tasks
${pendingTasks || "(none)"}

## Current Task
${currentTask ? `${currentTask.title}: ${currentTask.description}` : "No current task"}

IMPORTANT:
1. Focus on completing the current task.
2. When you complete a task, mark it done and move to the next.
3. If all tasks are complete, say "All tasks complete".
4. If you need user input, ask clearly.`;
  }

  /**
   * Run a single iteration of the Ralph loop
   */
  async runIteration(): Promise<IterationResult> {
    if (!this._prd) {
      throw new Error("PRD not loaded. Call loadPRD() first.");
    }

    if (this.isComplete()) {
      return {
        iteration: this._iteration,
        tasksCompleted: [],
        output: "All tasks already complete",
        success: true,
      };
    }

    if (this._iteration >= this._maxIterations) {
      return {
        iteration: this._iteration,
        tasksCompleted: [],
        output: `Max iterations (${this._maxIterations}) reached`,
        success: false,
        errorMessage: "Max iterations reached",
      };
    }

    this.setStatus("running");
    this._currentOutput = "";
    this._isPaused = false;

    this.emit(RALPH_EVENTS.ITERATION_START, {
      iteration: this._iteration + 1,
      currentTask: this.currentTask,
    });

    return new Promise((resolve) => {
      const tasksCompletedThisIteration: string[] = [];

      // Create Claude process for this iteration
      this._claudeProcess = new ClaudeProcess();

      // Track output
      this._claudeProcess.onStdout((data) => {
        this._currentOutput += data;
        this.emit(RALPH_EVENTS.OUTPUT, data);

        // Simple detection of task completion patterns
        // This is intentionally simple - we rely on prd.json updates rather than parsing
        if (
          data.toLowerCase().includes("task complete") ||
          data.toLowerCase().includes("completed task")
        ) {
          // Mark current task as completed
          if (this.currentTask && this.currentTask.status !== "completed") {
            this.currentTask.status = "completed";
            this.currentTask.iteration = this._iteration + 1;
            tasksCompletedThisIteration.push(this.currentTask.id);
            this.emit(RALPH_EVENTS.TASK_UPDATED, this.currentTask);

            // Move to next pending task
            const nextTask = this._prd!.tasks.find(
              (t) => t.status === "pending"
            );
            this._prd!.currentTask = nextTask?.id ?? null;
          }
        }

        // Detect if Claude is waiting for input
        if (
          data.includes("?") ||
          data.toLowerCase().includes("please provide") ||
          data.toLowerCase().includes("what would you like")
        ) {
          this.setStatus("waiting_for_input");
        }
      });

      this._claudeProcess.onStderr((data) => {
        this._currentOutput += data;
        this.emit(RALPH_EVENTS.OUTPUT, data);
      });

      // Handle process completion
      this._claudeProcess.onExit((code) => {
        this._iteration++;
        this._prd!.iteration = this._iteration;

        // Save PRD after iteration
        void this.savePRD();

        const result: IterationResult = {
          iteration: this._iteration,
          tasksCompleted: tasksCompletedThisIteration,
          output: this._currentOutput,
          success: code === 0,
          errorMessage: code !== 0 ? `Claude exited with code ${code}` : undefined,
        };

        this.emit(RALPH_EVENTS.ITERATION_COMPLETE, result);

        if (this.isComplete()) {
          this.setStatus("complete");
          this.emit(RALPH_EVENTS.COMPLETE, {
            iterations: this._iteration,
            tasksCompleted: this.completedTasks.length,
          });
        } else {
          this.setStatus("idle");
        }

        this._claudeProcess = null;
        resolve(result);
      });

      this._claudeProcess.onError((error) => {
        this.emit(RALPH_EVENTS.ERROR, { message: error.message, phase: "running" });
        this.setStatus("error");
        resolve({
          iteration: this._iteration,
          tasksCompleted: tasksCompletedThisIteration,
          output: this._currentOutput,
          success: false,
          errorMessage: error.message,
        });
      });

      // Spawn Claude with the prompt
      const prompt = this.buildPrompt();

      this._claudeProcess.spawn({
        ...this._claudeOptions,
        cwd: this._cwd,
        args: [
          "--print",
          prompt,
          ...(this._claudeOptions.args ?? []),
        ],
      });
    });
  }

  /**
   * Run the loop until complete or max iterations
   */
  async runLoop(): Promise<void> {
    if (!this._prd) {
      throw new Error("PRD not loaded. Call loadPRD() first.");
    }

    while (!this.isComplete() && this._iteration < this._maxIterations && !this._isPaused) {
      const result = await this.runIteration();
      if (!result.success) {
        break;
      }
    }
  }

  /**
   * Check if all tasks are complete
   */
  isComplete(): boolean {
    if (!this._prd) return false;
    return this._prd.tasks.every((t) => t.status === "completed");
  }

  /**
   * Pause the Ralph loop after the current iteration
   */
  pause(): void {
    this._isPaused = true;
    if (this._status === "running") {
      this.setStatus("paused");
    }
  }

  /**
   * Resume a paused Ralph loop
   */
  resume(): void {
    this._isPaused = false;
    if (this._status === "paused") {
      // Don't automatically start - let caller decide
      this.setStatus("idle");
    }
  }

  /**
   * Send input to the Claude process (when waiting for input)
   */
  sendInput(input: string): void {
    if (!this._claudeProcess) {
      throw new Error("No Claude process running");
    }
    this._claudeProcess.writeLine(input);
    this.setStatus("running");
  }

  /**
   * Stop the current iteration and cleanup
   */
  async stop(): Promise<void> {
    this._isPaused = true;
    if (this._claudeProcess) {
      await this._claudeProcess.stop();
      this._claudeProcess = null;
    }
    this.setStatus("idle");
  }

  /**
   * Force kill the current iteration
   */
  kill(): void {
    this._isPaused = true;
    if (this._claudeProcess) {
      this._claudeProcess.kill();
      this._claudeProcess = null;
    }
    this.setStatus("idle");
  }

  /**
   * Update a task's status manually
   */
  async updateTask(
    taskId: string,
    status: PRDTask["status"]
  ): Promise<void> {
    if (!this._prd) {
      throw new Error("PRD not loaded");
    }

    const task = this._prd.tasks.find((t) => t.id === taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    task.status = status;
    if (status === "completed") {
      task.iteration = this._iteration;
    }

    this.emit(RALPH_EVENTS.TASK_UPDATED, task);
    await this.savePRD();

    // Update current task if needed
    if (status === "completed" && this._prd.currentTask === taskId) {
      const nextTask = this._prd.tasks.find((t) => t.status === "pending");
      this._prd.currentTask = nextTask?.id ?? null;
    }
  }

  // Type-safe event listener methods
  onStatus(listener: (status: RalphLoopStatus) => void): this {
    return this.on(RALPH_EVENTS.STATUS, listener);
  }

  onPRDLoaded(listener: (prd: PRDDocument) => void): this {
    return this.on(RALPH_EVENTS.PRD_LOADED, listener);
  }

  onIterationStart(
    listener: (data: { iteration: number; currentTask: PRDTask | null }) => void
  ): this {
    return this.on(RALPH_EVENTS.ITERATION_START, listener);
  }

  onIterationComplete(listener: (result: IterationResult) => void): this {
    return this.on(RALPH_EVENTS.ITERATION_COMPLETE, listener);
  }

  onTaskUpdated(listener: (task: PRDTask) => void): this {
    return this.on(RALPH_EVENTS.TASK_UPDATED, listener);
  }

  onOutput(listener: (data: string) => void): this {
    return this.on(RALPH_EVENTS.OUTPUT, listener);
  }

  onError(
    listener: (error: { message: string; phase: string }) => void
  ): this {
    return this.on(RALPH_EVENTS.ERROR, listener);
  }

  onComplete(
    listener: (data: { iterations: number; tasksCompleted: number }) => void
  ): this {
    return this.on(RALPH_EVENTS.COMPLETE, listener);
  }
}
