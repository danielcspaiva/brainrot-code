#!/usr/bin/env node
import { render, Box, Text, useInput, useApp } from "ink";
import { useState } from "react";
import { useClaudeCode } from "./use-claude-code.js";
import { useRalphLoopWithClaudeOutput } from "./use-ralph-loop.js";
import { Layout } from "./Layout.js";
import { LoopManagementPanel } from "./LoopManagementPanel.js";
import { LogViewer } from "./LogViewer.js";

/** Game area placeholder - will be replaced with actual game */
function GameArea({
  logs,
  hasFocus,
}: {
  logs: { type: "stdout" | "stderr"; content: string; timestamp: Date }[];
  hasFocus: boolean;
}) {
  return (
    <Box flexDirection="column" height="100%">
      <LogViewer logs={logs} hasFocus={hasFocus} initialViewMode="condensed" />
    </Box>
  );
}

/** Header component */
function Header() {
  return (
    <Box borderStyle="round" borderColor="cyan" paddingX={2}>
      <Text bold color="cyan">
        BRAINROT CLI
      </Text>
      <Text> - </Text>
      <Text>Play games while Claude Code works</Text>
    </Box>
  );
}

/** Footer with global controls */
function Footer() {
  return (
    <Box>
      <Text dimColor>Ctrl+C: Exit</Text>
    </Box>
  );
}

function App() {
  const { exit } = useApp();
  const { status, output, spawn, stop } = useClaudeCode();
  const [focusedPane, setFocusedPane] = useState<0 | 1>(0);

  // Use Ralph loop parsing for the output
  const ralphLoop = useRalphLoopWithClaudeOutput(output);

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

    // Track focus changes via Tab key
    if (key.tab) {
      setFocusedPane((current) => (current === 0 ? 1 : 0));
      return;
    }
  });

  return (
    <Layout
      gameArea={<GameArea logs={output} hasFocus={focusedPane === 0} />}
      managementArea={
        <LoopManagementPanel
          loopState={ralphLoop.state}
          needsAttention={ralphLoop.needsAttention}
          statusMessage={ralphLoop.statusMessage}
          progressString={ralphLoop.progressString}
          processStatus={status}
          onStart={spawn}
          onStop={() => void stop()}
        />
      }
      gameTitle="Live Logs"
      managementTitle="Loop Management"
      header={<Header />}
      footer={<Footer />}
      layoutOptions={{
        initialDirection: "horizontal",
        initialSplitRatio: 0.5,
        minRatio: 0.25,
        maxRatio: 0.75,
      }}
    />
  );
}

render(<App />);
