/**
 * Hook for streaming Claude output.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ClaudeProcess,
  type ClaudeSpawnOptions,
  type ProcessStatus,
} from "./process.js";
import { ClaudeStreamParser } from "./stream-parser.js";
import type {
  ClaudeActivity,
  ClaudeOutputLine,
  OutputLineKind,
} from "./types.js";

export interface UseClaudeStreamOptions {
  maxLines?: number;
  outputMode?: ClaudeSpawnOptions["outputMode"];
}

export interface UseClaudeStreamResult {
  status: ProcessStatus;
  output: ClaudeOutputLine[];
  activity: ClaudeActivity;
  elapsedMs: number;
  spawn: (options: ClaudeSpawnOptions) => void;
  stop: () => Promise<void>;
  kill: () => void;
  writeLine: (input: string) => void;
  clear: () => void;
}

export function useClaudeStream(
  options: UseClaudeStreamOptions = {}
): UseClaudeStreamResult {
  const { maxLines = 1000, outputMode = "stream-json" } = options;

  const processRef = useRef<ClaudeProcess | null>(null);
  const parserRef = useRef<ClaudeStreamParser>(new ClaudeStreamParser());
  const idCounterRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [status, setStatus] = useState<ProcessStatus>("idle");
  const [output, setOutput] = useState<ClaudeOutputLine[]>([]);
  const [activity, setActivity] = useState<ClaudeActivity>({
    status: "idle",
    currentTool: null,
  });
  const [elapsedMs, setElapsedMs] = useState(0);

  const pushLine = useCallback(
    (kind: OutputLineKind, text: string) => {
      setOutput((prev) => {
        const id = `line-${Date.now()}-${idCounterRef.current++}`;
        const next = [...prev, { id, kind, text }];
        if (next.length > maxLines) {
          return next.slice(-maxLines);
        }
        return next;
      });
    },
    [maxLines]
  );

  useEffect(() => {
    const process = new ClaudeProcess();
    processRef.current = process;

    process.onStatus((nextStatus) => {
      setStatus(nextStatus);
      if (nextStatus === "running") {
        startTimeRef.current = Date.now();
        setActivity((prev) => ({ ...prev, status: "running" }));
      } else if (nextStatus === "stopped") {
        setActivity((prev) => ({ ...prev, status: "idle", currentTool: null }));
      } else if (nextStatus === "crashed") {
        setActivity((prev) => ({ ...prev, status: "error" }));
      }
    });

    process.onStdout((chunk) => {
      if (outputMode !== "stream-json") {
        const lines = chunk.split("\n").filter(Boolean);
        for (const line of lines) {
          pushLine("text", line);
        }
        return;
      }

      const parsed = parserRef.current.feed(chunk);
      for (const item of parsed) {
        if (!item.event) {
          pushLine("error", `Unparsed: ${item.raw}`);
          continue;
        }

        if (item.event.type === "system" && item.event.content) {
          pushLine("system", item.event.content);
          continue;
        }

        if (item.event.type === "assistant" && item.event.message?.content) {
          for (const content of item.event.message.content) {
            if (content.type === "text") {
              pushLine("text", content.text);
            } else if (content.type === "tool_use") {
              setActivity((prev) => ({
                ...prev,
                currentTool: content.name,
              }));
              const inputPreview = content.input
                ? ` ${JSON.stringify(content.input).slice(0, 120)}`
                : "";
              pushLine("tool", `Tool: ${content.name}${inputPreview}`);
            } else if (content.type === "tool_result") {
              pushLine("result", `Tool result: ${content.name ?? "unknown"}`);
            }
          }
          continue;
        }

        if (item.event.type === "result" && item.event.result) {
          pushLine("result", item.event.result);
          continue;
        }

        if (item.event.type === "error") {
          pushLine("error", item.event.error ?? "Stream error");
        }
      }
    });

    process.onStderr((chunk) => {
      const lines = chunk.split("\n").filter(Boolean);
      for (const line of lines) {
        pushLine("error", line);
      }
    });

    process.onError((err) => {
      pushLine("error", err.message);
    });

    return () => {
      if (process.isRunning()) {
        process.kill();
      }
    };
  }, [outputMode, pushLine]);

  useEffect(() => {
    if (status === "running") {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      timerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setElapsedMs(Date.now() - startTimeRef.current);
        }
      }, 250);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [status]);

  const spawn = useCallback(
    (spawnOptions: ClaudeSpawnOptions) => {
      setOutput([]);
      setElapsedMs(0);
      setActivity({ status: "running", currentTool: null });
      processRef.current?.spawn({ ...spawnOptions, outputMode });
    },
    [outputMode]
  );

  const stop = useCallback(async () => {
    await processRef.current?.stop();
  }, []);

  const kill = useCallback(() => {
    processRef.current?.kill();
  }, []);

  const writeLine = useCallback((input: string) => {
    processRef.current?.writeLine(input);
  }, []);

  const clear = useCallback(() => {
    setOutput([]);
    setActivity({ status: "idle", currentTool: null });
    setElapsedMs(0);
  }, []);

  return {
    status,
    output,
    activity,
    elapsedMs,
    spawn,
    stop,
    kill,
    writeLine,
    clear,
  };
}
