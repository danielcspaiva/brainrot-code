/**
 * GameSelector Component
 *
 * A menu component for selecting and launching games.
 * Supports keyboard navigation with arrow keys and Enter to select.
 */

import { Box, Text, useInput } from "ink";
import { useState, useCallback } from "react";
import type { GameInfo, GameDimensions } from "./game-types.js";

export interface GameSelectorProps {
  /** Available games to select from */
  games: GameInfo[];
  /** Whether the selector has keyboard focus */
  hasFocus: boolean;
  /** Available dimensions */
  dimensions: GameDimensions;
  /** Callback when a game is selected */
  onSelectGame: (gameId: string) => void;
}

interface GameCardProps {
  game: GameInfo;
  isSelected: boolean;
  isHighlighted: boolean;
  dimensions: GameDimensions;
}

function GameCard({ game, isSelected, isHighlighted, dimensions }: GameCardProps) {
  const borderColor = isHighlighted ? "cyan" : isSelected ? "yellow" : "gray";
  const titleColor = isHighlighted ? "cyan" : isSelected ? "yellow" : "white";

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
          {isHighlighted ? "▸ " : "  "}
          {game.name}
        </Text>
      </Box>
      <Text dimColor wrap="truncate">
        {game.description}
      </Text>
      <Box marginTop={1}>
        <Text color="gray">Controls: </Text>
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
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold color="cyan">
        🎮 Select a Game
      </Text>
      <Text dimColor>
        {hasFocus
          ? "↑/↓: Navigate | Enter: Select | Q: Back to Logs"
          : "Press Tab to focus game selector"}
      </Text>
    </Box>
  );
}

function EmptyState() {
  return (
    <Box flexDirection="column" padding={2}>
      <Text color="yellow">No games available</Text>
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
}: GameSelectorProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const handleSelect = useCallback(() => {
    if (games.length > 0 && games[selectedIndex]) {
      onSelectGame(games[selectedIndex].id);
    }
  }, [games, selectedIndex, onSelectGame]);

  useInput(
    (input, key) => {
      if (!hasFocus || games.length === 0) return;

      // Navigate up
      if (key.upArrow || input === "k") {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : games.length - 1));
        return;
      }

      // Navigate down
      if (key.downArrow || input === "j") {
        setSelectedIndex((prev) => (prev < games.length - 1 ? prev + 1 : 0));
        return;
      }

      // Select game
      if (key.return || input === " ") {
        handleSelect();
        return;
      }

      // Quick select by number (1-9)
      const num = parseInt(input, 10);
      if (!isNaN(num) && num >= 1 && num <= games.length) {
        setSelectedIndex(num - 1);
        handleSelect();
        return;
      }
    },
    { isActive: hasFocus }
  );

  // Keep selected index in bounds
  if (selectedIndex >= games.length && games.length > 0) {
    setSelectedIndex(games.length - 1);
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
        </Box>
      )}

      {/* Game count indicator */}
      {games.length > 0 && (
        <Box marginTop={1}>
          <Text dimColor>
            Game {selectedIndex + 1} of {games.length}
          </Text>
        </Box>
      )}
    </Box>
  );
}

export default GameSelector;
