/**
 * Tetris Game - OpenTUI Version
 *
 * Classic Tetris game implemented with OpenTUI components.
 * Features: 7 standard pieces, rotation, line clearing, scoring, next piece preview.
 */

import { useKeyboard } from "@opentui/react";
import { useState, useCallback, useEffect, useRef } from "react";
import type { GameComponentProps, GameInfo, Point } from "../game-types.js";
import { useGameLoop } from "../hooks/useGameLoop.js";

/** Tetris game metadata */
export const tetrisGameInfo: GameInfo = {
  id: "tetris",
  name: "Tetris",
  description: "Classic Tetris - clear lines with falling blocks!",
  controls: "Arrow keys to move/rotate, Space to drop, P to pause",
  minWidth: 30,
  minHeight: 20,
};

/** Tetromino piece types */
type TetrominoType = "I" | "O" | "T" | "S" | "Z" | "J" | "L";

/** Tetromino shape definition (relative coordinates) */
interface Tetromino {
  type: TetrominoType;
  blocks: Point[];
}

/** Board cell state */
interface Cell {
  filled: boolean;
  pieceType?: TetrominoType;
}

/** Game state */
interface TetrisState {
  board: Cell[][];
  currentPiece: Tetromino | null;
  piecePosition: Point;
  nextPiece: TetrominoType;
  score: number;
  level: number;
  lines: number;
  status: "playing" | "paused" | "game_over";
  clearingLines: number[];
  clearAnimFrame: number;
  highScore: number;
}

/** Board dimensions */
const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;

/** Piece colors */
const PIECE_COLORS: Record<TetrominoType, string> = {
  I: "#00FFFF", // Cyan
  O: "#FFFF00", // Yellow
  T: "#FF00FF", // Magenta
  S: "#00FF00", // Green
  Z: "#FF0000", // Red
  J: "#0000FF", // Blue
  L: "#FFA500", // Orange
};

/** UI Colors */
const COLORS = {
  border: "#888888",
  score: "#FFFF00",
  level: "#00FFFF",
  lines: "#00FF00",
  highScore: "#888888",
  fps: "#666666",
  gameOver: "#FF0000",
  paused: "#FFFF00",
  hint: "#666666",
  ghost: "#444444",
  flashOn: "#FFFFFF",
};

