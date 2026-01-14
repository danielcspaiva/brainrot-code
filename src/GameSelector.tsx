/**
 * GameSelector Component
 *
 * A menu component for selecting and launching games.
 * Supports keyboard navigation with arrow keys and Enter to select.
 */

import { Box, Text, useInput } from "ink";
import { useState, useCallback, useEffect } from "react";
import type { GameInfo, GameDimensions } from "./game-types.js";
import { navIcons } from "./theme.js";
import { useThemeColors } from "./useTheme.js";
import { getAchievementCount } from "./stats.js";

export interface GameSelectorProps {
  /** Available games to select from */
  games: GameInfo[];
  /** Whether the selector has keyboard focus */
  hasFocus: boolean;
  /** Available dimensions */
  dimensions: GameDimensions;
  /** Callback when a game is selected */
  onSelectGame: (gameId: string) => void;
  /** Callback when stats menu is requested */
  onOpenStats?: () => void;
  /** Whether games are enabled (unlocked after loop start) */
  gamesEnabled?: boolean;
  /** Whether a loop is currently active */
  hasActiveLoop?: boolean;
  /** Callback when Start New Loop is selected */
  onStartNewLoop?: () => void;
  /** Callback when View Current Loop is selected */
  onViewCurrentLoop?: () => void;
}

interface GameCardProps {
  game: GameInfo;
  isSelected: boolean;
  isHighlighted: boolean;
  dimensions: GameDimensions;
  isDisabled?: boolean;
}

function GameCard({
  game,
  isSelected,
  isHighlighted,
  dimensions,
  isDisabled = false,
}: GameCardProps) {
  const colors = useThemeColors();

  // When disabled, use muted colors; otherwise use normal highlight colors
  const borderColor = isDisabled
    ? colors.border
    : isHighlighted
      ? colors.primary
      : isSelected
        ? colors.accent
        : colors.border;
  const titleColor = isDisabled
    ? colors.textMuted
    : isHighlighted
      ? colors.primary
      : isSelected
        ? colors.accent
        : colors.text;

  // Calculate card width based on available space
  const cardWidth = Math.min(Math.max(dimensions.width - 4, 30), 50);

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={borderColor}
      paddingX={1}
      width={cardWidth}
    >
      <Box>
        <Text bold color={titleColor}>
          {isHighlighted ? `${navIcons.arrowRight} ` : "  "}
          {isDisabled ? "🔒 " : ""}
          {game.name}
        </Text>
      </Box>
      <Text dimColor wrap="truncate">
        {game.description}
      </Text>
      <Box marginTop={1}>
        <Text color={colors.textMuted}>Controls: </Text>
        <Text dimColor>{game.controls}</Text>
      </Box>
      {game.minWidth && game.minHeight && (
        <Text dimColor>
          Min size: {game.minWidth}x{game.minHeight}
        </Text>
      )}
    </Box>
  );
}

function SelectorHeader({ hasFocus }: { hasFocus: boolean }) {
  const colors = useThemeColors();
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold color={colors.primary}>
        Select a Game
      </Text>
      <Text dimColor>
        {hasFocus
          ? "↑/↓: Navigate | Enter: Select | S: Stats | Q: Back"
          : "Press Tab to focus game selector"}
      </Text>
    </Box>
  );
}

interface StatsMenuCardProps {
  isHighlighted: boolean;
  dimensions: GameDimensions;
  achievementCount: { unlocked: number; total: number };
}

function StatsMenuCard({
  isHighlighted,
  dimensions,
  achievementCount,
}: StatsMenuCardProps) {
  const colors = useThemeColors();
  const borderColor = isHighlighted ? colors.warning : colors.border;
  const titleColor = isHighlighted ? colors.warning : colors.textMuted;
  const cardWidth = Math.min(Math.max(dimensions.width - 4, 30), 50);

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={borderColor}
      paddingX={1}
      width={cardWidth}
    >
      <Box>
        <Text bold color={titleColor}>
          {isHighlighted ? `${navIcons.arrowRight} ` : "  "}
          Stats & Achievements
        </Text>
      </Box>
      <Text dimColor>
        View your gameplay statistics and unlock achievements
      </Text>
      <Box marginTop={1}>
        <Text color={colors.textMuted}>Progress: </Text>
        <Text color={colors.success}>
          {achievementCount.unlocked}/{achievementCount.total} achievements
        </Text>
      </Box>
    </Box>
  );
}

interface LoopMenuCardProps {
  isHighlighted: boolean;
  dimensions: GameDimensions;
  hasActiveLoop: boolean;
}

function LoopMenuCard({
  isHighlighted,
  dimensions,
  hasActiveLoop,
}: LoopMenuCardProps) {
  const colors = useThemeColors();
  const borderColor = isHighlighted ? colors.success : colors.border;
  const titleColor = isHighlighted ? colors.success : colors.text;
  const cardWidth = Math.min(Math.max(dimensions.width - 4, 30), 50);

  const title = hasActiveLoop ? "View Current Loop" : "Start New Loop";
  const description = hasActiveLoop
    ? "View progress on your current feature development loop"
    : "Begin a new feature development loop with Claude";
  const icon = hasActiveLoop ? "📋" : "🚀";

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={borderColor}
      paddingX={1}
      width={cardWidth}
    >
      <Box>
        <Text bold color={titleColor}>
          {isHighlighted ? `${navIcons.arrowRight} ` : "  "}
          {icon} {title}
        </Text>
      </Box>
      <Text dimColor>{description}</Text>
      <Box marginTop={1}>
        <Text color={colors.textMuted}>Shortcut: </Text>
        <Text dimColor>N</Text>
      </Box>
    </Box>
  );
}

