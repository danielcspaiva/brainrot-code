#!/usr/bin/env node
import { render, Box, Text, useInput, useApp } from "ink";
import { useClaudeCode } from "./use-claude-code.js";
import { useRalphLoopWithClaudeOutput } from "./use-ralph-loop.js";
import { Layout } from "./Layout.js";
import { LoopManagementPanel } from "./LoopManagementPanel.js";

/** Game area placeholder - will be replaced with actual game */
function GameArea() {
  return (
    <Box flexDirection="column" padding={1}>
      <Text color="yellow">Game Area</Text>
      <Text dimColor>Games will appear here while Claude Code works.</Text>
      <Box marginTop={1}>
        <Text>Coming soon...</Text>
      </Box>
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
  });

  return (
    <Layout
      gameArea={<GameArea />}
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
      gameTitle="Game"
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
