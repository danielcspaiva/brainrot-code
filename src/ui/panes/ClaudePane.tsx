/**
 * Claude output pane with streaming view.
 */

import { memo, useMemo } from "react";
import { useThemeColors } from "../../theme/ThemeProvider.js";
import type { ClaudeActivity, ClaudeOutputLine } from "../../claude/types.js";

export interface ClaudePaneProps {
  hasFocus: boolean;
  output?: ClaudeOutputLine[];
  activity?: ClaudeActivity;
  elapsedMs?: number;
}

interface RenderLine {
  id: string;
  text: string;
  color: string;
}

function formatElapsed(elapsedMs: number): string {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

const ClaudePane = memo(function ClaudePane({
  hasFocus,
  output = [],
  activity = { status: "idle", currentTool: null },
  elapsedMs = 0,
}: ClaudePaneProps) {
  const colors = useThemeColors();

  const renderLines = useMemo(() => {
    let inCodeBlock = false;

    return output.map((line) => {
      const trimmed = line.text.trim();
      if (trimmed.startsWith("```")) {
        inCodeBlock = !inCodeBlock;
        return {
          id: line.id,
          text: line.text,
          color: colors.accent,
        } as RenderLine;
      }

      let color = colors.text;
      if (line.kind === "tool") color = colors.accent;
      if (line.kind === "system") color = colors.secondary;
      if (line.kind === "result") color = colors.success;
      if (line.kind === "error") color = colors.error;
      if (inCodeBlock) color = colors.accent;

      return {
        id: line.id,
        text: line.text,
        color,
      } as RenderLine;
    });
  }, [output, colors]);

  const headerStatus =
    activity.status === "running"
      ? `RUNNING ${formatElapsed(elapsedMs)}`
      : activity.status.toUpperCase();
  const toolLabel = activity.currentTool
    ? `Tool: ${activity.currentTool}`
    : "";

  return (
    <box
      title="Claude"
      style={{
        border: true,
        borderStyle: hasFocus ? "double" : "single",
        borderColor: hasFocus ? colors.borderFocus : colors.border,
        flexGrow: 1,
        flexDirection: "column",
        padding: 1,
      }}
    >
      <box style={{ flexDirection: "row", gap: 2, marginBottom: 1 }}>
        <text fg={colors.primary} bold>
          {headerStatus}
        </text>
        {toolLabel ? <text fg={colors.textMuted}>{toolLabel}</text> : null}
      </box>

      {renderLines.length === 0 ? (
        <box
          style={{
            flexGrow: 1,
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
          }}
        >
          <text fg={colors.textMuted}>No output yet</text>
          <text fg={colors.textMuted}>
            Start a loop to stream Claude output here.
          </text>
          <text fg={colors.textMuted}>Tab: Switch focus | ?: Help</text>
        </box>
      ) : (
        <scrollbox
          stickyScroll={true}
          stickyStart="bottom"
          focused={hasFocus}
          style={{
            flexGrow: 1,
            viewportOptions: {
              backgroundColor: colors.panelBg,
            },
            contentOptions: {
              backgroundColor: colors.panelBg,
            },
          }}
        >
          {renderLines.map((line) => (
            <text key={line.id} fg={line.color}>
              {line.text}
            </text>
          ))}
        </scrollbox>
      )}
    </box>
  );
});

export default ClaudePane;
