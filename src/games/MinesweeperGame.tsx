/**
 * Minesweeper Game
 *
 * Classic Minesweeper puzzle game implemented with the game framework.
 * Features: Multiple difficulty levels, flag mechanics, timer, mine count.
 */

import { Box, Text, useInput } from "ink";
import { useState, useCallback, useRef, useEffect } from "react";
import type { GameComponentProps, GameInfo, Point } from "../game-types.js";
import { useGameLoop } from "../use-game-loop.js";
import { useBestTimes } from "../use-high-scores.js";
import { Leaderboard, formatTime } from "../Leaderboard.js";

/** Minesweeper game metadata */
export const minesweeperGameInfo: GameInfo = {
  id: "minesweeper",
  name: "Minesweeper",
  description: "Classic Minesweeper - find mines without triggering them!",
  controls: "Arrows to move, Space to reveal, F to flag, D for difficulty",
  minWidth: 30,
  minHeight: 15,
};

/** Difficulty settings */
interface DifficultySettings {
  name: string;
  width: number;
  height: number;
  mines: number;
}

const DIFFICULTIES: DifficultySettings[] = [
  { name: "Easy", width: 9, height: 9, mines: 10 },
  { name: "Medium", width: 16, height: 16, mines: 40 },
  { name: "Hard", width: 20, height: 12, mines: 60 },
];

/** Cell state */
interface Cell {
  hasMine: boolean;
  revealed: boolean;
  flagged: boolean;
  adjacentMines: number;
}

/** Game status */
type GameStatus = "playing" | "won" | "lost" | "selecting_difficulty" | "leaderboard";

/** Game state */
interface MinesweeperState {
  board: Cell[][];
  cursor: Point;
  status: GameStatus;
  minesRemaining: number;
  timeElapsed: number;
  difficultyIndex: number;
  firstClick: boolean;
  /** Position on leaderboard after winning (0 if not on leaderboard) */
  leaderboardPosition: number;
}

/** Create an empty board */
function createEmptyBoard(width: number, height: number): Cell[][] {
  return Array(height)
    .fill(null)
    .map(() =>
      Array(width)
        .fill(null)
        .map(() => ({
          hasMine: false,
          revealed: false,
          flagged: false,
          adjacentMines: 0,
        }))
    );
}

/** Place mines on the board, avoiding the safe zone around first click */
function placeMines(
  board: Cell[][],
  mineCount: number,
  safePoint: Point
): Cell[][] {
  const height = board.length;
  const width = board[0].length;
  const newBoard = board.map((row) => row.map((cell) => ({ ...cell })));

  let placed = 0;
  while (placed < mineCount) {
    const x = Math.floor(Math.random() * width);
    const y = Math.floor(Math.random() * height);

    // Skip if already has mine or too close to safe point
    if (newBoard[y][x].hasMine) continue;
    if (Math.abs(x - safePoint.x) <= 1 && Math.abs(y - safePoint.y) <= 1) {
      continue;
    }

    newBoard[y][x].hasMine = true;
    placed++;
  }

  // Calculate adjacent mine counts
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (newBoard[y][x].hasMine) continue;

      let count = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const ny = y + dy;
          const nx = x + dx;
          if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
            if (newBoard[ny][nx].hasMine) count++;
          }
        }
      }
      newBoard[y][x].adjacentMines = count;
    }
  }

  return newBoard;
}

/** Reveal a cell and cascade if empty */
function revealCell(board: Cell[][], point: Point): Cell[][] {
  const height = board.length;
  const width = board[0].length;
  const newBoard = board.map((row) => row.map((cell) => ({ ...cell })));

  const reveal = (x: number, y: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    if (newBoard[y][x].revealed || newBoard[y][x].flagged) return;

    newBoard[y][x].revealed = true;

    // If empty cell (no adjacent mines), reveal neighbors
    if (newBoard[y][x].adjacentMines === 0 && !newBoard[y][x].hasMine) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          reveal(x + dx, y + dy);
        }
      }
    }
  };

  reveal(point.x, point.y);
  return newBoard;
}

/** Reveal all mines (when game is lost) */
function revealAllMines(board: Cell[][]): Cell[][] {
  return board.map((row) =>
    row.map((cell) => ({
      ...cell,
      revealed: cell.hasMine ? true : cell.revealed,
    }))
  );
}

