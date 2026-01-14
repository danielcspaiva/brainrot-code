#!/usr/bin/env node
import { render, Box, Text, useInput, useApp } from "ink";
import { useState, useCallback, useMemo, useEffect, createContext, useContext } from "react";
import { useClaudeCode } from "./use-claude-code.js";
import { useRalphLoopWithClaudeOutput } from "./use-ralph-loop.js";
import { Layout, useTerminalSize } from "./Layout.js";
import { LoopManagementPanel } from "./LoopManagementPanel.js";
import { LogViewer } from "./LogViewer.js";
import { GameSelector } from "./GameSelector.js";
import { SettingsMenu } from "./SettingsMenu.js";
import { StatsMenu } from "./StatsMenu.js";
import { useAchievementNotifications } from "./AchievementNotification.js";
import { getGameList, getGameById } from "./games/index.js";
import { useConfig } from "./use-config.js";
import { getLayoutOptions, getClaudeCodeOptions, deepMerge, saveConfig, type BrainrotConfig } from "./config.js";
import { parseCLI, printHelp, printVersion, printError } from "./cli.js";
import { recordSessionStart } from "./stats.js";
import { useLoopState, useLoopStateExists } from "./use-loop-state.js";
import { OnboardingTutorial } from "./OnboardingTutorial.js";
import { ResumeOverlay, type ResumeAction } from "./ResumeOverlay.js";
import { FeaturePromptScreen } from "./FeaturePromptScreen.js";
import { InterviewQuestion } from "./InterviewQuestion.js";
import type { ClaudeCodeOutput } from "./use-claude-code.js";
import type { GameDimensions, LoopAttention, GameStateUpdate } from "./game-types.js";
import { ThemeProvider, useThemeColors } from "./useTheme.js";
import { StatusBar, GameStatusProvider, useGameStatus } from "./StatusBar.js";
import { HelpOverlay } from "./HelpOverlay.js";

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

type GameAreaMode = "menu" | "logs" | "game" | "settings" | "stats";

interface GameAreaProps {
  logs: ClaudeCodeOutput[];
  hasFocus: boolean;
  dimensions: GameDimensions;
  loopAttention: LoopAttention;
  onLoopAlertDismiss: () => void;
  config: BrainrotConfig;
  onConfigChange: (updates: Partial<BrainrotConfig>) => void;
  onConfigSave: () => Promise<void>;
  onAchievementUnlock: (ids: string[]) => void;
  onGameStateChange: (update: GameStateUpdate) => void;
}

