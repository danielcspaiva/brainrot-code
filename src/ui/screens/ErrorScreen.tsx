/**
 * Simple error screen.
 */

import { useKeyboard } from "@opentui/react";
import { useCallback } from "react";
import { useThemeColors } from "../../theme/ThemeProvider.js";

export interface ErrorScreenProps {
  message: string;
  hasFocus: boolean;
  onDismiss: () => void;
}

export default function ErrorScreen({
  message,
  hasFocus,
  onDismiss,
}: ErrorScreenProps) {
  const colors = useThemeColors();

  useKeyboard(
    useCallback(
      (key) => {
        if (!hasFocus) return;
        if (key.name === "escape" || key.name === "return") {
          onDismiss();
        }
      },
      [hasFocus, onDismiss]
    )
  );

  return (
    <box
      style={{
        width: "100%",
        height: "100%",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 1,
      }}
    >
      <text fg={colors.error} bold>
        Error
      </text>
      <text fg={colors.textMuted}>{message}</text>
      <text fg={colors.textMuted}>Press Enter or Esc to return</text>
    </box>
  );
}
