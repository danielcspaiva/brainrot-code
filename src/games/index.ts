/**
 * Game Registry
 *
 * Central registry of all available games.
 */

import type { GameRegistryEntry, GameInfo } from "../game-types.js";
import { SnakeGame, snakeGameInfo } from "./SnakeGame.js";
import { PongGame, pongGameInfo } from "./PongGame.js";
import { TetrisGame, tetrisGameInfo } from "./TetrisGame.js";
import { MinesweeperGame, minesweeperGameInfo } from "./MinesweeperGame.js";

/**
 * All available games
 */
export const gameRegistry: GameRegistryEntry[] = [
  {
    info: snakeGameInfo,
    component: SnakeGame,
  },
  {
    info: pongGameInfo,
    component: PongGame,
  },
  {
    info: tetrisGameInfo,
    component: TetrisGame,
  },
  {
    info: minesweeperGameInfo,
    component: MinesweeperGame,
  },
];

/**
 * Get list of all game info for the selector
 */
export function getGameList(): GameInfo[] {
  return gameRegistry.map((entry) => entry.info);
}

/**
 * Get a game by ID
 */
export function getGameById(id: string): GameRegistryEntry | undefined {
  return gameRegistry.find((entry) => entry.info.id === id);
}

export { SnakeGame, snakeGameInfo } from "./SnakeGame.js";
export { PongGame, pongGameInfo } from "./PongGame.js";
export { TetrisGame, tetrisGameInfo } from "./TetrisGame.js";
export { MinesweeperGame, minesweeperGameInfo } from "./MinesweeperGame.js";
