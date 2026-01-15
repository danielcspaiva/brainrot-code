/**
 * StatusBar component for BrainRot CLI v2
 *
 * Displays persistent status information:
 * - Loop status: iteration X/N, current task
 * - Game info: name, score
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
  score?: number;
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
  score,
}: StatusBarProps) {
  // Build loop status string
  let loopStatus = "";
  if (iteration !== undefined && maxIterations !== undefined) {
    loopStatus = `Iter ${iteration}/${maxIterations}`;
    if (currentTask) {
      loopStatus += ` | ${currentTask}`;
    }
  }

  // Build game status string
  let gameStatus = "";
  if (gameName) {
    gameStatus = gameName;
    if (score !== undefined) {
      gameStatus += `: ${score}`;
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
        {loopStatus && <text fg="#888888">{loopStatus}</text>}
      </box>

      {/* Center: Game info */}
      <box style={{ flexDirection: "row", gap: 2 }}>
        {gameStatus && <text fg="#FFFF00">{gameStatus}</text>}
        <text fg="#666666">
          {focus === "claude" ? "◀ Claude" : "Game ▶"} | {dimensions.width}x
          {dimensions.height}
        </text>
      </box>

      {/* Right: Key hints */}
      <text fg="#555555">Tab:Switch | Alt+←→:Resize | H:Hide | ESC:Exit</text>
    </box>
  );
}