/** Game area with mode switching between menu, logs, settings, stats, and active game */
function GameArea({
  logs,
  hasFocus,
  dimensions,
  loopAttention,
  onLoopAlertDismiss,
  config,
  onConfigChange,
  onConfigSave,
  onAchievementUnlock: _onAchievementUnlock,
  onGameStateChange,
}: GameAreaProps) {
  const [mode, setMode] = useState<GameAreaMode>("menu");
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const colors = useThemeColors();
  const { setGameState, clearGameState } = useGameStatus();

  const games = useMemo(() => getGameList(), []);

  const handleSelectGame = useCallback((gameId: string) => {
    setSelectedGameId(gameId);
    setMode("game");
    // Set game name in status bar
    const gameInfo = getGameById(gameId);
    if (gameInfo) {
      setGameState({ gameId, gameName: gameInfo.info.name });
    }
  }, [setGameState]);

  const handleExitGame = useCallback(() => {
    setSelectedGameId(null);
    setMode("menu");
    // Clear game state from status bar
    clearGameState();
  }, [clearGameState]);

  const handleCloseSettings = useCallback(() => {
    setMode("menu");
  }, []);

  const handleOpenStats = useCallback(() => {
    setMode("stats");
  }, []);

  const handleCloseStats = useCallback(() => {
    setMode("menu");
  }, []);

  // Handle mode switching with keyboard
  useInput(
    (input, key) => {
      if (!hasFocus) return;

      // Ctrl+, to open settings (from menu only)
      if (key.ctrl && input === "," && mode === "menu") {
        setMode("settings");
        return;
      }

      // 'L' to switch to logs view
      if ((input === "l" || input === "L") && mode !== "game" && mode !== "settings" && mode !== "stats") {
        setMode(mode === "logs" ? "menu" : "logs");
        return;
      }

      // 'Q' or Escape to go back to menu from logs
      if ((input === "q" || input === "Q") && mode === "logs") {
        setMode("menu");
        return;
      }
    },
    { isActive: hasFocus && mode !== "game" && mode !== "settings" && mode !== "stats" }
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

  if (mode === "settings") {
    return (
      <SettingsMenu
        config={config}
        hasFocus={hasFocus}
        onConfigChange={onConfigChange}
        onSave={onConfigSave}
        onClose={handleCloseSettings}
      />
    );
  }

  if (mode === "stats") {
    return (
      <StatsMenu
        hasFocus={hasFocus}
        onClose={handleCloseStats}
      />
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
          onGameStateChange={onGameStateChange}
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
        onOpenStats={handleOpenStats}
      />
      <Box paddingX={1}>
        <Text dimColor>L: View Logs | Ctrl+,: Settings</Text>
      </Box>
    </Box>
  );
}

/** Header component */
function Header() {
  const colors = useThemeColors();
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

/** Status bar footer - needs to be inside GameStatusProvider */
function StatusBarFooter({ loopStatus, needsAttention }: { loopStatus: string; needsAttention: boolean }) {
  return (
    <StatusBar
      loopStatus={loopStatus}
      needsAttention={needsAttention}
      condensed={true}
    />
  );
}

function AppContent() {
  const { exit } = useApp();
  const { config: fileConfig } = useConfig();
  const cliOverrides = useCLIOverrides();
  const { addAchievements, NotificationComponent, hasNotifications } = useAchievementNotifications();

  // Local config state for live preview (before saving)
  const [localConfigOverrides, setLocalConfigOverrides] = useState<Partial<BrainrotConfig>>({});

  // Record session start on mount
  useEffect(() => {
    void recordSessionStart();
  }, []);

  // Merge: file config -> local overrides -> CLI overrides (CLI takes precedence)
  const config = useMemo(
    () => deepMerge(deepMerge(fileConfig, localConfigOverrides), cliOverrides),
    [fileConfig, localConfigOverrides, cliOverrides]
  );

  // Handle config changes from settings menu (immediate preview)
  const handleConfigChange = useCallback((updates: Partial<BrainrotConfig>) => {
    setLocalConfigOverrides((prev) => deepMerge(prev, updates));
  }, []);

  // Handle saving config to disk
  const handleConfigSave = useCallback(async () => {
    // Merge current file config with local overrides and save
    const configToSave = deepMerge(fileConfig, localConfigOverrides);
    await saveConfig(configToSave);
    // Clear local overrides since they're now persisted
    setLocalConfigOverrides({});
  }, [fileConfig, localConfigOverrides]);

  // Get config-derived options
  const layoutOptions = useMemo(() => getLayoutOptions(config), [config]);
  const claudeCodeOptions = useMemo(() => getClaudeCodeOptions(config), [config]);

  const { status, output, spawn, stop } = useClaudeCode(claudeCodeOptions);
  const [focusedPane, setFocusedPane] = useState<0 | 1>(0);
  const [loopAlertDismissed, setLoopAlertDismissed] = useState(false);
  const [showHelpOverlay, setShowHelpOverlay] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [showFeaturePrompt, setShowFeaturePrompt] = useState(false);
  const [showInterviewQuestion, setShowInterviewQuestion] = useState(false);
  const [showResumeOverlay, setShowResumeOverlay] = useState(false);
  const [resumeOverlayDismissed, setResumeOverlayDismissed] = useState(false);
  const terminalSize = useTerminalSize();

  // Check if this is a first-time user (no existing loop state)
  const { exists: loopStateExists, isChecking: isCheckingLoopState } = useLoopStateExists();

  // Use loop state persistence - loads on startup and auto-saves changes
  const loopState = useLoopState();

  // Show onboarding tutorial for first-time users
  // Show resume overlay for returning users with existing loop state
  useEffect(() => {
    // Only trigger after we've checked loop state existence
    if (!isCheckingLoopState && !onboardingCompleted && !resumeOverlayDismissed) {
      if (loopStateExists === false) {
        // First-time user: show onboarding
        setShowOnboarding(true);
      } else if (loopStateExists === true && loopState.hasLoop) {
        // Returning user with previous loop: show resume overlay
        setShowResumeOverlay(true);
      }
    }
  }, [isCheckingLoopState, loopStateExists, onboardingCompleted, resumeOverlayDismissed, loopState.hasLoop]);

  // Handle onboarding completion - show feature prompt next
  const handleOnboardingComplete = useCallback(() => {
    setShowOnboarding(false);
    setOnboardingCompleted(true);
    // Show feature prompt screen after onboarding
    setShowFeaturePrompt(true);
  }, []);

  // Handle feature prompt completion - show interview question next
  const handleFeaturePromptComplete = useCallback((prompt: string) => {
    setShowFeaturePrompt(false);
    // Store the feature prompt in loop state
    if (prompt) {
      loopState.state.prd = {
        name: prompt,
        description: prompt,
      };
    }
    // Show interview question screen next
    setShowInterviewQuestion(true);
  }, [loopState.state]);

  // Handle interview question answer
  const handleInterviewAnswer = useCallback((answer: string) => {
    setShowInterviewQuestion(false);
    // Store the answer in loop state (extend PRD content)
    if (loopState.state.prd) {
      loopState.state.prd.content = answer;
    }
  }, [loopState.state]);

  // Handle going back from interview question to feature prompt
  const handleInterviewQuestionBack = useCallback(() => {
    setShowInterviewQuestion(false);
    setShowFeaturePrompt(true);
  }, []);

  // Handle going back from feature prompt to onboarding
  const handleFeaturePromptBack = useCallback(() => {
    setShowFeaturePrompt(false);
    setShowOnboarding(true);
    setOnboardingCompleted(false);
  }, []);

  // Handle resume overlay action selection
  const handleResumeAction = useCallback((action: ResumeAction) => {
    setShowResumeOverlay(false);
    setResumeOverlayDismissed(true);

    switch (action) {
      case "resume":
        // Resume the previous loop - just dismiss the overlay
        // The loop state is already loaded
        break;
      case "new":
        // Start a new loop - clear the existing state
        loopState.clear();
        break;
      case "history":
        // View history - for now, dismiss and let user navigate to stats
        // In a more complete implementation, this could open a history view
        break;
    }
  }, [loopState]);

  // Use Ralph loop parsing for the output
  const ralphLoop = useRalphLoopWithClaudeOutput(output);

  // Sync Ralph loop status to persistent state when it changes
  useEffect(() => {
    if (ralphLoop.state.status !== loopState.state.loopStatus) {
      loopState.setLoopStatus(ralphLoop.state.status);
    }
  }, [ralphLoop.state.status, loopState]);

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

  // Toggle help overlay
  const handleToggleHelp = useCallback(() => {
    setShowHelpOverlay((prev) => !prev);
  }, []);

  // Close help overlay
  const handleCloseHelp = useCallback(() => {
    setShowHelpOverlay(false);
  }, []);

  // Reset dismiss state when a new attention request comes in
  useEffect(() => {
    if (ralphLoop.needsAttention) {
      setLoopAlertDismissed(false);
    }
  }, [ralphLoop.needsAttention, ralphLoop.state.userAttention.reason, ralphLoop.state.userAttention.prompt]);

  useInput((input, key) => {
    // Ctrl+C always works to exit
    if (key.ctrl && input === "c") {
      void stop().then(() => exit());
      return;
    }

    // When onboarding, feature prompt, interview question, or resume overlay is shown, only handle Ctrl+C (above)
    // These components handle their own keyboard input
    if (showOnboarding || showFeaturePrompt || showInterviewQuestion || showResumeOverlay) {
      return;
    }

    // Help overlay toggle with ? key (works globally)
    if (input === "?") {
      handleToggleHelp();
      return;
    }

    // When help overlay is shown, only handle escape and ? to close
    if (showHelpOverlay) {
      if (key.escape) {
        handleCloseHelp();
      }
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

  // Handler for game state updates from games
  const { setGameState } = useGameStatus();
  const handleGameStateChange = useCallback((update: GameStateUpdate) => {
    setGameState(update);
  }, [setGameState]);

  // Determine effective loop status for status bar
  const effectiveLoopStatus = useMemo(() => {
    // If process is running, use ralph loop status, otherwise use process status
    if (status === "running") {
      return ralphLoop.state.status;
    }
    return status;
  }, [status, ralphLoop.state.status]);

  return (
    <ThemeProvider config={config}>
      {/* Onboarding tutorial - full-screen modal for first-time users */}
      {showOnboarding && (
        <Box
          position="absolute"
          width={terminalSize.width}
          height={terminalSize.height}
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
        >
          <OnboardingTutorial
            isVisible={showOnboarding}
            onComplete={handleOnboardingComplete}
            hasFocus={showOnboarding}
            dimensions={{ width: terminalSize.width, height: terminalSize.height }}
          />
        </Box>
      )}
      {/* Feature prompt screen - shown after onboarding for first-time users */}
      {showFeaturePrompt && !showOnboarding && (
        <Box
          position="absolute"
          width={terminalSize.width}
          height={terminalSize.height}
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
        >
          <FeaturePromptScreen
            isVisible={showFeaturePrompt}
            onComplete={handleFeaturePromptComplete}
            onBack={handleFeaturePromptBack}
            hasFocus={showFeaturePrompt}
            dimensions={{ width: terminalSize.width, height: terminalSize.height }}
          />
        </Box>
      )}
      {/* Interview question screen - shown after feature prompt */}
      {showInterviewQuestion && !showOnboarding && !showFeaturePrompt && (
        <Box
          position="absolute"
          width={terminalSize.width}
          height={terminalSize.height}
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
        >
          <InterviewQuestion
            isVisible={showInterviewQuestion}
            question="What type of project is this?"
            header="Project Context"
            options={[
              { label: "Web application (frontend/fullstack)", value: "web" },
              { label: "Backend API or service", value: "backend" },
              { label: "CLI tool or script", value: "cli" },
              { label: "Mobile app", value: "mobile" },
            ]}
            onAnswer={handleInterviewAnswer}
            onBack={handleInterviewQuestionBack}
            hasFocus={showInterviewQuestion}
            dimensions={{ width: terminalSize.width, height: terminalSize.height }}
          />
        </Box>
      )}
      {/* Resume overlay - full-screen modal for returning users */}
      {showResumeOverlay && !showOnboarding && !showFeaturePrompt && !showInterviewQuestion && (
        <Box
          position="absolute"
          width={terminalSize.width}
          height={terminalSize.height}
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
        >
          <ResumeOverlay
            isVisible={showResumeOverlay}
            loopState={loopState.state}
            onAction={handleResumeAction}
            hasFocus={showResumeOverlay}
            dimensions={{ width: terminalSize.width, height: terminalSize.height }}
          />
        </Box>
      )}
      {/* Help overlay - shown above everything */}
      {showHelpOverlay && !showOnboarding && !showFeaturePrompt && !showInterviewQuestion && !showResumeOverlay && (
        <Box position="absolute" marginTop={1} marginLeft={2}>
          <HelpOverlay hasFocus={showHelpOverlay} onClose={handleCloseHelp} />
        </Box>
      )}
      {/* Achievement notification overlay */}
      {hasNotifications && !showOnboarding && !showFeaturePrompt && !showInterviewQuestion && !showResumeOverlay && (
        <Box position="absolute" marginTop={3} marginLeft={5}>
          {NotificationComponent}
        </Box>
      )}
      <Layout
        gameArea={
          <GameArea
            logs={output}
            hasFocus={focusedPane === 0 && !showHelpOverlay && !showOnboarding && !showFeaturePrompt && !showInterviewQuestion && !showResumeOverlay}
            dimensions={gameDimensions}
            loopAttention={loopAttention}
            onLoopAlertDismiss={handleLoopAlertDismiss}
            config={config}
            onConfigChange={handleConfigChange}
            onConfigSave={handleConfigSave}
            onAchievementUnlock={addAchievements}
            onGameStateChange={handleGameStateChange}
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
        footer={<StatusBarFooter loopStatus={effectiveLoopStatus} needsAttention={ralphLoop.needsAttention} />}
        layoutOptions={layoutOptions}
        handleInput={!showHelpOverlay && !showOnboarding && !showFeaturePrompt && !showInterviewQuestion && !showResumeOverlay}
      />
    </ThemeProvider>
  );
}

/** App wrapper that provides GameStatusProvider context */
function App() {
  return (
    <GameStatusProvider>
      <AppContent />
    </GameStatusProvider>
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
