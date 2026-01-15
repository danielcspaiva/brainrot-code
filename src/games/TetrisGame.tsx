/**
 * Tetris Game
 *
 * Classic Tetris game implemented with the game framework.
 * Features: 7 standard pieces, rotation, line clearing, scoring, next piece preview.
 */

import { Box, Text, useInput } from "ink";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import type { GameComponentProps, GameInfo, Point } from "../game-types.js";
import { useGameLoop } from "../use-game-loop.js";
import { useHighScores } from "../use-high-scores.js";
import { useGameSession } from "../use-stats.js";
import { Leaderboard, NewHighScoreBanner } from "../Leaderboard.js";
import { LoopAlertOverlay } from "../LoopAlertOverlay.js";
import { useThemeColors, useGameColors } from "../useTheme.js";

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
  status: "playing" | "paused" | "game_over" | "leaderboard";
  clearingLines: number[];
  clearAnimFrame: number;
  /** Position on leaderboard after game over (0 if not on leaderboard) */
  leaderboardPosition: number;
}

/** Board dimensions */
const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;

/** Piece definitions with their rotations */
const PIECE_DEFINITIONS: Record<
  TetrominoType,
  { blocks: Point[] }
> = {
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

/** Hook to get theme-aware piece colors */
function usePieceColors(): Record<TetrominoType, string> {
  const colors = useThemeColors();
  const gameColors = useGameColors();

  return useMemo(() => ({
    I: colors.primary,      // Cyan in default theme
    O: colors.accent,       // Yellow in default theme
    T: colors.secondary,    // Magenta in default theme
    S: colors.success,      // Green in default theme
    Z: colors.error,        // Red in default theme
    J: colors.info,         // Cyan/Blue in default theme
    L: gameColors.item,     // Yellow/Orange in default theme
  }), [colors, gameColors]);
}

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
function createInitialState(): TetrisState {
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
    leaderboardPosition: 0,
  };
}

/** Next piece preview component */
function NextPiecePreview({ pieceType }: { pieceType: TetrominoType }) {
  const pieceColors = usePieceColors();
  const piece = createPiece(pieceType);
  const grid: string[][] = Array(4)
    .fill(null)
    .map(() => Array(4).fill(" "));

  // Center the piece in the preview
  const offsetX = piece.type === "I" ? 0 : 1;
  const offsetY = piece.type === "I" ? 1 : 1;

  for (const block of piece.blocks) {
    const y = block.y + offsetY;
    const x = block.x + offsetX;
    if (y >= 0 && y < 4 && x >= 0 && x < 4) {
      grid[y][x] = "█";
    }
  }

  return (
    <Box flexDirection="column" borderStyle="single" paddingX={1}>
      <Text bold>Next:</Text>
      {grid.map((row, y) => (
        <Box key={y}>
          {row.map((cell, x) => (
            <Text key={x} color={cell === "█" ? pieceColors[pieceType] : undefined}>
              {cell}
            </Text>
          ))}
        </Box>
      ))}
    </Box>
  );
}

