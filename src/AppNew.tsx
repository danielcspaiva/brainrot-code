/**
 * New App Entry Point
 *
 * Implements the simplified UI flow:
 * FEATURE_INPUT → CLAUDE_PLANNING → GAME_SELECT → LOOP_RUNNING → LOOP_COMPLETE
 */

import { Box, Text, useInput, useApp } from "ink";
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
import { useTerminalSize } from "./Layout.js";
import { LogViewer } from "./LogViewer.js";
import { useConfig } from "./use-config.js";
import {
  getClaudeCodeOptions,
  getSidePanelSettings,
  deepMerge,
  type BrainrotConfig,
} from "./config.js";
import { useLoopState, useLoopStateExists } from "./use-loop-state.js";
import { getGameById } from "./games/index.js";
import { ThemeProvider, useThemeColors } from "./useTheme.js";
import {
  GameStatusProvider,
  useGameStatus,
  LoopInfoProvider,
  useLoopInfo,
} from "./StatusBar.js";
import { HelpOverlay } from "./HelpOverlay.js";
import type {
  GameDimensions,
  LoopAttention,
  GameStateUpdate,
} from "./game-types.js";

// New components
import { FeatureInput } from "./FeatureInput.js";
import { GameSelectScreen } from "./GameSelectScreen.js";
import { StatusBarMinimal, type LoopStatus } from "./StatusBarMinimal.js";
import { SidePanel, type Task as SidePanelTask } from "./SidePanel.js";
import { GameSelectorOverlay } from "./GameSelectorOverlay.js";
import { AttentionOverlay } from "./AttentionOverlay.js";
import { LoopComplete, type GameSessionStats } from "./LoopComplete.js";
import { ResumePrompt } from "./ResumePrompt.js";
import { PlanningPhase } from "./PlanningPhase.js";
import { PreStartReviewScreen } from "./PreStartReviewScreen.js";
import { TaskBreakdownScreen } from "./TaskBreakdownScreen.js";
import { useRalphLoopManager } from "./use-ralph-loop-manager.js";
import { initDebugLogger, debugLog } from "./debug-logger.js";
import type { LoopTask } from "./loop-state.js";
import type { GeneratedPrd } from "./PrdGenerationScreen.js";

// ============================================================================
// TYPES
// ============================================================================

type AppState =
  | "feature_input"
  | "planning"
  | "plan_confirmation"
  | "task_breakdown"
  | "game_select"
  | "loop_running"
  | "loop_complete"
  | "resume_prompt";

interface PlanningState {
  featureDescription: string;
}

// ============================================================================
// CLI OVERRIDE CONTEXT
// ============================================================================

const CLIOverridesContext = createContext<Partial<BrainrotConfig>>({});

export function useCLIOverrides(): Partial<BrainrotConfig> {
  return useContext(CLIOverridesContext);
}

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

