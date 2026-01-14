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
}

interface GameCardProps {
  game: GameInfo;
  isSelected: boolean;
  isHighlighted: boolean;
  dimensions: GameDimensions;
}

function GameCard({ game, isSelected, isHighlighted, dimensions }: GameCardProps) {
  const colors = useThemeColors();
  const borderColor = isHighlighted ? colors.primary : isSelected ? colors.accent : colors.border;
  const titleColor = isHighlighted ? colors.primary : isSelected ? colors.accent : colors.text;

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

function StatsMenuCard({ isHighlighted, dimensions, achievementCount }: StatsMenuCardProps) {
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
}: GameSelectorProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [achievementCount, setAchievementCount] = useState({ unlocked: 0, total: 0 });

  // Total items: games + stats menu
  const totalItems = games.length + 1;
  const statsIndex = games.length; // Stats is always last

  // Load achievement count
  useEffect(() => {
    const loadCount = async () => {
      const count = await getAchievementCount();
      setAchievementCount(count);
    };
    void loadCount();
  }, []);

  const handleSelect = useCallback(() => {
    if (selectedIndex === statsIndex) {
      onOpenStats?.();
    } else if (games.length > 0 && games[selectedIndex]) {
      onSelectGame(games[selectedIndex].id);
    }
  }, [games, selectedIndex, onSelectGame, onOpenStats, statsIndex]);

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

      // Quick select game by number (1-9)
      const num = parseInt(input, 10);
      if (!isNaN(num) && num >= 1 && num <= games.length) {
        setSelectedIndex(num - 1);
        if (games[num - 1]) {
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

      {games.length === 0 ? (
        <EmptyState />
      ) : (
        <Box flexDirection="column" gap={1}>
          {games.map((game, index) => (
            <GameCard
              key={game.id}
              game={game}
              isSelected={index === selectedIndex}
              isHighlighted={hasFocus && index === selectedIndex}
              dimensions={dimensions}
            />
          ))}

          {/* Stats & Achievements menu item */}
          <StatsMenuCard
            isHighlighted={hasFocus && selectedIndex === statsIndex}
            dimensions={dimensions}
            achievementCount={achievementCount}
          />
        </Box>
      )}

      {/* Item count indicator */}
      {totalItems > 0 && (
        <Box marginTop={1}>
          <Text dimColor>
            {selectedIndex === statsIndex
              ? "Stats & Achievements"
              : `Game ${selectedIndex + 1} of ${games.length}`}
          </Text>
        </Box>
      )}
    </Box>
  );
}

export default GameSelector;
