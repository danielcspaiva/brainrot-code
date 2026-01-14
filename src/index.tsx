#!/usr/bin/env node
import { render, Box, Text, useInput, useApp } from "ink";
import { useState, useCallback, useMemo } from "react";
import { useClaudeCode } from "./use-claude-code.js";
import { useRalphLoopWithClaudeOutput } from "./use-ralph-loop.js";
import { Layout, useTerminalSize } from "./Layout.js";
import { LoopManagementPanel } from "./LoopManagementPanel.js";
import { LogViewer } from "./LogViewer.js";
import { GameSelector } from "./GameSelector.js";
import { getGameList, getGameById } from "./games/index.js";
import type { ClaudeCodeOutput } from "./use-claude-code.js";
import type { GameDimensions } from "./game-types.js";

type GameAreaMode = "menu" | "logs" | "game";

interface GameAreaProps {
  logs: ClaudeCodeOutput[];
  hasFocus: boolean;
  dimensions: GameDimensions;
}

/** Game area with mode switching between menu, logs, and active game */
function GameArea({ logs, hasFocus, dimensions }: GameAreaProps) {
  const [mode, setMode] = useState<GameAreaMode>("menu");
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

  const games = useMemo(() => getGameList(), []);

  const handleSelectGame = useCallback((gameId: string) => {
    setSelectedGameId(gameId);
    setMode("game");
  }, []);

  const handleExitGame = useCallback(() => {
    setSelectedGameId(null);
    setMode("menu");
  }, []);

  // Handle mode switching with keyboard
  useInput(
    (input) => {
      if (!hasFocus) return;

      // 'L' to switch to logs view
      if ((input === "l" || input === "L") && mode !== "game") {
        setMode(mode === "logs" ? "menu" : "logs");
        return;
      }

      // 'Q' or Escape to go back to menu from logs
      if ((input === "q" || input === "Q") && mode === "logs") {
        setMode("menu");
        return;
      }
    },
    { isActive: hasFocus && mode !== "game" }
  );

  // Render based on current mode
  if (mode === "logs") {
    return (
      <Box flexDirection="column" height="100%">
        <Box paddingX={1} marginBottom={1}>
          <Text bold color="cyan">
            Live Logs
          </Text>
          <Text dimColor> | L: Back to Games | Q: Menu</Text>
        </Box>
        <LogViewer logs={logs} hasFocus={hasFocus} initialViewMode="condensed" />
      </Box>
    );
  }

  if (mode === "game" && selectedGameId) {
    const gameEntry = getGameById(selectedGameId);
    if (gameEntry) {
      const GameComponent = gameEntry.component;
      return (
        <GameComponent
          hasFocus={hasFocus}
          dimensions={dimensions}
          onExit={handleExitGame}
        />
      );
    }
  }

  // Default: show game selector menu
  return (
    <Box flexDirection="column" height="100%">
      <GameSelector
        games={games}
        hasFocus={hasFocus}
        dimensions={dimensions}
        onSelectGame={handleSelectGame}
      />
      <Box paddingX={1}>
        <Text dimColor>L: View Logs</Text>
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
  const [focusedPane, setFocusedPane] = useState<0 | 1>(0);
  const terminalSize = useTerminalSize();

  // Use Ralph loop parsing for the output
  const ralphLoop = useRalphLoopWithClaudeOutput(output);

  // Calculate game area dimensions (accounting for layout chrome)
  const gameDimensions = useMemo(() => {
    // Account for header (3), footer (2), help (1), borders, and split pane divider
    const availableHeight = Math.max(terminalSize.height - 8, 10);
    const availableWidth = Math.max(Math.floor(terminalSize.width * 0.5) - 4, 20);
    return { width: availableWidth, height: availableHeight };
  }, [terminalSize.width, terminalSize.height]);

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
      gameArea={
        <GameArea
          logs={output}
          hasFocus={focusedPane === 0}
          dimensions={gameDimensions}
        />
      }
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
      gameTitle="Games"
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
