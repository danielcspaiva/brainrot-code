/**
 * StatusBar component for BrainRot CLI v2
 *
 * Displays persistent status information:
 * - Loop status: iteration X/N, current task
 * - Game info: name, score, status
 * - Theme indicator
 * - Key hints
 */

export interface StatusBarProps {
  /** Current application state label */
  stateLabel: string;
  /** Color for state display */
  stateColor: string;
  /** Current focus target */
  focus: "claude" | "game";
  /** Terminal dimensions */
  dimensions: { width: number; height: number };
  /** Current iteration number */
  iteration?: number;
  /** Maximum iterations */
  maxIterations?: number;
  /** Current task name */
  currentTask?: string;
  /** Active game name */
  gameName?: string;
  /** Current game score */
  gameScore?: number;
  /** Current game status */
  gameStatus?: "playing" | "paused" | "game_over" | "menu" | null;
  /** Current theme ID */
  themeId?: string;
}

export default function StatusBar({
  stateLabel,
  stateColor,
  focus,
  dimensions,
  iteration,
  maxIterations,
  currentTask,
  gameName,
  gameScore,
  gameStatus,
  themeId,
}: StatusBarProps) {
  // Build loop status string
  let loopStatusStr = "";
  if (iteration !== undefined && maxIterations !== undefined) {
    loopStatusStr = `Iter ${iteration}/${maxIterations}`;
    if (currentTask) {
      loopStatusStr += ` | ${currentTask}`;
    }
  }

  // Build game status string
  let gameStatusStr = "";
  if (gameName) {
    gameStatusStr = gameName;
    if (gameScore !== undefined) {
      gameStatusStr += `: ${gameScore}`;
    }
    if (gameStatus === "paused") {
      gameStatusStr += " [PAUSED]";
    } else if (gameStatus === "game_over") {
      gameStatusStr += " [GAME OVER]";
    }
  }

  return (
    <box
      style={{
        height: 1,
        flexDirection: "row",
        backgroundColor: "#222222",
        justifyContent: "space-between",
        paddingLeft: 1,
        paddingRight: 1,
      }}
    >
      {/* Left: State and loop info */}
      <box style={{ flexDirection: "row", gap: 2 }}>
        <text fg={stateColor}>[{stateLabel}]</text>
        {loopStatusStr && <text fg="#888888">{loopStatusStr}</text>}
      </box>

      {/* Center: Game info and focus */}
      <box style={{ flexDirection: "row", gap: 2 }}>
        {gameStatusStr && <text fg="#FFFF00">{gameStatusStr}</text>}
        <text fg="#666666">
          {focus === "claude" ? "◀ Claude" : "Game ▶"} | {dimensions.width}x
          {dimensions.height}
        </text>
        {themeId && <text fg="#555555">[{themeId}]</text>}
      </box>

      {/* Right: Key hints */}
      <text fg="#555555">Tab:Switch | G:Games | T:Theme | ESC:Exit</text>
    </box>
  );
}
