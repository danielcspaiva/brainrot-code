import { spawn, type ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";

export type ProcessStatus =
  | "idle"
  | "starting"
  | "running"
  | "stopping"
  | "stopped"
  | "crashed";

export interface ProcessError {
  code: number | null;
  signal: NodeJS.Signals | null;
  message: string;
}

// Event names as constants for type safety
export const CLAUDE_EVENTS = {
  STDOUT: "stdout",
  STDERR: "stderr",
  STATUS: "status",
  ERROR: "error",
  EXIT: "exit",
} as const;

export class ClaudeCodeProcess extends EventEmitter {
  private childProcess: ChildProcess | null = null;
  private _status: ProcessStatus = "idle";
  private isShuttingDown = false;

  get status(): ProcessStatus {
    return this._status;
  }

  private setStatus(status: ProcessStatus): void {
    this._status = status;
    this.emit(CLAUDE_EVENTS.STATUS, status);
  }

  /**
   * Spawn Claude Code as a child process
   * @param args Additional arguments to pass to claude
   * @param cwd Working directory for Claude Code
   */
  spawn(args: string[] = [], cwd?: string): void {
    if (this.childProcess) {
      throw new Error("Claude Code process is already running");
    }

    this.isShuttingDown = false;
    this.setStatus("starting");

    // Spawn claude with the provided arguments
    this.childProcess = spawn("claude", args, {
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
      // Ensure the process is killed when parent exits
      detached: false,
    });

    this.setupProcessHandlers();
    this.setStatus("running");
  }

  private setupProcessHandlers(): void {
    if (!this.childProcess) return;

    // Capture stdout
    this.childProcess.stdout?.on("data", (data: Buffer) => {
      this.emit(CLAUDE_EVENTS.STDOUT, data.toString());
    });

    // Capture stderr
    this.childProcess.stderr?.on("data", (data: Buffer) => {
      this.emit(CLAUDE_EVENTS.STDERR, data.toString());
    });

    // Handle process errors (e.g., failed to spawn)
    this.childProcess.on("error", (err: Error) => {
      const processError: ProcessError = {
        code: null,
        signal: null,
        message: err.message,
      };
      this.emit(CLAUDE_EVENTS.ERROR, processError);

      if (!this.isShuttingDown) {
        this.setStatus("crashed");
      }
      this.childProcess = null;
    });

    // Handle process exit
    this.childProcess.on("exit", (code, signal) => {
      this.emit(CLAUDE_EVENTS.EXIT, code, signal);

      if (this.isShuttingDown) {
        this.setStatus("stopped");
      } else if (code !== 0) {
        const processError: ProcessError = {
          code,
          signal,
          message: `Claude Code exited with code ${code}${signal ? ` (signal: ${signal})` : ""}`,
        };
        this.emit(CLAUDE_EVENTS.ERROR, processError);
        this.setStatus("crashed");
      } else {
        this.setStatus("stopped");
      }

      this.childProcess = null;
    });
  }

  /**
   * Send input to Claude Code's stdin
   * @param input The input string to send
   */
  write(input: string): void {
    if (!this.childProcess?.stdin) {
      throw new Error(
        "Claude Code process is not running or stdin is not available"
      );
    }

    this.childProcess.stdin.write(input);
  }

  /**
   * Send input followed by a newline to Claude Code's stdin
   * @param input The input string to send
   */
  writeLine(input: string): void {
    this.write(input + "\n");
  }

  /**
   * Gracefully stop the Claude Code process
   * Sends SIGTERM first, then SIGKILL if process doesn't exit within timeout
   * @param timeout Milliseconds to wait before force killing (default: 5000)
   */
  async stop(timeout = 5000): Promise<void> {
    if (!this.childProcess) {
      return;
    }

    this.isShuttingDown = true;
    this.setStatus("stopping");

    return new Promise((resolve) => {
      const forceKillTimer = setTimeout(() => {
        if (this.childProcess) {
          this.childProcess.kill("SIGKILL");
        }
      }, timeout);

      const cleanup = () => {
        clearTimeout(forceKillTimer);
        resolve();
      };

      if (this.childProcess) {
        this.childProcess.once("exit", cleanup);
        // Send SIGTERM for graceful shutdown
        this.childProcess.kill("SIGTERM");
      } else {
        cleanup();
      }
    });
  }

  /**
   * Force kill the Claude Code process immediately
   */
  kill(): void {
    if (this.childProcess) {
      this.isShuttingDown = true;
      this.setStatus("stopping");
      this.childProcess.kill("SIGKILL");
    }
  }

  /**
   * Check if the process is currently running
   */
  isRunning(): boolean {
    return this._status === "running";
  }

  // Type-safe event listener methods
  onStdout(listener: (data: string) => void): this {
    return this.on(CLAUDE_EVENTS.STDOUT, listener);
  }

  onStderr(listener: (data: string) => void): this {
    return this.on(CLAUDE_EVENTS.STDERR, listener);
  }

  onStatus(listener: (status: ProcessStatus) => void): this {
    return this.on(CLAUDE_EVENTS.STATUS, listener);
  }

  onError(listener: (error: ProcessError) => void): this {
    return this.on(CLAUDE_EVENTS.ERROR, listener);
  }

  onExit(
    listener: (code: number | null, signal: NodeJS.Signals | null) => void
  ): this {
    return this.on(CLAUDE_EVENTS.EXIT, listener);
  }
}

// Singleton instance for easy access
let instance: ClaudeCodeProcess | null = null;

export function getClaudeCodeProcess(): ClaudeCodeProcess {
  if (!instance) {
    instance = new ClaudeCodeProcess();
  }
  return instance;
}

/**
 * Setup cleanup handlers for graceful shutdown
 * This ensures no orphaned processes when the parent exits
 */
export function setupProcessCleanup(claudeProcess: ClaudeCodeProcess): void {
  const cleanup = async () => {
    if (claudeProcess.isRunning()) {
      await claudeProcess.stop();
    }
  };

  // Handle various exit signals
  process.on("SIGINT", () => {
    void cleanup().then(() => process.exit(0));
  });

  process.on("SIGTERM", () => {
    void cleanup().then(() => process.exit(0));
  });

  process.on("SIGHUP", () => {
    void cleanup().then(() => process.exit(0));
  });

  // Handle uncaught exceptions - ensure cleanup before exit
  process.on("uncaughtException", (err) => {
    console.error("Uncaught exception:", err);
    void cleanup().then(() => process.exit(1));
  });

  // Handle unhandled promise rejections
  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled rejection:", reason);
    void cleanup().then(() => process.exit(1));
  });

  // Handle normal exit
  process.on("exit", () => {
    // Synchronous cleanup - just kill if still running
    if (claudeProcess.isRunning()) {
      claudeProcess.kill();
    }
  });
}
