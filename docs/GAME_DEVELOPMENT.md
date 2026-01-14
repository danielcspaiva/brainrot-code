# Game Development Guide

This guide explains how to create new games for BrainRot CLI.

## Overview

Games in BrainRot CLI are React components that implement the `GameComponentProps` interface. They run alongside Claude Code in a split-pane terminal UI and can auto-pause when Claude Code needs user attention.

## Core Interfaces

### GameComponentProps

Every game receives these props:

```typescript
interface GameComponentProps {
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

  /** Callback to report game state changes to status bar */
  onGameStateChange?: (update: GameStateUpdate) => void;
}
```

### GameDimensions

```typescript
interface GameDimensions {
  width: number;   // Available width in characters
  height: number;  // Available height in lines
}
```

### GameInfo

Metadata for the game selector:

```typescript
interface GameInfo {
  id: string;           // Unique identifier (e.g., "snake")
  name: string;         // Display name (e.g., "Snake")
  description: string;  // Short description
  controls: string;     // Control instructions
  minWidth?: number;    // Minimum width required
  minHeight?: number;   // Minimum height required
}
```

### GameStateUpdate

Report state changes to the status bar:

```typescript
interface GameStateUpdate {
  score: number | null;
  status: "playing" | "paused" | "game_over" | "menu" | null;
  highScore: number | null;
}
```

### LoopAttention

Information about Claude Code needing attention:

```typescript
interface LoopAttention {
  needsAttention: boolean;
  reason: string | null;
  type: "question" | "confirmation" | "error" | "permission" | null;
  prompt: string | null;
}
```

## Essential Hooks

### useGameLoop

Provides a consistent game loop with timing information:

```typescript
import { useGameLoop } from "../use-game-loop.js";

const { loopInfo, isRunning, start, stop, toggle, reset } = useGameLoop({
  targetFps: 30,        // Target frames per second
  isActive: true,       // Whether loop should run
  onTick: (info) => {   // Called each frame
    // info.deltaTime - ms since last frame
    // info.fps - current FPS
    // info.elapsedTime - total ms elapsed
    // info.frameCount - total frames rendered
  },
});
```

### useHighScores / useBestTimes

Persist and retrieve high scores:

```typescript
import { useHighScores, useBestTimes } from "../use-high-scores.js";

// For score-based games (higher is better)
const { highScore, leaderboard, submitScore } = useHighScores("your-game-id");

// For time-based games (lower is better)
const { bestTime, leaderboard, submitTime } = useBestTimes("your-game-id");

// Submit a score
const position = await submitScore(score, "PlayerName");
```

### useGameSession

Track play sessions for statistics:

```typescript
import { useGameSession } from "../use-stats.js";

const { startSession, endSession, isSessionActive } = useGameSession("your-game-id");

// Start when game begins
startSession();

// End when game is over
endSession({ score: 100, won: true });
```

## Step-by-Step: Creating a New Game

### 1. Create the Game File

Create `src/Games/YourGame.tsx`:

