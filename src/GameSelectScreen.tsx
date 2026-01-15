/**
 * Game Select Screen
 *
 * Full-screen game picker that appears after Claude finishes planning.
 * User selects a game, then the loop starts and they begin playing.
 */

import { Box, Text, useInput } from "ink";
import { useState, useCallback, useMemo } from "react";
import { useThemeColors } from "./useTheme.js";
import { navIcons } from "./theme.js";
import { getGameList } from "./games/index.js";
import type { GameInfo } from "./game-types.js";

// ============================================================================
// TYPES
// ============================================================================

export interface GameSelectScreenProps {
  /** Feature being built */
  featureDescription: string;
  /** Number of tasks planned */
  taskCount: number;
  /** Callback when user selects a game and starts the loop */
  onSelectGame: (gameId: string) => void;
  /** Whether the component has focus */
  hasFocus: boolean;
  /** Terminal dimensions */
  dimensions: { width: number; height: number };
}

// ============================================================================
// GAME ITEM COMPONENT
// ============================================================================

interface GameItemProps {
  game: GameInfo;
  isSelected: boolean;
  colors: ReturnType<typeof useThemeColors>;
}

function GameItem({ game, isSelected, colors }: GameItemProps) {
  const icon = getGameIcon(game.id);

  return (
    <Box flexDirection="column" paddingY={0}>
      <Box>
        <Text color={isSelected ? colors.primary : colors.text} bold={isSelected}>
          {isSelected ? navIcons.arrowRight : " "} {icon} {game.name}
        </Text>
      </Box>
      <Box paddingLeft={4}>
        <Text dimColor>{game.description}</Text>
      </Box>
    </Box>
  );
}

function getGameIcon(gameId: string): string {
  switch (gameId) {
    case "snake":
      return "\u{1F40D}"; // snake emoji
    case "pong":
      return "\u{1F3D3}"; // ping pong emoji
    case "tetris":
      return "\u{1F9F1}"; // brick emoji
    case "minesweeper":
      return "\u{1F4A3}"; // bomb emoji
    default:
      return "\u{1F3AE}"; // video game emoji
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function GameSelectScreen({
  featureDescription,
  taskCount,
  onSelectGame,
  hasFocus,
  dimensions,
}: GameSelectScreenProps) {
  const colors = useThemeColors();
  const games = useMemo(() => getGameList(), []);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const handleSelect = useCallback(() => {
    const selectedGame = games[selectedIndex];
    if (selectedGame) {
      onSelectGame(selectedGame.id);
    }
  }, [games, selectedIndex, onSelectGame]);

  // Handle keyboard input
  useInput(
    (input, key) => {
      if (!hasFocus) return;

      // Arrow keys or j/k to navigate
      if (key.upArrow || input === "k" || input === "K") {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : games.length - 1));
        return;
      }

      if (key.downArrow || input === "j" || input === "J") {
        setSelectedIndex((prev) => (prev < games.length - 1 ? prev + 1 : 0));
        return;
      }

      // Enter or Space to select
      if (key.return || input === " ") {
        handleSelect();
        return;
      }

      // Number keys for quick selection
      const num = parseInt(input, 10);
      if (num >= 1 && num <= games.length) {
        setSelectedIndex(num - 1);
        handleSelect();
      }
    },
    { isActive: hasFocus }
  );

  // Calculate content width
  const contentWidth = useMemo(() => {
    return Math.min(55, dimensions.width - 8);
  }, [dimensions.width]);

  return (
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      width="100%"
      height="100%"
    >
      {/* Logo */}
      <Box marginBottom={1}>
        <Text bold color={colors.primary}>
          BRAINROT
        </Text>
      </Box>

      {/* Ready message */}
      <Box flexDirection="column" alignItems="center" marginBottom={2}>
        <Text color={colors.success}>Claude is ready to start working!</Text>
        <Text dimColor>Pick a game to play while you wait.</Text>
      </Box>

      {/* Game list card */}
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={colors.border}
        paddingX={2}
        paddingY={1}
        width={contentWidth}
      >
        {games.map((game, index) => (
          <GameItem
            key={game.id}
            game={game}
            isSelected={index === selectedIndex}
            colors={colors}
          />
        ))}
      </Box>

      {/* Task summary */}
      <Box flexDirection="column" alignItems="center" marginTop={2}>
        <Text dimColor>
          Task: "{featureDescription.length > 35
            ? featureDescription.slice(0, 35) + "..."
            : featureDescription}"
        </Text>
        <Text dimColor>
          {taskCount} task{taskCount !== 1 ? "s" : ""} planned {navIcons.bullet} Ready to start
        </Text>
      </Box>

      {/* Footer hints */}
      <Box
        position="absolute"
        marginTop={dimensions.height - 2}
        borderStyle="single"
        borderColor={colors.border}
        paddingX={2}
        width={dimensions.width - 4}
      >
        <Text dimColor>
          <Text color={colors.primary}>{"\u2191\u2193"}</Text>: Navigate |{" "}
          <Text color={colors.primary}>Enter</Text>: Start Loop & Play |{" "}
          <Text color={colors.primary}>?</Text>: Help
        </Text>
      </Box>
    </Box>
  );
}

export default GameSelectScreen;