/** Game board component */
function GameBoard({
  board,
  currentPiece,
  piecePosition,
  clearingLines,
  clearAnimFrame,
}: {
  board: Cell[][];
  currentPiece: Tetromino | null;
  piecePosition: Point;
  clearingLines: number[];
  clearAnimFrame: number;
}) {
  const colors = useThemeColors();
  const pieceColors = usePieceColors();

  // Create display board
  const display: { char: string; pieceType?: TetrominoType }[][] = board.map((row, _y) =>
    row.map((cell) => {
      if (cell.filled) {
        return { char: "█", pieceType: cell.pieceType };
      }
      return { char: " " };
    })
  );

  // Add current piece
  if (currentPiece) {
    for (const block of currentPiece.blocks) {
      const x = piecePosition.x + block.x;
      const y = piecePosition.y + block.y;
      if (y >= 0 && y < BOARD_HEIGHT && x >= 0 && x < BOARD_WIDTH) {
        display[y][x] = { char: "█", pieceType: currentPiece.type };
      }
    }

    // Add ghost piece (drop preview)
    let ghostY = piecePosition.y;
    while (
      isValidPosition(board, currentPiece, {
        x: piecePosition.x,
        y: ghostY + 1,
      })
    ) {
      ghostY++;
    }
    if (ghostY !== piecePosition.y) {
      for (const block of currentPiece.blocks) {
        const x = piecePosition.x + block.x;
        const y = ghostY + block.y;
        if (
          y >= 0 &&
          y < BOARD_HEIGHT &&
          x >= 0 &&
          x < BOARD_WIDTH &&
          !display[y][x].pieceType
        ) {
          // Ghost piece uses neutral/muted color
          display[y][x] = { char: "░" };
        }
      }
    }
  }

  // Apply line clearing animation
  const isClearing = clearingLines.length > 0;
  const flashOn = clearAnimFrame % 2 === 0;

  return (
    <Box flexDirection="column">
      {/* Top border */}
      <Text color={colors.border}>{"┌" + "──".repeat(BOARD_WIDTH) + "┐"}</Text>

      {/* Board rows */}
      {display.map((row, y) => (
        <Box key={y}>
          <Text color={colors.border}>│</Text>
          {row.map((cell, x) => {
            // Line clearing animation
            if (isClearing && clearingLines.includes(y)) {
              return (
                <Text key={x} color={flashOn ? colors.text : undefined}>
                  {flashOn ? "██" : "  "}
                </Text>
              );
            }

            // Get color based on piece type
            const cellColor = cell.pieceType
              ? pieceColors[cell.pieceType]
              : cell.char === "░"
                ? colors.textMuted
                : undefined;

            return (
              <Text key={x} color={cellColor}>
                {cell.char}
                {cell.char}
              </Text>
            );
          })}
          <Text color={colors.border}>│</Text>
        </Box>
      ))}

      {/* Bottom border */}
      <Text color={colors.border}>{"└" + "──".repeat(BOARD_WIDTH) + "┘"}</Text>
    </Box>
  );
}

/** Game over overlay */
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

/** Paused overlay */
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

/** Compact horizontal stats bar */
function GameStats({
  score,
  highScore,
  level,
  lines,
}: {
  score: number;
  highScore: number;
  level: number;
  lines: number;
}) {
  return (
    <Box paddingX={1} gap={2}>
      <Text>
        <Text bold>Score:</Text> <Text color="yellow">{score}</Text>
      </Text>
      <Text>
        <Text bold>Level:</Text> <Text color="cyan">{level}</Text>
      </Text>
      <Text>
        <Text bold>Lines:</Text> <Text color="green">{lines}</Text>
      </Text>
      <Text dimColor>High: {highScore}</Text>
    </Box>
  );
}