```typescript
/**
 * Your Game
 *
 * Description of your game.
 */

import React, { useState, useEffect, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import type { GameComponentProps, GameInfo } from "../game-types.js";
import { useGameLoop } from "../use-game-loop.js";
import { useHighScores } from "../use-high-scores.js";
import { useGameSession } from "../use-stats.js";
import { LoopAlertOverlay } from "../LoopAlertOverlay.js";

// ============================================================================
// GAME INFO
// ============================================================================

export const yourGameInfo: GameInfo = {
  id: "your-game",
  name: "Your Game",
  description: "Description of your game",
  controls: "Arrow keys to move, P to pause, R to restart",
  minWidth: 20,
  minHeight: 10,
};

// ============================================================================
// TYPES
// ============================================================================

interface GameState {
  status: "playing" | "paused" | "game_over";
  score: number;
  // Add your game-specific state here
}

// ============================================================================
// INITIAL STATE
// ============================================================================

function createInitialState(width: number, height: number): GameState {
  return {
    status: "playing",
    score: 0,
    // Initialize your game state based on dimensions
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function YourGame({
  hasFocus,
  dimensions,
  onExit,
  loopAttention,
  onLoopAlertDismiss,
  onGameStateChange,
}: GameComponentProps) {
  // Calculate board dimensions
  const boardWidth = Math.max(dimensions.width - 2, 15);
  const boardHeight = Math.max(dimensions.height - 5, 8);

  // Game state
  const [state, setState] = useState<GameState>(() =>
    createInitialState(boardWidth, boardHeight)
  );

  // High scores
  const { highScore, submitScore } = useHighScores("your-game");

  // Session tracking
  const { startSession, endSession, isSessionActive } = useGameSession("your-game");

  // Game loop
  const { loopInfo } = useGameLoop({
    targetFps: 30,
    isActive: hasFocus && state.status === "playing",
    onTick: useCallback(
      (info) => {
        // Update game state each frame
        setState((prev) => {
          if (prev.status !== "playing") return prev;

          // Your game logic here
          return prev;
        });
      },
      [boardWidth, boardHeight]
    ),
  });

  // Start session when game starts
  useEffect(() => {
    if (state.status === "playing" && !isSessionActive) {
      startSession();
    }
  }, [state.status, isSessionActive, startSession]);

  // Submit score on game over
  useEffect(() => {
    if (state.status === "game_over" && state.score > 0) {
      submitScore(state.score);
      if (isSessionActive) {
        endSession({ score: state.score });
      }
    }
  }, [state.status, state.score, submitScore, endSession, isSessionActive]);

  // Report state changes to status bar
  useEffect(() => {
    onGameStateChange?.({
      score: state.score,
      status: state.status,
      highScore: highScore || null,
    });
  }, [state.score, state.status, highScore, onGameStateChange]);

  // Auto-pause when Claude Code needs attention
  useEffect(() => {
    if (loopAttention?.needsAttention && state.status === "playing") {
      setState((prev) => ({ ...prev, status: "paused" }));
    }
  }, [loopAttention?.needsAttention, state.status]);

  // Reset game when dimensions change
  useEffect(() => {
    setState(createInitialState(boardWidth, boardHeight));
  }, [boardWidth, boardHeight]);

  // Input handling
  useInput(
    (input, key) => {
      if (!hasFocus) return;

      const lowerInput = input.toLowerCase();

      // Exit to menu
      if (lowerInput === "q" || key.escape) {
        onExit();
        return;
      }

      // Restart
      if (lowerInput === "r") {
        setState(createInitialState(boardWidth, boardHeight));
        return;
      }

      // Pause/Resume
      if (lowerInput === "p") {
        setState((prev) => ({
          ...prev,
          status: prev.status === "playing" ? "paused" : "playing",
        }));
        return;
      }

      // Game-specific input (only when playing)
      if (state.status === "playing") {
        // Handle arrow keys, WASD, etc.
        if (key.upArrow || lowerInput === "w") {
          // Handle up
        }
        if (key.downArrow || lowerInput === "s") {
          // Handle down
        }
        if (key.leftArrow || lowerInput === "a") {
          // Handle left
        }
        if (key.rightArrow || lowerInput === "d") {
          // Handle right
        }
      }
    },
    { isActive: hasFocus }
  );

  // Render
  return (
    <Box flexDirection="column" width={dimensions.width} height={dimensions.height}>
      {/* HUD */}
      <Box justifyContent="space-between" paddingX={1}>
        <Text>Score: {state.score}</Text>
        <Text dimColor>High: {highScore || 0}</Text>
      </Box>

      {/* Game Board */}
      <Box flexDirection="column" flexGrow={1} alignItems="center" justifyContent="center">
        {/* Render your game here */}
        <Text>Your game content</Text>

        {/* Status overlays */}
        {state.status === "paused" && (
          <Text color="yellow">PAUSED - Press P to resume</Text>
        )}
        {state.status === "game_over" && (
          <Text color="red">GAME OVER - Press R to restart</Text>
        )}
      </Box>

      {/* Controls hint */}
      <Box paddingX={1}>
        <Text dimColor>
          {state.status === "playing" ? "P:Pause R:Restart Q:Quit" : "R:Restart Q:Quit"}
        </Text>
      </Box>

      {/* Loop alert overlay */}
      {loopAttention?.needsAttention && (
        <LoopAlertOverlay
          attention={loopAttention}
          onDismiss={onLoopAlertDismiss}
        />
      )}
    </Box>
  );
}
```

### 2. Register the Game

Edit `src/Games/index.ts`:

