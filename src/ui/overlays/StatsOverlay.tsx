/**
 * Stats and achievements overlay.
 */

import { useKeyboard } from "@opentui/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useThemeColors } from "../../theme/ThemeProvider.js";
import { getGameList } from "../../games/index.js";
import { getAchievements } from "../../data/achievements.js";
import { getGameStats, getGlobalStats, type GameStats, type GlobalStats } from "../../data/stats.js";
import Overlay from "./Overlay.js";

export interface StatsOverlayProps {
  isVisible: boolean;
  hasFocus: boolean;
  onClose: () => void;
}

type TabId = "overview" | "games" | "achievements";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "games", label: "Games" },
  { id: "achievements", label: "Achievements" },
];

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

export default function StatsOverlay({
  isVisible,
  hasFocus,
  onClose,
}: StatsOverlayProps) {
  const colors = useThemeColors();
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [gameStats, setGameStats] = useState<Record<string, GameStats>>({});
  const [achievements, setAchievements] = useState<
    Array<{ id: string; title: string; description: string; unlocked: boolean }>
  >([]);

  useEffect(() => {
    if (!isVisible) return;
    void getGlobalStats().then(setGlobalStats);
    void getAchievements().then(setAchievements);

    const loadGameStats = async () => {
      const list = getGameList();
      const entries = await Promise.all(
        list.map(async (game) => [game.id, await getGameStats(game.id)] as const)
      );
      const mapped: Record<string, GameStats> = {};
      for (const [id, stats] of entries) {
        mapped[id] = stats;
      }
      setGameStats(mapped);
    };

    void loadGameStats();
  }, [isVisible]);

  useKeyboard(
    useCallback(
      (key) => {
        if (!hasFocus) return;
        if (key.name === "escape" || key.name === "q") {
          onClose();
          return;
        }
        if (key.name === "left") {
          const index = TABS.findIndex((tab) => tab.id === activeTab);
          const next = index <= 0 ? TABS.length - 1 : index - 1;
          setActiveTab(TABS[next].id);
        }
        if (key.name === "right") {
          const index = TABS.findIndex((tab) => tab.id === activeTab);
          const next = index === TABS.length - 1 ? 0 : index + 1;
          setActiveTab(TABS[next].id);
        }
      },
      [activeTab, hasFocus, onClose]
    )
  );

  const tabLabel = useMemo(() => {
    return TABS.find((tab) => tab.id === activeTab)?.label ?? "Overview";
  }, [activeTab]);

  return (
    <Overlay isVisible={isVisible} title={`Stats - ${tabLabel}`} width={70} height={22}>
      <box style={{ flexDirection: "column", gap: 1 }}>
        <box style={{ flexDirection: "row", gap: 2 }}>
          {TABS.map((tab) => (
            <text key={tab.id} fg={tab.id === activeTab ? colors.primary : colors.textMuted}>
              {tab.label}
            </text>
          ))}
        </box>

        {activeTab === "overview" && (
          <box style={{ flexDirection: "column", gap: 1 }}>
            {globalStats ? (
              <>
                <text fg={colors.textMuted}>
                  Games played: {globalStats.totalGamesPlayed}
                </text>
                <text fg={colors.textMuted}>
                  Time played: {formatDuration(globalStats.totalTimePlayedMs)}
                </text>
                <text fg={colors.textMuted}>
                  First played: {globalStats.firstPlayed ?? "-"}
                </text>
                <text fg={colors.textMuted}>
                  Last played: {globalStats.lastPlayed ?? "-"}
                </text>
              </>
            ) : (
              <text fg={colors.textMuted}>Loading stats...</text>
            )}
          </box>
        )}

        {activeTab === "games" && (
          <scrollbox>
            {getGameList().map((game) => {
              const stats = gameStats[game.id];
              return (
                <box key={game.id} style={{ flexDirection: "column", gap: 0 }}>
                  <text fg={colors.text} bold>
                    {game.name}
                  </text>
                  <text fg={colors.textMuted}>
                    Played: {stats?.gamesPlayed ?? 0} | High: {stats?.highestScore ?? 0}
                  </text>
                  <box style={{ marginBottom: 1 }} />
                </box>
              );
            })}
            {getGameList().length === 0 ? (
              <text fg={colors.textMuted}>No games available.</text>
            ) : null}
          </scrollbox>
        )}

        {activeTab === "achievements" && (
          <scrollbox>
            {achievements.length === 0 ? (
              <text fg={colors.textMuted}>No achievements yet.</text>
            ) : (
              achievements.map((achievement) => (
                <box key={achievement.id} style={{ flexDirection: "column", gap: 0 }}>
                  <text fg={achievement.unlocked ? colors.success : colors.textMuted} bold>
                    {achievement.title}
                  </text>
                  <text fg={colors.textMuted}>{achievement.description}</text>
                  <box style={{ marginBottom: 1 }} />
                </box>
              ))
            )}
          </scrollbox>
        )}

        <text fg={colors.textMuted}>Left/Right: Tabs | Esc: Close</text>
      </box>
    </Overlay>
  );
}
