/**
 * Loop header banner with progress and attention hints.
 */

import { useMemo } from "react";
import { useTerminalDimensions } from "@opentui/react";
import { useThemeColors } from "../theme/ThemeProvider.js";
import { truncateText } from "./text.js";

export interface LoopBannerProps {
  title: string;
  progress: { completed: number; total: number };
  currentTask?: string | null;
  attention?: boolean;
}

export default function LoopBanner({
  title,
  progress,
  currentTask,
  attention = false,
}: LoopBannerProps) {
  const colors = useThemeColors();
  const { width } = useTerminalDimensions();

  const { leftText, rightText } = useMemo(() => {
    const progressLabel =
      progress.total > 0
        ? `${progress.completed}/${progress.total} tasks`
        : "No tasks";
    const leftBase = `${title} | ${progressLabel}`.trim();

    const taskLabel = currentTask ? `Task: ${currentTask}` : "Task: -";
    const rightBase = attention ? `ATTENTION | ${taskLabel}` : taskLabel;

    const usableWidth = Math.max(0, width - 2);
    const gap = rightBase ? 1 : 0;
    const maxRight = Math.max(0, usableWidth - leftBase.length - gap);
    const nextRight =
      rightBase.length > maxRight ? truncateText(rightBase, maxRight) : rightBase;
    const usedRight = nextRight ? nextRight.length + gap : 0;
    const maxLeft = Math.max(0, usableWidth - usedRight);
    const nextLeft =
      leftBase.length > maxLeft ? truncateText(leftBase, maxLeft) : leftBase;

    return { leftText: nextLeft, rightText: nextRight };
  }, [
    attention,
    currentTask,
    progress.completed,
    progress.total,
    title,
    width,
  ]);

  return (
    <box
      style={{
        height: 1,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.statusBg,
        paddingLeft: 1,
        paddingRight: 1,
      }}
    >
      <text fg={colors.textMuted}>{leftText}</text>
      <box style={{ flexGrow: 1 }} />
      {rightText ? (
        <text fg={attention ? colors.warning : colors.textMuted} bold={attention}>
          {rightText}
        </text>
      ) : null}
    </box>
  );
}