/** Piece definitions with their rotations */
const PIECE_DEFINITIONS: Record<TetrominoType, { blocks: Point[] }> = {
  I: {
    blocks: [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
    ],
  },
  O: {
    blocks: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ],
  },
  T: {
    blocks: [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
  },
  S: {
    blocks: [
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ],
  },
  Z: {
    blocks: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
  },
  J: {
    blocks: [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
  },
  L: {
    blocks: [
      { x: 2, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
  },
};

const PIECE_TYPES: TetrominoType[] = ["I", "O", "T", "S", "Z", "J", "L"];

/** Create a new piece */
function createPiece(type: TetrominoType): Tetromino {
  const def = PIECE_DEFINITIONS[type];
  return {
    type,
    blocks: [...def.blocks],
  };
}

/** Get a random piece type */
function randomPieceType(): TetrominoType {
  return PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
}

/** Create empty board */
function createEmptyBoard(): Cell[][] {
  return Array(BOARD_HEIGHT)
    .fill(null)
    .map(() =>
      Array(BOARD_WIDTH)
        .fill(null)
        .map(() => ({ filled: false }))
    );
}

/** Rotate piece 90 degrees clockwise */
function rotatePiece(piece: Tetromino): Tetromino {
  if (piece.type === "O") return piece; // O doesn't rotate

  // Find bounding box
  const minX = Math.min(...piece.blocks.map((b) => b.x));
  const minY = Math.min(...piece.blocks.map((b) => b.y));
  const maxY = Math.max(...piece.blocks.map((b) => b.y));

  const height = maxY - minY + 1;

  // Rotate around center
  const newBlocks = piece.blocks.map((block) => {
    const relX = block.x - minX;
    const relY = block.y - minY;
    return {
      x: height - 1 - relY + minX,
      y: relX + minY,
    };
  });

  // Normalize to start from 0
  const newMinX = Math.min(...newBlocks.map((b) => b.x));
  const newMinY = Math.min(...newBlocks.map((b) => b.y));

  return {
    ...piece,
    blocks: newBlocks.map((b) => ({
      x: b.x - newMinX,
      y: b.y - newMinY,
    })),
  };
}

/** Check if piece position is valid */
function isValidPosition(
  board: Cell[][],
  piece: Tetromino,
  position: Point
): boolean {
  for (const block of piece.blocks) {
    const x = position.x + block.x;
    const y = position.y + block.y;

    // Check bounds
    if (x < 0 || x >= BOARD_WIDTH || y >= BOARD_HEIGHT) {
      return false;
    }

    // Allow blocks above the board
    if (y < 0) continue;

    // Check collision with placed blocks
    if (board[y][x].filled) {
      return false;
    }
  }
  return true;
}

/** Place piece on board */
function placePiece(
  board: Cell[][],
  piece: Tetromino,
  position: Point
): Cell[][] {
  const newBoard = board.map((row) => row.map((cell) => ({ ...cell })));

  for (const block of piece.blocks) {
    const x = position.x + block.x;
    const y = position.y + block.y;
    if (y >= 0 && y < BOARD_HEIGHT && x >= 0 && x < BOARD_WIDTH) {
      newBoard[y][x] = { filled: true, pieceType: piece.type };
    }
  }

  return newBoard;
}

/** Find completed lines */
function findCompletedLines(board: Cell[][]): number[] {
  const lines: number[] = [];
  for (let y = 0; y < BOARD_HEIGHT; y++) {
    if (board[y].every((cell) => cell.filled)) {
      lines.push(y);
    }
  }
  return lines;
}

/** Clear completed lines */
function clearLines(board: Cell[][], lines: number[]): Cell[][] {
  if (lines.length === 0) return board;

  const newBoard = board.filter((_, y) => !lines.includes(y));

  // Add empty rows at top
  while (newBoard.length < BOARD_HEIGHT) {
    newBoard.unshift(
      Array(BOARD_WIDTH)
        .fill(null)
        .map(() => ({ filled: false }))
    );
  }

  return newBoard;
}

/** Calculate score for cleared lines */
function calculateLineScore(lines: number, level: number): number {
  const baseScores: Record<number, number> = {
    1: 100,
    2: 300,
    3: 500,
    4: 800, // Tetris!
  };
  return (baseScores[lines] || 0) * (level + 1);
}

/** Calculate drop speed based on level */
function getDropSpeed(level: number): number {
  // Starts at 1000ms, decreases with level
  return Math.max(100, 1000 - level * 80);
}

/** Create initial game state */
function createInitialState(highScore: number = 0): TetrisState {
  const firstPiece = randomPieceType();
  const nextPiece = randomPieceType();

  return {
    board: createEmptyBoard(),
    currentPiece: createPiece(firstPiece),
    piecePosition: { x: Math.floor((BOARD_WIDTH - 4) / 2), y: 0 },
    nextPiece,
    score: 0,
    level: 0,
    lines: 0,
    status: "playing",
    clearingLines: [],
    clearAnimFrame: 0,
    highScore,
  };
}

/**
 * Tetris game component for OpenTUI
 */
export function TetrisGame({
  hasFocus,
  onExit,
  loopAttention,
  onLoopAlertDismiss,
  onGameStateChange,
  autoPauseEnabled = true,
}: GameComponentProps) {
  const [state, setState] = useState<TetrisState>(() => createInitialState());
  const lastDropTime = useRef(0);
  const clearAnimTimer = useRef(0);
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

  // Lock piece and check for lines
  const lockPiece = useCallback(() => {
    setState((prev) => {
      if (!prev.currentPiece) return prev;

      const newBoard = placePiece(
        prev.board,
        prev.currentPiece,
        prev.piecePosition
      );
      const completedLines = findCompletedLines(newBoard);

      if (completedLines.length > 0) {
        // Start line clearing animation
        return {
          ...prev,
          board: newBoard,
          currentPiece: null,
          clearingLines: completedLines,
          clearAnimFrame: 0,
        };
      }

      // No lines to clear, spawn new piece immediately
      const newPiece = createPiece(prev.nextPiece);
      const startPosition = { x: Math.floor((BOARD_WIDTH - 4) / 2), y: 0 };

      if (!isValidPosition(newBoard, newPiece, startPosition)) {
        const newHighScore = Math.max(prev.score, prev.highScore);
        return {
          ...prev,
          board: newBoard,
          status: "game_over",
          highScore: newHighScore,
        };
      }

      return {
        ...prev,
        board: newBoard,
        currentPiece: newPiece,
        piecePosition: startPosition,
        nextPiece: randomPieceType(),
      };
    });
  }, []);

  // Move piece
  const movePiece = useCallback(
    (dx: number, dy: number) => {
      setState((prev) => {
        if (!prev.currentPiece || prev.status !== "playing") return prev;

        const newPosition = {
          x: prev.piecePosition.x + dx,
          y: prev.piecePosition.y + dy,
        };

        if (isValidPosition(prev.board, prev.currentPiece, newPosition)) {
          return { ...prev, piecePosition: newPosition };
        }

        // If moving down and invalid, lock piece
        if (dy > 0) {
          lockPiece();
        }

        return prev;
      });
    },
    [lockPiece]
  );

  // Rotate piece
  const rotate = useCallback(() => {
    setState((prev) => {
      if (!prev.currentPiece || prev.status !== "playing") return prev;

      const rotated = rotatePiece(prev.currentPiece);

      // Try normal rotation
      if (isValidPosition(prev.board, rotated, prev.piecePosition)) {
        return { ...prev, currentPiece: rotated };
      }

      // Wall kick attempts
      const kicks = [
        { x: -1, y: 0 },
        { x: 1, y: 0 },
        { x: -2, y: 0 },
        { x: 2, y: 0 },
        { x: 0, y: -1 },
      ];

      for (const kick of kicks) {
        const kickedPosition = {
          x: prev.piecePosition.x + kick.x,
          y: prev.piecePosition.y + kick.y,
        };
        if (isValidPosition(prev.board, rotated, kickedPosition)) {
          return {
            ...prev,
            currentPiece: rotated,
            piecePosition: kickedPosition,
          };
        }
      }

      return prev;
    });
  }, []);

  // Hard drop
  const hardDrop = useCallback(() => {
    setState((prev) => {
      if (!prev.currentPiece || prev.status !== "playing") return prev;

      let dropY = prev.piecePosition.y;
      while (
        isValidPosition(prev.board, prev.currentPiece, {
          x: prev.piecePosition.x,
          y: dropY + 1,
        })
      ) {
        dropY++;
      }

      // Add points for hard drop (2 per cell)
      const dropDistance = dropY - prev.piecePosition.y;
      const newScore = prev.score + dropDistance * 2;

      const newBoard = placePiece(prev.board, prev.currentPiece, {
        x: prev.piecePosition.x,
        y: dropY,
      });
      const completedLines = findCompletedLines(newBoard);

      if (completedLines.length > 0) {
        return {
          ...prev,
          board: newBoard,
          currentPiece: null,
          score: newScore,
          clearingLines: completedLines,
          clearAnimFrame: 0,
        };
      }

      const newPiece = createPiece(prev.nextPiece);
      const startPosition = { x: Math.floor((BOARD_WIDTH - 4) / 2), y: 0 };

      if (!isValidPosition(newBoard, newPiece, startPosition)) {
        const newHighScore = Math.max(newScore, prev.highScore);
        return {
          ...prev,
          board: newBoard,
          score: newScore,
          status: "game_over",
          highScore: newHighScore,
        };
      }

      return {
        ...prev,
        board: newBoard,
        currentPiece: newPiece,
        piecePosition: startPosition,
        nextPiece: randomPieceType(),
        score: newScore,
      };
    });
  }, []);

  // Game loop
  const { loopInfo } = useGameLoop({
    targetFps: 30,
    isActive: hasFocus && state.status === "playing",
    onTick: (info) => {
      // Handle line clearing animation
      if (state.clearingLines.length > 0) {
        clearAnimTimer.current += info.deltaTime;
        if (clearAnimTimer.current >= 100) {
          // 100ms per frame
          clearAnimTimer.current = 0;
          setState((prev) => {
            const newFrame = prev.clearAnimFrame + 1;
            if (newFrame >= 4) {
              // Animation complete, clear lines
              const clearedBoard = clearLines(prev.board, prev.clearingLines);
              const lineCount = prev.clearingLines.length;
              const lineScore = calculateLineScore(lineCount, prev.level);
              const newLines = prev.lines + lineCount;
              const newLevel = Math.floor(newLines / 10);

              // Spawn new piece
              const newPiece = createPiece(prev.nextPiece);
              const startPosition = {
                x: Math.floor((BOARD_WIDTH - 4) / 2),
                y: 0,
              };

              if (!isValidPosition(clearedBoard, newPiece, startPosition)) {
                const newHighScore = Math.max(prev.score + lineScore, prev.highScore);
                return {
                  ...prev,
                  board: clearedBoard,
                  score: prev.score + lineScore,
                  lines: newLines,
                  level: newLevel,
                  clearingLines: [],
                  clearAnimFrame: 0,
                  status: "game_over",
                  highScore: newHighScore,
                };
              }

              return {
                ...prev,
                board: clearedBoard,
                currentPiece: newPiece,
                piecePosition: startPosition,
                nextPiece: randomPieceType(),
                score: prev.score + lineScore,
                lines: newLines,
                level: newLevel,
                clearingLines: [],
                clearAnimFrame: 0,
              };
            }
            return { ...prev, clearAnimFrame: newFrame };
          });
        }
        return;
      }

      // Auto drop
      const dropSpeed = getDropSpeed(state.level);
      if (info.elapsedTime - lastDropTime.current >= dropSpeed) {
        movePiece(0, 1);
        lastDropTime.current = info.elapsedTime;
      }
    },
  });

  // Handle keyboard input
  useKeyboard(
    useCallback(
      (key) => {
        if (!hasFocus) return;

        const keyName = key.name.toLowerCase();

        // Exit
        if (keyName === "q" || keyName === "escape") {
          onExit();
          return;
        }

        // Restart
        if (keyName === "r") {
          setState((prev) => createInitialState(prev.highScore));
          lastDropTime.current = 0;
          clearAnimTimer.current = 0;
          return;
        }

        // Dismiss loop alert with Enter key
        if (keyName === "return" && showLoopAlert) {
          setShowLoopAlert(false);
          onLoopAlertDismiss?.();
          return;
        }

        // Pause
        if (keyName === "p") {
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

        if (state.status !== "playing" || state.clearingLines.length > 0) return;

        // Movement
        if (keyName === "left" || keyName === "arrowleft" || keyName === "a") {
          movePiece(-1, 0);
        } else if (keyName === "right" || keyName === "arrowright" || keyName === "d") {
          movePiece(1, 0);
        } else if (keyName === "down" || keyName === "arrowdown" || keyName === "s") {
          movePiece(0, 1);
          setState((prev) => ({ ...prev, score: prev.score + 1 })); // Soft drop bonus
        } else if (keyName === "up" || keyName === "arrowup" || keyName === "w") {
          rotate();
        } else if (keyName === "space" || keyName === " ") {
          hardDrop();
        }
      },
      [hasFocus, state.status, state.clearingLines, showLoopAlert, movePiece, rotate, hardDrop, onExit, onLoopAlertDismiss]
    )
  );

  // Build display board
  const buildDisplayBoard = (): { char: string; color: string }[][] => {
    const display: { char: string; color: string }[][] = state.board.map((row, y) =>
      row.map((cell) => {
        if (cell.filled && cell.pieceType) {
          return { char: "██", color: PIECE_COLORS[cell.pieceType] };
        }
        return { char: "  ", color: "" };
      })
    );

    // Add current piece
    if (state.currentPiece) {
      for (const block of state.currentPiece.blocks) {
        const x = state.piecePosition.x + block.x;
        const y = state.piecePosition.y + block.y;
        if (y >= 0 && y < BOARD_HEIGHT && x >= 0 && x < BOARD_WIDTH) {
          display[y][x] = { char: "██", color: PIECE_COLORS[state.currentPiece.type] };
        }
      }

      // Add ghost piece (drop preview)
      let ghostY = state.piecePosition.y;
      while (
        isValidPosition(state.board, state.currentPiece, {
          x: state.piecePosition.x,
          y: ghostY + 1,
        })
      ) {
        ghostY++;
      }
      if (ghostY !== state.piecePosition.y) {
        for (const block of state.currentPiece.blocks) {
          const x = state.piecePosition.x + block.x;
          const y = ghostY + block.y;
          if (
            y >= 0 &&
            y < BOARD_HEIGHT &&
            x >= 0 &&
            x < BOARD_WIDTH &&
            display[y][x].char === "  "
          ) {
            display[y][x] = { char: "░░", color: COLORS.ghost };
          }
        }
      }
    }

    return display;
  };

  // Render next piece preview
  const renderNextPiecePreview = () => {
    const piece = createPiece(state.nextPiece);
    const grid: { char: string; color: string }[][] = Array(4)
      .fill(null)
      .map(() => Array(4).fill(null).map(() => ({ char: " ", color: "" })));

    const offsetX = piece.type === "I" ? 0 : 1;
    const offsetY = piece.type === "I" ? 1 : 1;

    for (const block of piece.blocks) {
      const y = block.y + offsetY;
      const x = block.x + offsetX;
      if (y >= 0 && y < 4 && x >= 0 && x < 4) {
        grid[y][x] = { char: "█", color: PIECE_COLORS[state.nextPiece] };
      }
    }

    return (
      <box style={{ flexDirection: "column", borderStyle: "single", paddingLeft: 1, paddingRight: 1 }}>
        <text><strong>Next:</strong></text>
        {grid.map((row, y) => (
          <box key={y} style={{ flexDirection: "row" }}>
            {row.map((cell, x) => (
              <text key={x} fg={cell.color || undefined}>{cell.char}</text>
            ))}
          </box>
        ))}
      </box>
    );
  };

  // Render HUD
  const renderHUD = () => (
    <box style={{ flexDirection: "row", gap: 2, paddingLeft: 1, paddingRight: 1 }}>
      <text>
        <strong>Score:</strong> <span fg={COLORS.score}>{state.score}</span>
      </text>
      <text>
        <strong>Level:</strong> <span fg={COLORS.level}>{state.level}</span>
      </text>
      <text>
        <strong>Lines:</strong> <span fg={COLORS.lines}>{state.lines}</span>
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
      <text>
        Level: <span fg={COLORS.level}>{state.level}</span> | Lines: <span fg={COLORS.lines}>{state.lines}</span>
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

  // Render game board
  const renderBoard = () => {
    const display = buildDisplayBoard();
    const isClearing = state.clearingLines.length > 0;
    const flashOn = state.clearAnimFrame % 2 === 0;

    return (
      <box style={{ flexDirection: "row", flexGrow: 1 }}>
        <box style={{ flexDirection: "column" }}>
          {/* Top border */}
          <text fg={COLORS.border}>{"┌" + "──".repeat(BOARD_WIDTH) + "┐"}</text>

          {/* Board rows */}
          {display.map((row, y) => (
            <box key={y} style={{ flexDirection: "row" }}>
              <text fg={COLORS.border}>│</text>
              {row.map((cell, x) => {
                // Line clearing animation
                if (isClearing && state.clearingLines.includes(y)) {
                  return (
                    <text key={x} fg={flashOn ? COLORS.flashOn : undefined}>
                      {flashOn ? "██" : "  "}
                    </text>
                  );
                }
                return (
                  <text key={x} fg={cell.color || undefined}>
                    {cell.char}
                  </text>
                );
              })}
              <text fg={COLORS.border}>│</text>
            </box>
          ))}

          {/* Bottom border */}
          <text fg={COLORS.border}>{"└" + "──".repeat(BOARD_WIDTH) + "┘"}</text>
        </box>

        {/* Next piece preview */}
        {renderNextPiecePreview()}
      </box>
    );
  };

  // Render controls hint
  const renderControls = () => (
    <box style={{ paddingLeft: 1 }}>
      <text fg={COLORS.hint}>Arrow/WASD: Move | Up/W: Rotate | Space: Drop | P: Pause | R: Restart | Q: Exit</text>
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

export default TetrisGame;
