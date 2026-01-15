/**
 * Pong Game - OpenTUI Version
 *
 * Single-player pong against AI.
 * Demonstrates continuous movement and collision detection.
 */

import { useKeyboard } from "@opentui/react";
import { useState, useCallback, useEffect, useRef } from "react";
import type { GameComponentProps, GameInfo } from "../game-types.js";
import { useGameLoop } from "../hooks/useGameLoop.js";
import { useHighScores } from "../data/useHighScores.js";
import { useGameSession } from "../data/useStats.js";

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

/** Colors for game elements */
const COLORS = {
  border: "#888888",
  centerLine: "#555555",
  player: "#00FF00",
  opponent: "#FF6600",
  ball: "#FFFF00",
  score: "#FFFFFF",
  hint: "#666666",
  paused: "#FFFF00",
  win: "#00FF00",
  lose: "#FF0000",
};

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

function resetBall(
  width: number,
  height: number,
  towardsPlayer: boolean
): Ball {
  return {
    x: Math.floor(width / 2),
    y: Math.floor(height / 2),
    vx: BALL_SPEED * (towardsPlayer ? -1 : 1),
    vy: BALL_SPEED * (Math.random() - 0.5),
  };
}

/**
 * Pong game component for OpenTUI
 */
export function PongGame({
  hasFocus,
  dimensions,
  onExit,
  loopAttention,
  onLoopAlertDismiss,
  onGameStateChange,
  autoPauseEnabled = true,
}: GameComponentProps) {
  // Calculate game board size (leaving room for HUD)
  const boardWidth = Math.max(dimensions.width - 2, 25);
  const boardHeight = Math.max(dimensions.height - 5, 12);

  const { highScore, submit } = useHighScores("pong");
  const session = useGameSession("pong");

  const [state, setState] = useState<PongState>(() =>
    createInitialState(boardWidth, boardHeight)
  );

  const [playerDirection, setPlayerDirection] = useState<-1 | 0 | 1>(0);
  const [showLoopAlert, setShowLoopAlert] = useState(false);
  const [wasPlayingBeforeAlert, setWasPlayingBeforeAlert] = useState(false);
  const playerDirectionRef = useRef<-1 | 0 | 1>(0);

  // Keep ref in sync with state
  useEffect(() => {
    playerDirectionRef.current = playerDirection;
  }, [playerDirection]);

  // Report game state changes to status bar
  useEffect(() => {
    onGameStateChange?.({
      score: state.playerScore,
      status: state.status,
      highScore: highScore || null,
    });
  }, [state.playerScore, state.status, highScore, onGameStateChange]);

  useEffect(() => {
    if (state.status === "playing" && !session.isActive) {
      session.startSession();
    }
  }, [session, state.status]);

  useEffect(() => {
    if (state.status === "game_over") {
      if (state.playerScore > 0) {
        void submit(state.playerScore);
      }
      void session.endSession({
        score: state.playerScore,
        won: state.winner === "player",
      });
    }
  }, [session, state.playerScore, state.status, state.winner, submit]);

  // Reset game when dimensions change
  useEffect(() => {
    setState(createInitialState(boardWidth, boardHeight));
  }, [boardWidth, boardHeight]);

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

  const updateGame = useCallback(
    (deltaTime: number) => {
      setState((prev) => {
        if (prev.status !== "playing") return prev;

        const dt = deltaTime / 16; // Normalize to ~60fps
        const currentDirection = playerDirectionRef.current;

        // Move player paddle
        let newPlayerY = prev.playerY + currentDirection * PADDLE_SPEED * dt;
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
          const hitPos =
            (newBallY - newAiY - PADDLE_HEIGHT / 2) / (PADDLE_HEIGHT / 2);
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
    [boardWidth, boardHeight]
  );

  // Game loop
  const { loopInfo } = useGameLoop({
    targetFps: 30,
    isActive: hasFocus && state.status === "playing",
    onTick: (info) => {
      updateGame(info.deltaTime);
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
          setState(createInitialState(boardWidth, boardHeight));
          setPlayerDirection(0);
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

        // Movement - only set direction while playing
        if (state.status !== "playing") return;

        if (keyName === "up" || keyName === "arrowup" || keyName === "w") {
          setPlayerDirection(-1);
        } else if (keyName === "down" || keyName === "arrowdown" || keyName === "s") {
          setPlayerDirection(1);
        }
      },
      [hasFocus, state.status, showLoopAlert, boardWidth, boardHeight, onExit, onLoopAlertDismiss]
    )
  );

  // Reset direction when keys released (approximate with timeout)
  useEffect(() => {
    if (playerDirection !== 0) {
      const timeout = setTimeout(() => setPlayerDirection(0), 100);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [playerDirection]);

  // Build the game board as a 2D array
  const board: string[][] = [];
  for (let y = 0; y < boardHeight; y++) {
    const row: string[] = [];
    for (let x = 0; x < boardWidth; x++) {
      // Border (top/bottom only)
      if (y === 0 || y === boardHeight - 1) {
        row.push("═");
      } else if (x === Math.floor(boardWidth / 2)) {
        // Center line
        row.push("│");
      } else {
        row.push(" ");
      }
    }
    board.push(row);
  }

  // Corners
  if (boardHeight > 0 && boardWidth > 0) {
    board[0][0] = "╔";
    board[0][boardWidth - 1] = "╗";
    board[boardHeight - 1][0] = "╚";
    board[boardHeight - 1][boardWidth - 1] = "╝";
  }

  // Player paddle (left side)
  const paddleX = 2;
  for (let i = 0; i < PADDLE_HEIGHT; i++) {
    const y = Math.round(state.playerY) + i;
    if (y > 0 && y < boardHeight - 1) {
      board[y][paddleX] = "█";
    }
  }

  // AI paddle (right side)
  const aiPaddleX = boardWidth - 3;
  for (let i = 0; i < PADDLE_HEIGHT; i++) {
    const y = Math.round(state.aiY) + i;
    if (y > 0 && y < boardHeight - 1) {
      board[y][aiPaddleX] = "█";
    }
  }

  // Ball
  const ballX = Math.round(state.ball.x);
  const ballY = Math.round(state.ball.y);
  if (ballY > 0 && ballY < boardHeight - 1 && ballX > 0 && ballX < boardWidth - 1) {
    board[ballY][ballX] = "●";
  }

  // Render HUD (score display)
  const renderHUD = () => (
    <box style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 1, paddingRight: 1 }}>
      <text>
        <span fg={COLORS.player}>Player: </span>
        <span fg={COLORS.player}>{state.playerScore}</span>
      </text>
      <text fg={COLORS.hint}>First to {WIN_SCORE} wins</text>
      <text>
        <span fg={COLORS.opponent}>AI: </span>
        <span fg={COLORS.opponent}>{state.aiScore}</span>
      </text>
      <text fg={COLORS.hint}>{loopInfo.fps} FPS</text>
    </box>
  );

  // Render game over overlay
  const renderGameOver = () => (
    <box style={{ flexDirection: "column", alignItems: "center", justifyContent: "center", flexGrow: 1 }}>
      <text fg={state.winner === "player" ? COLORS.win : COLORS.lose}>
        <strong>{state.winner === "player" ? "YOU WIN!" : "AI WINS!"}</strong>
      </text>
      <text fg={COLORS.hint}>Press R to play again | Q to exit</text>
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

            // Player paddle
            const isPlayerPaddle =
              x === paddleX &&
              y >= Math.round(state.playerY) &&
              y < Math.round(state.playerY) + PADDLE_HEIGHT;
            // AI paddle
            const isAIPaddle =
              x === aiPaddleX &&
              y >= Math.round(state.aiY) &&
              y < Math.round(state.aiY) + PADDLE_HEIGHT;
            // Ball
            const isBall = x === ballX && y === ballY;
            // Center line
            const isCenterLine = x === Math.floor(boardWidth / 2) && cell === "│";

            if (isPlayerPaddle) {
              color = COLORS.player;
            } else if (isAIPaddle) {
              color = COLORS.opponent;
            } else if (isBall) {
              color = COLORS.ball;
            } else if (isCenterLine) {
              color = COLORS.centerLine;
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
      <text fg={COLORS.hint}>↑/↓ or W/S: Move | P: Pause | R: Restart | Q: Exit</text>
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

export default PongGame;
