/**
 * Minesweeper Game - OpenTUI Version
 *
 * Classic Minesweeper puzzle game implemented with OpenTUI components.
 * Features: Multiple difficulty levels, flag mechanics, timer, cursor-based controls.
 */

import { useKeyboard } from "@opentui/react";
import { useState, useCallback, useEffect, useRef } from "react";
import type { GameComponentProps, GameInfo, Point } from "../game-types.js";
import { useGameLoop } from "../hooks/useGameLoop.js";
import { useHighScores } from "../data/useHighScores.js";
import { useGameSession } from "../data/useStats.js";

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
type GameStatus = "playing" | "paused" | "won" | "lost" | "selecting_difficulty";

/** Game state */
interface MinesweeperState {
  board: Cell[][];
  cursor: Point;
  status: GameStatus;
  minesRemaining: number;
  timeElapsed: number;
  difficultyIndex: number;
  firstClick: boolean;
  bestTimes: number[];
}

/** UI Colors */
const COLORS = {
  border: "#888888",
  cursor: "#00FFFF",
  hidden: "#888888",
  flag: "#FF0000",
  mine: "#FF0000",
  wrongFlag: "#FF6600",
  gameOver: "#FF0000",
  won: "#00FF00",
  paused: "#FFFF00",
  hint: "#666666",
  selected: "#00FF00",
  difficulty: "#00FFFF",
  time: "#FFFF00",
  // Number colors for adjacent mine counts
  num1: "#0000FF", // Blue
  num2: "#00AA00", // Green
  num3: "#FF0000", // Red
  num4: "#000080", // Dark blue
  num5: "#800000", // Maroon
  num6: "#008080", // Teal
  num7: "#000000", // Black
  num8: "#808080", // Gray
};

/** Get color for adjacent mine count */
function getNumberColor(num: number): string {
  const colorMap: Record<number, string> = {
    1: COLORS.num1,
    2: COLORS.num2,
    3: COLORS.num3,
    4: COLORS.num4,
    5: COLORS.num5,
    6: COLORS.num6,
    7: COLORS.num7,
    8: COLORS.num8,
  };
  return colorMap[num] || COLORS.hint;
}

/** Format time as MM:SS */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
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
function createInitialState(
  difficultyIndex: number,
  bestTimes: number[] = [0, 0, 0]
): MinesweeperState {
  const diff = DIFFICULTIES[difficultyIndex];
  return {
    board: createEmptyBoard(diff.width, diff.height),
    cursor: { x: Math.floor(diff.width / 2), y: Math.floor(diff.height / 2) },
    status: "playing",
    minesRemaining: diff.mines,
    timeElapsed: 0,
    difficultyIndex,
    firstClick: true,
    bestTimes,
  };
}

/**
 * Minesweeper game component for OpenTUI
 */
