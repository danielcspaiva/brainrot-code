/**
 * Loop completion screen.
 */

import { useKeyboard } from "@opentui/react";
import { useCallback } from "react";
import { useThemeColors } from "../../theme/ThemeProvider.js";

export interface LoopCompleteScreenProps {
  featureName: string;
  taskCount: number;
  durationMs: number;
  hasFocus: boolean;
  onRestart: () => void;
  onQuit: () => void;
}

function formatElapsed(elapsedMs: number): string {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function LoopCompleteScreen({
  featureName,
  taskCount,
  durationMs,
  hasFocus,
  onRestart,
  onQuit,
}: LoopCompleteScreenProps) {
  const colors = useThemeColors();

  useKeyboard(
    useCallback(
      (key) => {
        if (!hasFocus) return;
        if (key.name === "return" || key.name === "enter") {
          onRestart();
        }
        if (key.name === "escape") {
          onQuit();
        }
      },
      [hasFocus, onRestart, onQuit]
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
      <text fg={colors.success} bold>
        Loop Complete
      </text>
      <text fg={colors.text}>{featureName}</text>
      <text fg={colors.textMuted}>Tasks completed: {taskCount}</text>
      <text fg={colors.textMuted}>Duration: {formatElapsed(durationMs)}</text>

      <box style={{ marginTop: 1, flexDirection: "row", gap: 2 }}>
        <text fg={colors.textMuted}>Enter: New loop</text>
        <text fg={colors.textMuted}>Esc: Quit</text>
      </box>
    </box>
  );
}
