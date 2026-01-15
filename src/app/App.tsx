/**
 * Root app shell with config + theme providers.
 */

import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Layout from "../ui/Layout.js";
import StatusBar from "../ui/StatusBar.js";
import ClaudePane from "../ui/panes/ClaudePane.js";
import GamePane from "../ui/panes/GamePane.js";
import TaskPane from "../ui/panes/TaskPane.js";
import LoopBanner from "../ui/LoopBanner.js";
import {
  getNextLayoutId,
  type LayoutPresetId,
} from "../ui/layouts.js";
import { ConfigProvider, useConfig } from "../data/ConfigProvider.js";
import { ThemeProvider, useTheme } from "../theme/ThemeProvider.js";
import { deepMerge, saveConfig, type BrainrotConfig } from "../data/config.js";
import { useClaudeStream } from "../claude/useClaudeStream.js";
import type { AppState, PlanDocument } from "./state.js";
import { buildPlanningPrompt, parsePlanFromOutput } from "./planning.js";
import FeatureInputScreen from "../ui/screens/FeatureInputScreen.js";
import PlanningScreen from "../ui/screens/PlanningScreen.js";
import PlanReviewScreen from "../ui/screens/PlanReviewScreen.js";
import TaskBreakdownScreen from "../ui/screens/TaskBreakdownScreen.js";
import LoopCompleteScreen from "../ui/screens/LoopCompleteScreen.js";
import ErrorScreen from "../ui/screens/ErrorScreen.js";
import HelpOverlay from "../ui/overlays/HelpOverlay.js";
import GameSelectorOverlay from "../ui/overlays/GameSelectorOverlay.js";
import AttentionOverlay from "../ui/overlays/AttentionOverlay.js";
import SettingsOverlay from "../ui/overlays/SettingsOverlay.js";
import StatsOverlay from "../ui/overlays/StatsOverlay.js";
import { useLoopState } from "../data/useLoopState.js";
import { getGameById } from "../games/index.js";
import type { GameStateUpdate, LoopAttention } from "../game-types.js";

export type FocusTarget = "claude" | "game";

interface AppShellProps {
  cliOverrides?: Partial<BrainrotConfig>;
  configPath?: string;
}