export function MinesweeperGame({
  hasFocus,
  onExit,
  loopAttention,
  onLoopAlertDismiss,
  onGameStateChange,
  autoPauseEnabled = true,
}: GameComponentProps) {
  const { highScore, submit } = useHighScores("minesweeper", "asc");
  const session = useGameSession("minesweeper");

  const [state, setState] = useState<MinesweeperState>(() =>
    createInitialState(0)
  );
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState(0);
  const [showLoopAlert, setShowLoopAlert] = useState(false);
  const [wasPlayingBeforeAlert, setWasPlayingBeforeAlert] = useState(false);

  // Report game state changes to status bar
  useEffect(() => {
    // Map minesweeper-specific status to generic game status
    const mappedStatus =
      state.status === "won" || state.status === "lost"
        ? "game_over"
        : state.status === "selecting_difficulty"
          ? "menu"
          : state.status;
    onGameStateChange?.({
      score: state.timeElapsed,
      status: mappedStatus,
      highScore: highScore > 0 ? highScore : null,
    });
  }, [state.timeElapsed, state.status, highScore, onGameStateChange]);

  useEffect(() => {
    if (state.status === "playing" && !session.isActive) {
      session.startSession();
    }
  }, [session, state.status]);

  useEffect(() => {
    if (state.status === "won") {
      if (state.timeElapsed > 0) {
        void submit(state.timeElapsed);
      }
      void session.endSession({ score: state.timeElapsed, won: true });
    }
    if (state.status === "lost") {
      void session.endSession({ score: state.timeElapsed, won: false });
    }
  }, [session, state.status, state.timeElapsed, submit]);

  // Auto-pause when loop needs attention (if enabled)
  useEffect(() => {
    if (
      autoPauseEnabled &&
      loopAttention?.needsAttention &&
      state.status === "playing"
    ) {
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
          let newBoard = prev.board.map((row) => row.map((c) => ({ ...c })));
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
            // Update best time if this is a new record
            const newBestTimes = [...prev.bestTimes];
            if (
              newBestTimes[prev.difficultyIndex] === 0 ||
              prev.timeElapsed < newBestTimes[prev.difficultyIndex]
            ) {
              newBestTimes[prev.difficultyIndex] = prev.timeElapsed;
            }
            return {
              ...prev,
              board: newBoard,
              status: "won",
              bestTimes: newBestTimes,
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
        // Update best time if this is a new record
        const newBestTimes = [...prev.bestTimes];
        if (
          newBestTimes[prev.difficultyIndex] === 0 ||
          prev.timeElapsed < newBestTimes[prev.difficultyIndex]
        ) {
          newBestTimes[prev.difficultyIndex] = prev.timeElapsed;
        }
        return {
          ...prev,
          board: newBoard,
          status: "won",
          bestTimes: newBestTimes,
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

  // Game loop (just for consistency, minesweeper doesn't need frame timing)
  useGameLoop({
    targetFps: 10,
    isActive: hasFocus && state.status === "playing",
  });

  // Handle input
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

        // Difficulty selection mode
        if (state.status === "selecting_difficulty") {
          if (keyName === "up" || keyName === "arrowup" || keyName === "w") {
            setSelectedDifficulty((prev) =>
              prev > 0 ? prev - 1 : DIFFICULTIES.length - 1
            );
          } else if (keyName === "down" || keyName === "arrowdown" || keyName === "s") {
            setSelectedDifficulty((prev) =>
              prev < DIFFICULTIES.length - 1 ? prev + 1 : 0
            );
          } else if (keyName === "return") {
            setState((prev) =>
              createInitialState(selectedDifficulty, prev.bestTimes)
            );
          }
          return;
        }

        // Change difficulty
        if (keyName === "d") {
          setSelectedDifficulty(state.difficultyIndex);
          setState((prev) => ({ ...prev, status: "selecting_difficulty" }));
          return;
        }

        // Dismiss loop alert with Enter key when paused and showing alert
        if (keyName === "return" && showLoopAlert && state.status === "paused") {
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
            status:
              prev.status === "playing"
                ? "paused"
                : prev.status === "paused"
                  ? "playing"
                  : prev.status,
          }));
          return;
        }

        // Restart
        if (keyName === "r") {
          setState((prev) =>
            createInitialState(prev.difficultyIndex, prev.bestTimes)
          );
          return;
        }

        if (state.status !== "playing") return;

        // Movement
        if (keyName === "left" || keyName === "arrowleft" || keyName === "a") {
          moveCursor(-1, 0);
        } else if (keyName === "right" || keyName === "arrowright") {
          // Note: 'd' is for difficulty, so only use arrow key
          moveCursor(1, 0);
        } else if (keyName === "up" || keyName === "arrowup" || keyName === "w") {
          moveCursor(0, -1);
        } else if (keyName === "down" || keyName === "arrowdown" || keyName === "s") {
          moveCursor(0, 1);
        } else if (keyName === "space" || keyName === " ") {
          reveal();
        } else if (keyName === "f") {
          toggleFlag();
        }
      },
      [
        hasFocus,
        state.status,
        state.difficultyIndex,
        selectedDifficulty,
        showLoopAlert,
        moveCursor,
        reveal,
        toggleFlag,
        onExit,
        onLoopAlertDismiss,
      ]
    )
  );

  const diff = DIFFICULTIES[state.difficultyIndex];
  const gameOver = state.status === "won" || state.status === "lost";

  // Get cell display
  const getCellDisplay = (
    cell: Cell,
    isCursor: boolean
  ): { char: string; color?: string; bgColor?: string } => {
    const bgColor = isCursor ? COLORS.cursor : undefined;

    if (!cell.revealed) {
      if (cell.flagged) {
        // Show incorrect flags on game over
        if (gameOver && !cell.hasMine) {
          return { char: "✗", color: COLORS.wrongFlag, bgColor };
        }
        return { char: "⚑", color: COLORS.flag, bgColor };
      }
      return { char: "■", color: COLORS.hidden, bgColor };
    }

    if (cell.hasMine) {
      return { char: "💣", color: COLORS.mine, bgColor };
    }

    if (cell.adjacentMines === 0) {
      return { char: " ", bgColor };
    }

    return {
      char: cell.adjacentMines.toString(),
      color: getNumberColor(cell.adjacentMines),
      bgColor,
    };
  };

  // Render stats bar
  const renderStats = () => (
    <box
      style={{
        flexDirection: "row",
        gap: 2,
        paddingLeft: 1,
        paddingRight: 1,
      }}
    >
      <text>
        <strong>Mines:</strong> <span fg={COLORS.flag}>{state.minesRemaining.toString().padStart(2, " ")}</span>
      </text>
      <text>
        <strong>Time:</strong> <span fg={COLORS.time}>{formatTime(state.timeElapsed)}</span>
      </text>
      <text>
        <strong fg={COLORS.difficulty}>{diff.name}</strong>
      </text>
      <text fg={COLORS.hint}>
        Best: {formatTime(state.bestTimes[state.difficultyIndex])}
      </text>
    </box>
  );

  // Render game board
  const renderBoard = () => (
    <box style={{ flexDirection: "column" }}>
      {/* Top border */}
      <text fg={COLORS.border}>{"┌" + "──".repeat(diff.width) + "┐"}</text>

      {/* Board rows */}
      {state.board.map((row, y) => (
        <box key={y} style={{ flexDirection: "row" }}>
          <text fg={COLORS.border}>│</text>
          {row.map((cell, x) => {
            const isCursor = x === state.cursor.x && y === state.cursor.y;
            const display = getCellDisplay(cell, isCursor);
            return (
              <text
                key={x}
                fg={display.color}
                bg={display.bgColor}
              >
                {display.char.length === 1 ? display.char + " " : display.char}
              </text>
            );
          })}
          <text fg={COLORS.border}>│</text>
        </box>
      ))}

      {/* Bottom border */}
      <text fg={COLORS.border}>{"└" + "──".repeat(diff.width) + "┘"}</text>
    </box>
  );

  // Render difficulty selector
  const renderDifficultySelector = () => (
    <box
      style={{
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        flexGrow: 1,
        padding: 2,
      }}
    >
      <text>
        <strong fg={COLORS.difficulty}>Select Difficulty</strong>
      </text>
      <text> </text>
      {DIFFICULTIES.map((d, i) => (
        <box key={i}>
          <text
            fg={i === selectedDifficulty ? COLORS.selected : undefined}
          >
            {i === selectedDifficulty ? "▶ " : "  "}
            <span>{d.name.padEnd(8)} {d.width}x{d.height} ({d.mines} mines)</span>
            <span fg={COLORS.hint}> Best: {formatTime(state.bestTimes[i])}</span>
          </text>
        </box>
      ))}
      <text> </text>
      <text fg={COLORS.hint}>↑↓ to select, Enter to start</text>
    </box>
  );

  // Render paused overlay
  const renderPaused = () => (
    <box
      style={{
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        flexGrow: 1,
      }}
    >
      {showLoopAlert && loopAttention ? (
        <>
          <text fg={COLORS.paused}>
            <strong>CLAUDE NEEDS INPUT</strong>
          </text>
          <text fg={COLORS.hint}>
            {loopAttention.reason || "Waiting for input..."}
          </text>
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

  // Render game over overlay
  const renderGameOver = () => {
    const won = state.status === "won";
    const isNewBest =
      won &&
      state.timeElapsed > 0 &&
      (state.bestTimes[state.difficultyIndex] === state.timeElapsed ||
        state.bestTimes[state.difficultyIndex] === 0);

    return (
      <box style={{ flexDirection: "column", flexGrow: 1 }}>
        {renderStats()}
        {renderBoard()}
        <box
          style={{
            flexDirection: "column",
            alignItems: "center",
            padding: 1,
          }}
        >
          <text fg={won ? COLORS.won : COLORS.gameOver}>
            <strong>{won ? "YOU WIN!" : "GAME OVER"}</strong>
          </text>
          <text>
            Time: <span fg={COLORS.time}>{formatTime(state.timeElapsed)}</span>
          </text>
          {won && isNewBest && (
            <text fg={COLORS.won}>
              <strong>NEW BEST TIME!</strong>
            </text>
          )}
          <text fg={COLORS.hint}>R to restart | D for difficulty | Q to exit</text>
        </box>
      </box>
    );
  };

  // Render controls hint
  const renderControls = () => (
    <box style={{ paddingLeft: 1 }}>
      <text fg={COLORS.hint}>
        Arrow keys: Move | Space: Reveal | F: Flag | D: Difficulty | P: Pause | R: Restart | Q: Exit
      </text>
    </box>
  );

  return (
    <box style={{ flexDirection: "column", flexGrow: 1 }}>
      {state.status === "selecting_difficulty" ? (
        renderDifficultySelector()
      ) : state.status === "paused" ? (
        <>
          {renderStats()}
          {renderPaused()}
          {renderControls()}
        </>
      ) : state.status === "won" || state.status === "lost" ? (
        renderGameOver()
      ) : (
        <>
          {renderStats()}
          {renderBoard()}
          {renderControls()}
        </>
      )}
    </box>
  );
}

export default MinesweeperGame;
