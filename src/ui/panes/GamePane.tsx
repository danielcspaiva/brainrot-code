/**
 * Placeholder game pane.
 */

import { memo } from "react";
import { useThemeColors } from "../../theme/ThemeProvider.js";
import type { ReactNode } from "react";

export interface GamePaneProps {
  hasFocus: boolean;
  gameId?: string | null;
  game?: ReactNode;
}

const GamePane = memo(function GamePane({ hasFocus, gameId, game }: GamePaneProps) {
  const colors = useThemeColors();

  return (
    <box
      title="Game"
      style={{
        border: true,
        borderStyle: hasFocus ? "double" : "single",
        borderColor: hasFocus ? colors.borderFocus : colors.border,
        flexGrow: 1,
        flexDirection: "column",
        padding: 1,
      }}
    >
      {game ? (
        <box style={{ flexGrow: 1 }}>{game}</box>
      ) : (
        <>
          <text fg={colors.primary} bold>
            {gameId ? `Selected game: ${gameId}` : "No game selected"}
          </text>
          <box
            style={{
              flexGrow: 1,
              justifyContent: "center",
              flexDirection: "column",
              gap: 1,
            }}
          >
            <text fg={colors.textMuted}>
              {gameId ? "Game not loaded yet" : "Press G to select a game"}
            </text>
            <text fg={colors.textMuted}>
              P: Pause | R: Restart | Q: Quit game
            </text>
          </box>
        </>
      )}
    </box>
  );
});

export default GamePane;
