#!/usr/bin/env node
import { render, Box, Text, useInput, useApp } from "ink";
import { useState } from "react";
import { useClaudeCode, type ClaudeCodeOutput } from "./use-claude-code.js";

function StatusIndicator({ status }: { status: string }) {
  const statusColors: Record<string, string> = {
    idle: "gray",
    starting: "yellow",
    running: "green",
    stopping: "yellow",
    stopped: "gray",
    crashed: "red",
  };

  return (
    <Text color={statusColors[status] ?? "white"}>
      [{status.toUpperCase()}]
    </Text>
  );
}

function OutputLine({ item }: { item: ClaudeCodeOutput }) {
  const color = item.type === "stderr" ? "red" : "white";
  return <Text color={color}>{item.content}</Text>;
}

function App() {
  const { exit } = useApp();
  const { status, output, error, spawn, stop } = useClaudeCode();
  const [inputBuffer, setInputBuffer] = useState("");

  useInput((input, key) => {
    if (key.ctrl && input === "c") {
      void stop().then(() => exit());
      return;
    }

    if (key.ctrl && input === "s") {
      // Toggle start/stop with Ctrl+S
      if (status === "idle" || status === "stopped" || status === "crashed") {
        spawn();
      } else if (status === "running") {
        void stop();
      }
      return;
    }

    // Build input buffer (simplified - real implementation would handle more keys)
    if (key.return) {
      setInputBuffer("");
    } else if (key.backspace || key.delete) {
      setInputBuffer((prev) => prev.slice(0, -1));
    } else if (input && !key.ctrl && !key.meta) {
      setInputBuffer((prev) => prev + input);
    }
  });

  // Show last 10 lines of output
  const recentOutput = output.slice(-10);

  return (
    <Box flexDirection="column" padding={1}>
      <Box borderStyle="round" borderColor="cyan" paddingX={2} paddingY={1}>
        <Text bold color="cyan">
          BRAINROT CLI
        </Text>
        <Text> </Text>
        <StatusIndicator status={status} />
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text>
          Welcome to Brainrot CLI - your terminal companion for Claude Code
        </Text>
      </Box>

      {error && (
        <Box marginTop={1} borderStyle="single" borderColor="red" paddingX={1}>
          <Text color="red">Error: {error.message}</Text>
        </Box>
      )}

      {recentOutput.length > 0 && (
        <Box
          marginTop={1}
          flexDirection="column"
          borderStyle="single"
          borderColor="gray"
          paddingX={1}
        >
          <Text dimColor>── Output ──</Text>
          {recentOutput.map((item, idx) => (
            <OutputLine key={idx} item={item} />
          ))}
        </Box>
      )}

      <Box marginTop={1} flexDirection="column">
        <Text dimColor>
          Ctrl+S: {status === "running" ? "Stop" : "Start"} Claude Code | Ctrl+C:
          Exit
        </Text>
        {inputBuffer && (
          <Text>
            {">"} {inputBuffer}
            <Text color="cyan">▋</Text>
          </Text>
        )}
      </Box>
    </Box>
  );
}

render(<App />);
