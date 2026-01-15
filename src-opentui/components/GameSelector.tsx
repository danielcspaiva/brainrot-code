/**
 * GameSelector component for BrainRot CLI v2
 *
 * Overlay for selecting a game to play.
 * Shows available games with descriptions and controls.
 * Keyboard navigation: arrows to select, Enter to confirm, Esc to cancel.
 */

import { useState, useCallback, useEffect } from "react";
import { useKeyboard } from "@opentui/react";
import { getGameList, type GameInfo } from "../games/index.js";

export interface GameSelectorProps {
  /** Whether this selector has focus for keyboard input */
  hasFocus: boolean;
  /** Callback when a game is selected */
  onSelect: (gameId: string) => void;
  /** Callback when selector is closed without selection */
  onClose: () => void;
  /** Currently selected game ID (for highlighting) */
  currentGameId?: string | null;
}

export default function GameSelector({
  hasFocus,
  onSelect,
  onClose,
  currentGameId,
}: GameSelectorProps) {
  const games = getGameList();
  const [selectedIndex, setSelectedIndex] = useState(() => {
    // Start with current game selected if any
    if (currentGameId) {
      const index = games.findIndex((g) => g.id === currentGameId);
      return index >= 0 ? index : 0;
    }
    return 0;
  });

  // Handle keyboard navigation
  useKeyboard(
    useCallback(
      (key) => {
        if (!hasFocus) return;

        const keyName = key.name?.toLowerCase() ?? key.key?.toLowerCase() ?? "";

        // Navigate up/down
        if (keyName === "up" || keyName === "arrowup" || keyName === "k") {
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : games.length - 1));
        } else if (
          keyName === "down" ||
          keyName === "arrowdown" ||
          keyName === "j"
        ) {
          setSelectedIndex((prev) => (prev < games.length - 1 ? prev + 1 : 0));
        }
        // Select game
        else if (keyName === "return" || keyName === "enter") {
          const game = games[selectedIndex];
          if (game) {
            onSelect(game.id);
          }
        }
        // Close selector
        else if (keyName === "escape" || keyName === "esc" || keyName === "q") {
          onClose();
        }
        // Number keys for quick select (1-4)
        else if (keyName >= "1" && keyName <= "4") {
          const index = parseInt(keyName, 10) - 1;
          if (index >= 0 && index < games.length) {
            onSelect(games[index].id);
          }
        }
      },
      [hasFocus, selectedIndex, games, onSelect, onClose]
    )
  );

  // Reset selection when opening
  useEffect(() => {
    if (hasFocus && currentGameId) {
      const index = games.findIndex((g) => g.id === currentGameId);
      if (index >= 0) {
        setSelectedIndex(index);
      }
    }
  }, [hasFocus, currentGameId, games]);

  const selectedGame = games[selectedIndex];

  return (
    <box
      style={{
        flexDirection: "column",
        width: "100%",
        height: "100%",
        padding: 1,
      }}
    >
      {/* Header */}
      <box
        style={{
          flexDirection: "row",
          justifyContent: "center",
          marginBottom: 1,
        }}
      >
        <text fg="#00FFFF" bold>
          Select a Game
        </text>
      </box>

      {/* Game list */}
      <box
        style={{
          flexDirection: "column",
          border: true,
          borderStyle: "single",
          borderColor: "#444444",
          padding: 1,
          flexGrow: 1,
        }}
      >
        {games.map((game, index) => {
          const isSelected = index === selectedIndex;
          const isCurrent = game.id === currentGameId;

          return (
            <box
              key={game.id}
              style={{
                flexDirection: "row",
                backgroundColor: isSelected ? "#333333" : undefined,
                padding: 0,
              }}
            >
              {/* Selection indicator */}
              <text fg={isSelected ? "#00FF00" : "#333333"}>
                {isSelected ? "▶ " : "  "}
              </text>

              {/* Number shortcut */}
              <text fg="#666666">{index + 1}. </text>

              {/* Game name */}
              <text fg={isSelected ? "#FFFFFF" : "#AAAAAA"} bold={isSelected}>
                {game.name}
              </text>

              {/* Current game indicator */}
              {isCurrent && (
                <text fg="#00FFFF" dim>
                  {" "}
                  (current)
                </text>
              )}
            </box>
          );
        })}
      </box>

      {/* Selected game details */}
      {selectedGame && (
        <box
          style={{
            flexDirection: "column",
            border: true,
            borderStyle: "single",
            borderColor: "#555555",
            padding: 1,
            marginTop: 1,
          }}
        >
          <text fg="#00FF00" bold>
            {selectedGame.name}
          </text>
          <text fg="#AAAAAA">{selectedGame.description}</text>
          <box style={{ marginTop: 1 }}>
            <text fg="#FFFF00">Controls: </text>
            <text fg="#888888">{selectedGame.controls}</text>
          </box>
          {selectedGame.minWidth && selectedGame.minHeight && (
            <text fg="#666666" dim>
              Min size: {selectedGame.minWidth}x{selectedGame.minHeight}
            </text>
          )}
        </box>
      )}

      {/* Footer with key hints */}
      <box
        style={{
          flexDirection: "row",
          justifyContent: "center",
          marginTop: 1,
          gap: 2,
        }}
      >
        <text fg="#666666">↑↓ Navigate</text>
        <text fg="#666666">Enter Select</text>
        <text fg="#666666">1-4 Quick select</text>
        <text fg="#666666">Esc Cancel</text>
      </box>
    </box>
  );
}