/** Check if the game is won */
function checkWin(board: Cell[][]): boolean {
  for (const row of board) {
    for (const cell of row) {
      // All non-mine cells must be revealed
      if (!cell.hasMine && !cell.revealed) return false;
    }
  }
  return true;
}

/** Count flagged cells */
function countFlags(board: Cell[][]): number {
  let count = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell.flagged) count++;
    }
  }
  return count;
}

/** Create initial game state */
function createInitialState(difficultyIndex: number): MinesweeperState {
  const diff = DIFFICULTIES[difficultyIndex];
  return {
    board: createEmptyBoard(diff.width, diff.height),
    cursor: { x: Math.floor(diff.width / 2), y: Math.floor(diff.height / 2) },
    status: "playing",
    minesRemaining: diff.mines,
    timeElapsed: 0,
    difficultyIndex,
    firstClick: true,
    leaderboardPosition: 0,
  };
}

/** Get cell display character */
function getCellDisplay(
  cell: Cell,
  isCursor: boolean,
  gameOver: boolean
): { char: string; color?: string; bgColor?: string } {
  const bgColor = isCursor ? "blue" : undefined;

  if (!cell.revealed) {
    if (cell.flagged) {
      // Show incorrect flags on game over
      if (gameOver && !cell.hasMine) {
        return { char: "✗", color: "red", bgColor };
      }
      return { char: "⚑", color: "red", bgColor };
    }
    return { char: "■", color: "gray", bgColor };
  }

  if (cell.hasMine) {
    return { char: "💣", color: "red", bgColor };
  }

  if (cell.adjacentMines === 0) {
    return { char: " ", bgColor };
  }

  const colors: Record<number, string> = {
    1: "blue",
    2: "green",
    3: "red",
    4: "#000080", // Dark blue
    5: "#800000", // Maroon
    6: "cyan",
    7: "black",
    8: "gray",
  };

  return {
    char: cell.adjacentMines.toString(),
    color: colors[cell.adjacentMines] || "white",
    bgColor,
  };
}

/** Game board component */
function GameBoard({
  board,
  cursor,
  status,
}: {
  board: Cell[][];
  cursor: Point;
  status: GameStatus;
}) {
  const width = board[0].length;
  const gameOver = status === "won" || status === "lost";

  return (
    <Box flexDirection="column">
      {/* Top border */}
      <Text color="gray">{"┌" + "──".repeat(width) + "┐"}</Text>

      {/* Board rows */}
      {board.map((row, y) => (
        <Box key={y}>
          <Text color="gray">│</Text>
          {row.map((cell, x) => {
            const isCursor = x === cursor.x && y === cursor.y;
            const display = getCellDisplay(cell, isCursor, gameOver);
            return (
              <Text
                key={x}
                color={display.color}
                backgroundColor={display.bgColor}
              >
                {display.char.length === 1 ? display.char + " " : display.char}
              </Text>
            );
          })}
          <Text color="gray">│</Text>
        </Box>
      ))}

      {/* Bottom border */}
      <Text color="gray">{"└" + "──".repeat(width) + "┘"}</Text>
    </Box>
  );
}

/** HUD component */
function GameHUD({
  minesRemaining,
  timeElapsed,
  difficulty,
  bestTime,
  fps,
}: {
  minesRemaining: number;
  timeElapsed: number;
  difficulty: string;
  bestTime: number;
  fps: number;
}) {
  return (
    <Box flexDirection="column" marginLeft={1}>
      <Box borderStyle="single" flexDirection="column" paddingX={1}>
        <Text bold>Mines</Text>
        <Text color="red">{minesRemaining.toString().padStart(3, " ")}</Text>
      </Box>
      <Box borderStyle="single" flexDirection="column" paddingX={1}>
        <Text bold>Time</Text>
        <Text color="yellow">{formatTime(timeElapsed)}</Text>
      </Box>
      <Box borderStyle="single" flexDirection="column" paddingX={1}>
        <Text bold>Level</Text>
        <Text color="cyan">{difficulty}</Text>
      </Box>
      <Box borderStyle="single" flexDirection="column" paddingX={1}>
        <Text dimColor>Best</Text>
        <Text dimColor>{formatTime(bestTime)}</Text>
      </Box>
      <Text dimColor>{fps} FPS</Text>
    </Box>
  );
}