function EmptyState() {
  const colors = useThemeColors();
  return (
    <Box flexDirection="column" padding={2}>
      <Text color={colors.accent}>No games available</Text>
      <Text dimColor>Check back later for new games!</Text>
    </Box>
  );
}

/**
 * Game selector menu component
 */
export function GameSelector({
  games,
  hasFocus,
  dimensions,
  onSelectGame,
  onOpenStats,
  gamesEnabled = true,
  hasActiveLoop = false,
  onStartNewLoop,
  onViewCurrentLoop,
}: GameSelectorProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [achievementCount, setAchievementCount] = useState({
    unlocked: 0,
    total: 0,
  });
  const [showLockedMessage, setShowLockedMessage] = useState(false);
  const colors = useThemeColors();

  // Menu structure: [Loop option] + [Games] + [Stats]
  // Loop option is always at index 0
  const loopIndex = 0;
  const firstGameIndex = 1;
  const statsIndex = games.length + 1; // Stats is always last
  const totalItems = games.length + 2; // Loop option + games + stats

  // Load achievement count
  useEffect(() => {
    const loadCount = async () => {
      const count = await getAchievementCount();
      setAchievementCount(count);
    };
    void loadCount();
  }, []);

  // Clear the locked message after a timeout
  useEffect(() => {
    if (showLockedMessage) {
      const timer = setTimeout(() => {
        setShowLockedMessage(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [showLockedMessage]);

  const handleSelect = useCallback(() => {
    if (selectedIndex === loopIndex) {
      // Loop option - first item
      if (hasActiveLoop) {
        onViewCurrentLoop?.();
      } else {
        onStartNewLoop?.();
      }
    } else if (selectedIndex === statsIndex) {
      // Stats is always accessible
      onOpenStats?.();
    } else {
      // Game selection (indices are offset by 1 due to loop option)
      const gameIndex = selectedIndex - firstGameIndex;
      if (games.length > 0 && games[gameIndex]) {
        // Check if games are enabled
        if (!gamesEnabled) {
          setShowLockedMessage(true);
          return;
        }
        onSelectGame(games[gameIndex].id);
      }
    }
  }, [
    games,
    selectedIndex,
    onSelectGame,
    onOpenStats,
    statsIndex,
    gamesEnabled,
    hasActiveLoop,
    onStartNewLoop,
    onViewCurrentLoop,
  ]);

  useInput(
    (input, key) => {
      if (!hasFocus) return;

      // Navigate up
      if (key.upArrow || input === "k") {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1));
        return;
      }

      // Navigate down
      if (key.downArrow || input === "j") {
        setSelectedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0));
        return;
      }

      // Select item
      if (key.return || input === " ") {
        handleSelect();
        return;
      }

      // Quick open stats with S key
      if (input === "s" || input === "S") {
        onOpenStats?.();
        return;
      }

      // Quick trigger loop option with N key
      if (input === "n" || input === "N") {
        setSelectedIndex(loopIndex);
        if (hasActiveLoop) {
          onViewCurrentLoop?.();
        } else {
          onStartNewLoop?.();
        }
        return;
      }

      // Quick select game by number (1-9)
      const num = parseInt(input, 10);
      if (!isNaN(num) && num >= 1 && num <= games.length) {
        // Map number to game index (account for loop option at index 0)
        const gameMenuIndex = num - 1 + firstGameIndex;
        setSelectedIndex(gameMenuIndex);
        if (games[num - 1]) {
          // Check if games are enabled before quick-selecting
          if (!gamesEnabled) {
            setShowLockedMessage(true);
            return;
          }
          onSelectGame(games[num - 1].id);
        }
        return;
      }
    },
    { isActive: hasFocus }
  );

  // Keep selected index in bounds
  if (selectedIndex >= totalItems && totalItems > 0) {
    setSelectedIndex(totalItems - 1);
  }

  return (
    <Box flexDirection="column" padding={1} height="100%">
      <SelectorHeader hasFocus={hasFocus} />

      {/* Locked message notification */}
      {showLockedMessage && (
        <Box marginBottom={1} paddingX={1}>
          <Text color={colors.warning}>🔒 Start a loop to unlock games!</Text>
        </Box>
      )}

      <Box flexDirection="column" gap={1}>
        {/* Loop option - always first */}
        <LoopMenuCard
          isHighlighted={hasFocus && selectedIndex === loopIndex}
          dimensions={dimensions}
          hasActiveLoop={hasActiveLoop}
        />

        {games.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {games.map((game, index) => {
              const menuIndex = index + firstGameIndex;
              return (
                <GameCard
                  key={game.id}
                  game={game}
                  isSelected={menuIndex === selectedIndex}
                  isHighlighted={hasFocus && menuIndex === selectedIndex}
                  dimensions={dimensions}
                  isDisabled={!gamesEnabled}
                />
              );
            })}
          </>
        )}

        {/* Stats & Achievements menu item */}
        <StatsMenuCard
          isHighlighted={hasFocus && selectedIndex === statsIndex}
          dimensions={dimensions}
          achievementCount={achievementCount}
        />
      </Box>

      {/* Item count indicator */}
      {totalItems > 0 && (
        <Box marginTop={1}>
          <Text dimColor>
            {selectedIndex === loopIndex
              ? hasActiveLoop
                ? "View Current Loop"
                : "Start New Loop"
              : selectedIndex === statsIndex
                ? "Stats & Achievements"
                : `Game ${selectedIndex - firstGameIndex + 1} of ${games.length}`}
          </Text>
        </Box>
      )}
    </Box>
  );
}

export default GameSelector;
