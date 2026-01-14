/**
 * Pong Game
 *
 * Single-player pong against AI.
 * Demonstrates continuous movement and collision detection.
 */

import { Box, Text, useInput } from "ink";
import { useState, useCallback, useEffect } from "react";
import type { GameComponentProps, GameInfo } from "../game-types.js";
import { useGameLoop } from "../use-game-loop.js";
import { LoopAlertOverlay } from "../LoopAlertOverlay.js";

/** Pong game metadata */
export const pongGameInfo: GameInfo = {
  id: "pong",
  name: "Pong",
  description: "Classic pong game against AI - first to 5 wins!",
  controls: "↑/↓ or W/S to move paddle, P to pause, R to restart",
  minWidth: 30,
  minHeight: 15,
};

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface PongState {
  playerY: number;
  aiY: number;
  ball: Ball;
  playerScore: number;
  aiScore: number;
  status: "playing" | "paused" | "game_over";
  winner: "player" | "ai" | null;
}

const PADDLE_HEIGHT = 5;
const BALL_SPEED = 0.5;
const PADDLE_SPEED = 1;
const WIN_SCORE = 5;

function createInitialState(width: number, height: number): PongState {
  const centerY = Math.floor(height / 2);

  return {
    playerY: centerY - Math.floor(PADDLE_HEIGHT / 2),
    aiY: centerY - Math.floor(PADDLE_HEIGHT / 2),
    ball: {
      x: Math.floor(width / 2),
      y: centerY,
      vx: BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
      vy: BALL_SPEED * (Math.random() - 0.5),
    },
    playerScore: 0,
    aiScore: 0,
    status: "playing",
    winner: null,
  };
}

function resetBall(width: number, height: number, towardsPlayer: boolean): Ball {
  return {
    x: Math.floor(width / 2),
    y: Math.floor(height / 2),
    vx: BALL_SPEED * (towardsPlayer ? -1 : 1),
    vy: BALL_SPEED * (Math.random() - 0.5),
  };
}

interface GameBoardProps {
  state: PongState;
  width: number;
  height: number;
}

