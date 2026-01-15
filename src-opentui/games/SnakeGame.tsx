/**
 * Snake Game - OpenTUI Version
 *
 * Classic snake game implemented with OpenTUI components.
 * Uses box and text components for rendering, useKeyboard for input.
 */

import { useKeyboard } from "@opentui/react";
import { useState, useCallback, useEffect, useRef } from "react";
import type { GameComponentProps, GameInfo, Point, Direction } from "../game-types.js";
import { directionToVector, pointsEqual, addVectors } from "../game-types.js";
import { useGameLoop } from "../hooks/useGameLoop.js";

/** Snake game metadata */
export const snakeGameInfo: GameInfo = {
  id: "snake",
  name: "Snake",
  description:
    "Classic snake game - eat food to grow, avoid walls and yourself!",
  controls: "Arrow keys/WASD to move, P to pause, R to restart",
  minWidth: 20,
  minHeight: 10,
};

interface SnakeState {
  snake: Point[];
  direction: Direction;
  nextDirection: Direction;
  food: Point;
  score: number;
  status: "playing" | "paused" | "game_over";
  speed: number;
  highScore: number;
}

function createInitialState(width: number, height: number, highScore: number = 0): SnakeState {
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);

  return {
    snake: [
      { x: centerX, y: centerY },
      { x: centerX - 1, y: centerY },
      { x: centerX - 2, y: centerY },
    ],
    direction: "right",
    nextDirection: "right",
    food: spawnFood(width, height, [{ x: centerX, y: centerY }]),
    score: 0,
    status: "playing",
    speed: 150, // ms per move
    highScore,
  };
}

function spawnFood(width: number, height: number, snake: Point[]): Point {
  let food: Point;
  let attempts = 0;
  const maxAttempts = 100;

  do {
    food = {
      x: Math.floor(Math.random() * (width - 2)) + 1,
      y: Math.floor(Math.random() * (height - 2)) + 1,
    };
    attempts++;
  } while (
    snake.some((segment) => pointsEqual(segment, food)) &&
    attempts < maxAttempts
  );

  return food;
}

/** Colors for game elements */
const COLORS = {
  border: "#888888",
  snakeHead: "#00FF00",
  snakeBody: "#00AA00",
  food: "#FF0000",
  score: "#FFFF00",
  highScore: "#888888",
  fps: "#666666",
  gameOver: "#FF0000",
  paused: "#FFFF00",
  hint: "#666666",
};

/**
 * Snake game component for OpenTUI
 */
