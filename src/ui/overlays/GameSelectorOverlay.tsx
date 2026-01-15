/**
 * Game selector overlay.
 */

import { useKeyboard } from "@opentui/react";
import { useCallback, useMemo, useState } from "react";
import { useThemeColors } from "../../theme/ThemeProvider.js";
import { getGameList } from "../../games/index.js";
import Overlay from "./Overlay.js";

export interface GameSelectorOverlayProps {
  isVisible: boolean;
  hasFocus: boolean;
  onSelect: (gameId: string) => void;
  onClose: () => void;
}

const GAMES = getGameList().map((game) => ({
  id: game.id,
  name: game.name,
  description: game.description,
}));

export default function GameSelectorOverlay({
  isVisible,
  hasFocus,
  onSelect,
  onClose,
}: GameSelectorOverlayProps) {
  const colors = useThemeColors();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const current = useMemo(() => GAMES[selectedIndex], [selectedIndex]);

  useKeyboard(
    useCallback(
      (key) => {
        if (!hasFocus) return;

        if (key.name === "escape" || key.name === "q") {
          onClose();
          return;
        }

        if (key.name === "up" || key.name === "k") {
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : GAMES.length - 1));
          return;
        }

        if (key.name === "down" || key.name === "j") {
          setSelectedIndex((prev) => (prev < GAMES.length - 1 ? prev + 1 : 0));
          return;
        }

        if (key.name === "return" || key.name === "enter") {
          onSelect(current.id);
        }
      },
      [hasFocus, onClose, onSelect, current]
    )
  );

  return (
    <Overlay isVisible={isVisible} title="Select Game" width={50} height={18}>
      <box style={{ flexDirection: "column", gap: 1 }}>
        {GAMES.map((game, index) => {
          const isSelected = index === selectedIndex;
          return (
            <box key={game.id} style={{ flexDirection: "row", gap: 1 }}>
              <text fg={isSelected ? colors.primary : colors.textMuted}>
                {isSelected ? ">" : " "}
              </text>
              <text fg={isSelected ? colors.text : colors.textMuted} bold={isSelected}>
                {game.name}
              </text>
            </box>
          );
        })}

        <box style={{ marginTop: 1 }}>
          <text fg={colors.textMuted}>{current.description}</text>
        </box>

        <box style={{ marginTop: 1, flexDirection: "row", gap: 2 }}>
          <text fg={colors.textMuted}>Enter: Select</text>
          <text fg={colors.textMuted}>Esc: Close</text>
        </box>
      </box>
    </Overlay>
  );
}
