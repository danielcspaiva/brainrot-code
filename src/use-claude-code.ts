import { useState, useEffect, useCallback, useRef } from "react";
import {
  ClaudeCodeProcess,
  type ProcessStatus,
  type ProcessError,
  type ClaudeCodeSpawnOptions,
  setupProcessCleanup,
} from "./claude-code-process.js";

export interface ClaudeCodeOutput {
  type: "stdout" | "stderr";
  content: string;
  timestamp: Date;
}

export interface UseClaudeCodeOptions {
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
}

export interface UseClaudeCodeResult {
  status: ProcessStatus;
  output: ClaudeCodeOutput[];
  error: ProcessError | null;
  spawn: (args?: string[], cwd?: string) => void;
  stop: () => Promise<void>;
  write: (input: string) => void;
  writeLine: (input: string) => void;
  clearOutput: () => void;
}

export function useClaudeCode(options: UseClaudeCodeOptions = {}): UseClaudeCodeResult {
  const {
    executablePath,
    defaultArgs = [],
    workingDirectory,
    environment,
    shutdownTimeout,
  } = options;
  const processRef = useRef<ClaudeCodeProcess | null>(null);
  const [status, setStatus] = useState<ProcessStatus>("idle");
  const [output, setOutput] = useState<ClaudeCodeOutput[]>([]);
  const [error, setError] = useState<ProcessError | null>(null);

  // Initialize process on mount
  useEffect(() => {
    const claudeProcess = new ClaudeCodeProcess();
    processRef.current = claudeProcess;

    // Setup cleanup handlers
    setupProcessCleanup(claudeProcess);

    // Subscribe to events using type-safe methods
    claudeProcess.onStatus((newStatus) => {
      setStatus(newStatus);
    });

    claudeProcess.onStdout((content) => {
      setOutput((prev) => [
        ...prev,
        { type: "stdout", content, timestamp: new Date() },
      ]);
    });

    claudeProcess.onStderr((content) => {
      setOutput((prev) => [
        ...prev,
        { type: "stderr", content, timestamp: new Date() },
      ]);
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
  }, []);

  const spawn = useCallback((args: string[] = [], cwd?: string) => {
    if (processRef.current) {
      setError(null);
      const spawnOptions: ClaudeCodeSpawnOptions = {
        executablePath,
        args: [...defaultArgs, ...args],
        cwd: cwd ?? workingDirectory,
        env: environment,
        shutdownTimeout,
      };
      processRef.current.spawn(spawnOptions);
    }
  }, [executablePath, defaultArgs, workingDirectory, environment, shutdownTimeout]);

  const stop = useCallback(async () => {
    if (processRef.current) {
      await processRef.current.stop();
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
    write,
    writeLine,
    clearOutput,
  };
}
