#!/usr/bin/env node
import { render, Box, Text, useInput, useApp } from "ink";
import {
  useState,
  useCallback,
  useMemo,
  useEffect,
  createContext,
  useContext,
} from "react";
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
import {
  getLayoutOptions,
  getClaudeCodeOptions,
  deepMerge,
  saveConfig,
  type BrainrotConfig,
} from "./config.js";
import { parseCLI, printHelp, printVersion, printError } from "./cli.js";
import { recordSessionStart } from "./stats.js";
import { useLoopState, useLoopStateExists } from "./use-loop-state.js";
import { OnboardingTutorial } from "./OnboardingTutorial.js";
import { ResumeOverlay, type ResumeAction } from "./ResumeOverlay.js";
import { FeaturePromptScreen } from "./FeaturePromptScreen.js";
import {
  DynamicInterviewFlow,
  type InterviewResult,
} from "./DynamicInterviewFlow.js";
import {
  PrdGenerationScreen,
  type GeneratedPrd,
} from "./PrdGenerationScreen.js";
import { TaskBreakdownScreen } from "./TaskBreakdownScreen.js";
import { PreStartReviewScreen } from "./PreStartReviewScreen.js";
import { PrdOverlay, type PrdOverlayAction } from "./PrdOverlay.js";
import type { ClaudeCodeOutput } from "./use-claude-code.js";
import type {
  GameDimensions,
  LoopAttention,
  GameStateUpdate,
} from "./game-types.js";
import { ThemeProvider, useThemeColors } from "./useTheme.js";
import {
  StatusBar,
  GameStatusProvider,
  useGameStatus,
  LoopInfoProvider,
  useLoopInfo,
  type HotkeyContext,
} from "./StatusBar.js";
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
  gamesEnabled: boolean;
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
  gamesEnabled,
}: GameAreaProps) {
  const [mode, setMode] = useState<GameAreaMode>("menu");
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const colors = useThemeColors();
  const { setGameState, clearGameState } = useGameStatus();

  const games = useMemo(() => getGameList(), []);

  const handleSelectGame = useCallback(
    (gameId: string) => {
      setSelectedGameId(gameId);
      setMode("game");
      // Set game name in status bar
      const gameInfo = getGameById(gameId);
      if (gameInfo) {
        setGameState({ gameId, gameName: gameInfo.info.name });
      }
    },
    [setGameState]
  );

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
      if (
        (input === "l" || input === "L") &&
        mode !== "game" &&
        mode !== "settings" &&
        mode !== "stats"
      ) {
        setMode(mode === "logs" ? "menu" : "logs");
        return;
      }

      // 'Q' or Escape to go back to menu from logs
      if ((input === "q" || input === "Q") && mode === "logs") {
        setMode("menu");
        return;
      }
    },
    {
      isActive:
        hasFocus && mode !== "game" && mode !== "settings" && mode !== "stats",
    }
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
        <LogViewer
          logs={logs}
          hasFocus={hasFocus}
          initialViewMode="condensed"
        />
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
    return <StatsMenu hasFocus={hasFocus} onClose={handleCloseStats} />;
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
        gamesEnabled={gamesEnabled}
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
function StatusBarFooter({
  loopStatus,
  needsAttention,
  hotkeyContext,
}: {
  loopStatus: string;
  needsAttention: boolean;
  hotkeyContext: HotkeyContext;
}) {
  return (
    <StatusBar
      loopStatus={loopStatus}
      needsAttention={needsAttention}
      condensed={true}
      hotkeyContext={hotkeyContext}
    />
  );
}