/** Difficulty selector */
function DifficultySelector({
  selectedIndex,
  bestTimes,
}: {
  selectedIndex: number;
  bestTimes: number[];
}) {
  return (
    <Box flexDirection="column" alignItems="center" padding={2}>
      <Text bold color="cyan">
        Select Difficulty
      </Text>
      <Text> </Text>
      {DIFFICULTIES.map((diff, i) => (
        <Box key={i}>
          <Text
            color={i === selectedIndex ? "green" : "white"}
            bold={i === selectedIndex}
          >
            {i === selectedIndex ? "▶ " : "  "}
            {diff.name.padEnd(8)} {diff.width}x{diff.height} ({diff.mines}{" "}
            mines) Best: {formatTime(bestTimes[i])}
          </Text>
        </Box>
      ))}
      <Text> </Text>
      <Text dimColor>↑↓ to select, Enter to start</Text>
    </Box>
  );
}

/** Game over overlay */
function GameOverOverlay({
  won,
  timeElapsed,
  leaderboardPosition,
}: {
  won: boolean;
  timeElapsed: number;
  leaderboardPosition: number;
}) {
  return (
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      padding={1}
    >
      <Text bold color={won ? "green" : "red"}>
        {won ? "YOU WIN!" : "GAME OVER"}
      </Text>
      <Text>
        Time: <Text color="yellow">{formatTime(timeElapsed)}</Text>
      </Text>
      {won && leaderboardPosition > 0 && (
        <Box
          flexDirection="column"
          alignItems="center"
          borderStyle="double"
          borderColor="green"
          paddingX={2}
          paddingY={1}
        >
          <Text bold color="green">
            NEW BEST TIME!
          </Text>
          <Text>
            You ranked{" "}
            <Text color="cyan">
              {leaderboardPosition === 1
                ? "1st"
                : leaderboardPosition === 2
                  ? "2nd"
                  : leaderboardPosition === 3
                    ? "3rd"
                    : `${leaderboardPosition}th`}
            </Text>{" "}
            place!
          </Text>
        </Box>
      )}
      <Text dimColor>R to restart | H for leaderboard | D to change difficulty</Text>
    </Box>
  );
}

/** Get game ID for a specific difficulty */
function getGameIdForDifficulty(difficultyIndex: number): string {
  const diffName = DIFFICULTIES[difficultyIndex].name.toLowerCase();
  return `minesweeper-${diffName}`;
}

/**
 * Minesweeper game component
 */
