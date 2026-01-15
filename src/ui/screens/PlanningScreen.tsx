/**
 * Planning screen with streaming output.
 */

import { useMemo } from "react";
import { useThemeColors } from "../../theme/ThemeProvider.js";
import type { ClaudeActivity, ClaudeOutputLine } from "../../claude/types.js";

export interface PlanningScreenProps {
  feature: string;
  output: ClaudeOutputLine[];
  activity: ClaudeActivity;
  elapsedMs: number;
  onCancel: () => void;
}

function formatElapsed(elapsedMs: number): string {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function PlanningScreen({
  feature,
  output,
  activity,
  elapsedMs,
  onCancel,
}: PlanningScreenProps) {
  const colors = useThemeColors();

  const recent = useMemo(() => output.slice(-200), [output]);

  return (
    <box
      style={{
        width: "100%",
        height: "100%",
        flexDirection: "column",
        padding: 2,
      }}
    >
      <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <text fg={colors.primary} bold>
          Planning
        </text>
        <text fg={colors.textMuted}>
          {activity.status === "running" ? `Running ${formatElapsed(elapsedMs)}` : activity.status}
        </text>
      </box>

      <box style={{ marginTop: 1 }}>
        <text fg={colors.textMuted}>Feature:</text>
        <text fg={colors.text}> {feature}</text>
      </box>

      <box
        style={{
          marginTop: 2,
          border: true,
          borderStyle: "single",
          borderColor: colors.border,
          flexGrow: 1,
          padding: 1,
        }}
      >
        {recent.length === 0 ? (
          <box
            style={{
              flexGrow: 1,
              justifyContent: "center",
              flexDirection: "column",
              gap: 1,
            }}
          >
            <text fg={colors.textMuted}>Waiting for output...</text>
            <text fg={colors.textMuted}>
              Claude is drafting the plan. This can take a moment.
            </text>
          </box>
        ) : (
          <scrollbox stickyScroll={true} stickyStart="bottom">
            {recent.map((line) => (
              <text key={line.id} fg={colors.textMuted}>
                {line.text}
              </text>
            ))}
          </scrollbox>
        )}
      </box>

      <box style={{ marginTop: 1, flexDirection: "row", gap: 2 }}>
        <text fg={colors.textMuted}>Esc: Cancel</text>
        <text fg={colors.textMuted}>Ctrl+C: Quit</text>
        <text fg={colors.textMuted}>?: Help</text>
      </box>
    </box>
  );
}