function AppContent() {
  const { exit } = useApp();
  const { config: fileConfig } = useConfig();
  const cliOverrides = useCLIOverrides();
  const { addAchievements, NotificationComponent, hasNotifications } =
    useAchievementNotifications();

  // Local config state for live preview (before saving)
  const [localConfigOverrides, setLocalConfigOverrides] = useState<
    Partial<BrainrotConfig>
  >({});

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
  const claudeCodeOptions = useMemo(
    () => getClaudeCodeOptions(config),
    [config]
  );

  const { status, output, spawn, stop } = useClaudeCode(claudeCodeOptions);
  const [focusedPane, setFocusedPane] = useState<0 | 1>(0);
  const [loopAlertDismissed, setLoopAlertDismissed] = useState(false);
  const [showHelpOverlay, setShowHelpOverlay] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [showFeaturePrompt, setShowFeaturePrompt] = useState(false);
  const [showInterviewFlow, setShowInterviewFlow] = useState(false);
  const [featurePromptText, setFeaturePromptText] = useState("");
  const [showResumeOverlay, setShowResumeOverlay] = useState(false);
  const [resumeOverlayDismissed, setResumeOverlayDismissed] = useState(false);
  const [showPrdGeneration, setShowPrdGeneration] = useState(false);
  const [showTaskBreakdown, setShowTaskBreakdown] = useState(false);
  const [showPreStartReview, setShowPreStartReview] = useState(false);
  const [currentInterviewResult, setCurrentInterviewResult] =
    useState<InterviewResult | null>(null);
  const [currentGeneratedPrd, setCurrentGeneratedPrd] =
    useState<GeneratedPrd | null>(null);
  const [showPrdOverlay, setShowPrdOverlay] = useState(false);
  const terminalSize = useTerminalSize();

  // Check if this is a first-time user (no existing loop state)
  const { exists: loopStateExists, isChecking: isCheckingLoopState } =
    useLoopStateExists();

  // Use loop state persistence - loads on startup and auto-saves changes
  const loopState = useLoopState();

  // Show onboarding tutorial for first-time users
  // Show resume overlay for returning users with existing loop state
  useEffect(() => {
    // Only trigger after we've checked loop state existence
    if (
      !isCheckingLoopState &&
      !onboardingCompleted &&
      !resumeOverlayDismissed
    ) {
      if (loopStateExists === false) {
        // First-time user: show onboarding
        setShowOnboarding(true);
      } else if (loopStateExists === true && loopState.hasLoop) {
        // Returning user with previous loop: show resume overlay
        setShowResumeOverlay(true);
      }
    }
  }, [
    isCheckingLoopState,
    loopStateExists,
    onboardingCompleted,
    resumeOverlayDismissed,
    loopState.hasLoop,
  ]);

  // Handle onboarding completion - show feature prompt next
  const handleOnboardingComplete = useCallback(() => {
    setShowOnboarding(false);
    setOnboardingCompleted(true);
    // Show feature prompt screen after onboarding
    setShowFeaturePrompt(true);
  }, []);

  // Handle feature prompt completion - show dynamic interview flow next
  const handleFeaturePromptComplete = useCallback(
    (prompt: string) => {
      setShowFeaturePrompt(false);
      setFeaturePromptText(prompt);
      // Store the feature prompt in loop state
      if (prompt) {
        loopState.state.prd = {
          name: prompt,
          description: prompt,
        };
      }
      // Show dynamic interview flow next
      setShowInterviewFlow(true);
    },
    [loopState.state]
  );

  // Handle interview flow completion - trigger PRD generation
  const handleInterviewComplete = useCallback((result: InterviewResult) => {
    setShowInterviewFlow(false);
    // Store the interview result and show PRD generation screen
    setCurrentInterviewResult(result);
    setShowPrdGeneration(true);
  }, []);

  // Handle PRD generation completion - show task breakdown screen
  const handlePrdGenerationComplete = useCallback(
    (generatedPrd: GeneratedPrd) => {
      setShowPrdGeneration(false);
      // Store the generated PRD for display in task breakdown screen
      setCurrentGeneratedPrd(generatedPrd);
      // Show task breakdown screen
      setShowTaskBreakdown(true);
    },
    []
  );

  // Handle task breakdown screen continue - show pre-start review screen
  const handleTaskBreakdownContinue = useCallback(() => {
    setShowTaskBreakdown(false);
    // Show the pre-start review screen for final confirmation
    setShowPreStartReview(true);
  }, []);

  // Handle pre-start review screen - start loop
  const handlePreStartReviewStart = useCallback(() => {
    setShowPreStartReview(false);
    if (!currentGeneratedPrd) return;

    // Store the generated PRD and tasks in loop state
    if (loopState.state.prd) {
      loopState.state.prd.content = currentGeneratedPrd.fullContent;
      loopState.state.prd.raw = {
        interview: currentInterviewResult,
        generated: currentGeneratedPrd,
      };
    }
    // Set tasks from the generated PRD
    loopState.setPrdAndTasks(
      loopState.state.prd ?? {
        name: currentInterviewResult?.featureDescription ?? "Feature",
        description: currentGeneratedPrd.overview,
        content: currentGeneratedPrd.fullContent,
      },
      currentGeneratedPrd.taskBreakdown
    );
    // Clear the interview result and generated PRD
    setCurrentInterviewResult(null);
    setCurrentGeneratedPrd(null);
  }, [loopState, currentInterviewResult, currentGeneratedPrd]);

  // Handle pre-start review screen - edit tasks (go back to task breakdown)
  const handlePreStartReviewEditTasks = useCallback(() => {
    setShowPreStartReview(false);
    // Go back to task breakdown screen to edit tasks
    setShowTaskBreakdown(true);
  }, []);

  // Handle PRD generation cancellation
  const handlePrdGenerationCancel = useCallback(() => {
    setShowPrdGeneration(false);
    // Go back to interview flow
    setShowInterviewFlow(true);
  }, []);

  // Handle going back from interview flow to feature prompt
  const handleInterviewFlowBack = useCallback(() => {
    setShowInterviewFlow(false);
    setShowFeaturePrompt(true);
  }, []);

  // Handle going back from feature prompt to onboarding
  const handleFeaturePromptBack = useCallback(() => {
    setShowFeaturePrompt(false);
    setShowOnboarding(true);
    setOnboardingCompleted(false);
  }, []);

  // Handle resume overlay action selection
  const handleResumeAction = useCallback(
    (action: ResumeAction) => {
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
    },
    [loopState]
  );

  // Use Ralph loop parsing for the output
  const ralphLoop = useRalphLoopWithClaudeOutput(output);

  // Sync Ralph loop status to persistent state when it changes
  useEffect(() => {
    if (ralphLoop.state.status !== loopState.state.loopStatus) {
      loopState.setLoopStatus(ralphLoop.state.status);
    }
  }, [ralphLoop.state.status, loopState]);

  // Use loop info context to update status bar
  const { setLoopInfo } = useLoopInfo();

  // Sync loop state to loop info context for status bar display
  useEffect(() => {
    const { tasks, progress, startedAt } = loopState.state;

    // Find the current task (in_progress status)
    const currentTask = tasks.find((t) => t.status === "in_progress") ?? null;

    setLoopInfo({
      currentTask,
      progress: progress.totalTasks > 0 ? progress : null,
      startedAt: tasks.length > 0 ? startedAt : null,
    });
  }, [loopState.state, setLoopInfo]);

  // Calculate game area dimensions (accounting for layout chrome)
  const gameDimensions = useMemo(() => {
    // Account for header (3), footer (2), help (1), borders, and split pane divider
    const availableHeight = Math.max(terminalSize.height - 8, 10);
    const availableWidth = Math.max(
      Math.floor(terminalSize.width * 0.5) - 4,
      20
    );
    return { width: availableWidth, height: availableHeight };
  }, [terminalSize.width, terminalSize.height]);

  // Create loop attention object for games
  const loopAttention = useMemo(
    () => ({
      needsAttention: ralphLoop.needsAttention && !loopAlertDismissed,
      reason: ralphLoop.state.userAttention.reason,
      type: ralphLoop.state.userAttention.type,
      prompt: ralphLoop.state.userAttention.prompt,
    }),
    [
      ralphLoop.needsAttention,
      ralphLoop.state.userAttention,
      loopAlertDismissed,
    ]
  );

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

  // Toggle PRD overlay
  const handleTogglePrdOverlay = useCallback(() => {
    setShowPrdOverlay((prev) => !prev);
  }, []);

  // Close PRD overlay
  const handleClosePrdOverlay = useCallback(() => {
    setShowPrdOverlay(false);
  }, []);

  // Handle PRD overlay action
  const handlePrdOverlayAction = useCallback(
    (action: PrdOverlayAction) => {
      setShowPrdOverlay(false);
      switch (action) {
        case "resume":
          // Resume the loop - just close the overlay
          break;
        case "new_loop":
          // Clear existing loop and start fresh
          loopState.clear();
          setShowFeaturePrompt(true);
          break;
        case "full_prd":
          // For now, just close - could open a detailed PRD view in the future
          break;
      }
    },
    [loopState]
  );

  // Reset dismiss state when a new attention request comes in
  useEffect(() => {
    if (ralphLoop.needsAttention) {
      setLoopAlertDismissed(false);
    }
  }, [
    ralphLoop.needsAttention,
    ralphLoop.state.userAttention.reason,
    ralphLoop.state.userAttention.prompt,
  ]);

  useInput((input, key) => {
    // Ctrl+C always works to exit
    if (key.ctrl && input === "c") {
      void stop().then(() => exit());
      return;
    }

    // When onboarding, feature prompt, interview flow, PRD generation, task breakdown, pre-start review, or resume overlay is shown, only handle Ctrl+C (above)
    // These components handle their own keyboard input
    if (
      showOnboarding ||
      showFeaturePrompt ||
      showInterviewFlow ||
      showPrdGeneration ||
      showTaskBreakdown ||
      showPreStartReview ||
      showResumeOverlay
    ) {
      return;
    }

    // Help overlay toggle with ? key (works globally)
    if (input === "?") {
      handleToggleHelp();
      return;
    }

    // PRD overlay toggle with P key (works globally when no other modal is open)
    if ((input === "p" || input === "P") && !showHelpOverlay) {
      handleTogglePrdOverlay();
      return;
    }

    // When help overlay is shown, only handle escape and ? to close
    if (showHelpOverlay) {
      if (key.escape) {
        handleCloseHelp();
      }
      return;
    }

    // When PRD overlay is shown, only handle escape and P to close
    if (showPrdOverlay) {
      if (key.escape) {
        handleClosePrdOverlay();
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
  const handleGameStateChange = useCallback(
    (update: GameStateUpdate) => {
      setGameState(update);
    },
    [setGameState]
  );

  // Determine effective loop status for status bar
  const effectiveLoopStatus = useMemo(() => {
    // If process is running, use ralph loop status, otherwise use process status
    if (status === "running") {
      return ralphLoop.state.status;
    }
    return status;
  }, [status, ralphLoop.state.status]);

  // Determine if games are enabled (only after explicit loop start)
  // Games are disabled during: onboarding, setup wizard, interview, PRD generation, task breakdown, pre-start review
  // Games are enabled only after explicit loop start (user clicks "Start Loop" on pre-start review)
  const gamesEnabled = useMemo(() => {
    // Games are disabled during any setup flow
    if (
      showOnboarding ||
      showFeaturePrompt ||
      showInterviewFlow ||
      showPrdGeneration ||
      showTaskBreakdown ||
      showPreStartReview ||
      showResumeOverlay
    ) {
      return false;
    }
    // Games are enabled only when there's an active loop with tasks
    // (set by handlePreStartReviewStart or by resuming an existing loop)
    return loopState.hasLoop && loopState.state.tasks.length > 0;
  }, [
    showOnboarding,
    showFeaturePrompt,
    showInterviewFlow,
    showPrdGeneration,
    showTaskBreakdown,
    showPreStartReview,
    showResumeOverlay,
    loopState.hasLoop,
    loopState.state.tasks.length,
  ]);

  // Determine current hotkey context for status bar
  const currentHotkeyContext = useMemo((): HotkeyContext => {
    // Interview/onboarding flows take highest priority
    if (
      showOnboarding ||
      showFeaturePrompt ||
      showInterviewFlow ||
      showPrdGeneration ||
      showTaskBreakdown ||
      showPreStartReview
    ) {
      return "interview";
    }
    // Overlays/modals
    if (showHelpOverlay || showPrdOverlay || showResumeOverlay) {
      return "overlay";
    }
    // Loop is active and running
    if (status === "running") {
      return "loop";
    }
    // Default state - game context is auto-detected by StatusBar based on gameState
    return "default";
  }, [
    showOnboarding,
    showFeaturePrompt,
    showInterviewFlow,
    showPrdGeneration,
    showPreStartReview,
    showTaskBreakdown,
    showHelpOverlay,
    showPrdOverlay,
    showResumeOverlay,
    status,
  ]);

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
            dimensions={{
              width: terminalSize.width,
              height: terminalSize.height,
            }}
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
            dimensions={{
              width: terminalSize.width,
              height: terminalSize.height,
            }}
          />
        </Box>
      )}
      {/* Dynamic interview flow - shown after feature prompt */}
      {showInterviewFlow && !showOnboarding && !showFeaturePrompt && (
        <Box
          position="absolute"
          width={terminalSize.width}
          height={terminalSize.height}
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
        >
          <DynamicInterviewFlow
            isVisible={showInterviewFlow}
            featureDescription={featurePromptText}
            onComplete={handleInterviewComplete}
            onBack={handleInterviewFlowBack}
            hasFocus={showInterviewFlow}
            dimensions={{
              width: terminalSize.width,
              height: terminalSize.height,
            }}
          />
        </Box>
      )}
      {/* PRD Generation screen - shown after interview flow */}
      {showPrdGeneration &&
        currentInterviewResult &&
        !showOnboarding &&
        !showFeaturePrompt &&
        !showInterviewFlow && (
          <Box
            position="absolute"
            width={terminalSize.width}
            height={terminalSize.height}
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
          >
            <PrdGenerationScreen
              isVisible={showPrdGeneration}
              interviewResult={currentInterviewResult}
              onComplete={handlePrdGenerationComplete}
              onCancel={handlePrdGenerationCancel}
              hasFocus={showPrdGeneration}
              dimensions={{
                width: terminalSize.width,
                height: terminalSize.height,
              }}
            />
          </Box>
        )}
      {/* Task Breakdown screen - shown after PRD generation */}
      {showTaskBreakdown &&
        currentGeneratedPrd &&
        !showOnboarding &&
        !showFeaturePrompt &&
        !showInterviewFlow &&
        !showPrdGeneration && (
          <Box
            position="absolute"
            width={terminalSize.width}
            height={terminalSize.height}
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
          >
            <TaskBreakdownScreen
              isVisible={showTaskBreakdown}
              tasks={currentGeneratedPrd.taskBreakdown}
              featureName={
                currentInterviewResult?.featureDescription ??
                loopState.state.prd?.name ??
                "Feature"
              }
              onContinue={handleTaskBreakdownContinue}
              hasFocus={showTaskBreakdown}
              dimensions={{
                width: terminalSize.width,
                height: terminalSize.height,
              }}
            />
          </Box>
        )}
      {/* Pre-Start Review screen - shown after task breakdown for final confirmation */}
      {showPreStartReview &&
        currentGeneratedPrd &&
        !showOnboarding &&
        !showFeaturePrompt &&
        !showInterviewFlow &&
        !showPrdGeneration &&
        !showTaskBreakdown && (
          <Box
            position="absolute"
            width={terminalSize.width}
            height={terminalSize.height}
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
          >
            <PreStartReviewScreen
              isVisible={showPreStartReview}
              generatedPrd={currentGeneratedPrd}
              featureName={
                currentInterviewResult?.featureDescription ??
                loopState.state.prd?.name ??
                "Feature"
              }
              onStart={handlePreStartReviewStart}
              onEditTasks={handlePreStartReviewEditTasks}
              hasFocus={showPreStartReview}
              dimensions={{
                width: terminalSize.width,
                height: terminalSize.height,
              }}
            />
          </Box>
        )}
      {/* Resume overlay - full-screen modal for returning users */}
      {showResumeOverlay &&
        !showOnboarding &&
        !showFeaturePrompt &&
        !showInterviewFlow &&
        !showPrdGeneration &&
        !showTaskBreakdown &&
        !showPreStartReview && (
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
              dimensions={{
                width: terminalSize.width,
                height: terminalSize.height,
              }}
            />
          </Box>
        )}
      {/* PRD overlay - triggered by P key */}
      {showPrdOverlay &&
        !showOnboarding &&
        !showFeaturePrompt &&
        !showInterviewFlow &&
        !showPrdGeneration &&
        !showTaskBreakdown &&
        !showPreStartReview &&
        !showResumeOverlay && (
          <Box
            position="absolute"
            width={terminalSize.width}
            height={terminalSize.height}
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
          >
            <PrdOverlay
              isVisible={showPrdOverlay}
              loopState={loopState.state}
              onAction={handlePrdOverlayAction}
              onClose={handleClosePrdOverlay}
              hasFocus={showPrdOverlay}
              dimensions={{
                width: terminalSize.width,
                height: terminalSize.height,
              }}
            />
          </Box>
        )}
      {/* Help overlay - shown above everything */}
      {showHelpOverlay &&
        !showOnboarding &&
        !showFeaturePrompt &&
        !showInterviewFlow &&
        !showPrdGeneration &&
        !showTaskBreakdown &&
        !showPreStartReview &&
        !showResumeOverlay &&
        !showPrdOverlay && (
          <Box position="absolute" marginTop={1} marginLeft={2}>
            <HelpOverlay hasFocus={showHelpOverlay} onClose={handleCloseHelp} />
          </Box>
        )}
      {/* Achievement notification overlay */}
      {hasNotifications &&
        !showOnboarding &&
        !showFeaturePrompt &&
        !showInterviewFlow &&
        !showPrdGeneration &&
        !showTaskBreakdown &&
        !showPreStartReview &&
        !showResumeOverlay &&
        !showPrdOverlay && (
          <Box position="absolute" marginTop={3} marginLeft={5}>
            {NotificationComponent}
          </Box>
        )}
      <Layout
        gameArea={
          <GameArea
            logs={output}
            hasFocus={
              focusedPane === 0 &&
              !showHelpOverlay &&
              !showOnboarding &&
              !showFeaturePrompt &&
              !showInterviewFlow &&
              !showPrdGeneration &&
              !showTaskBreakdown &&
              !showPreStartReview &&
              !showResumeOverlay &&
              !showPrdOverlay
            }
            dimensions={gameDimensions}
            loopAttention={loopAttention}
            onLoopAlertDismiss={handleLoopAlertDismiss}
            config={config}
            onConfigChange={handleConfigChange}
            onConfigSave={handleConfigSave}
            onAchievementUnlock={addAchievements}
            onGameStateChange={handleGameStateChange}
            gamesEnabled={gamesEnabled}
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
        footer={
          <StatusBarFooter
            loopStatus={effectiveLoopStatus}
            needsAttention={ralphLoop.needsAttention}
            hotkeyContext={currentHotkeyContext}
          />
        }
        layoutOptions={layoutOptions}
        handleInput={
          !showHelpOverlay &&
          !showOnboarding &&
          !showFeaturePrompt &&
          !showInterviewFlow &&
          !showPrdGeneration &&
          !showTaskBreakdown &&
          !showPreStartReview &&
          !showResumeOverlay &&
          !showPrdOverlay
        }
      />
    </ThemeProvider>
  );
}

/** App wrapper that provides GameStatusProvider and LoopInfoProvider context */
function App() {
  return (
    <GameStatusProvider>
      <LoopInfoProvider>
        <AppContent />
      </LoopInfoProvider>
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
