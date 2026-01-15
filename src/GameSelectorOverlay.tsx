/**
 * Game Selector Overlay
 *
 * Modal overlay for switching games during the loop.
 * Triggered by pressing G key while playing.
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

export interface GameSelectorOverlayProps {
  /** Currently playing game ID */
  currentGameId: string | null;
  /** Callback when user selects a game */
  onSelectGame: (gameId: string) => void;
  /** Callback when user wants to view stats */
  onViewStats: () => void;
  /** Callback when overlay is closed */
  onClose: () => void;
  /** Whether the component has focus */
  hasFocus: boolean;
}

// ============================================================================
// GAME ITEM COMPONENT
// ============================================================================

interface GameItemProps {
  game: GameInfo;
  isSelected: boolean;
  isCurrent: boolean;
  colors: ReturnType<typeof useThemeColors>;
}

function GameItem({ game, isSelected, isCurrent, colors }: GameItemProps) {
  const icon = getGameIcon(game.id);

  return (
    <Box>
      <Text color={isSelected ? colors.primary : colors.text} bold={isSelected}>
        {isSelected ? navIcons.arrowRight : " "} {icon} {game.name}
        {isCurrent && (
          <Text dimColor> (playing)</Text>
        )}
      </Text>
    </Box>
  );
}

function getGameIcon(gameId: string): string {
  switch (gameId) {
    case "snake":
      return "\u{1F40D}";
    case "pong":
      return "\u{1F3D3}";
    case "tetris":
      return "\u{1F9F1}";
    case "minesweeper":
      return "\u{1F4A3}";
    default:
      return "\u{1F3AE}";
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function GameSelectorOverlay({
  currentGameId,
  onSelectGame,
  onViewStats,
  onClose,
  hasFocus,
}: GameSelectorOverlayProps) {
  const colors = useThemeColors();
  const games = useMemo(() => getGameList(), []);

  // Add stats option to the list
  const menuItems = useMemo(() => {
    return [
      ...games.map((g) => ({ type: "game" as const, game: g })),
      { type: "stats" as const },
    ];
  }, [games]);

  const [selectedIndex, setSelectedIndex] = useState(() => {
    // Start with current game selected
    if (currentGameId) {
      const idx = games.findIndex((g) => g.id === currentGameId);
      return idx >= 0 ? idx : 0;
    }
    return 0;
  });

  const handleSelect = useCallback(() => {
    const item = menuItems[selectedIndex];
    if (item.type === "game") {
      onSelectGame(item.game.id);
    } else {
      onViewStats();
    }
  }, [menuItems, selectedIndex, onSelectGame, onViewStats]);

  // Handle keyboard input
  useInput(
    (input, key) => {
      if (!hasFocus) return;

      // Escape to close
      if (key.escape) {
        onClose();
        return;
      }

      // Arrow keys or j/k to navigate
      if (key.upArrow || input === "k" || input === "K") {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : menuItems.length - 1));
        return;
      }

      if (key.downArrow || input === "j" || input === "J") {
        setSelectedIndex((prev) => (prev < menuItems.length - 1 ? prev + 1 : 0));
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
        const game = games[num - 1];
        if (game) {
          onSelectGame(game.id);
        }
      }
    },
    { isActive: hasFocus }
  );

  const overlayWidth = 40;

  return (
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      width="100%"
      height="100%"
    >
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={colors.primary}
        paddingX={2}
        paddingY={1}
        width={overlayWidth}
      >
        {/* Header */}
        <Box justifyContent="center" marginBottom={1}>
          <Text bold color={colors.primary}>SELECT GAME</Text>
        </Box>

        {/* Divider */}
        <Box marginBottom={1}>
          <Text dimColor>{"─".repeat(overlayWidth - 6)}</Text>
        </Box>

        {/* Game list */}
        {games.map((game, index) => (
          <GameItem
            key={game.id}
            game={game}
            isSelected={index === selectedIndex}
            isCurrent={game.id === currentGameId}
            colors={colors}
          />
        ))}

        {/* Divider */}
        <Box marginY={1}>
          <Text dimColor>{"─".repeat(overlayWidth - 6)}</Text>
        </Box>

        {/* Stats option */}
        <Box>
          <Text
            color={selectedIndex === games.length ? colors.primary : colors.text}
            bold={selectedIndex === games.length}
          >
            {selectedIndex === games.length ? navIcons.arrowRight : " "} Stats & Achievements
          </Text>
        </Box>

        {/* Footer hints */}
        <Box marginTop={1} justifyContent="center">
          <Text dimColor>
            {"\u2191\u2193"}: Navigate | Enter: Select | Esc: Close
          </Text>
        </Box>
      </Box>
    </Box>
  );
}

export default GameSelectorOverlay;