function GameBoard({ state, width, height }: GameBoardProps) {
  const board: string[][] = [];

  // Initialize empty board
  for (let y = 0; y < height; y++) {
    const row: string[] = [];
    for (let x = 0; x < width; x++) {
      // Border
      if (y === 0 || y === height - 1) {
        row.push("═");
      } else if (x === 0 || x === width - 1) {
        row.push(" ");
      } else if (x === Math.floor(width / 2)) {
        row.push("│"); // Center line
      } else {
        row.push(" ");
      }
    }
    board.push(row);
  }

  // Corners and edges
  if (height > 0 && width > 0) {
    board[0][0] = "╔";
    board[0][width - 1] = "╗";
    board[height - 1][0] = "╚";
    board[height - 1][width - 1] = "╝";
  }

  // Player paddle (left side)
  const paddleX = 2;
  for (let i = 0; i < PADDLE_HEIGHT; i++) {
    const y = state.playerY + i;
    if (y > 0 && y < height - 1) {
      board[y][paddleX] = "█";
    }
  }

  // AI paddle (right side)
  const aiPaddleX = width - 3;
  for (let i = 0; i < PADDLE_HEIGHT; i++) {
    const y = state.aiY + i;
    if (y > 0 && y < height - 1) {
      board[y][aiPaddleX] = "█";
    }
  }

  // Ball
  const ballX = Math.round(state.ball.x);
  const ballY = Math.round(state.ball.y);
  if (ballY > 0 && ballY < height - 1 && ballX > 0 && ballX < width - 1) {
    board[ballY][ballX] = "●";
  }

  return (
    <Box flexDirection="column">
      {board.map((row, y) => (
        <Box key={y}>
          {row.map((cell, x) => {
            let color: string | undefined;

            const isPlayerPaddle =
              x === paddleX &&
              y >= state.playerY &&
              y < state.playerY + PADDLE_HEIGHT;
            const isAIPaddle =
              x === aiPaddleX &&
              y >= state.aiY &&
              y < state.aiY + PADDLE_HEIGHT;
            const isBall = x === ballX && y === ballY;

            if (isPlayerPaddle) {
              color = "cyan";
            } else if (isAIPaddle) {
              color = "magenta";
            } else if (isBall) {
              color = "yellow";
            } else if (cell === "│") {
              color = "gray";
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

function ScoreDisplay({
  playerScore,
  aiScore,
  fps,
}: {
  playerScore: number;
  aiScore: number;
  fps: number;
}) {
  return (
    <Box justifyContent="space-between" paddingX={1}>
      <Box>
        <Text color="cyan">Player: </Text>
        <Text bold color="cyan">
          {playerScore}
        </Text>
      </Box>
      <Box>
        <Text dimColor>First to {WIN_SCORE} wins</Text>
      </Box>
      <Box>
        <Text color="magenta">AI: </Text>
        <Text bold color="magenta">
          {aiScore}
        </Text>
      </Box>
      <Text dimColor>{fps} FPS</Text>
    </Box>
  );
}

function GameOverOverlay({ winner }: { winner: "player" | "ai" }) {
  return (
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      padding={2}
    >
      <Text bold color={winner === "player" ? "green" : "red"}>
        {winner === "player" ? "YOU WIN!" : "AI WINS!"}
      </Text>
      <Text dimColor>Press R to play again</Text>
    </Box>
  );
}

function PausedOverlay() {
  return (
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      padding={2}
    >
      <Text bold color="yellow">
        PAUSED
      </Text>
      <Text dimColor>Press P to resume</Text>
    </Box>
  );
}

/**
 * Pong game component
 */
export function PongGame({ hasFocus, dimensions, onExit, loopAttention, onLoopAlertDismiss }: GameComponentProps) {
  const boardWidth = Math.max(dimensions.width - 2, 25);
  const boardHeight = Math.max(dimensions.height - 5, 12);

  const [state, setState] = useState<PongState>(() =>
    createInitialState(boardWidth, boardHeight)
  );

  const [playerDirection, setPlayerDirection] = useState<-1 | 0 | 1>(0);
  const [showLoopAlert, setShowLoopAlert] = useState(false);
  const [wasPlayingBeforeAlert, setWasPlayingBeforeAlert] = useState(false);

  // Reset game when dimensions change
  useEffect(() => {
    setState(createInitialState(boardWidth, boardHeight));
  }, [boardWidth, boardHeight]);

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
  }, [loopAttention?.needsAttention, state.status, showLoopAlert, wasPlayingBeforeAlert]);

  const updateGame = useCallback(
    (deltaTime: number) => {
      setState((prev) => {
        if (prev.status !== "playing") return prev;

        const dt = deltaTime / 16; // Normalize to ~60fps

        // Move player paddle
        let newPlayerY = prev.playerY + playerDirection * PADDLE_SPEED * dt;
        newPlayerY = Math.max(
          1,
          Math.min(boardHeight - PADDLE_HEIGHT - 1, newPlayerY)
        );

        // AI movement (follows ball with some delay)
        const aiCenterY = prev.aiY + PADDLE_HEIGHT / 2;
        let newAiY = prev.aiY;
        if (prev.ball.y < aiCenterY - 1) {
          newAiY -= PADDLE_SPEED * 0.7 * dt;
        } else if (prev.ball.y > aiCenterY + 1) {
          newAiY += PADDLE_SPEED * 0.7 * dt;
        }
        newAiY = Math.max(1, Math.min(boardHeight - PADDLE_HEIGHT - 1, newAiY));

        // Move ball
        let newBallX = prev.ball.x + prev.ball.vx * dt;
        let newBallY = prev.ball.y + prev.ball.vy * dt;
        let newVx = prev.ball.vx;
        let newVy = prev.ball.vy;

        // Ball collision with top/bottom walls
        if (newBallY <= 1 || newBallY >= boardHeight - 2) {
          newVy = -newVy;
          newBallY = Math.max(1, Math.min(boardHeight - 2, newBallY));
        }

        // Ball collision with player paddle
        const paddleX = 2;
        if (
          newBallX <= paddleX + 1 &&
          newBallY >= newPlayerY &&
          newBallY <= newPlayerY + PADDLE_HEIGHT
        ) {
          newVx = Math.abs(newVx) * 1.05; // Speed up slightly
          newBallX = paddleX + 1;
          // Add spin based on where ball hit paddle
          const hitPos =
            (newBallY - newPlayerY - PADDLE_HEIGHT / 2) / (PADDLE_HEIGHT / 2);
          newVy += hitPos * 0.2;
        }

        // Ball collision with AI paddle
        const aiPaddleX = boardWidth - 3;
        if (
          newBallX >= aiPaddleX - 1 &&
          newBallY >= newAiY &&
          newBallY <= newAiY + PADDLE_HEIGHT
        ) {
          newVx = -Math.abs(newVx) * 1.05;
          newBallX = aiPaddleX - 1;
          const hitPos = (newBallY - newAiY - PADDLE_HEIGHT / 2) / (PADDLE_HEIGHT / 2);
          newVy += hitPos * 0.2;
        }

        // Clamp velocity
        const maxSpeed = BALL_SPEED * 3;
        newVx = Math.max(-maxSpeed, Math.min(maxSpeed, newVx));
        newVy = Math.max(-maxSpeed, Math.min(maxSpeed, newVy));

        // Check scoring
        let newPlayerScore = prev.playerScore;
        let newAiScore = prev.aiScore;
        let newStatus: PongState["status"] = prev.status;
        let newWinner: PongState["winner"] = prev.winner;

        if (newBallX <= 0) {
          // AI scores
          newAiScore += 1;
          if (newAiScore >= WIN_SCORE) {
            newStatus = "game_over";
            newWinner = "ai";
          } else {
            const resetedBall = resetBall(boardWidth, boardHeight, true);
            return {
              ...prev,
              playerY: newPlayerY,
              aiY: newAiY,
              ball: resetedBall,
              aiScore: newAiScore,
            };
          }
        } else if (newBallX >= boardWidth - 1) {
          // Player scores
          newPlayerScore += 1;
          if (newPlayerScore >= WIN_SCORE) {
            newStatus = "game_over";
            newWinner = "player";
          } else {
            const resetedBall = resetBall(boardWidth, boardHeight, false);
            return {
              ...prev,
              playerY: newPlayerY,
              aiY: newAiY,
              ball: resetedBall,
              playerScore: newPlayerScore,
            };
          }
        }

        return {
          ...prev,
          playerY: newPlayerY,
          aiY: newAiY,
          ball: {
            x: newBallX,
            y: newBallY,
            vx: newVx,
            vy: newVy,
          },
          playerScore: newPlayerScore,
          aiScore: newAiScore,
          status: newStatus,
          winner: newWinner,
        };
      });
    },
    [boardWidth, boardHeight, playerDirection]
  );

  // Game loop
  const { loopInfo } = useGameLoop({
    targetFps: 30,
    isActive: hasFocus && state.status === "playing",
    onTick: (info) => {
      updateGame(info.deltaTime);
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
        setState(createInitialState(boardWidth, boardHeight));
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

      // Movement
      if (key.upArrow || input === "w" || input === "W") {
        setPlayerDirection(-1);
      } else if (key.downArrow || input === "s" || input === "S") {
        setPlayerDirection(1);
      }
    },
    { isActive: hasFocus }
  );

  // Reset direction when keys released (approximate with timeout)
  useEffect(() => {
    if (playerDirection !== 0) {
      const timeout = setTimeout(() => setPlayerDirection(0), 100);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [playerDirection]);

  return (
    <Box flexDirection="column" height="100%">
      <ScoreDisplay
        playerScore={state.playerScore}
        aiScore={state.aiScore}
        fps={loopInfo.fps}
      />

      <Box flexGrow={1} justifyContent="center" alignItems="center">
        {state.status === "game_over" && state.winner ? (
          <GameOverOverlay winner={state.winner} />
        ) : state.status === "paused" && showLoopAlert && loopAttention ? (
          <LoopAlertOverlay attention={loopAttention} onDismiss={onLoopAlertDismiss} />
        ) : state.status === "paused" ? (
          <PausedOverlay />
        ) : (
          <GameBoard state={state} width={boardWidth} height={boardHeight} />
        )}
      </Box>

      <Box paddingX={1}>
        <Text dimColor>
          {hasFocus
            ? "↑/↓ or W/S: Move | P: Pause | R: Restart | Q: Exit"
            : "Press Tab to focus"}
        </Text>
      </Box>
    </Box>
  );
}

export default PongGame;
