/**
 * Stats Hook
 *
 * React hook for tracking game stats and achievements.
 * Provides easy integration with game components.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  type GameStats,
  type GlobalStats,
  type Achievement,
  getGameStats,
  getGlobalStats,
  recordGameSession,
  getAchievements,
  getAchievementById,
  getAchievementCount,
} from "./stats.js";

export interface UseStatsResult {
  /** Stats for the specific game */
  gameStats: GameStats;
  /** Global stats across all games */
  globalStats: GlobalStats;
  /** Whether stats are still loading */
  isLoading: boolean;
  /** Record end of a game session */
  recordSession: (
    score: number,
    duration: number,
    won?: boolean,
    customStats?: Record<string, number>
  ) => Promise<string[]>;
  /** Reload stats from disk */
  refreshStats: () => Promise<void>;
}

/**
 * Hook for tracking stats for a specific game
 */
export function useStats(gameId: string): UseStatsResult {
  const [gameStats, setGameStats] = useState<GameStats>({
    gamesPlayed: 0,
    timePlayed: 0,
    highestScore: 0,
    totalScore: 0,
    wins: 0,
    losses: 0,
    lastPlayed: null,
  });
  const [globalStats, setGlobalStats] = useState<GlobalStats>({
    totalGamesPlayed: 0,
    totalTimePlayed: 0,
    achievementsUnlocked: 0,
    firstPlayed: null,
    lastPlayed: null,
    sessionCount: 0,
    currentStreak: 0,
    bestStreak: 0,
    lastStreakDate: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const [game, global] = await Promise.all([
        getGameStats(gameId),
        getGlobalStats(),
      ]);
      setGameStats(game);
      setGlobalStats(global);
    } finally {
      setIsLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const recordSession = useCallback(
    async (
      score: number,
      duration: number,
      won?: boolean,
      customStats?: Record<string, number>
    ): Promise<string[]> => {
      const newAchievements = await recordGameSession(
        gameId,
        score,
        duration,
        won,
        customStats
      );
      // Reload stats after recording
      await loadStats();
      return newAchievements;
    },
    [gameId, loadStats]
  );

  return {
    gameStats,
    globalStats,
    isLoading,
    recordSession,
    refreshStats: loadStats,
  };
}

export interface UseAchievementsResult {
  /** All achievements with unlock status */
  achievements: Array<
    Achievement & { unlocked: boolean; unlockedAt: string | null }
  >;
  /** Total number of achievements */
  total: number;
  /** Number of unlocked achievements */
  unlocked: number;
  /** Whether achievements are still loading */
  isLoading: boolean;
  /** Get achievement details by ID */
  getAchievement: (id: string) => Achievement | undefined;
  /** Reload achievements from disk */
  refreshAchievements: () => Promise<void>;
}

/**
 * Hook for accessing achievements
 */
export function useAchievements(): UseAchievementsResult {
  const [achievements, setAchievements] = useState<
    Array<Achievement & { unlocked: boolean; unlockedAt: string | null }>
  >([]);
  const [total, setTotal] = useState(0);
  const [unlocked, setUnlocked] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadAchievements = useCallback(async () => {
    setIsLoading(true);
    try {
      const [achievementsList, counts] = await Promise.all([
        getAchievements(),
        getAchievementCount(),
      ]);
      setAchievements(achievementsList);
      setTotal(counts.total);
      setUnlocked(counts.unlocked);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAchievements();
  }, [loadAchievements]);

  return {
    achievements,
    total,
    unlocked,
    isLoading,
    getAchievement: getAchievementById,
    refreshAchievements: loadAchievements,
  };
}

export interface UseGameSessionResult {
  /** Start tracking a game session */
  startSession: () => void;
  /** End the session and record stats */
  endSession: (
    score: number,
    won?: boolean,
    customStats?: Record<string, number>
  ) => Promise<string[]>;
  /** Current session duration in seconds */
  sessionDuration: number;
  /** Whether a session is active */
  isSessionActive: boolean;
}

/**
 * Hook for tracking a single game session's duration
 */
export function useGameSession(gameId: string): UseGameSessionResult {
  const [isActive, setIsActive] = useState(false);
  const [duration, setDuration] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startSession = useCallback(() => {
    startTimeRef.current = Date.now();
    setIsActive(true);
    setDuration(0);

    // Update duration every second
    intervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }
    }, 1000);
  }, []);

  const endSession = useCallback(
    async (
      score: number,
      won?: boolean,
      customStats?: Record<string, number>
    ): Promise<string[]> => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      const finalDuration = startTimeRef.current
        ? Math.floor((Date.now() - startTimeRef.current) / 1000)
        : 0;

      setIsActive(false);
      startTimeRef.current = null;

      // Record the session
      if (finalDuration > 0) {
        return recordGameSession(
          gameId,
          score,
          finalDuration,
          won,
          customStats
        );
      }
      return [];
    },
    [gameId]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    startSession,
    endSession,
    sessionDuration: duration,
    isSessionActive: isActive,
  };
}
