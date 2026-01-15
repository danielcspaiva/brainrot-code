/**
 * Help overlay.
 */

import { useKeyboard } from "@opentui/react";
import { useCallback } from "react";
import { KEYBINDINGS } from "../../app/keybindings.js";
import { useThemeColors } from "../../theme/ThemeProvider.js";
import Overlay from "./Overlay.js";

export interface HelpOverlayProps {
  isVisible: boolean;
  hasFocus: boolean;
  onClose: () => void;
}

export default function HelpOverlay({
  isVisible,
  hasFocus,
  onClose,
}: HelpOverlayProps) {
  const colors = useThemeColors();

  useKeyboard(
    useCallback(
      (key) => {
        if (!hasFocus) return;
        if (key.name === "escape" || key.name === "q") {
          onClose();
        }
      },
      [hasFocus, onClose]
    )
  );

  return (
    <Overlay isVisible={isVisible} title="Help">
      <box style={{ flexDirection: "column", gap: 1 }}>
        <text fg={colors.primary} bold>
          Global
        </text>
        {KEYBINDINGS.global.map((binding) => (
          <text key={binding.key} fg={colors.textMuted}>
            {binding.key}: {binding.action}
          </text>
        ))}

        <text fg={colors.primary} bold>
          Loop
        </text>
        {KEYBINDINGS.loop.map((binding) => (
          <text key={binding.key} fg={colors.textMuted}>
            {binding.key}: {binding.action}
          </text>
        ))}

        <text fg={colors.primary} bold>
          Games
        </text>
        {KEYBINDINGS.games.map((binding) => (
          <text key={binding.key} fg={colors.textMuted}>
            {binding.key}: {binding.action}
          </text>
        ))}

        <text fg={colors.primary} bold>
          Tasks
        </text>
        {KEYBINDINGS.tasks.map((binding) => (
          <text key={binding.key} fg={colors.textMuted}>
            {binding.key}: {binding.action}
          </text>
        ))}

        <box style={{ marginTop: 1 }}>
          <text fg={colors.textMuted}>Esc: Close</text>
        </box>
      </box>
    </Overlay>
  );
}
