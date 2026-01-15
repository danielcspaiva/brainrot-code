/**
 * Stats & Achievements Menu Component
 *
 * Displays gameplay statistics and achievements in a tabbed interface.
 * Accessible from the main game selector menu.
 */

import { Box, Text, useInput } from "ink";
import { useState, useEffect, useMemo, useCallback } from "react";
import { navIcons } from "./theme.js";
import { useThemeColors } from "./useTheme.js";
import {
  type GlobalStats,
  type GameStats,
  type Achievement,
  getAllStats,
  formatDuration,
  formatStatsDate,
} from "./stats.js";
import { useAchievements } from "./use-stats.js";
import { ProgressBar, Divider } from "./styled-components.js";

// ============================================================================
// TYPES
// ============================================================================

type StatsTab = "overview" | "games" | "achievements";

export interface StatsMenuProps {
  /** Whether the menu has focus */
  hasFocus: boolean;
  /** Callback to close the menu */
  onClose: () => void;
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface TabHeaderProps {
  tabs: { id: StatsTab; label: string }[];
  activeTab: StatsTab;
}

function TabHeader({ tabs, activeTab }: TabHeaderProps) {
  const colors = useThemeColors();
  return (
    <Box marginBottom={1}>
      {tabs.map((tab, index) => (
        <Box key={tab.id}>
          {index > 0 && <Text dimColor> | </Text>}
          <Text
            bold={activeTab === tab.id}
            color={activeTab === tab.id ? colors.primary : colors.textMuted}
          >
            {activeTab === tab.id ? `[${tab.label}]` : tab.label}
          </Text>
        </Box>
      ))}
    </Box>
  );
}

interface StatRowProps {
  label: string;
  value: string | number;
  color?: string;
}

function StatRow({ label, value, color }: StatRowProps) {
  const colors = useThemeColors();
  return (
    <Box>
      <Text dimColor>{label}: </Text>
      <Text bold color={color ?? colors.accent}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </Text>
    </Box>
  );
}

// ============================================================================
// TAB CONTENT COMPONENTS
// ============================================================================

interface OverviewTabProps {
  globalStats: GlobalStats;
  achievementProgress: { unlocked: number; total: number };
}

function OverviewTab({ globalStats, achievementProgress }: OverviewTabProps) {
  const colors = useThemeColors();

  return (
    <Box flexDirection="column" gap={1}>
      <Box marginBottom={1}>
        <Text bold color={colors.primary}>
          {navIcons.arrowRight} Global Statistics
        </Text>
      </Box>

      <Box flexDirection="column" paddingLeft={2}>
        <StatRow
          label="Total Games Played"
          value={globalStats.totalGamesPlayed}
        />
        <StatRow
          label="Total Time Played"
          value={formatDuration(globalStats.totalTimePlayed)}
        />
        <StatRow
          label="First Played"
          value={formatStatsDate(globalStats.firstPlayed)}
        />
        <StatRow
          label="Last Played"
          value={formatStatsDate(globalStats.lastPlayed)}
        />
      </Box>

      <Box marginTop={1} marginBottom={1}>
        <Divider width={40} label="Streaks" />
      </Box>

      <Box flexDirection="column" paddingLeft={2}>
        <StatRow
          label="Current Streak"
          value={`${globalStats.currentStreak} day${globalStats.currentStreak !== 1 ? "s" : ""}`}
          color={globalStats.currentStreak > 0 ? colors.success : undefined}
        />
        <StatRow
          label="Best Streak"
          value={`${globalStats.bestStreak} day${globalStats.bestStreak !== 1 ? "s" : ""}`}
          color={colors.warning}
        />
      </Box>

      <Box marginTop={1} marginBottom={1}>
        <Divider width={40} label="Achievements" />
      </Box>

      <Box flexDirection="column" paddingLeft={2}>
        <Box>
          <Text dimColor>Progress: </Text>
          <Text bold color={colors.primary}>
            {achievementProgress.unlocked}/{achievementProgress.total}
          </Text>
        </Box>
        <Box marginTop={1}>
          <ProgressBar
            percentage={
              (achievementProgress.unlocked / achievementProgress.total) * 100
            }
            width={30}
          />
        </Box>
      </Box>
    </Box>
  );
}

interface GamesTabProps {
  gameStats: Record<string, GameStats>;
  selectedIndex: number;
}

const GAME_IDS = ["snake", "pong", "tetris", "minesweeper"];
const GAME_NAMES: Record<string, string> = {
  snake: "Snake",
  pong: "Pong",
  tetris: "Tetris",
  minesweeper: "Minesweeper",
};

function GamesTab({ gameStats, selectedIndex }: GamesTabProps) {
  const colors = useThemeColors();
  const selectedGame = GAME_IDS[selectedIndex];
  const stats = gameStats[selectedGame] ?? {
    gamesPlayed: 0,
    timePlayed: 0,
    highestScore: 0,
    totalScore: 0,
    wins: 0,
    losses: 0,
    lastPlayed: null,
  };

  return (
    <Box flexDirection="column">
      {/* Game selector */}
      <Box marginBottom={1}>
        {GAME_IDS.map((gameId, index) => (
          <Box key={gameId}>
            {index > 0 && <Text> </Text>}
            <Text
              bold={index === selectedIndex}
              color={
                index === selectedIndex ? colors.primary : colors.textMuted
              }
            >
              {index === selectedIndex
                ? `[${GAME_NAMES[gameId]}]`
                : GAME_NAMES[gameId]}
            </Text>
          </Box>
        ))}
      </Box>

      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={colors.border}
        paddingX={2}
        paddingY={1}
      >
        <Box marginBottom={1}>
          <Text bold color={colors.primary}>
            {GAME_NAMES[selectedGame]} Statistics
          </Text>
        </Box>

        <StatRow label="Games Played" value={stats.gamesPlayed} />
        <StatRow label="Time Played" value={formatDuration(stats.timePlayed)} />
        <StatRow
          label="Highest Score"
          value={stats.highestScore}
          color={colors.warning}
        />
        <StatRow label="Total Score" value={stats.totalScore} />

        {(selectedGame === "pong" || selectedGame === "minesweeper") && (
          <>
            <StatRow label="Wins" value={stats.wins} color={colors.success} />
            <StatRow label="Losses" value={stats.losses} color={colors.error} />
            {stats.wins + stats.losses > 0 && (
              <StatRow
                label="Win Rate"
                value={`${Math.round((stats.wins / (stats.wins + stats.losses)) * 100)}%`}
              />
            )}
          </>
        )}

        {selectedGame === "tetris" &&
          stats.custom?.linesCleared !== undefined && (
            <StatRow label="Lines Cleared" value={stats.custom.linesCleared} />
          )}

        {selectedGame === "minesweeper" &&
          stats.custom?.fastestWin !== undefined && (
            <StatRow
              label="Fastest Win"
              value={`${stats.custom.fastestWin}s`}
              color={colors.info}
            />
          )}

        <Box marginTop={1}>
          <StatRow
            label="Last Played"
            value={formatStatsDate(stats.lastPlayed)}
          />
        </Box>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>Use ←→ arrows to switch games</Text>
      </Box>
    </Box>
  );
}

interface AchievementsTabProps {
  achievements: Array<
    Achievement & { unlocked: boolean; unlockedAt: string | null }
  >;
  selectedIndex: number;
  scrollOffset: number;
}

function AchievementsTab({
  achievements,
  selectedIndex,
  scrollOffset,
}: AchievementsTabProps) {
  const colors = useThemeColors();
  const maxVisible = 8;

  // Group achievements by category
  const grouped = useMemo(() => {
    const groups: Record<string, typeof achievements> = {
      general: [],
      snake: [],
      pong: [],
      tetris: [],
      minesweeper: [],
    };
    for (const a of achievements) {
      groups[a.category].push(a);
    }
    return groups;
  }, [achievements]);

  // Flatten for navigation
  const flatList = useMemo(() => {
    const items: Array<
      | { type: "header"; category: string }
      | { type: "achievement"; data: (typeof achievements)[0] }
    > = [];

    for (const category of [
      "general",
      "snake",
      "pong",
      "tetris",
      "minesweeper",
    ]) {
      if (grouped[category].length > 0) {
        items.push({ type: "header", category });
        for (const a of grouped[category]) {
          items.push({ type: "achievement", data: a });
        }
      }
    }
    return items;
  }, [grouped]);

  const visibleItems = flatList.slice(scrollOffset, scrollOffset + maxVisible);

  const categoryNames: Record<string, string> = {
    general: "General",
    snake: "Snake",
    pong: "Pong",
    tetris: "Tetris",
    minesweeper: "Minesweeper",
  };

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color={colors.primary}>
          {navIcons.arrowRight} Achievements (
          {achievements.filter((a) => a.unlocked).length}/{achievements.length})
        </Text>
      </Box>

      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={colors.border}
        paddingX={1}
        paddingY={1}
        minHeight={maxVisible + 2}
      >
        {visibleItems.map((item, index) => {
          const actualIndex = scrollOffset + index;

          if (item.type === "header") {
            return (
              <Box
                key={`header-${item.category}`}
                marginY={actualIndex > 0 ? 1 : 0}
              >
                <Text bold color={colors.secondary}>
                  {categoryNames[item.category]}
                </Text>
              </Box>
            );
          }

          const achievement = item.data;
          const isSelected = actualIndex === selectedIndex;

          return (
            <Box key={achievement.id}>
              <Text
                color={
                  isSelected
                    ? colors.primary
                    : achievement.unlocked
                      ? colors.success
                      : colors.textMuted
                }
              >
                {isSelected ? navIcons.arrowRight : " "}
                {achievement.unlocked ? achievement.icon : "?"}{" "}
                {achievement.hidden && !achievement.unlocked
                  ? "???"
                  : achievement.name}
                {achievement.unlocked && (
                  <Text dimColor>
                    {" "}
                    - {formatStatsDate(achievement.unlockedAt)}
                  </Text>
                )}
              </Text>
            </Box>
          );
        })}
      </Box>

      {/* Selected achievement details */}
      {flatList[selectedIndex]?.type === "achievement" && (
        <Box
          marginTop={1}
          flexDirection="column"
          borderStyle="round"
          borderColor={colors.border}
          paddingX={2}
          paddingY={1}
        >
          {(() => {
            const item = flatList[selectedIndex];
            if (item.type !== "achievement") return null;
            const achievement = item.data;
            return (
              <>
                <Box>
                  <Text
                    bold
                    color={
                      achievement.unlocked ? colors.success : colors.textMuted
                    }
                  >
                    {achievement.icon} {achievement.name}
                  </Text>
                </Box>
                <Box>
                  <Text dimColor>{achievement.description}</Text>
                </Box>
                {achievement.unlocked && (
                  <Box marginTop={1}>
                    <Text color={colors.success}>
                      Unlocked: {formatStatsDate(achievement.unlockedAt)}
                    </Text>
                  </Box>
                )}
              </>
            );
          })()}
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor>Use ↑↓ arrows to navigate</Text>
      </Box>
    </Box>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function StatsMenu({ hasFocus, onClose }: StatsMenuProps) {
  const [activeTab, setActiveTab] = useState<StatsTab>("overview");
  const [globalStats, setGlobalStats] = useState<GlobalStats>({
    totalGamesPlayed: 0,
    totalTimePlayed: 0,
    achievementsUnlocked: 0,
    firstPlayed: null,
    lastPlayed: null,
    sessionCount: 0,
    currentStreak: 0,
    bestStreak: 0,
    lastStreakDate: null,
  });
  const [gameStats, setGameStats] = useState<Record<string, GameStats>>({});
  const [selectedGameIndex, setSelectedGameIndex] = useState(0);
  const [achievementIndex, setAchievementIndex] = useState(0);
  const [achievementScroll, setAchievementScroll] = useState(0);
  const colors = useThemeColors();

  const { achievements, total, unlocked } = useAchievements();

  const tabs = useMemo<{ id: StatsTab; label: string }[]>(
    () => [
      { id: "overview", label: "Overview" },
      { id: "games", label: "Games" },
      { id: "achievements", label: "Achievements" },
    ],
    []
  );

  // Load stats on mount
  useEffect(() => {
    const loadStats = async () => {
      const data = await getAllStats();
      setGlobalStats(data.global);
      setGameStats(data.games);
    };
    void loadStats();
  }, []);

  // Handle tab change
  const handleTabChange = useCallback(
    (direction: "next" | "prev") => {
      const currentIdx = tabs.findIndex((t) => t.id === activeTab);
      let newIdx: number;
      if (direction === "next") {
        newIdx = (currentIdx + 1) % tabs.length;
      } else {
        newIdx = currentIdx <= 0 ? tabs.length - 1 : currentIdx - 1;
      }
      setActiveTab(tabs[newIdx].id);
    },
    [activeTab, tabs]
  );

  // Build flat list for achievement navigation
  const achievementFlatList = useMemo(() => {
    const items: Array<{ type: "header" | "achievement"; index?: number }> = [];
    const grouped: Record<string, typeof achievements> = {
      general: [],
      snake: [],
      pong: [],
      tetris: [],
      minesweeper: [],
    };
    for (const a of achievements) {
      grouped[a.category].push(a);
    }
    for (const category of [
      "general",
      "snake",
      "pong",
      "tetris",
      "minesweeper",
    ]) {
      if (grouped[category].length > 0) {
        items.push({ type: "header" });
        for (let i = 0; i < grouped[category].length; i++) {
          items.push({ type: "achievement" });
        }
      }
    }
    return items;
  }, [achievements]);

  // Keyboard input handling
  useInput(
    (input, key) => {
      if (!hasFocus) return;

      // Close menu
      if (key.escape || input === "q" || input === "Q") {
        onClose();
        return;
      }

      // Switch tabs
      if (key.tab) {
        handleTabChange(key.shift ? "prev" : "next");
        return;
      }

      // Tab-specific navigation
      if (activeTab === "games") {
        if (key.leftArrow) {
          setSelectedGameIndex((prev) =>
            prev > 0 ? prev - 1 : GAME_IDS.length - 1
          );
        } else if (key.rightArrow) {
          setSelectedGameIndex((prev) =>
            prev < GAME_IDS.length - 1 ? prev + 1 : 0
          );
        }
      }

      if (activeTab === "achievements") {
        const maxVisible = 8;
        if (key.upArrow) {
          setAchievementIndex((prev) => {
            const newIndex =
              prev > 0 ? prev - 1 : achievementFlatList.length - 1;
            // Adjust scroll if needed
            if (newIndex < achievementScroll) {
              setAchievementScroll(newIndex);
            }
            return newIndex;
          });
        } else if (key.downArrow) {
          setAchievementIndex((prev) => {
            const newIndex =
              prev < achievementFlatList.length - 1 ? prev + 1 : 0;
            // Adjust scroll if needed
            if (newIndex >= achievementScroll + maxVisible) {
              setAchievementScroll(newIndex - maxVisible + 1);
            }
            if (newIndex === 0) {
              setAchievementScroll(0);
            }
            return newIndex;
          });
        }
      }
    },
    { isActive: hasFocus }
  );

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color={colors.primary}>
          {navIcons.arrowRight} Stats & Achievements
        </Text>
      </Box>

      {/* Tab navigation */}
      <TabHeader tabs={tabs} activeTab={activeTab} />

      {/* Tab content */}
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={colors.border}
        paddingX={1}
        paddingY={1}
      >
        {activeTab === "overview" && (
          <OverviewTab
            globalStats={globalStats}
            achievementProgress={{ unlocked, total }}
          />
        )}
        {activeTab === "games" && (
          <GamesTab gameStats={gameStats} selectedIndex={selectedGameIndex} />
        )}
        {activeTab === "achievements" && (
          <AchievementsTab
            achievements={achievements}
            selectedIndex={achievementIndex}
            scrollOffset={achievementScroll}
          />
        )}
      </Box>

      {/* Footer */}
      <Box
        marginTop={1}
        paddingTop={1}
        borderStyle="single"
        borderTop
        borderBottom={false}
        borderLeft={false}
        borderRight={false}
        borderColor={colors.border}
      >
        <Text dimColor>
          <Text color={colors.primary}>Tab</Text>: Switch sections |{" "}
          <Text color={colors.primary}>Esc/Q</Text>: Close
        </Text>
      </Box>
    </Box>
  );
}

export default StatsMenu;
