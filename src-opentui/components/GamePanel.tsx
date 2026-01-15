/**
 * GamePanel component for BrainRot CLI v2
 *
 * Container for the active game with:
 * - Border indicating focus state
 * - Game selection when no game is active
 * - Game rendering area
 */

import type { ReactNode } from "react";

export interface GamePanelProps {
  /** Whether this panel has focus */
  hasFocus: boolean;
  /** Active game component to render */
  game?: ReactNode;
  /** Name of the active game */
  gameName?: string;
  /** Current score */
  score?: number;
}

export default function GamePanel({
  hasFocus,
  game,
  gameName,
  score,
}: GamePanelProps) {
  return (
    <box
      title={gameName ? `Game: ${gameName}` : "Game"}
      style={{
        border: true,
        borderStyle: hasFocus ? "double" : "single",
        borderColor: hasFocus ? "#00FF00" : "#444444",
        flexGrow: 1,
        flexDirection: "column",
        padding: 1,
      }}
    >
      {game ? (
        <>
          {/* Game header with score */}
          {score !== undefined && (
            <box
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 1,
              }}
            >
              <text fg="#00FF00" bold>
                {gameName}
              </text>
              <text fg="#FFFF00">Score: {score}</text>
            </box>
          )}

          {/* Game content */}
          <box style={{ flexGrow: 1 }}>{game}</box>
        </>
      ) : (
        /* No game selected - show selection prompt */
        <box
          style={{
            flexGrow: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <text fg="#888888">No game selected</text>
          <text fg="#666666">Press G to open game selector</text>
          <box style={{ marginTop: 2 }}>
            <text fg="#555555">Available games:</text>
            <text fg="#444444">• Snake</text>
            <text fg="#444444">• Pong</text>
            <text fg="#444444">• Tetris</text>
            <text fg="#444444">• Minesweeper</text>
          </box>
        </box>
      )}

      {/* Focus indicator */}
      {hasFocus && (
        <box
          style={{
            borderTop: true,
            borderColor: "#444444",
            marginTop: 1,
            paddingTop: 1,
          }}
        >
          <text fg="#666666">
            {game ? "Use arrow keys to play" : "Press G to select a game"}
          </text>
        </box>
      )}
    </box>
  );
}
