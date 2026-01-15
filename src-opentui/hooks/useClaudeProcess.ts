import { useState, useEffect, useCallback, useRef } from "react";
import {
  ClaudeProcess,
  type ProcessStatus,
  type ProcessError,
  type ClaudeSpawnOptions,
  setupProcessCleanup,
} from "../claude/process.js";

export interface ClaudeOutput {
  type: "stdout" | "stderr";
  content: string;
  timestamp: Date;
}

export interface UseClaudeProcessOptions {
  /** Path to Claude Code executable */
  executablePath?: string;
  /** Default arguments to pass to Claude Code */
  defaultArgs?: string[];
  /** Default working directory */
  workingDirectory?: string;
  /** Environment variables to pass */
  environment?: Record<string, string>;
  /** Timeout for graceful shutdown */
  shutdownTimeout?: number;
  /** Maximum number of output lines to retain (default: 1000) */
  maxOutputLines?: number;
}

export interface UseClaudeProcessResult {
  /** Current process status */
  status: ProcessStatus;
  /** Collected output from stdout/stderr */
  output: ClaudeOutput[];
  /** Last error that occurred */
  error: ProcessError | null;
  /** Spawn a new Claude process */
  spawn: (args?: string[], cwd?: string) => void;
  /** Gracefully stop the process */
  stop: () => Promise<void>;
  /** Force kill the process */
  kill: () => void;
  /** Write to process stdin */
  write: (input: string) => void;
  /** Write line to process stdin (adds newline) */
  writeLine: (input: string) => void;
  /** Clear output buffer */
  clearOutput: () => void;
  /** Check if process is running */
  isRunning: boolean;
}

/**
 * React hook for managing a Claude Code child process.
 * Handles process lifecycle, output collection, and cleanup.
 */
export function useClaudeProcess(
  options: UseClaudeProcessOptions = {}
): UseClaudeProcessResult {
  const {
    executablePath,
    defaultArgs = [],
    workingDirectory,
    environment,
    shutdownTimeout,
    maxOutputLines = 1000,
  } = options;

  const processRef = useRef<ClaudeProcess | null>(null);
  const [status, setStatus] = useState<ProcessStatus>("idle");
  const [output, setOutput] = useState<ClaudeOutput[]>([]);
  const [error, setError] = useState<ProcessError | null>(null);

  // Initialize process on mount
  useEffect(() => {
    const claudeProcess = new ClaudeProcess();
    processRef.current = claudeProcess;

    // Setup cleanup handlers for graceful shutdown
    setupProcessCleanup(claudeProcess);

    // Subscribe to events using type-safe methods
    claudeProcess.onStatus((newStatus) => {
      setStatus(newStatus);
    });

    claudeProcess.onStdout((content) => {
      setOutput((prev) => {
        const newOutput = [
          ...prev,
          { type: "stdout" as const, content, timestamp: new Date() },
        ];
        // Trim to max output lines
        if (newOutput.length > maxOutputLines) {
          return newOutput.slice(-maxOutputLines);
        }
        return newOutput;
      });
    });

    claudeProcess.onStderr((content) => {
      setOutput((prev) => {
        const newOutput = [
          ...prev,
          { type: "stderr" as const, content, timestamp: new Date() },
        ];
        // Trim to max output lines
        if (newOutput.length > maxOutputLines) {
          return newOutput.slice(-maxOutputLines);
        }
        return newOutput;
      });
    });

    claudeProcess.onError((err) => {
      setError(err);
    });

    // Cleanup on unmount
    return () => {
      if (claudeProcess.isRunning()) {
        claudeProcess.kill();
      }
    };
  }, [maxOutputLines]);

  const spawn = useCallback(
    (args: string[] = [], cwd?: string) => {
      if (processRef.current) {
        setError(null);
        const spawnOptions: ClaudeSpawnOptions = {
          executablePath,
          args: [...defaultArgs, ...args],
          cwd: cwd ?? workingDirectory,
          env: environment,
          shutdownTimeout,
        };
        processRef.current.spawn(spawnOptions);
      }
    },
    [executablePath, defaultArgs, workingDirectory, environment, shutdownTimeout]
  );

  const stop = useCallback(async () => {
    if (processRef.current) {
      await processRef.current.stop();
    }
  }, []);

  const kill = useCallback(() => {
    if (processRef.current) {
      processRef.current.kill();
    }
  }, []);

  const write = useCallback((input: string) => {
    if (processRef.current) {
      processRef.current.write(input);
    }
  }, []);

  const writeLine = useCallback((input: string) => {
    if (processRef.current) {
      processRef.current.writeLine(input);
    }
  }, []);

  const clearOutput = useCallback(() => {
    setOutput([]);
    setError(null);
  }, []);

  return {
    status,
    output,
    error,
    spawn,
    stop,
    kill,
    write,
    writeLine,
    clearOutput,
    isRunning: status === "running",
  };
}

// Re-export types for convenience
export type { ProcessStatus, ProcessError, ClaudeSpawnOptions } from "../claude/process.js";
