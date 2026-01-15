/**
 * Game Registry for BrainRot CLI v2 (OpenTUI)
 *
 * Central registry for all available games.
 * Games are registered here and can be retrieved by ID.
 */

import type { GameInfo, GameRegistryEntry } from "../game-types.js";

// Game registry - will be populated as games are ported
// Each game exports: <GameName>GameInfo and <GameName> component
export const gameRegistry: GameRegistryEntry[] = [
  // Games will be added here as they are ported from Ink to OpenTUI
  // Example:
  // { info: snakeGameInfo, component: SnakeGame },
  // { info: pongGameInfo, component: PongGame },
  // { info: tetrisGameInfo, component: TetrisGame },
  // { info: minesweeperGameInfo, component: MinesweeperGame },
];

/**
 * Get list of all available games
 */
export function getGameList(): GameInfo[] {
  return gameRegistry.map((entry) => entry.info);
}

/**
 * Get a game by its ID
 */
export function getGameById(id: string): GameRegistryEntry | undefined {
  return gameRegistry.find((entry) => entry.info.id === id);
}

/**
 * Check if a game exists
 */
export function hasGame(id: string): boolean {
  return gameRegistry.some((entry) => entry.info.id === id);
}

/**
 * Get total number of available games
 */
export function getGameCount(): number {
  return gameRegistry.length;
}

// Re-export types for convenience
export type { GameInfo, GameRegistryEntry } from "../game-types.js";
