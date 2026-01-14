/**
 * Game Framework Types and Interfaces
 *
 * Provides common types for building terminal games that run
 * alongside Claude Code work.
 */

/**
 * Game state status
 */
export type GameStatus = "menu" | "playing" | "paused" | "game_over";

/**
 * Input key representation for game input handling
 */
export interface GameInput {
  key: string;
  ctrl: boolean;
  shift: boolean;
  meta: boolean;
  /** Arrow keys */
  upArrow: boolean;
  downArrow: boolean;
  leftArrow: boolean;
  rightArrow: boolean;
  /** Special keys */
  return: boolean;
  escape: boolean;
  space: boolean;
  tab: boolean;
  backspace: boolean;
  delete: boolean;
}

/**
 * Game dimensions from the container
 */
export interface GameDimensions {
  width: number;
  height: number;
}

/**
 * Base game state interface - games extend this
 */
export interface BaseGameState {
  status: GameStatus;
  score: number;
  highScore: number;
}

/**
 * Game metadata for the selector
 */
export interface GameInfo {
  id: string;
  name: string;
  description: string;
  controls: string;
  /** Minimum dimensions required to play */
  minWidth?: number;
  minHeight?: number;
}

/**
 * Loop attention information passed to games
 */
export interface LoopAttention {
  /** Whether the loop needs user attention */
  needsAttention: boolean;
  /** Reason for needing attention */
  reason: string | null;
  /** Type of attention needed */
  type: "question" | "confirmation" | "error" | "permission" | null;
  /** Prompt text if any */
  prompt: string | null;
}

/**
 * Props passed to game components
 */
export interface GameComponentProps {
  /** Whether the game pane has focus */
  hasFocus: boolean;
  /** Available dimensions for the game */
  dimensions: GameDimensions;
  /** Callback when game wants to return to menu */
  onExit: () => void;
  /** Loop attention state for auto-pause feature */
  loopAttention?: LoopAttention;
  /** Callback when user acknowledges/dismisses loop alert */
  onLoopAlertDismiss?: () => void;
}

/**
 * Game registry entry
 */
export interface GameRegistryEntry {
  info: GameInfo;
  component: React.ComponentType<GameComponentProps>;
}

/**
 * Game loop timing info
 */
export interface GameLoopInfo {
  /** Frames per second */
  fps: number;
  /** Time since last frame in milliseconds */
  deltaTime: number;
  /** Total elapsed time in milliseconds */
  elapsedTime: number;
  /** Current frame number */
  frameCount: number;
}

/**
 * Canvas cell for character-based rendering
 */
export interface CanvasCell {
  char: string;
  color?: string;
  backgroundColor?: string;
  bold?: boolean;
  dim?: boolean;
}

/**
 * Simple 2D point
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Simple 2D vector
 */
export interface Vector2D {
  x: number;
  y: number;
}

/**
 * Direction enum for movement
 */
export type Direction = "up" | "down" | "left" | "right";

/**
 * Convert direction to vector
 */
export function directionToVector(direction: Direction): Vector2D {
  switch (direction) {
    case "up":
      return { x: 0, y: -1 };
    case "down":
      return { x: 0, y: 1 };
    case "left":
      return { x: -1, y: 0 };
    case "right":
      return { x: 1, y: 0 };
  }
}

/**
 * Check if two points are equal
 */
export function pointsEqual(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

/**
 * Add two vectors
 */
export function addVectors(a: Vector2D, b: Vector2D): Vector2D {
  return { x: a.x + b.x, y: a.y + b.y };
}

/**
 * Create a game input object from ink's useInput callback params
 */
export function createGameInput(
  input: string,
  key: {
    upArrow: boolean;
    downArrow: boolean;
    leftArrow: boolean;
    rightArrow: boolean;
    return: boolean;
    escape: boolean;
    ctrl: boolean;
    shift: boolean;
    meta: boolean;
    tab: boolean;
    backspace: boolean;
    delete: boolean;
  }
): GameInput {
  return {
    key: input,
    ctrl: key.ctrl,
    shift: key.shift,
    meta: key.meta,
    upArrow: key.upArrow,
    downArrow: key.downArrow,
    leftArrow: key.leftArrow,
    rightArrow: key.rightArrow,
    return: key.return,
    escape: key.escape,
    space: input === " ",
    tab: key.tab,
    backspace: key.backspace,
    delete: key.delete,
  };
}