/**
 * Tetris game component
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
  const scoreSubmittedRef = useRef(false);
  const statsSubmittedRef = useRef(false);
  const [showLoopAlert, setShowLoopAlert] = useState(false);
  const [wasPlayingBeforeAlert, setWasPlayingBeforeAlert] = useState(false);

  // High score persistence
  const { highScore, leaderboard, submitScore } = useHighScores("tetris");

  // Stats tracking
  const { startSession, endSession, isSessionActive } =
    useGameSession("tetris");

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

  // Auto-pause when loop needs attention (if enabled)
  useEffect(() => {
    if (autoPauseEnabled && loopAttention?.needsAttention && state.status === "playing") {
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
    autoPauseEnabled,
    loopAttention?.needsAttention,
    state.status,
    showLoopAlert,
    wasPlayingBeforeAlert,
  ]);

  // Start session when game starts
  useEffect(() => {
    if (state.status === "playing" && !isSessionActive) {
      startSession();
    }
  }, [state.status, isSessionActive, startSession]);

  // Submit score when game ends
  useEffect(() => {
    if (
      state.status === "game_over" &&
      !scoreSubmittedRef.current &&
      state.score > 0
    ) {
      scoreSubmittedRef.current = true;
      submitScore(state.score, { level: state.level, lines: state.lines }).then(
        (position) => {
          if (position > 0) {
            setState((prev) => ({ ...prev, leaderboardPosition: position }));
          }
        }
      );
    }

    // Record stats when game ends
    if (state.status === "game_over" && !statsSubmittedRef.current) {
      statsSubmittedRef.current = true;
      void endSession(state.score, undefined, { linesCleared: state.lines });
    }
  }, [
    state.status,
    state.score,
    state.level,
    state.lines,
    submitScore,
    endSession,
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
        return {
          ...prev,
          board: newBoard,
          status: "game_over",
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
        return {
          ...prev,
          board: newBoard,
          score: newScore,
          status: "game_over",
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
  useGameLoop({
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
                return {
                  ...prev,
                  board: clearedBoard,
                  score: prev.score + lineScore,
                  lines: newLines,
                  level: newLevel,
                  clearingLines: [],
                  clearAnimFrame: 0,
                  status: "game_over",
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

  // Handle input
  useInput(
    (input, key) => {
      if (!hasFocus) return;

      // Exit
      if (input === "q" || input === "Q" || key.escape) {
        onExit();
        return;
      }

      // Restart
      if (input === "r" || input === "R") {
        scoreSubmittedRef.current = false;
        statsSubmittedRef.current = false;
        setState(createInitialState());
        lastDropTime.current = 0;
        clearAnimTimer.current = 0;
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

      // Pause
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

      if (state.status !== "playing" || state.clearingLines.length > 0) return;

      // Movement
      if (key.leftArrow || input === "a" || input === "A") {
        movePiece(-1, 0);
      } else if (key.rightArrow || input === "d" || input === "D") {
        movePiece(1, 0);
      } else if (key.downArrow || input === "s" || input === "S") {
        movePiece(0, 1);
        setState((prev) => ({ ...prev, score: prev.score + 1 })); // Soft drop bonus
      } else if (key.upArrow || input === "w" || input === "W") {
        rotate();
      } else if (input === " ") {
        hardDrop();
      }
    },
    { isActive: hasFocus }
  );

  return (
    <Box flexDirection="column" height="100%" overflow="hidden">
      {state.status === "leaderboard" ? (
        <Box flexGrow={1} justifyContent="center" alignItems="center">
          <Leaderboard
            title="Tetris High Scores"
            scores={leaderboard}
            highlightPosition={state.leaderboardPosition}
          />
        </Box>
      ) : state.status === "game_over" ? (
        <Box flexGrow={1} justifyContent="center" alignItems="center">
          <GameOverOverlay
            score={state.score}
            leaderboardPosition={state.leaderboardPosition}
          />
        </Box>
      ) : state.status === "paused" && showLoopAlert && loopAttention ? (
        <Box flexGrow={1} justifyContent="center" alignItems="center">
          <LoopAlertOverlay
            attention={loopAttention}
            onDismiss={onLoopAlertDismiss}
          />
        </Box>
      ) : state.status === "paused" ? (
        <Box flexGrow={1} justifyContent="center" alignItems="center">
          <PausedOverlay />
        </Box>
      ) : (
        <Box flexDirection="column" flexGrow={1}>
          <GameStats
            score={state.score}
            highScore={highScore}
            level={state.level}
            lines={state.lines}
          />
          <Box flexGrow={1}>
            <GameBoard
              board={state.board}
              currentPiece={state.currentPiece}
              piecePosition={state.piecePosition}
              clearingLines={state.clearingLines}
              clearAnimFrame={state.clearAnimFrame}
            />
            <NextPiecePreview pieceType={state.nextPiece} />
          </Box>
        </Box>
      )}
    </Box>
  );
}

export default TetrisGame;
