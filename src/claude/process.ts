/**
 * Claude process manager.
 */

import { spawn as nodeSpawn, type ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";

export interface ClaudeSpawnOptions {
  executablePath?: string;
  args?: string[];
  prompt?: string;
  cwd?: string;
  env?: Record<string, string>;
  shutdownTimeout?: number;
  outputMode?: "stream-json" | "stream-text" | "buffered";
}

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

export const CLAUDE_EVENTS = {
  STDOUT: "stdout",
  STDERR: "stderr",
  STATUS: "status",
  ERROR: "error",
  EXIT: "exit",
} as const;

export class ClaudeProcess extends EventEmitter {
  private childProcess: ChildProcess | null = null;
  private statusValue: ProcessStatus = "idle";
  private isShuttingDown = false;
  private shutdownTimeout = 5000;

  get status(): ProcessStatus {
    return this.statusValue;
  }

  private setStatus(status: ProcessStatus): void {
    this.statusValue = status;
    this.emit(CLAUDE_EVENTS.STATUS, status);
  }

  spawn(options: ClaudeSpawnOptions = {}): void {
    if (this.childProcess) {
      throw new Error("Claude process is already running");
    }

    const {
      executablePath = "claude",
      args = [],
      prompt,
      cwd,
      env,
      shutdownTimeout = 5000,
      outputMode = "stream-json",
    } = options;

    this.shutdownTimeout = shutdownTimeout;
    this.isShuttingDown = false;
    this.setStatus("starting");

    const processEnv = env ? { ...process.env, ...env } : process.env;

    const finalArgs = [...args];

    if (prompt) {
      finalArgs.unshift("-p", prompt);
    }

    if (outputMode === "stream-json") {
      finalArgs.push("--output-format", "stream-json");
    } else if (outputMode === "stream-text") {
      finalArgs.push("--output-format", "stream-text");
    }

    this.childProcess = nodeSpawn(executablePath, finalArgs, {
      cwd,
      env: processEnv,
      stdio: ["pipe", "pipe", "pipe"],
      detached: false,
    });

    this.setupHandlers();
    this.setStatus("running");
  }

  private setupHandlers(): void {
    if (!this.childProcess) return;

    this.childProcess.stdout?.on("data", (data: Buffer) => {
      this.emit(CLAUDE_EVENTS.STDOUT, data.toString());
    });

    this.childProcess.stderr?.on("data", (data: Buffer) => {
      this.emit(CLAUDE_EVENTS.STDERR, data.toString());
    });

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

    this.childProcess.on("exit", (code, signal) => {
      this.emit(CLAUDE_EVENTS.EXIT, code, signal);

      if (this.isShuttingDown) {
        this.setStatus("stopped");
      } else if (code !== 0) {
        const processError: ProcessError = {
          code,
          signal,
          message: `Claude exited with code ${code}${signal ? ` (signal: ${signal})` : ""}`,
        };
        this.emit(CLAUDE_EVENTS.ERROR, processError);
        this.setStatus("crashed");
      } else {
        this.setStatus("stopped");
      }

      this.childProcess = null;
    });
  }

  write(input: string): void {
    if (!this.childProcess?.stdin) {
      throw new Error("Claude process is not running");
    }

    this.childProcess.stdin.write(input);
  }

  writeLine(input: string): void {
    this.write(input + "\n");
  }

  async stop(timeout?: number): Promise<void> {
    if (!this.childProcess) return;

    this.isShuttingDown = true;
    this.setStatus("stopping");

    const effectiveTimeout = timeout ?? this.shutdownTimeout;

    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        if (this.childProcess) {
          this.childProcess.kill("SIGKILL");
        }
      }, effectiveTimeout);

      const cleanup = () => {
        clearTimeout(timer);
        resolve();
      };

      this.childProcess?.once("exit", cleanup);
      this.childProcess?.kill("SIGTERM");
    });
  }

  kill(): void {
    if (this.childProcess) {
      this.isShuttingDown = true;
      this.setStatus("stopping");
      this.childProcess.kill("SIGKILL");
    }
  }

  isRunning(): boolean {
    return this.statusValue === "running";
  }

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