export function MinesweeperGame({ hasFocus, onExit }: GameComponentProps) {
  const [state, setState] = useState<MinesweeperState>(() =>
    createInitialState(0)
  );
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState(0);
  const scoreSubmittedRef = useRef(false);

  // High score persistence for current difficulty
  const { bestTime, leaderboard, submitTime } = useBestTimes(
    getGameIdForDifficulty(state.difficultyIndex)
  );

  // Get best times for all difficulties for the selector
  const { bestTime: easyBest } = useBestTimes("minesweeper-easy");
  const { bestTime: mediumBest } = useBestTimes("minesweeper-medium");
  const { bestTime: hardBest } = useBestTimes("minesweeper-hard");
  const allBestTimes = [easyBest, mediumBest, hardBest];

  // Submit time when game is won
  useEffect(() => {
    if (state.status === "won" && !scoreSubmittedRef.current && state.timeElapsed > 0) {
      scoreSubmittedRef.current = true;
      submitTime(state.timeElapsed, { difficulty: DIFFICULTIES[state.difficultyIndex].name }).then((position) => {
        if (position > 0) {
          setState((prev) => ({ ...prev, leaderboardPosition: position }));
        }
      });
    }
  }, [state.status, state.timeElapsed, state.difficultyIndex, submitTime]);

  // Game timer
  useEffect(() => {
    if (
      state.status === "playing" &&
      !state.firstClick &&
      hasFocus &&
      !timerRef.current
    ) {
      timerRef.current = setInterval(() => {
        setState((prev) => ({
          ...prev,
          timeElapsed: Math.min(prev.timeElapsed + 1, 999),
        }));
      }, 1000);
    } else if (
      (state.status !== "playing" || state.firstClick || !hasFocus) &&
      timerRef.current
    ) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [state.status, state.firstClick, hasFocus]);

  // Reveal cell
  const reveal = useCallback(() => {
    setState((prev) => {
      if (prev.status !== "playing") return prev;

      const { x, y } = prev.cursor;
      const cell = prev.board[y][x];

      // Can't reveal flagged cells
      if (cell.flagged) return prev;

      // Already revealed - do chord reveal if adjacent flags match adjacent mines
      if (cell.revealed && cell.adjacentMines > 0) {
        // Count adjacent flags
        let flagCount = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            if (
              ny >= 0 &&
              ny < prev.board.length &&
              nx >= 0 &&
              nx < prev.board[0].length
            ) {
              if (prev.board[ny][nx].flagged) flagCount++;
            }
          }
        }

        // If flags match, reveal adjacent non-flagged cells
        if (flagCount === cell.adjacentMines) {
          let newBoard = prev.board.map((row) =>
            row.map((c) => ({ ...c }))
          );
          let hitMine = false;

          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const ny = y + dy;
              const nx = x + dx;
              if (
                ny >= 0 &&
                ny < newBoard.length &&
                nx >= 0 &&
                nx < newBoard[0].length
              ) {
                const neighbor = newBoard[ny][nx];
                if (!neighbor.flagged && !neighbor.revealed) {
                  if (neighbor.hasMine) {
                    hitMine = true;
                  }
                  newBoard = revealCell(newBoard, { x: nx, y: ny });
                }
              }
            }
          }

          if (hitMine) {
            return {
              ...prev,
              board: revealAllMines(newBoard),
              status: "lost",
            };
          }

          if (checkWin(newBoard)) {
            return {
              ...prev,
              board: newBoard,
              status: "won",
            };
          }

          return { ...prev, board: newBoard };
        }
        return prev;
      }

      // First click - generate mines
      if (prev.firstClick) {
        const diff = DIFFICULTIES[prev.difficultyIndex];
        let newBoard = placeMines(prev.board, diff.mines, prev.cursor);
        newBoard = revealCell(newBoard, prev.cursor);

        return {
          ...prev,
          board: newBoard,
          firstClick: false,
        };
      }

      // Hit a mine
      if (cell.hasMine) {
        return {
          ...prev,
          board: revealAllMines(prev.board),
          status: "lost",
        };
      }

      // Reveal the cell
      const newBoard = revealCell(prev.board, prev.cursor);

      // Check win condition
      if (checkWin(newBoard)) {
        return {
          ...prev,
          board: newBoard,
          status: "won",
        };
      }

      return { ...prev, board: newBoard };
    });
  }, []);

  // Toggle flag
  const toggleFlag = useCallback(() => {
    setState((prev) => {
      if (prev.status !== "playing" || prev.firstClick) return prev;

      const { x, y } = prev.cursor;
      const cell = prev.board[y][x];

      // Can't flag revealed cells
      if (cell.revealed) return prev;

      const newBoard = prev.board.map((row) => row.map((c) => ({ ...c })));
      newBoard[y][x].flagged = !newBoard[y][x].flagged;

      const diff = DIFFICULTIES[prev.difficultyIndex];
      const flaggedCount = countFlags(newBoard);

      return {
        ...prev,
        board: newBoard,
        minesRemaining: diff.mines - flaggedCount,
      };
    });
  }, []);

  // Move cursor
  const moveCursor = useCallback((dx: number, dy: number) => {
    setState((prev) => {
      if (prev.status === "selecting_difficulty") return prev;

      const width = prev.board[0].length;
      const height = prev.board.length;
      const newX = Math.max(0, Math.min(width - 1, prev.cursor.x + dx));
      const newY = Math.max(0, Math.min(height - 1, prev.cursor.y + dy));

      return {
        ...prev,
        cursor: { x: newX, y: newY },
      };
    });
  }, []);

  // Game loop for FPS display
  const { loopInfo } = useGameLoop({
    targetFps: 10, // Low FPS needed, mostly cursor-driven
    isActive: hasFocus && state.status === "playing",
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

      // Difficulty selection mode
      if (state.status === "selecting_difficulty") {
        if (key.upArrow) {
          setSelectedDifficulty((prev) =>
            prev > 0 ? prev - 1 : DIFFICULTIES.length - 1
          );
        } else if (key.downArrow) {
          setSelectedDifficulty((prev) =>
            prev < DIFFICULTIES.length - 1 ? prev + 1 : 0
          );
        } else if (key.return) {
          scoreSubmittedRef.current = false;
          setState(createInitialState(selectedDifficulty));
        }
        return;
      }

      // Change difficulty
      if (input === "d" || input === "D") {
        setSelectedDifficulty(state.difficultyIndex);
        setState((prev) => ({ ...prev, status: "selecting_difficulty" }));
        return;
      }

      // Show leaderboard (when game over)
      if ((input === "h" || input === "H") && (state.status === "won" || state.status === "lost" || state.status === "leaderboard")) {
        setState((prev) => ({
          ...prev,
          status: prev.status === "leaderboard" ? "won" : "leaderboard",
        }));
        return;
      }

      // Restart
      if (input === "r" || input === "R") {
        scoreSubmittedRef.current = false;
        setState(createInitialState(state.difficultyIndex));
        return;
      }

      if (state.status !== "playing") return;

      // Movement
      if (key.leftArrow || input === "a" || input === "A") {
        moveCursor(-1, 0);
      } else if (key.rightArrow || input === "d" || input === "D") {
        moveCursor(1, 0);
      } else if (key.upArrow || input === "w" || input === "W") {
        moveCursor(0, -1);
      } else if (key.downArrow || input === "s" || input === "S") {
        moveCursor(0, 1);
      } else if (input === " " || key.return) {
        reveal();
      } else if (input === "f" || input === "F") {
        toggleFlag();
      }
    },
    { isActive: hasFocus }
  );

  const diff = DIFFICULTIES[state.difficultyIndex];

  return (
    <Box flexDirection="column" height="100%">
      {state.status === "selecting_difficulty" ? (
        <Box flexGrow={1} justifyContent="center" alignItems="center">
          <DifficultySelector
            selectedIndex={selectedDifficulty}
            bestTimes={allBestTimes}
          />
        </Box>
      ) : state.status === "leaderboard" ? (
        <Box flexGrow={1} justifyContent="center" alignItems="center">
          <Leaderboard
            title={`${diff.name} Best Times`}
            scores={leaderboard}
            lowerIsBetter={true}
            formatScore={formatTime}
            highlightPosition={state.leaderboardPosition}
          />
        </Box>
      ) : state.status === "won" || state.status === "lost" ? (
        <Box flexDirection="column" flexGrow={1}>
          <Box>
            <GameBoard
              board={state.board}
              cursor={state.cursor}
              status={state.status}
            />
            <GameHUD
              minesRemaining={state.minesRemaining}
              timeElapsed={state.timeElapsed}
              difficulty={diff.name}
              bestTime={bestTime}
              fps={loopInfo.fps}
            />
          </Box>
          <GameOverOverlay
            won={state.status === "won"}
            timeElapsed={state.timeElapsed}
            leaderboardPosition={state.leaderboardPosition}
          />
        </Box>
      ) : (
        <Box flexGrow={1}>
          <GameBoard
            board={state.board}
            cursor={state.cursor}
            status={state.status}
          />
          <GameHUD
            minesRemaining={state.minesRemaining}
            timeElapsed={state.timeElapsed}
            difficulty={diff.name}
            bestTime={bestTime}
            fps={loopInfo.fps}
          />
        </Box>
      )}

      <Box paddingX={1}>
        <Text dimColor>
          {hasFocus
            ? state.status === "leaderboard"
              ? "H: Back | R: Restart | D: Difficulty | Q: Exit"
              : "←→↑↓: Move | Space: Reveal | F: Flag | D: Difficulty | R: Restart | H: Times | Q: Exit"
            : "Press Tab to focus"}
        </Text>
      </Box>
    </Box>
  );
}

export default MinesweeperGame;