export function SnakeGame({
  hasFocus,
  dimensions,
  onExit,
  loopAttention,
  onLoopAlertDismiss,
  onGameStateChange,
  autoPauseEnabled = true,
}: GameComponentProps) {
  // Calculate game board size (leaving room for HUD)
  const boardWidth = Math.max(dimensions.width - 2, 15);
  const boardHeight = Math.max(dimensions.height - 5, 8);

  const [state, setState] = useState<SnakeState>(() =>
    createInitialState(boardWidth, boardHeight)
  );

  const [lastMoveTime, setLastMoveTime] = useState(0);
  const [showLoopAlert, setShowLoopAlert] = useState(false);
  const [wasPlayingBeforeAlert, setWasPlayingBeforeAlert] = useState(false);

  // Report game state changes to status bar
  useEffect(() => {
    onGameStateChange?.({
      score: state.score,
      status: state.status,
      highScore: state.highScore,
    });
  }, [state.score, state.status, state.highScore, onGameStateChange]);

  // Auto-pause when loop needs attention (if enabled)
  useEffect(() => {
    if (autoPauseEnabled && loopAttention?.needsAttention && state.status === "playing") {
      setWasPlayingBeforeAlert(true);
      setShowLoopAlert(true);
      setState((prev) => ({ ...prev, status: "paused" }));
    } else if (!loopAttention?.needsAttention && showLoopAlert) {
      setShowLoopAlert(false);
      if (wasPlayingBeforeAlert) {
        setState((prev) => {
          if (prev.status === "paused") {
            return { ...prev, status: "playing" };
          }
          return prev;
        });
        setWasPlayingBeforeAlert(false);
      }
    }
  }, [
    autoPauseEnabled,
    loopAttention?.needsAttention,
    state.status,
    showLoopAlert,
    wasPlayingBeforeAlert,
  ]);

  // Reset game when dimensions change significantly
  useEffect(() => {
    setState((prev) =>
      createInitialState(boardWidth, boardHeight, prev.highScore)
    );
  }, [boardWidth, boardHeight]);

  const moveSnake = useCallback(() => {
    setState((prev) => {
      if (prev.status !== "playing") return prev;

      // Apply the queued direction
      const direction = prev.nextDirection;
      const head = prev.snake[0];
      const delta = directionToVector(direction);
      const newHead = addVectors(head, delta);

      // Check wall collision
      if (
        newHead.x <= 0 ||
        newHead.x >= boardWidth - 1 ||
        newHead.y <= 0 ||
        newHead.y >= boardHeight - 1
      ) {
        const newHighScore = Math.max(prev.score, prev.highScore);
        return {
          ...prev,
          status: "game_over",
          highScore: newHighScore,
        };
      }

      // Check self collision
      if (prev.snake.some((segment) => pointsEqual(segment, newHead))) {
        const newHighScore = Math.max(prev.score, prev.highScore);
        return {
          ...prev,
          status: "game_over",
          highScore: newHighScore,
        };
      }

      // Check food collision
      const ateFood = pointsEqual(newHead, prev.food);
      const newSnake = [newHead, ...prev.snake];
      if (!ateFood) {
        newSnake.pop(); // Remove tail if didn't eat
      }

      // Calculate new speed (gets faster as score increases)
      const newSpeed = Math.max(50, 150 - prev.score * 2);

      return {
        ...prev,
        snake: newSnake,
        direction,
        score: ateFood ? prev.score + 10 : prev.score,
        food: ateFood
          ? spawnFood(boardWidth, boardHeight, newSnake)
          : prev.food,
        speed: newSpeed,
      };
    });
  }, [boardWidth, boardHeight]);

  // Game loop
  const { loopInfo } = useGameLoop({
    targetFps: 30,
    isActive: hasFocus && state.status === "playing",
    onTick: (info) => {
      // Move snake based on speed
      if (info.elapsedTime - lastMoveTime >= state.speed) {
        moveSnake();
        setLastMoveTime(info.elapsedTime);
      }
    },
  });

  // Handle keyboard input
  useKeyboard(
    useCallback(
      (key) => {
        if (!hasFocus) return;

        const keyName = key.name.toLowerCase();

        // Exit to menu
        if (keyName === "q" || keyName === "escape") {
          onExit();
          return;
        }

        // Restart
        if (keyName === "r") {
          setState((prev) =>
            createInitialState(boardWidth, boardHeight, prev.highScore)
          );
          setLastMoveTime(0);
          return;
        }

        // Dismiss loop alert with Enter key
        if (keyName === "return" && showLoopAlert) {
          setShowLoopAlert(false);
          onLoopAlertDismiss?.();
          return;
        }

        // Pause/unpause
        if (keyName === "p") {
          if (showLoopAlert) {
            setShowLoopAlert(false);
            setWasPlayingBeforeAlert(false);
          }
          setState((prev) => ({
            ...prev,
            status: prev.status === "playing" ? "paused" : "playing",
          }));
          return;
        }

        // Direction changes (only while playing)
        if (state.status !== "playing") return;

        // Prevent 180-degree turns
        const currentDir = state.direction;

        if (
          (keyName === "up" || keyName === "arrowup" || keyName === "w") &&
          currentDir !== "down"
        ) {
          setState((prev) => ({ ...prev, nextDirection: "up" }));
        } else if (
          (keyName === "down" || keyName === "arrowdown" || keyName === "s") &&
          currentDir !== "up"
        ) {
          setState((prev) => ({ ...prev, nextDirection: "down" }));
        } else if (
          (keyName === "left" || keyName === "arrowleft" || keyName === "a") &&
          currentDir !== "right"
        ) {
          setState((prev) => ({ ...prev, nextDirection: "left" }));
        } else if (
          (keyName === "right" || keyName === "arrowright" || keyName === "d") &&
          currentDir !== "left"
        ) {
          setState((prev) => ({ ...prev, nextDirection: "right" }));
        }
      },
      [hasFocus, state.status, state.direction, showLoopAlert, boardWidth, boardHeight, onExit, onLoopAlertDismiss]
    )
  );

  // Build the game board as a 2D array
  const board: string[][] = [];
  for (let y = 0; y < boardHeight; y++) {
    const row: string[] = [];
    for (let x = 0; x < boardWidth; x++) {
      // Border
      if (y === 0 || y === boardHeight - 1) {
        row.push("─");
      } else if (x === 0 || x === boardWidth - 1) {
        row.push("│");
      } else {
        row.push(" ");
      }
    }
    board.push(row);
  }

  // Corners
  if (boardHeight > 0 && boardWidth > 0) {
    board[0][0] = "┌";
    board[0][boardWidth - 1] = "┐";
    board[boardHeight - 1][0] = "└";
    board[boardHeight - 1][boardWidth - 1] = "┘";
  }

  // Place food
  if (
    state.food.y > 0 &&
    state.food.y < boardHeight - 1 &&
    state.food.x > 0 &&
    state.food.x < boardWidth - 1
  ) {
    board[state.food.y][state.food.x] = "●";
  }

  // Place snake
  state.snake.forEach((segment, index) => {
    if (
      segment.y > 0 &&
      segment.y < boardHeight - 1 &&
      segment.x > 0 &&
      segment.x < boardWidth - 1
    ) {
      board[segment.y][segment.x] = index === 0 ? "█" : "▓";
    }
  });

  // Render HUD
  const renderHUD = () => (
    <box style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 1, paddingRight: 1 }}>
      <text>
        Score: <span fg={COLORS.score}>{state.score}</span>
      </text>
      <text fg={COLORS.highScore}>High: {state.highScore}</text>
      <text fg={COLORS.fps}>{loopInfo.fps} FPS</text>
    </box>
  );

  // Render game over overlay
  const renderGameOver = () => (
    <box style={{ flexDirection: "column", alignItems: "center", justifyContent: "center", flexGrow: 1 }}>
      <text fg={COLORS.gameOver}>
        <strong>GAME OVER</strong>
      </text>
      <text>
        Score: <span fg={COLORS.score}>{state.score}</span>
      </text>
      {state.score >= state.highScore && state.score > 0 && (
        <text fg={COLORS.score}>NEW HIGH SCORE!</text>
      )}
      <text fg={COLORS.hint}>Press R to restart | Q to exit</text>
    </box>
  );

  // Render paused overlay
  const renderPaused = () => (
    <box style={{ flexDirection: "column", alignItems: "center", justifyContent: "center", flexGrow: 1 }}>
      {showLoopAlert && loopAttention ? (
        <>
          <text fg={COLORS.paused}>
            <strong>CLAUDE NEEDS INPUT</strong>
          </text>
          <text fg={COLORS.hint}>{loopAttention.reason || "Waiting for input..."}</text>
          <text fg={COLORS.hint}>Press Enter to dismiss | P to resume</text>
        </>
      ) : (
        <>
          <text fg={COLORS.paused}>
            <strong>PAUSED</strong>
          </text>
          <text fg={COLORS.hint}>Press P to resume</text>
        </>
      )}
    </box>
  );

  // Render the game board
  const renderBoard = () => (
    <box style={{ flexDirection: "column", alignItems: "center", justifyContent: "center", flexGrow: 1 }}>
      {board.map((row, y) => (
        <box key={y} style={{ flexDirection: "row" }}>
          {row.map((cell, x) => {
            let color: string = COLORS.border;
            const isSnakeHead =
              state.snake[0] && state.snake[0].x === x && state.snake[0].y === y;
            const isSnakeBody = state.snake
              .slice(1)
              .some((s) => s.x === x && s.y === y);
            const isFood = state.food.x === x && state.food.y === y;

            if (isSnakeHead) {
              color = COLORS.snakeHead;
            } else if (isSnakeBody) {
              color = COLORS.snakeBody;
            } else if (isFood) {
              color = COLORS.food;
            }

            return (
              <text key={x} fg={color}>
                {cell}
              </text>
            );
          })}
        </box>
      ))}
    </box>
  );

  // Render controls hint
  const renderControls = () => (
    <box style={{ paddingLeft: 1 }}>
      <text fg={COLORS.hint}>Arrow keys/WASD: Move | P: Pause | R: Restart | Q: Exit</text>
    </box>
  );

  return (
    <box style={{ flexDirection: "column", flexGrow: 1 }}>
      {renderHUD()}
      {state.status === "game_over"
        ? renderGameOver()
        : state.status === "paused"
        ? renderPaused()
        : renderBoard()}
      {renderControls()}
    </box>
  );
}

export default SnakeGame;