```typescript
import type { GameRegistryEntry, GameInfo } from "../game-types.js";
import { SnakeGame, snakeGameInfo } from "./SnakeGame.js";
import { PongGame, pongGameInfo } from "./PongGame.js";
import { TetrisGame, tetrisGameInfo } from "./TetrisGame.js";
import { MinesweeperGame, minesweeperGameInfo } from "./MinesweeperGame.js";
// Add your import
import { YourGame, yourGameInfo } from "./YourGame.js";

export const gameRegistry: GameRegistryEntry[] = [
  { info: snakeGameInfo, component: SnakeGame },
  { info: pongGameInfo, component: PongGame },
  { info: tetrisGameInfo, component: TetrisGame },
  { info: minesweeperGameInfo, component: MinesweeperGame },
  // Add your game
  { info: yourGameInfo, component: YourGame },
];

// ... rest of the file

// Add export
export { YourGame, yourGameInfo } from "./YourGame.js";
```

### 3. Build and Test

```bash
npm run build
npm start
```

Your game should now appear in the game selector menu.

## Common Patterns

### Dimension Handling

Always calculate game dimensions from props and reinitialize when they change:

```typescript
const boardWidth = Math.max(dimensions.width - 2, MIN_WIDTH);
const boardHeight = Math.max(dimensions.height - 5, MIN_HEIGHT);

useEffect(() => {
  setState(createInitialState(boardWidth, boardHeight));
}, [boardWidth, boardHeight]);
```

### Input Guard

Always check `hasFocus` before processing input:

```typescript
useInput(
  (input, key) => {
    if (!hasFocus) return;
    // Handle input
  },
  { isActive: hasFocus }
);
```

### State Updates in Game Loop

Use functional setState to avoid stale closures:

```typescript
const { loopInfo } = useGameLoop({
  onTick: useCallback((info) => {
    setState((prev) => {
      if (prev.status !== "playing") return prev;
      // Compute next state from prev
      return { ...prev, /* updates */ };
    });
  }, [/* dependencies */]),
});
```

### Rendering with Unicode

Use Unicode box-drawing characters for borders:

```typescript
const CHARS = {
  topLeft: "┌",
  topRight: "┐",
  bottomLeft: "└",
  bottomRight: "┘",
  horizontal: "─",
  vertical: "│",
};
```

### Color Theming

Access theme colors via the theme hook:

```typescript
import { useTheme } from "../useTheme.js";

function MyGame(props: GameComponentProps) {
  const theme = useTheme();

  return (
    <Text color={theme.colors.primary}>Themed text</Text>
  );
}
```

## Auto-Pause Integration

Games should pause when Claude Code needs attention:

```typescript
// Auto-pause effect
useEffect(() => {
  if (loopAttention?.needsAttention && state.status === "playing") {
    setState((prev) => ({ ...prev, status: "paused" }));
  }
}, [loopAttention?.needsAttention, state.status]);

// Show overlay when paused due to attention
{loopAttention?.needsAttention && (
  <LoopAlertOverlay
    attention={loopAttention}
    onDismiss={onLoopAlertDismiss}
  />
)}
```

## Helper Types

### Point and Vector

```typescript
import { Point, Vector2D, Direction, directionToVector, addVectors, pointsEqual } from "../game-types.js";

// Point: { x: number, y: number }
// Vector2D: { x: number, y: number }
// Direction: "up" | "down" | "left" | "right"

const direction: Direction = "up";
const vector = directionToVector(direction); // { x: 0, y: -1 }

const pos: Point = { x: 5, y: 10 };
const newPos = addVectors(pos, vector); // { x: 5, y: 9 }

const same = pointsEqual(pos, newPos); // false
```

### Creating GameInput

Convert Ink's useInput params to GameInput:

```typescript
import { createGameInput, GameInput } from "../game-types.js";

useInput((input, key) => {
  const gameInput: GameInput = createGameInput(input, key);

  if (gameInput.space) {
    // Space was pressed
  }
});
```

## Best Practices

1. **Always respect focus** - Only respond to input when `hasFocus` is true
2. **Handle dimension changes** - Reinitialize game state when dimensions change
3. **Report state changes** - Call `onGameStateChange` so the status bar stays updated
4. **Support auto-pause** - Pause when Claude Code needs attention
5. **Provide clear controls** - Display control hints and support common keys (P, R, Q)
6. **Use functional state updates** - Avoid stale closures in callbacks
7. **Track sessions** - Use `useGameSession` for statistics
8. **Persist high scores** - Use `useHighScores` or `useBestTimes`

## Example Games

Study the existing implementations for reference:

- **SnakeGame.tsx** - Grid-based movement, collision detection
- **PongGame.tsx** - Physics-based movement, AI opponent
- **TetrisGame.tsx** - Piece rotation, line clearing
- **MinesweeperGame.tsx** - Grid reveal, flagging system

Each demonstrates different game mechanics while following the same framework patterns.