function AppNewContent() {
  const { exit } = useApp();
  const { config: fileConfig } = useConfig();
  const cliOverrides = useCLIOverrides();
  const colors = useThemeColors();
  const terminalSize = useTerminalSize();

  // Config
  const config = useMemo(
    () => deepMerge(fileConfig, cliOverrides),
    [fileConfig, cliOverrides]
  );
  const claudeCodeOptions = useMemo(
    () => getClaudeCodeOptions(config),
    [config]
  );
  const sidePanelSettings = useMemo(
    () => getSidePanelSettings(config),
    [config]
  );

  // Initialize debug logger (synchronous - logs available immediately)
  useEffect(() => {
    const debugEnabled = config.app?.debugMode ?? false;
    const workDir = config.claudeCode?.workingDirectory ?? process.cwd();
    initDebugLogger(debugEnabled, workDir);
    if (debugEnabled) {
      debugLog("INIT", "BrainRot started with debug mode enabled");
      debugLog("INIT", "Config", JSON.stringify(config.app ?? {}));
    }
  }, [config.app?.debugMode, config.claudeCode?.workingDirectory, config.app]);

  // Claude Code process (for fallback/legacy)
  const { status: processStatus, output, stop, writeLine } = useClaudeCode(claudeCodeOptions);
  const ralphLoop = useRalphLoopWithClaudeOutput(output);

  // New Ralph Loop Manager
  const ralphManager = useRalphLoopManager();

  // Loop state persistence
  const { exists: loopStateExists, isChecking: isCheckingLoopState } = useLoopStateExists();
  const loopState = useLoopState();

  // App state
  const [appState, setAppState] = useState<AppState>("feature_input");
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showGameSelector, setShowGameSelector] = useState(false);
  const [loopAlertDismissed, setLoopAlertDismissed] = useState(false);
  const [loopStartTime, setLoopStartTime] = useState<Date | null>(null);
  const [gameStats] = useState<GameSessionStats[]>([]); // TODO: Track game stats during session

  // Planning state
  const [planningState, setPlanningState] = useState<PlanningState>({
    featureDescription: "",
  });

  // Game status context
  const { setGameState, clearGameState } = useGameStatus();
  const { setLoopInfo } = useLoopInfo();

  // Check for existing loop on startup
  useEffect(() => {
    if (!isCheckingLoopState && loopStateExists === true && loopState.hasLoop) {
      setAppState("resume_prompt");
    }
  }, [isCheckingLoopState, loopStateExists, loopState.hasLoop]);

  // Watch for Ralph manager plan ready state
  useEffect(() => {
    if (appState === "planning" && ralphManager.isPlanReady) {
      setAppState("plan_confirmation");
    }
  }, [appState, ralphManager.isPlanReady]);

  // Watch for Ralph manager loop completion
  useEffect(() => {
    if (appState === "loop_running" && ralphManager.isComplete) {
      setAppState("loop_complete");
    }
  }, [appState, ralphManager.isComplete]);

  // Sync Ralph manager tasks with loop state
  useEffect(() => {
    if (ralphManager.prd && appState === "loop_running") {
      const updatedTasks: LoopTask[] = ralphManager.prd.tasks.map((t, i) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.passes ? "completed" : (i === ralphManager.state.currentTaskIndex ? "in_progress" : "pending"),
        complexity: t.complexity,
        dependsOn: t.dependsOn,
      }));
      // Only update if tasks have changed
      if (JSON.stringify(updatedTasks) !== JSON.stringify(loopState.state.tasks)) {
        loopState.updateTasks(updatedTasks);
      }
    }
  }, [ralphManager.prd, ralphManager.state.currentTaskIndex, appState, loopState]);

  // Sync loop state to loop info context
  useEffect(() => {
    const { tasks, progress, startedAt } = loopState.state;
    const currentTask = tasks.find((t) => t.status === "in_progress") ?? null;
    setLoopInfo({
      currentTask,
      progress: progress.totalTasks > 0 ? progress : null,
      startedAt: tasks.length > 0 ? startedAt : null,
    });
  }, [loopState.state, setLoopInfo]);

  // Handle feature submission - start REAL planning with Claude
  const handleFeatureSubmit = useCallback((feature: string) => {
    debugLog("EVENT", "handleFeatureSubmit called", feature);
    setPlanningState({ featureDescription: feature });
    setAppState("planning");

    // Start real planning with Claude via Ralph manager
    debugLog("EVENT", "Calling ralphManager.startPlanning");
    ralphManager.startPlanning(feature).catch((error) => {
      debugLog("ERROR", "Planning failed in handleFeatureSubmit", error instanceof Error ? error.message : String(error));
      console.error("Planning failed:", error);
    });
  }, [ralphManager]);

  // Handle planning phase completion - move to plan confirmation
  const handlePlanReady = useCallback(() => {
    setAppState("plan_confirmation");
  }, []);

  // Handle planning cancel
  const handlePlanningCancel = useCallback(() => {
    ralphManager.stop();
    setAppState("feature_input");
    setPlanningState({ featureDescription: "" });
  }, [ralphManager]);

  // Handle plan confirmation - move to task breakdown
  const handlePlanConfirm = useCallback(() => {
    setAppState("task_breakdown");
  }, []);

  // Handle task breakdown confirmation - move to game select
  const handleTaskBreakdownConfirm = useCallback(() => {
    setAppState("game_select");
  }, []);

  // Handle going back from plan confirmation
  const handlePlanEdit = useCallback(() => {
    // Go back to planning (re-run planning)
    if (planningState.featureDescription) {
      setAppState("planning");
      ralphManager.startPlanning(planningState.featureDescription).catch(console.error);
    }
  }, [planningState.featureDescription, ralphManager]);

  // Handle game selection and start loop
  const handleGameSelect = useCallback((gameId: string) => {
    setSelectedGameId(gameId);
    setLoopStartTime(new Date());

    // Store planning result from Ralph manager in loop state
    if (ralphManager.prd) {
      const tasks: LoopTask[] = ralphManager.prd.tasks.map((t, i) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: i === 0 ? "in_progress" : "pending",
        complexity: t.complexity,
        dependsOn: t.dependsOn,
      }));

      loopState.setPrdAndTasks(
        {
          name: ralphManager.prd.name,
          description: ralphManager.prd.description,
          content: "",
          raw: ralphManager.prd,
        },
        tasks
      );
    }

    // Start the game and loop
    const gameInfo = getGameById(gameId);
    if (gameInfo) {
      setGameState({ gameId, gameName: gameInfo.info.name });
    }

    // Start the real Ralph loop execution
    ralphManager.startExecution().catch(console.error);
    setAppState("loop_running");
  }, [ralphManager, loopState, setGameState]);

  // Handle game switch during loop (from overlay)
  const handleGameSwitch = useCallback((gameId: string) => {
    setSelectedGameId(gameId);
    setShowGameSelector(false);
    const gameInfo = getGameById(gameId);
    if (gameInfo) {
      setGameState({ gameId, gameName: gameInfo.info.name });
    }
  }, [setGameState]);

  // Handle attention overlay response
  const handleAttentionResponse = useCallback((response: string) => {
    // Send response to Claude Code process
    writeLine(response);
    setLoopAlertDismissed(true);
  }, [writeLine]);

  // Handle attention skip (let Claude decide)
  const handleAttentionSkip = useCallback(() => {
    setLoopAlertDismissed(true);
  }, []);

  // Handle loop complete actions
  const handleKeepPlaying = useCallback(() => {
    setAppState("game_select");
  }, []);

  // Handle quit
  const handleQuit = useCallback(() => {
    void stop().then(() => exit());
  }, [stop, exit]);

  // Handle resume from existing loop
  const handleResume = useCallback(() => {
    setAppState("game_select");
  }, []);

  // Handle new loop from resume prompt
  const handleNewLoop = useCallback(() => {
    loopState.clear();
    setAppState("feature_input");
  }, [loopState]);

  // Handle game exit
  const handleGameExit = useCallback(() => {
    setSelectedGameId(null);
    clearGameState();
  }, [clearGameState]);

  // Handle game state change
  const handleGameStateChange = useCallback((update: GameStateUpdate) => {
    setGameState(update);
  }, [setGameState]);

  // Handle loop alert dismiss
  const handleLoopAlertDismiss = useCallback(() => {
    setLoopAlertDismissed(true);
  }, []);

  // Reset dismiss state when new attention request comes in
  useEffect(() => {
    if (ralphLoop.needsAttention) {
      setLoopAlertDismissed(false);
    }
  }, [ralphLoop.needsAttention, ralphLoop.state.userAttention.reason]);

  // Side panel visibility
  const showSidePanel = useMemo(() => {
    return terminalSize.width >= sidePanelSettings.threshold;
  }, [terminalSize.width, sidePanelSettings.threshold]);

  // Side panel tasks (converted from loop state)
  const sidePanelTasks = useMemo((): SidePanelTask[] => {
    return loopState.state.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status as SidePanelTask["status"],
    }));
  }, [loopState.state.tasks]);

  // Current activity for side panel
  const currentActivity = useMemo(() => {
    // First check Ralph manager's current task
    if (ralphManager.currentTask) {
      // Use Ralph manager's output if available
      if (ralphManager.output.length > 0) {
        const lastOutput = ralphManager.output[ralphManager.output.length - 1];
        if (lastOutput?.content && lastOutput.content.trim().length > 0) {
          // Extract meaningful content (skip ANSI codes and empty lines)
          const cleanContent = lastOutput.content.replace(/\x1b\[[0-9;]*m/g, '').trim();
          if (cleanContent.length > 0) {
            return cleanContent.slice(0, 60);
          }
        }
      }
      return `Working on: ${ralphManager.currentTask.title}`;
    }

    // Fallback to loop state
    const currentTask = loopState.state.tasks.find((t) => t.status === "in_progress");
    if (!currentTask) return undefined;
    // Use the last output line as activity description if available
    if (output.length > 0) {
      const lastOutput = output[output.length - 1];
      if (lastOutput?.content && lastOutput.content.trim().length > 0) {
        return lastOutput.content.slice(0, 60);
      }
    }
    return `Working on: ${currentTask.title}`;
  }, [ralphManager.currentTask, ralphManager.output, loopState.state.tasks, output]);

  // Activity start time (convert from ISO string to Date)
  const activityStartedAt = useMemo(() => {
    const startedAtStr = loopState.state.startedAt;
    if (!startedAtStr) return null;
    try {
      return new Date(startedAtStr);
    } catch {
      return null;
    }
  }, [loopState.state.startedAt]);

  // Game dimensions (account for side panel if shown)
  const gameDimensions = useMemo((): GameDimensions => {
    // Full screen minus status bar (2 lines)
    const panelWidth = showSidePanel ? sidePanelSettings.width : 0;
    return {
      width: terminalSize.width - panelWidth,
      height: terminalSize.height - 2,
    };
  }, [terminalSize, showSidePanel, sidePanelSettings.width]);

  // Loop attention for games
  const loopAttention = useMemo((): LoopAttention => ({
    needsAttention: ralphLoop.needsAttention && !loopAlertDismissed,
    reason: ralphLoop.state.userAttention.reason,
    type: ralphLoop.state.userAttention.type,
    prompt: ralphLoop.state.userAttention.prompt,
  }), [ralphLoop.needsAttention, ralphLoop.state.userAttention, loopAlertDismissed]);

  // Current task info for status bar
  const currentTaskInfo = useMemo(() => {
    const tasks = loopState.state.tasks;
    const currentTask = tasks.find((t) => t.status === "in_progress");
    const completedCount = tasks.filter((t) => t.status === "completed").length;
    const totalCount = tasks.length;
    const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    return {
      currentTask: currentTask?.title ?? null,
      taskNumber: currentTask ? tasks.indexOf(currentTask) + 1 : null,
      totalTasks: totalCount,
      progress,
    };
  }, [loopState.state.tasks]);

  // Map process status to loop status
  const effectiveLoopStatus = useMemo((): LoopStatus => {
    // First check Ralph manager's state
    const ralphPhase = ralphManager.state.phase;
    if (ralphPhase === "executing" || ralphPhase === "retrying") {
      return "running";
    }
    if (ralphPhase === "completed") {
      return "completed";
    }
    if (ralphPhase === "errored") {
      return "errored";
    }
    if (ralphPhase === "paused" || ralphPhase === "task_complete") {
      return "waiting";
    }

    // Fallback to legacy process status
    if (processStatus === "running") {
      if (ralphLoop.state.status === "waiting_for_input") return "waiting";
      if (ralphLoop.state.status === "completed") return "completed";
      if (ralphLoop.state.status === "errored") return "errored";
      return "running";
    }
    if (processStatus === "stopped" || processStatus === "crashed") {
      return "idle";
    }
    return "idle";
  }, [ralphManager.state.phase, processStatus, ralphLoop.state.status]);

  // Global keyboard handling
  useInput((input, key) => {
    // Ctrl+C always exits
    if (key.ctrl && input === "c") {
      void stop().then(() => exit());
      return;
    }

    // ? toggles help
    if (input === "?") {
      setShowHelp((prev) => !prev);
      return;
    }

    // Help overlay captures all other input
    if (showHelp) {
      if (key.escape) setShowHelp(false);
      return;
    }

    // Game selector overlay captures input
    if (showGameSelector) {
      if (key.escape) setShowGameSelector(false);
      return;
    }

    // G toggles game selector (only in loop_running state)
    if ((input === "g" || input === "G") && appState === "loop_running" && !showLogs) {
      setShowGameSelector((prev) => !prev);
      return;
    }

    // L toggles logs (only in loop_running state)
    if ((input === "l" || input === "L") && appState === "loop_running" && !showGameSelector) {
      setShowLogs((prev) => !prev);
      return;
    }

    // Escape closes logs
    if (key.escape && showLogs) {
      setShowLogs(false);
      return;
    }
  });

  // Render based on app state
  const renderContent = () => {
    // Help overlay takes precedence
    if (showHelp) {
      return (
        <Box position="absolute" marginTop={1} marginLeft={2}>
          <HelpOverlay hasFocus={true} onClose={() => setShowHelp(false)} />
        </Box>
      );
    }

    // Logs overlay during loop
    if (showLogs && appState === "loop_running") {
      return (
        <Box flexDirection="column" width="100%" height="100%">
          <Box borderStyle="single" borderColor={colors.primary} paddingX={2}>
            <Text bold color={colors.primary}>LOGS</Text>
            <Text dimColor> | Press L to close | Ctrl+C to stop loop</Text>
          </Box>
          <LogViewer
            logs={output}
            hasFocus={true}
            initialViewMode="condensed"
          />
          <StatusBarMinimal
            status={effectiveLoopStatus}
            currentTask={currentTaskInfo.currentTask ?? undefined}
            taskNumber={currentTaskInfo.taskNumber ?? undefined}
            totalTasks={currentTaskInfo.totalTasks}
            progress={currentTaskInfo.progress}
            needsAttention={loopAttention.needsAttention}
            width={terminalSize.width}
          />
        </Box>
      );
    }

    switch (appState) {
      case "feature_input":
        return (
          <FeatureInput
            onSubmit={handleFeatureSubmit}
            hasFocus={true}
            dimensions={terminalSize}
          />
        );

      case "planning":
        return (
          <PlanningPhase
            featureDescription={planningState.featureDescription}
            phase={ralphManager.state.phase}
            output={ralphManager.output}
            prd={ralphManager.prd}
            error={ralphManager.state.error}
            onCancel={handlePlanningCancel}
            onPlanReady={handlePlanReady}
            hasFocus={true}
            dimensions={terminalSize}
            debugMode={config.app?.debugMode ?? false}
          />
        );

      case "plan_confirmation": {
        // Convert Ralph PRD tasks to GeneratedPrd format for PreStartReviewScreen
        const generatedPrd: GeneratedPrd = {
          overview: ralphManager.prd?.description ?? "",
          requirements: [],
          technicalApproach: "",
          taskBreakdown: (ralphManager.prd?.tasks ?? []).map((t, i) => ({
            id: t.id,
            title: `${i + 1}. ${t.title}`,
            description: t.description,
            status: "pending" as const,
            complexity: t.complexity,
            dependsOn: t.dependsOn,
          })),
          successCriteria: [],
          fullContent: "",
        };
        return (
          <PreStartReviewScreen
            isVisible={true}
            generatedPrd={generatedPrd}
            featureName={ralphManager.prd?.name ?? planningState.featureDescription}
            onStart={handlePlanConfirm}
            onEditTasks={handlePlanEdit}
            hasFocus={true}
            dimensions={terminalSize}
          />
        );
      }

      case "task_breakdown": {
        // Convert Ralph PRD tasks to LoopTask format for TaskBreakdownScreen
        const tasks: LoopTask[] = (ralphManager.prd?.tasks ?? []).map((t, i) => ({
          id: t.id,
          title: `${i + 1}. ${t.title}`,
          description: t.description,
          status: "pending" as const,
          complexity: t.complexity,
          dependsOn: t.dependsOn,
        }));
        return (
          <TaskBreakdownScreen
            isVisible={true}
            tasks={tasks}
            featureName={ralphManager.prd?.name ?? planningState.featureDescription}
            onContinue={handleTaskBreakdownConfirm}
            hasFocus={true}
            dimensions={terminalSize}
          />
        );
      }

      case "game_select":
        return (
          <GameSelectScreen
            featureDescription={ralphManager.prd?.name || planningState.featureDescription || loopState.state.prd?.name || "Feature"}
            taskCount={ralphManager.totalTasks || loopState.state.tasks.length}
            onSelectGame={handleGameSelect}
            hasFocus={true}
            dimensions={terminalSize}
          />
        );

      case "loop_running":
        if (selectedGameId) {
          const gameEntry = getGameById(selectedGameId);
          if (gameEntry) {
            const GameComponent = gameEntry.component;

            // Game selector overlay
            if (showGameSelector) {
              return (
                <GameSelectorOverlay
                  currentGameId={selectedGameId}
                  onSelectGame={handleGameSwitch}
                  onViewStats={() => setShowGameSelector(false)}
                  onClose={() => setShowGameSelector(false)}
                  hasFocus={true}
                />
              );
            }

            // Attention overlay (game pauses)
            if (loopAttention.needsAttention && !loopAlertDismissed) {
              return (
                <AttentionOverlay
                  isVisible={true}
                  prompt={loopAttention.prompt ?? "Claude needs your input"}
                  type={loopAttention.type as "question" | "confirmation" | "error" | "permission" | null}
                  onSubmit={handleAttentionResponse}
                  onSkip={handleAttentionSkip}
                  hasFocus={true}
                  dimensions={terminalSize}
                />
              );
            }

            return (
              <Box flexDirection="column" width="100%" height="100%">
                <Box flexGrow={1} flexDirection="row">
                  {/* Game area */}
                  <Box width={gameDimensions.width} height={gameDimensions.height}>
                    <GameComponent
                      hasFocus={true}
                      dimensions={gameDimensions}
                      onExit={handleGameExit}
                      loopAttention={loopAttention}
                      onLoopAlertDismiss={handleLoopAlertDismiss}
                      onGameStateChange={handleGameStateChange}
                    />
                  </Box>
                  {/* Side panel (only when terminal is wide enough) */}
                  {showSidePanel && (
                    <SidePanel
                      tasks={sidePanelTasks}
                      currentActivity={currentActivity}
                      activityStartedAt={activityStartedAt}
                      width={sidePanelSettings.width}
                      height={gameDimensions.height}
                    />
                  )}
                </Box>
                <StatusBarMinimal
                  status={effectiveLoopStatus}
                  currentTask={currentTaskInfo.currentTask ?? undefined}
                  taskNumber={currentTaskInfo.taskNumber ?? undefined}
                  totalTasks={currentTaskInfo.totalTasks}
                  progress={currentTaskInfo.progress}
                  needsAttention={loopAttention.needsAttention}
                  width={terminalSize.width}
                />
              </Box>
            );
          }
        }
        // No game selected - show game selector
        return (
          <GameSelectScreen
            featureDescription={ralphManager.prd?.name || planningState.featureDescription || loopState.state.prd?.name || "Feature"}
            taskCount={ralphManager.totalTasks || loopState.state.tasks.length}
            onSelectGame={handleGameSelect}
            hasFocus={true}
            dimensions={terminalSize}
          />
        );

      case "resume_prompt":
        return (
          <ResumePrompt
            featureName={loopState.state.prd?.name ?? "Unknown feature"}
            completedTasks={loopState.state.progress.completedTasks}
            totalTasks={loopState.state.progress.totalTasks}
            lastActiveAt={activityStartedAt}
            onResume={handleResume}
            onNewLoop={handleNewLoop}
            onQuit={handleQuit}
            hasFocus={true}
            dimensions={terminalSize}
          />
        );

      case "loop_complete": {
        const loopDuration = loopStartTime
          ? Date.now() - loopStartTime.getTime()
          : 0;
        return (
          <LoopComplete
            featureName={loopState.state.prd?.name ?? "Feature"}
            tasksCompleted={loopState.state.progress.completedTasks}
            totalTasks={loopState.state.progress.totalTasks}
            durationMs={loopDuration}
            gameStats={gameStats}
            onNewLoop={handleNewLoop}
            onKeepPlaying={handleKeepPlaying}
            onQuit={handleQuit}
            hasFocus={true}
            dimensions={terminalSize}
          />
        );
      }

      default:
        return null;
    }
  };

  return renderContent();
}

// ============================================================================
// EXPORTED APP WRAPPER
// ============================================================================

export interface AppNewProps {
  cliOverrides?: Partial<BrainrotConfig>;
}

export function AppNew({ cliOverrides = {} }: AppNewProps) {
  const { config: fileConfig } = useConfig();

  return (
    <CLIOverridesContext.Provider value={cliOverrides}>
      <ThemeProvider config={fileConfig}>
        <GameStatusProvider>
          <LoopInfoProvider>
            <AppNewContent />
          </LoopInfoProvider>
        </GameStatusProvider>
      </ThemeProvider>
    </CLIOverridesContext.Provider>
  );
}

export default AppNew;
