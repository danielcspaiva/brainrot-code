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
import { ClaudeChat, type ChatMessage } from "./ClaudeChat.js";
import { GameSelectScreen } from "./GameSelectScreen.js";
import { StatusBarMinimal, type LoopStatus } from "./StatusBarMinimal.js";
import { SidePanel, type Task as SidePanelTask } from "./SidePanel.js";
import { GameSelectorOverlay } from "./GameSelectorOverlay.js";
import { AttentionOverlay } from "./AttentionOverlay.js";
import { LoopComplete, type GameSessionStats } from "./LoopComplete.js";
import { ResumePrompt } from "./ResumePrompt.js";

// ============================================================================
// TYPES
// ============================================================================

type AppState =
  | "feature_input"
  | "claude_planning"
  | "game_select"
  | "loop_running"
  | "loop_complete"
  | "resume_prompt";

interface PlanningState {
  featureDescription: string;
  messages: ChatMessage[];
  isThinking: boolean;
  progress: number;
  taskCount: number;
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

  // Claude Code process
  const { status: processStatus, output, spawn, stop } = useClaudeCode(claudeCodeOptions);
  const ralphLoop = useRalphLoopWithClaudeOutput(output);

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
    messages: [],
    isThinking: false,
    progress: 0,
    taskCount: 0,
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

  // Handle feature submission
  const handleFeatureSubmit = useCallback((feature: string) => {
    setPlanningState((prev) => ({
      ...prev,
      featureDescription: feature,
      isThinking: true,
      progress: 10,
    }));
    setAppState("claude_planning");

    // TODO: Actually start Claude Code in plan mode
    // For now, simulate some planning steps
    setTimeout(() => {
      setPlanningState((prev) => ({
        ...prev,
        messages: [
          {
            role: "assistant",
            content: "I'll help you build this feature. Let me understand the codebase first...",
            isWaitingForInput: false,
          },
        ],
        progress: 30,
      }));
    }, 1000);

    setTimeout(() => {
      setPlanningState((prev) => ({
        ...prev,
        messages: [
          ...prev.messages,
          {
            role: "assistant",
            content: "Do you have any specific requirements or constraints I should know about?",
            isWaitingForInput: true,
          },
        ],
        isThinking: false,
        progress: 50,
      }));
    }, 2500);
  }, []);

  // Handle planning answer
  const handlePlanningAnswer = useCallback((answer: string) => {
    setPlanningState((prev) => ({
      ...prev,
      messages: [
        ...prev.messages,
        { role: "user", content: answer },
      ],
      isThinking: true,
      progress: prev.progress + 20,
    }));

    // Simulate completion of planning
    setTimeout(() => {
      setPlanningState((prev) => ({
        ...prev,
        messages: [
          ...prev.messages,
          {
            role: "assistant",
            content: "Great! I've analyzed your codebase and created a plan with 5 tasks. Ready to start!",
            isWaitingForInput: false,
          },
        ],
        isThinking: false,
        progress: 100,
        taskCount: 5,
      }));

      // Transition to game select after a brief delay
      setTimeout(() => {
        setAppState("game_select");
      }, 1500);
    }, 2000);
  }, []);

  // Handle planning cancel
  const handlePlanningCancel = useCallback(() => {
    setAppState("feature_input");
    setPlanningState({
      featureDescription: "",
      messages: [],
      isThinking: false,
      progress: 0,
      taskCount: 0,
    });
  }, []);

  // Handle game selection and start loop
  const handleGameSelect = useCallback((gameId: string) => {
    setSelectedGameId(gameId);
    setLoopStartTime(new Date());

    // Store planning result in loop state
    loopState.setPrdAndTasks(
      {
        name: planningState.featureDescription,
        description: "Feature implementation",
        content: "",
        raw: null,
      },
      Array.from({ length: planningState.taskCount }, (_, i) => ({
        id: `task-${i + 1}`,
        title: `Task ${i + 1}`,
        status: i === 0 ? "in_progress" : "pending",
        complexity: "medium",
      }))
    );

    // Start the game and loop
    const gameInfo = getGameById(gameId);
    if (gameInfo) {
      setGameState({ gameId, gameName: gameInfo.info.name });
    }
    spawn();
    setAppState("loop_running");
  }, [planningState, loopState, setGameState, spawn]);

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
    // TODO: Send response to Claude Code process
    console.log("User response:", response);
    setLoopAlertDismissed(true);
  }, []);

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
  }, [loopState.state.tasks, output]);

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
  }, [processStatus, ralphLoop.state.status]);

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

      case "claude_planning":
        return (
          <ClaudeChat
            featureDescription={planningState.featureDescription}
            messages={planningState.messages}
            isThinking={planningState.isThinking}
            progress={planningState.progress}
            onSubmitAnswer={handlePlanningAnswer}
            onCancel={handlePlanningCancel}
            hasFocus={true}
            dimensions={terminalSize}
          />
        );

      case "game_select":
        return (
          <GameSelectScreen
            featureDescription={planningState.featureDescription || loopState.state.prd?.name || "Feature"}
            taskCount={planningState.taskCount || loopState.state.tasks.length}
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
            featureDescription={planningState.featureDescription || loopState.state.prd?.name || "Feature"}
            taskCount={planningState.taskCount || loopState.state.tasks.length}
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

export function AppNew() {
  const { config: fileConfig } = useConfig();

  return (
    <ThemeProvider config={fileConfig}>
      <GameStatusProvider>
        <LoopInfoProvider>
          <AppNewContent />
        </LoopInfoProvider>
      </GameStatusProvider>
    </ThemeProvider>
  );
}

export default AppNew;
