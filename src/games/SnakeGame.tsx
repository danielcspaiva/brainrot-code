/**
 * Snake Game
 *
 * Classic snake game implemented with the game framework.
 * Demonstrates game loop, input handling, and rendering patterns.
 */

import { Box, Text, useInput } from "ink";
import { useState, useCallback, useEffect, useRef } from "react";
import type { GameComponentProps, GameInfo } from "../game-types.js";
import {
  type Direction,
  type Point,
  directionToVector,
  pointsEqual,
  addVectors,
} from "../game-types.js";
import { useGameLoop } from "../use-game-loop.js";
import { useHighScores } from "../use-high-scores.js";
import { useGameSession } from "../use-stats.js";
import { Leaderboard, NewHighScoreBanner } from "../Leaderboard.js";
import { LoopAlertOverlay } from "../LoopAlertOverlay.js";

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
  status: "playing" | "paused" | "game_over" | "leaderboard";
  speed: number;
  /** Position on leaderboard after game over (0 if not on leaderboard) */
  leaderboardPosition: number;
}

function createInitialState(width: number, height: number): SnakeState {
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
    leaderboardPosition: 0,
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

interface GameBoardProps {
  snake: Point[];
  food: Point;
  width: number;
  height: number;
}

function GameBoard({ snake, food, width, height }: GameBoardProps) {
  // Build the board as a 2D array
  const board: string[][] = [];

  for (let y = 0; y < height; y++) {
    const row: string[] = [];
    for (let x = 0; x < width; x++) {
      // Border
      if (y === 0 || y === height - 1) {
        row.push("─");
      } else if (x === 0 || x === width - 1) {
        row.push("│");
      } else {
        row.push(" ");
      }
    }
    board.push(row);
  }

  // Corners
  if (height > 0 && width > 0) {
    board[0][0] = "┌";
    board[0][width - 1] = "┐";
    board[height - 1][0] = "└";
    board[height - 1][width - 1] = "┘";
  }

  // Place food
  if (food.y > 0 && food.y < height - 1 && food.x > 0 && food.x < width - 1) {
    board[food.y][food.x] = "●";
  }

  // Place snake
  snake.forEach((segment, index) => {
    if (
      segment.y > 0 &&
      segment.y < height - 1 &&
      segment.x > 0 &&
      segment.x < width - 1
    ) {
      board[segment.y][segment.x] = index === 0 ? "█" : "▓";
    }
  });

  return (
    <Box flexDirection="column">
      {board.map((row, y) => (
        <Box key={y}>
          {row.map((cell, x) => {
            let color: string | undefined;
            const isSnakeHead =
              snake[0] && snake[0].x === x && snake[0].y === y;
            const isSnakeBody = snake
              .slice(1)
              .some((s) => s.x === x && s.y === y);
            const isFood = food.x === x && food.y === y;

            if (isSnakeHead) {
              color = "green";
            } else if (isSnakeBody) {
              color = "greenBright";
            } else if (isFood) {
              color = "red";
            } else if (cell !== " ") {
              color = "gray";
            }

            return (
              <Text key={x} color={color}>
                {cell}
              </Text>
            );
          })}
        </Box>
      ))}
    </Box>
  );
}

function GameOverOverlay({
  score,
  leaderboardPosition,
}: {
  score: number;
  leaderboardPosition: number;
}) {
  return (
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      padding={1}
    >
      <Text bold color="red">
        GAME OVER
      </Text>
      <Text>
        Score: <Text color="yellow">{score}</Text>
      </Text>
      {leaderboardPosition > 0 && (
        <NewHighScoreBanner position={leaderboardPosition} score={score} />
      )}
      <Text dimColor>Press R to restart | H for leaderboard</Text>
    </Box>
  );
}

function PausedOverlay() {
  return (
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      padding={1}
    >
      <Text bold color="yellow">
        PAUSED
      </Text>
      <Text dimColor>Press P to resume</Text>
    </Box>
  );
}

function GameHUD({
  score,
  highScore,
  fps,
}: {
  score: number;
  highScore: number;
  fps: number;
}) {
  return (
    <Box justifyContent="space-between" paddingX={1}>
      <Box>
        <Text>Score: </Text>
        <Text color="yellow" bold>
          {score}
        </Text>
      </Box>
      <Box>
        <Text dimColor>High: {highScore}</Text>
      </Box>
      <Box>
        <Text dimColor>{fps} FPS</Text>
      </Box>
    </Box>
  );
}

/**
 * Snake game component
 */
export function SnakeGame({
  hasFocus,
  dimensions,
  onExit,
  loopAttention,
  onLoopAlertDismiss,
  onGameStateChange,
}: GameComponentProps) {
  // Calculate game board size (leaving room for HUD and controls)
  const boardWidth = Math.max(dimensions.width - 2, 15);
  const boardHeight = Math.max(dimensions.height - 5, 8);

  const [state, setState] = useState<SnakeState>(() =>
    createInitialState(boardWidth, boardHeight)
  );

  const [lastMoveTime, setLastMoveTime] = useState(0);
  const scoreSubmittedRef = useRef(false);
  const statsSubmittedRef = useRef(false);
  const [showLoopAlert, setShowLoopAlert] = useState(false);
  const [wasPlayingBeforeAlert, setWasPlayingBeforeAlert] = useState(false);

  // High score persistence
  const { highScore, leaderboard, submitScore } = useHighScores("snake");

  // Report game state changes to status bar
  useEffect(() => {
    const mappedStatus =
      state.status === "leaderboard" ? "game_over" : state.status;
    onGameStateChange?.({
      score: state.score,
      status: mappedStatus,
      highScore,
    });
  }, [state.score, state.status, highScore, onGameStateChange]);

  // Stats tracking
  const { startSession, endSession, isSessionActive } = useGameSession("snake");

  // Auto-pause when loop needs attention
  useEffect(() => {
    if (loopAttention?.needsAttention && state.status === "playing") {
      setWasPlayingBeforeAlert(true);
      setShowLoopAlert(true);
      setState((prev) => ({ ...prev, status: "paused" }));
    } else if (!loopAttention?.needsAttention && showLoopAlert) {
      setShowLoopAlert(false);
      // Auto-resume if we were playing before the alert
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
    loopAttention?.needsAttention,
    state.status,
    showLoopAlert,
    wasPlayingBeforeAlert,
  ]);

  // Reset game when dimensions change significantly
  useEffect(() => {
    setState((prev) => ({
      ...createInitialState(boardWidth, boardHeight),
      leaderboardPosition: prev.leaderboardPosition,
    }));
  }, [boardWidth, boardHeight]);

  // Start session when game starts
  useEffect(() => {
    if (state.status === "playing" && !isSessionActive) {
      startSession();
    }
  }, [state.status, isSessionActive, startSession]);

  // Submit score and stats when game ends
  useEffect(() => {
    if (
      state.status === "game_over" &&
      !scoreSubmittedRef.current &&
      state.score > 0
    ) {
      scoreSubmittedRef.current = true;
      submitScore(state.score).then((position) => {
        if (position > 0) {
          setState((prev) => ({ ...prev, leaderboardPosition: position }));
        }
      });
    }

    // Record stats when game ends
    if (state.status === "game_over" && !statsSubmittedRef.current) {
      statsSubmittedRef.current = true;
      void endSession(state.score);
    }
  }, [state.status, state.score, submitScore, endSession]);

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
        return {
          ...prev,
          status: "game_over",
        };
      }

      // Check self collision
      if (prev.snake.some((segment) => pointsEqual(segment, newHead))) {
        return {
          ...prev,
          status: "game_over",
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

  // Handle input
  useInput(
    (input, key) => {
      if (!hasFocus) return;

      // Exit to menu
      if (input === "q" || input === "Q" || key.escape) {
        onExit();
        return;
      }

      // Restart
      if (input === "r" || input === "R") {
        scoreSubmittedRef.current = false;
        statsSubmittedRef.current = false;
        setState(createInitialState(boardWidth, boardHeight));
        setLastMoveTime(0);
        return;
      }

      // Show leaderboard (when game over or paused)
      if ((input === "h" || input === "H") && state.status !== "playing") {
        setState((prev) => ({
          ...prev,
          status: prev.status === "leaderboard" ? "game_over" : "leaderboard",
        }));
        return;
      }

      // Dismiss loop alert with Enter key
      if (key.return && showLoopAlert) {
        setShowLoopAlert(false);
        onLoopAlertDismiss?.();
        return;
      }

      // Pause/unpause
      if (input === "p" || input === "P") {
        // If we're showing loop alert, dismiss it and resume
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
        (key.upArrow || input === "w" || input === "W") &&
        currentDir !== "down"
      ) {
        setState((prev) => ({ ...prev, nextDirection: "up" }));
      } else if (
        (key.downArrow || input === "s" || input === "S") &&
        currentDir !== "up"
      ) {
        setState((prev) => ({ ...prev, nextDirection: "down" }));
      } else if (
        (key.leftArrow || input === "a" || input === "A") &&
        currentDir !== "right"
      ) {
        setState((prev) => ({ ...prev, nextDirection: "left" }));
      } else if (
        (key.rightArrow || input === "d" || input === "D") &&
        currentDir !== "left"
      ) {
        setState((prev) => ({ ...prev, nextDirection: "right" }));
      }
    },
    { isActive: hasFocus }
  );

  return (
    <Box flexDirection="column" height="100%">
      <GameHUD score={state.score} highScore={highScore} fps={loopInfo.fps} />

      <Box flexGrow={1} justifyContent="center" alignItems="center">
        {state.status === "leaderboard" ? (
          <Leaderboard
            title="Snake High Scores"
            scores={leaderboard}
            highlightPosition={state.leaderboardPosition}
          />
        ) : state.status === "game_over" ? (
          <GameOverOverlay
            score={state.score}
            leaderboardPosition={state.leaderboardPosition}
          />
        ) : state.status === "paused" && showLoopAlert && loopAttention ? (
          <LoopAlertOverlay
            attention={loopAttention}
            onDismiss={onLoopAlertDismiss}
          />
        ) : state.status === "paused" ? (
          <PausedOverlay />
        ) : (
          <GameBoard
            snake={state.snake}
            food={state.food}
            width={boardWidth}
            height={boardHeight}
          />
        )}
      </Box>

      <Box paddingX={1}>
        <Text dimColor>
          {hasFocus
            ? state.status === "leaderboard"
              ? "H: Back | R: Restart | Q: Exit"
              : "Arrow/WASD: Move | P: Pause | R: Restart | H: Scores | Q: Exit"
            : "Press Tab to focus"}
        </Text>
      </Box>
    </Box>
  );
}

export default SnakeGame;
