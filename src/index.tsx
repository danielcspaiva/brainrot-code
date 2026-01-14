#!/usr/bin/env node
import { render, Box, Text, useInput, useApp } from "ink";
import { useState, useCallback, useMemo, useEffect, createContext, useContext } from "react";
import { useClaudeCode } from "./use-claude-code.js";
import { useRalphLoopWithClaudeOutput } from "./use-ralph-loop.js";
import { Layout, useTerminalSize } from "./Layout.js";
import { LoopManagementPanel } from "./LoopManagementPanel.js";
import { LogViewer } from "./LogViewer.js";
import { GameSelector } from "./GameSelector.js";
import { getGameList, getGameById } from "./games/index.js";
import { useConfig } from "./use-config.js";
import { getLayoutOptions, getClaudeCodeOptions, deepMerge, type BrainrotConfig } from "./config.js";
import { parseCLI, printHelp, printVersion, printError } from "./cli.js";
import type { ClaudeCodeOutput } from "./use-claude-code.js";
import type { GameDimensions, LoopAttention } from "./game-types.js";
import { colors } from "./theme.js";

// ============================================================================
// CLI OVERRIDE CONTEXT
// ============================================================================

/**
 * Context for passing CLI overrides to the app
 */
const CLIOverridesContext = createContext<Partial<BrainrotConfig>>({});

/**
 * Hook to access CLI overrides
 */
function useCLIOverrides(): Partial<BrainrotConfig> {
  return useContext(CLIOverridesContext);
}

type GameAreaMode = "menu" | "logs" | "game";

interface GameAreaProps {
  logs: ClaudeCodeOutput[];
  hasFocus: boolean;
  dimensions: GameDimensions;
  loopAttention: LoopAttention;
  onLoopAlertDismiss: () => void;
}

/** Game area with mode switching between menu, logs, and active game */
function GameArea({ logs, hasFocus, dimensions, loopAttention, onLoopAlertDismiss }: GameAreaProps) {
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
          <Text bold color={colors.primary}>
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
          loopAttention={loopAttention}
          onLoopAlertDismiss={onLoopAlertDismiss}
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
    <Box borderStyle="round" borderColor={colors.primary} paddingX={2}>
      <Text bold color={colors.primary}>
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
  const { config: fileConfig } = useConfig();
  const cliOverrides = useCLIOverrides();

  // Merge file config with CLI overrides (CLI takes precedence)
  const config = useMemo(
    () => deepMerge(fileConfig, cliOverrides),
    [fileConfig, cliOverrides]
  );

  // Get config-derived options
  const layoutOptions = useMemo(() => getLayoutOptions(config), [config]);
  const claudeCodeOptions = useMemo(() => getClaudeCodeOptions(config), [config]);

  const { status, output, spawn, stop } = useClaudeCode(claudeCodeOptions);
  const [focusedPane, setFocusedPane] = useState<0 | 1>(0);
  const [loopAlertDismissed, setLoopAlertDismissed] = useState(false);
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

  // Create loop attention object for games
  const loopAttention = useMemo(() => ({
    needsAttention: ralphLoop.needsAttention && !loopAlertDismissed,
    reason: ralphLoop.state.userAttention.reason,
    type: ralphLoop.state.userAttention.type,
    prompt: ralphLoop.state.userAttention.prompt,
  }), [ralphLoop.needsAttention, ralphLoop.state.userAttention, loopAlertDismissed]);

  // Reset dismiss state when attention changes
  const handleLoopAlertDismiss = useCallback(() => {
    setLoopAlertDismissed(true);
  }, []);

  // Reset dismiss state when a new attention request comes in
  useEffect(() => {
    if (ralphLoop.needsAttention) {
      setLoopAlertDismissed(false);
    }
  }, [ralphLoop.needsAttention, ralphLoop.state.userAttention.reason, ralphLoop.state.userAttention.prompt]);

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
          loopAttention={loopAttention}
          onLoopAlertDismiss={handleLoopAlertDismiss}
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
      layoutOptions={layoutOptions}
    />
  );
}

// ============================================================================
// CLI PARSING AND STARTUP
// ============================================================================

/**
 * Main entry point - parses CLI args and renders the app
 */
function main(): void {
  // Parse CLI arguments
  const { args, error } = parseCLI();

  // Handle parsing errors
  if (error) {
    printError(error);
    process.exit(1);
  }

  // Handle --help flag
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  // Handle --version flag
  if (args.version) {
    printVersion();
    process.exit(0);
  }

  // Render the app with CLI overrides
  render(
    <CLIOverridesContext.Provider value={args.overrides}>
      <App />
    </CLIOverridesContext.Provider>
  );
}

// Run main
main();
