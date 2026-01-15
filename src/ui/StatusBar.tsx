/**
 * Minimal status bar placeholder.
 */

import { memo, useMemo } from "react";
import { useThemeColors } from "../theme/ThemeProvider.js";
import type { LayoutPresetId } from "./layouts.js";
import { truncateText } from "./text.js";

export interface StatusBarProps {
  focus: "claude" | "game";
  dimensions: { width: number; height: number };
  layoutId: LayoutPresetId;
  themeId: string;
  gameId?: string | null;
  gameScore?: number | null;
  gameStatus?: string | null;
}

const StatusBar = memo(function StatusBar({
  focus,
  dimensions,
  layoutId,
  themeId,
  gameId,
  gameScore,
  gameStatus,
}: StatusBarProps) {
  const colors = useThemeColors();

  const leftText = useMemo(() => {
    const parts = [
      `Focus:${focus === "claude" ? "Claude" : "Game"}`,
      `L:${layoutId}`,
      `T:${themeId}`,
    ];

    if (gameId) {
      const score = gameScore !== null && gameScore !== undefined ? ` ${gameScore}` : "";
      const status = gameStatus ? ` ${gameStatus}` : "";
      parts.push(`Game:${gameId}${score}${status}`);
    }

    return parts.join(" | ");
  }, [focus, gameId, gameScore, gameStatus, layoutId, themeId]);

  const rightText = useMemo(() => {
    const baseHints = ["Tab:Focus", "?:Help", "G:Game", "S:Settings", "V:Stats"];
    const gameHints = focus === "game" ? ["P:Pause", "R:Restart", "Q:Quit"] : [];
    const layoutHints = ["T:Theme", "Alt+L:Layout", "Alt+Left/Right:Resize"];
    return [...gameHints, ...baseHints, ...layoutHints].join(" | ");
  }, [focus]);

  const totalWidth = Math.max(0, dimensions.width - 2);
  const maxLeft = Math.max(0, Math.floor(totalWidth * 0.6));
  const trimmedLeft = truncateText(leftText, maxLeft);
  const maxRight = Math.max(0, totalWidth - trimmedLeft.length - 1);
  const trimmedRight = truncateText(rightText, maxRight);

  return (
    <box
      style={{
        height: 1,
        flexDirection: "row",
        backgroundColor: colors.statusBg,
        justifyContent: "space-between",
        paddingLeft: 1,
        paddingRight: 1,
      }}
    >
      <text fg={colors.textMuted}>{trimmedLeft}</text>
      <text fg={colors.textMuted}>{trimmedRight}</text>
    </box>
  );
});

export default StatusBar;
