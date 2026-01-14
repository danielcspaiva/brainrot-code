/**
 * React Hook for High Score Management
 *
 * Provides a React-friendly interface to the high score persistence system.
 */

import { useState, useEffect, useCallback } from "react";
import {
  getLeaderboard,
  getHighScore,
  submitScore,
  submitBestTime,
  getBestTime,
  type ScoreEntry,
} from "./high-scores.js";

/** Hook return type for regular score games (higher is better) */
export interface UseHighScoresResult {
  /** The current high score */
  highScore: number;
  /** The full leaderboard */
  leaderboard: ScoreEntry[];
  /** Whether the leaderboard is loading */
  isLoading: boolean;
  /** Submit a new score - returns position (1-10) or 0 if not on leaderboard */
  submitScore: (
    score: number,
    metadata?: Record<string, string | number>
  ) => Promise<number>;
  /** Refresh the leaderboard from disk */
  refresh: () => Promise<void>;
}

/** Hook return type for time-based games (lower is better) */
export interface UseBestTimesResult {
  /** The current best time */
  bestTime: number;
  /** The full leaderboard */
  leaderboard: ScoreEntry[];
  /** Whether the leaderboard is loading */
  isLoading: boolean;
  /** Submit a new time - returns position (1-10) or 0 if not on leaderboard */
  submitTime: (
    timeSeconds: number,
    metadata?: Record<string, string | number>
  ) => Promise<number>;
  /** Refresh the leaderboard from disk */
  refresh: () => Promise<void>;
}

/**
 * Hook for games where higher scores are better (Snake, Tetris)
 */
export function useHighScores(gameId: string): UseHighScoresResult {
  const [highScore, setHighScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState<ScoreEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [score, board] = await Promise.all([
        getHighScore(gameId),
        getLeaderboard(gameId),
      ]);
      setHighScore(score);
      setLeaderboard(board.scores);
    } catch {
      // Silently fail - use defaults
    }
    setIsLoading(false);
  }, [gameId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Submit a score
  const handleSubmitScore = useCallback(
    async (
      score: number,
      metadata?: Record<string, string | number>
    ): Promise<number> => {
      const position = await submitScore(gameId, score, metadata);

      // Refresh data after submission
      if (position > 0) {
        await loadData();
      }

      return position;
    },
    [gameId, loadData]
  );

  return {
    highScore,
    leaderboard,
    isLoading,
    submitScore: handleSubmitScore,
    refresh: loadData,
  };
}

/**
 * Hook for games where lower times are better (Minesweeper)
 */
export function useBestTimes(gameId: string): UseBestTimesResult {
  const [bestTime, setBestTime] = useState(999);
  const [leaderboard, setLeaderboard] = useState<ScoreEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [time, board] = await Promise.all([
        getBestTime(gameId),
        getLeaderboard(gameId),
      ]);
      setBestTime(time);
      setLeaderboard(board.scores);
    } catch {
      // Silently fail - use defaults
    }
    setIsLoading(false);
  }, [gameId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Submit a time
  const handleSubmitTime = useCallback(
    async (
      timeSeconds: number,
      metadata?: Record<string, string | number>
    ): Promise<number> => {
      const position = await submitBestTime(gameId, timeSeconds, metadata);

      // Refresh data after submission
      if (position > 0) {
        await loadData();
      }

      return position;
    },
    [gameId, loadData]
  );

  return {
    bestTime,
    leaderboard,
    isLoading,
    submitTime: handleSubmitTime,
    refresh: loadData,
  };
}