function AppShell() {
  const { width, height } = useTerminalDimensions();
  const { config, isLoading, setBaseConfig } = useConfig();
  const { themeId, nextTheme, setThemeId } = useTheme();
  const claudeStream = useClaudeStream({
    outputMode: config.claude?.outputMode ?? "stream-json",
  });
  const loopState = useLoopState();

  const [focus, setFocus] = useState<FocusTarget>("claude");
  const [layoutId, setLayoutId] = useState<LayoutPresetId>(
    config.layout?.preset ?? "default"
  );
  const [splitRatio, setSplitRatio] = useState(
    config.layout?.splitRatio ?? 0.6
  );
  const [appState, setAppState] = useState<AppState>("feature_input");
  const [feature, setFeature] = useState("");
  const [plan, setPlan] = useState<PlanDocument | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showGameSelector, setShowGameSelector] = useState(false);
  const [attentionPrompt, setAttentionPrompt] = useState<string | null>(null);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameStateUpdate | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [loopStartedAt, setLoopStartedAt] = useState<number | null>(null);
  const lastOutputIndexRef = useRef(0);

  useEffect(() => {
    if (!isLoading) {
      setLayoutId(config.layout?.preset ?? "default");
      setSplitRatio(config.layout?.splitRatio ?? 0.6);
    }
  }, [config.layout?.preset, config.layout?.splitRatio, isLoading]);

  const resizeStep = config.layout?.resizeStep ?? 0.05;
  const minRatio = config.layout?.minRatio ?? 0.2;
  const maxRatio = config.layout?.maxRatio ?? 0.8;
  const autoPauseEnabled = config.app?.autoPauseOnInput ?? true;

  const claudeOptions = useMemo(
    () => ({
      executablePath: config.claude?.executablePath ?? "claude",
      args: config.claude?.defaultArgs ?? [],
      cwd: config.claude?.workingDirectory,
      outputMode: config.claude?.outputMode ?? "stream-json",
    }),
    [
      config.claude?.defaultArgs,
      config.claude?.executablePath,
      config.claude?.outputMode,
      config.claude?.workingDirectory,
    ]
  );

  const applyConfigUpdates = useCallback(
    (updates: Partial<BrainrotConfig>) => {
      const next = deepMerge(config, updates);
      setBaseConfig(next);
      void saveConfig(next);
    },
    [config, setBaseConfig]
  );

  useEffect(() => {
    if (appState !== "planning") return;
    if (claudeStream.status === "stopped") {
      const combined = claudeStream.output.map((line) => line.text).join("\n");
      const parsed = parsePlanFromOutput(combined);
      if (parsed) {
        setPlan(parsed);
        setAppState("plan_review");
        return;
      }
      setErrorMessage("Failed to parse plan from Claude output.");
      setAppState("error");
    }
    if (claudeStream.status === "crashed") {
      setErrorMessage("Claude process crashed during planning.");
      setAppState("error");
    }
  }, [appState, claudeStream.status, claudeStream.output]);

  useEffect(() => {
    if (appState !== "loop_running") return;
    const output = claudeStream.output;
    if (output.length <= lastOutputIndexRef.current) return;

    const newLines = output.slice(lastOutputIndexRef.current);
    lastOutputIndexRef.current = output.length;

    for (const line of newLines) {
      const text = line.text.toLowerCase();
      if (text.includes("task complete") || text.includes("completed task")) {
        const current = loopState.state.tasks.find(
          (task) => task.status === "in_progress"
        );
        if (current) {
          void loopState.updateTask(current.id, { status: "completed" });
        }
        const next = loopState.state.tasks.find(
          (task) => task.status === "pending"
        );
        if (next) {
          void loopState.updateTask(next.id, { status: "in_progress" });
        }
      }
      if (
        attentionPrompt === null &&
        (text.includes("please provide") ||
          text.includes("need your input") ||
          text.includes("what would you like") ||
          text.includes("confirm") ||
          text.includes("permission"))
      ) {
        setAttentionPrompt(line.text);
      }
    }
  }, [appState, attentionPrompt, claudeStream.output, loopState]);

  useEffect(() => {
    if (appState !== "loop_running") {
      lastOutputIndexRef.current = 0;
    }
  }, [appState]);

  useEffect(() => {
    if (attentionPrompt && config.app?.autoFocusOnInput !== false) {
      setFocus("claude");
    }
  }, [attentionPrompt, config.app?.autoFocusOnInput]);

  useEffect(() => {
    if (appState !== "loop_running") return;
    if (loopState.progress.total > 0 &&
        loopState.progress.completed === loopState.progress.total) {
      setAppState("loop_complete");
    }
  }, [appState, loopState.progress]);

  const clampSplit = useCallback(
    (value: number) => Math.min(maxRatio, Math.max(minRatio, value)),
    [minRatio, maxRatio]
  );

  const overlayActive =
    showHelp ||
    showGameSelector ||
    attentionPrompt !== null ||
    showSettings ||
    showStats;

  const selectedGameEntry = selectedGameId ? getGameById(selectedGameId) : undefined;
  const GameComponent = selectedGameEntry?.component;

  const mainHeight = Math.max(1, height - 2);
  const minPaneWidth = 20;
  const leftWidth = Math.max(minPaneWidth, Math.floor(width * splitRatio) - 1);
  const rightWidth = Math.max(minPaneWidth, width - leftWidth - 1);
  const gameHeight = layoutId === "default"
    ? Math.max(10, Math.floor((mainHeight - 1) / 2))
    : mainHeight;

  const gameDimensions = useMemo(
    () => ({ width: rightWidth, height: gameHeight }),
    [rightWidth, gameHeight]
  );

  const terminalDimensions = useMemo(
    () => ({ width, height }),
    [width, height]
  );

  const loopAttention: LoopAttention = useMemo(
    () => ({
      needsAttention: attentionPrompt !== null,
      reason: attentionPrompt ? "input" : null,
      type: attentionPrompt ? "question" : null,
      prompt: attentionPrompt,
    }),
    [attentionPrompt]
  );

  const currentTaskTitle = useMemo(() => {
    const currentId = loopState.state.currentTaskId;
    if (!currentId) return null;
    return loopState.state.tasks.find((task) => task.id === currentId)?.title ?? null;
  }, [loopState.state.currentTaskId, loopState.state.tasks]);

  const loopBanner = useMemo(() => {
    const title = loopState.state.plan?.name ?? plan?.name ?? "Loop";
    return (
      <LoopBanner
        title={title}
        progress={loopState.progress}
        currentTask={currentTaskTitle}
        attention={attentionPrompt !== null}
      />
    );
  }, [
    attentionPrompt,
    currentTaskTitle,
    loopState.progress,
    loopState.state.plan?.name,
    plan?.name,
  ]);

  const handleLoopAlertDismiss = useCallback(() => {
    setAttentionPrompt(null);
  }, []);

  const handleGameStateChange = useCallback((next: GameStateUpdate) => {
    setGameState((prev) => {
      if (!prev) return next;
      if (
        prev.score === next.score &&
        prev.status === next.status &&
        prev.highScore === next.highScore
      ) {
        return prev;
      }
      return next;
    });
  }, []);

  const gameNode = useMemo(() => {
    if (!GameComponent) return null;
    return (
      <GameComponent
        hasFocus={focus === "game" && !overlayActive}
        dimensions={gameDimensions}
        onExit={() => setSelectedGameId(null)}
        loopAttention={loopAttention}
        onLoopAlertDismiss={handleLoopAlertDismiss}
        onGameStateChange={handleGameStateChange}
        autoPauseEnabled={autoPauseEnabled}
      />
    );
  }, [
    GameComponent,
    autoPauseEnabled,
    focus,
    gameDimensions,
    handleGameStateChange,
    handleLoopAlertDismiss,
    loopAttention,
    overlayActive,
  ]);

  useKeyboard(
    useCallback(
      (key) => {
        if (overlayActive) {
          if (key.name === "escape" || key.name === "q") {
            setShowHelp(false);
            setShowGameSelector(false);
            setAttentionPrompt(null);
            setShowSettings(false);
            setShowStats(false);
          }
          return;
        }

        if (key.name === "?" || key.key === "?") {
          setShowHelp(true);
          return;
        }

        if (key.ctrl && key.name === "c") {
          if (appState === "planning" || appState === "loop_running") {
            void claudeStream.stop();
            claudeStream.clear();
            setAppState("feature_input");
            return;
          }
          process.exit(0);
        }

        if (appState === "planning" && key.name === "escape") {
          void claudeStream.stop();
          claudeStream.clear();
          setAppState("feature_input");
          return;
        }

        if (appState === "loop_running" && focus === "claude" && key.name === "s") {
          setShowSettings(true);
          return;
        }

        if (appState === "loop_running" && focus === "claude" && key.name === "v") {
          setShowStats(true);
          return;
        }

        if (appState === "loop_running" && key.name === "g") {
          setShowGameSelector(true);
          return;
        }

        if (key.name === "tab") {
          setFocus((prev) => (prev === "claude" ? "game" : "claude"));
        }

        if (key.name === "t" && !key.ctrl && !key.alt && !key.shift) {
          nextTheme();
        }

        if (key.alt && key.name === "l") {
          setLayoutId((prev) => getNextLayoutId(prev));
        }

        if (key.alt && key.name === "left") {
          setSplitRatio((prev) => clampSplit(prev - resizeStep));
        }

        if (key.alt && key.name === "right") {
          setSplitRatio((prev) => clampSplit(prev + resizeStep));
        }
      },
      [
        appState,
        claudeStream,
        clampSplit,
        nextTheme,
        resizeStep,
        overlayActive,
      ]
    )
  );

  const taskHasFocus = useMemo(
    () => layoutId === "tasks-focus" && focus === "game",
    [layoutId, focus]
  );

  if (isLoading) {
    return (
      <box
        style={{
          width: "100%",
          height: "100%",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <text fg="#888888">Loading configuration...</text>
      </box>
    );
  }

  if (appState === "feature_input") {
    return (
      <>
        <FeatureInputScreen
          hasFocus={!overlayActive}
          onSubmit={(value) => {
            setFeature(value);
            setPlan(null);
            setAppState("planning");
            claudeStream.clear();
            claudeStream.spawn({
              ...claudeOptions,
              prompt: buildPlanningPrompt(value),
            });
          }}
        />
        <HelpOverlay isVisible={showHelp} hasFocus={showHelp} onClose={() => setShowHelp(false)} />
      </>
    );
  }

  if (appState === "planning") {
    return (
      <>
        <PlanningScreen
          feature={feature}
          output={claudeStream.output}
          activity={claudeStream.activity}
          elapsedMs={claudeStream.elapsedMs}
          onCancel={() => {
            void claudeStream.stop();
            claudeStream.clear();
            setAppState("feature_input");
          }}
        />
        <HelpOverlay isVisible={showHelp} hasFocus={showHelp} onClose={() => setShowHelp(false)} />
      </>
    );
  }

  if (appState === "plan_review" && plan) {
    return (
      <>
        <PlanReviewScreen
          plan={plan}
          hasFocus={!overlayActive}
          onConfirm={() => setAppState("task_breakdown")}
          onBack={() => {
            setPlan(null);
            setAppState("feature_input");
          }}
        />
        <HelpOverlay isVisible={showHelp} hasFocus={showHelp} onClose={() => setShowHelp(false)} />
      </>
    );
  }

  if (appState === "task_breakdown" && plan) {
    return (
      <>
        <TaskBreakdownScreen
          plan={plan}
          hasFocus={!overlayActive}
          onConfirm={() => {
            setLoopStartedAt(Date.now());
            const tasks = plan.tasks.map((task, index) => ({
              ...task,
              status: index === 0 ? "in_progress" : "pending",
            }));
            void loopState.setPlan(plan, tasks);
            setAppState("loop_running");
          }}
          onBack={() => setAppState("plan_review")}
        />
        <HelpOverlay isVisible={showHelp} hasFocus={showHelp} onClose={() => setShowHelp(false)} />
      </>
    );
  }

  if (appState === "loop_complete" && plan) {
    return (
      <>
        <LoopCompleteScreen
          featureName={plan.name}
          taskCount={plan.tasks.length}
          durationMs={loopStartedAt ? Date.now() - loopStartedAt : 0}
          hasFocus={!overlayActive}
          onRestart={() => {
            void loopState.clear();
            setSelectedGameId(null);
            setAppState("feature_input");
          }}
          onQuit={() => process.exit(0)}
        />
        <HelpOverlay isVisible={showHelp} hasFocus={showHelp} onClose={() => setShowHelp(false)} />
      </>
    );
  }

  if (appState === "error") {
    return (
      <>
        <ErrorScreen
          message={errorMessage ?? "Unknown error"}
          hasFocus={!overlayActive}
          onDismiss={() => {
            setErrorMessage(null);
            setPlan(null);
            setAppState("feature_input");
          }}
        />
        <HelpOverlay isVisible={showHelp} hasFocus={showHelp} onClose={() => setShowHelp(false)} />
      </>
    );
  }

  return (
    <>
      <Layout
        layoutId={layoutId}
        splitRatio={splitRatio}
        banner={loopBanner}
        claude={
          <ClaudePane
            hasFocus={focus === "claude" && !overlayActive}
            output={claudeStream.output}
            activity={claudeStream.activity}
            elapsedMs={claudeStream.elapsedMs}
          />
        }
        tasks={
          <TaskPane
            hasFocus={taskHasFocus && !overlayActive}
            tasks={loopState.state.tasks}
            currentTaskId={loopState.state.currentTaskId}
            onToggleStatus={(taskId) => void loopState.toggleTaskStatus(taskId)}
            onUpdateTask={(taskId, updates) =>
              void loopState.updateTask(taskId, updates)
            }
            onCreateTask={(title) => {
              const id = `manual-${Date.now()}`;
              void loopState.addTask({
                id,
                title,
                status: "pending",
              });
            }}
            onDeleteTask={(taskId) => void loopState.removeTask(taskId)}
          />
        }
        game={
          <GamePane
            hasFocus={focus === "game" && !overlayActive}
            gameId={selectedGameId}
            game={gameNode}
          />
        }
        status={
          <StatusBar
            focus={focus}
            dimensions={terminalDimensions}
            layoutId={layoutId}
            themeId={themeId}
            gameId={selectedGameId}
            gameScore={gameState?.score ?? null}
            gameStatus={gameState?.status ?? null}
          />
        }
      />
      <HelpOverlay isVisible={showHelp} hasFocus={showHelp} onClose={() => setShowHelp(false)} />
      <SettingsOverlay
        isVisible={showSettings}
        hasFocus={showSettings}
        themeId={themeId}
        layoutId={layoutId}
        autoPauseOnInput={autoPauseEnabled}
        onClose={() => setShowSettings(false)}
        onChangeTheme={(next) => {
          setThemeId(next);
          applyConfigUpdates({ theme: { scheme: next } });
        }}
        onChangeLayout={(next) => {
          setLayoutId(next);
          applyConfigUpdates({ layout: { preset: next } });
        }}
        onToggleAutoPause={() => {
          const current = config.app?.autoPauseOnInput ?? true;
          applyConfigUpdates({ app: { autoPauseOnInput: !current } });
        }}
      />
      <StatsOverlay
        isVisible={showStats}
        hasFocus={showStats}
        onClose={() => setShowStats(false)}
      />
      <GameSelectorOverlay
        isVisible={showGameSelector}
        hasFocus={showGameSelector}
        onSelect={(gameId) => {
          setSelectedGameId(gameId);
          setGameState(null);
          setShowGameSelector(false);
        }}
        onClose={() => setShowGameSelector(false)}
      />
      <AttentionOverlay
        isVisible={attentionPrompt !== null}
        prompt={attentionPrompt ?? ""}
        hasFocus={attentionPrompt !== null}
        onSubmit={(value) => {
          claudeStream.writeLine(value);
          setAttentionPrompt(null);
        }}
        onSkip={() => setAttentionPrompt(null)}
      />
    </>
  );
}

export default function App({ cliOverrides, configPath }: AppShellProps) {
  return (
    <ConfigProvider overrides={cliOverrides} configPath={configPath}>
      <ThemeProvider>
        <AppShell />
      </ThemeProvider>
    </ConfigProvider>
  );
}
