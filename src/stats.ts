/**
 * Stats and Achievement System
 *
 * Tracks gameplay statistics and provides an achievement system with
 * unlockable milestones. Data persists using XDG Base Directory conventions.
 */

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { getDataFilePath, ensureDataDir } from "./config.js";

// ============================================================================
// TYPES
// ============================================================================

/** Stats for a single game */
export interface GameStats {
  /** Total games played */
  gamesPlayed: number;
  /** Total time played in seconds */
  timePlayed: number;
  /** Highest score achieved */
  highestScore: number;
  /** Total score accumulated across all games */
  totalScore: number;
  /** Number of wins (for games with win conditions) */
  wins: number;
  /** Number of losses */
  losses: number;
  /** Last played timestamp */
  lastPlayed: string | null;
  /** Game-specific stats */
  custom?: Record<string, number>;
}

/** Global stats across all games */
export interface GlobalStats {
  /** Total games played across all games */
  totalGamesPlayed: number;
  /** Total time played in seconds */
  totalTimePlayed: number;
  /** Total achievements unlocked */
  achievementsUnlocked: number;
  /** First played timestamp */
  firstPlayed: string | null;
  /** Last played timestamp */
  lastPlayed: string | null;
  /** Session count (app opens) */
  sessionCount: number;
  /** Current streak (consecutive days played) */
  currentStreak: number;
  /** Best streak */
  bestStreak: number;
  /** Last streak date */
  lastStreakDate: string | null;
}

/** Achievement definition */
export interface Achievement {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Description of how to unlock */
  description: string;
  /** Category of achievement */
  category: "general" | "snake" | "pong" | "tetris" | "minesweeper";
  /** Icon to display */
  icon: string;
  /** Whether this achievement is hidden until unlocked */
  hidden?: boolean;
  /** Condition check function - receives stats and returns true if unlocked */
  condition: (stats: StatsData) => boolean;
}

/** Unlocked achievement record */
export interface UnlockedAchievement {
  /** Achievement ID */
  id: string;
  /** Timestamp when unlocked */
  unlockedAt: string;
}

/** Complete stats data structure */
export interface StatsData {
  /** Data format version */
  version: number;
  /** Global stats */
  global: GlobalStats;
  /** Per-game stats */
  games: Record<string, GameStats>;
  /** Unlocked achievements */
  achievements: UnlockedAchievement[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DATA_VERSION = 1;
const STATS_FILE = "stats.json";

/** Default empty game stats */
const DEFAULT_GAME_STATS: GameStats = {
  gamesPlayed: 0,
  timePlayed: 0,
  highestScore: 0,
  totalScore: 0,
  wins: 0,
  losses: 0,
  lastPlayed: null,
};

/** Default global stats */
const DEFAULT_GLOBAL_STATS: GlobalStats = {
  totalGamesPlayed: 0,
  totalTimePlayed: 0,
  achievementsUnlocked: 0,
  firstPlayed: null,
  lastPlayed: null,
  sessionCount: 0,
  currentStreak: 0,
  bestStreak: 0,
  lastStreakDate: null,
};

// ============================================================================
// ACHIEVEMENT DEFINITIONS
// ============================================================================

export const ACHIEVEMENTS: Achievement[] = [
  // General achievements
  {
    id: "first_game",
    name: "First Steps",
    description: "Play your first game",
    category: "general",
    icon: "🎮",
    condition: (stats) => stats.global.totalGamesPlayed >= 1,
  },
  {
    id: "ten_games",
    name: "Getting Started",
    description: "Play 10 games",
    category: "general",
    icon: "🎯",
    condition: (stats) => stats.global.totalGamesPlayed >= 10,
  },
  {
    id: "fifty_games",
    name: "Dedicated Player",
    description: "Play 50 games",
    category: "general",
    icon: "⭐",
    condition: (stats) => stats.global.totalGamesPlayed >= 50,
  },
  {
    id: "hundred_games",
    name: "Game Master",
    description: "Play 100 games",
    category: "general",
    icon: "🏆",
    condition: (stats) => stats.global.totalGamesPlayed >= 100,
  },
  {
    id: "hour_played",
    name: "Time Flies",
    description: "Play for a total of 1 hour",
    category: "general",
    icon: "⏰",
    condition: (stats) => stats.global.totalTimePlayed >= 3600,
  },
  {
    id: "five_hours",
    name: "Marathon Runner",
    description: "Play for a total of 5 hours",
    category: "general",
    icon: "🏃",
    condition: (stats) => stats.global.totalTimePlayed >= 18000,
  },
  {
    id: "three_day_streak",
    name: "Consistent",
    description: "Play 3 days in a row",
    category: "general",
    icon: "🔥",
    condition: (stats) => stats.global.bestStreak >= 3,
  },
  {
    id: "week_streak",
    name: "Dedicated",
    description: "Play 7 days in a row",
    category: "general",
    icon: "📅",
    condition: (stats) => stats.global.bestStreak >= 7,
  },
  {
    id: "all_games",
    name: "Variety Pack",
    description: "Play all 4 games at least once",
    category: "general",
    icon: "🎲",
    condition: (stats) => {
      const games = ["snake", "pong", "tetris", "minesweeper"];
      return games.every((g) => (stats.games[g]?.gamesPlayed ?? 0) >= 1);
    },
  },

  // Snake achievements
  {
    id: "snake_first",
    name: "Slithering Start",
    description: "Play your first Snake game",
    category: "snake",
    icon: "🐍",
    condition: (stats) => (stats.games.snake?.gamesPlayed ?? 0) >= 1,
  },
  {
    id: "snake_50_score",
    name: "Growing Snake",
    description: "Score 50 points in Snake",
    category: "snake",
    icon: "📈",
    condition: (stats) => (stats.games.snake?.highestScore ?? 0) >= 50,
  },
  {
    id: "snake_100_score",
    name: "Long Snake",
    description: "Score 100 points in Snake",
    category: "snake",
    icon: "🏅",
    condition: (stats) => (stats.games.snake?.highestScore ?? 0) >= 100,
  },
  {
    id: "snake_200_score",
    name: "Snake Charmer",
    description: "Score 200 points in Snake",
    category: "snake",
    icon: "👑",
    condition: (stats) => (stats.games.snake?.highestScore ?? 0) >= 200,
  },
  {
    id: "snake_10_games",
    name: "Snake Enthusiast",
    description: "Play Snake 10 times",
    category: "snake",
    icon: "🎮",
    condition: (stats) => (stats.games.snake?.gamesPlayed ?? 0) >= 10,
  },

  // Pong achievements
  {
    id: "pong_first",
    name: "Paddle Ready",
    description: "Play your first Pong game",
    category: "pong",
    icon: "🏓",
    condition: (stats) => (stats.games.pong?.gamesPlayed ?? 0) >= 1,
  },
  {
    id: "pong_first_win",
    name: "First Victory",
    description: "Win your first Pong game",
    category: "pong",
    icon: "✌️",
    condition: (stats) => (stats.games.pong?.wins ?? 0) >= 1,
  },
  {
    id: "pong_10_wins",
    name: "Pong Champion",
    description: "Win 10 Pong games",
    category: "pong",
    icon: "🥇",
    condition: (stats) => (stats.games.pong?.wins ?? 0) >= 10,
  },
  {
    id: "pong_50_wins",
    name: "Pong Master",
    description: "Win 50 Pong games",
    category: "pong",
    icon: "🏆",
    condition: (stats) => (stats.games.pong?.wins ?? 0) >= 50,
  },

  // Tetris achievements
  {
    id: "tetris_first",
    name: "Block Party",
    description: "Play your first Tetris game",
    category: "tetris",
    icon: "🧱",
    condition: (stats) => (stats.games.tetris?.gamesPlayed ?? 0) >= 1,
  },
  {
    id: "tetris_1000_score",
    name: "Stacking Up",
    description: "Score 1000 points in Tetris",
    category: "tetris",
    icon: "📊",
    condition: (stats) => (stats.games.tetris?.highestScore ?? 0) >= 1000,
  },
  {
    id: "tetris_5000_score",
    name: "Tetris Pro",
    description: "Score 5000 points in Tetris",
    category: "tetris",
    icon: "🌟",
    condition: (stats) => (stats.games.tetris?.highestScore ?? 0) >= 5000,
  },
  {
    id: "tetris_10000_score",
    name: "Tetris Legend",
    description: "Score 10000 points in Tetris",
    category: "tetris",
    icon: "💎",
    condition: (stats) => (stats.games.tetris?.highestScore ?? 0) >= 10000,
  },
  {
    id: "tetris_lines_cleared",
    name: "Line Clearer",
    description: "Clear 100 lines in Tetris",
    category: "tetris",
    icon: "📏",
    condition: (stats) =>
      (stats.games.tetris?.custom?.linesCleared ?? 0) >= 100,
  },

  // Minesweeper achievements
  {
    id: "minesweeper_first",
    name: "Mine Explorer",
    description: "Play your first Minesweeper game",
    category: "minesweeper",
    icon: "💣",
    condition: (stats) => (stats.games.minesweeper?.gamesPlayed ?? 0) >= 1,
  },
  {
    id: "minesweeper_first_win",
    name: "Bomb Defuser",
    description: "Win your first Minesweeper game",
    category: "minesweeper",
    icon: "🛡️",
    condition: (stats) => (stats.games.minesweeper?.wins ?? 0) >= 1,
  },
  {
    id: "minesweeper_10_wins",
    name: "Mine Sweeper",
    description: "Win 10 Minesweeper games",
    category: "minesweeper",
    icon: "🎖️",
    condition: (stats) => (stats.games.minesweeper?.wins ?? 0) >= 10,
  },
  {
    id: "minesweeper_fast",
    name: "Speed Demon",
    description: "Complete Minesweeper in under 60 seconds",
    category: "minesweeper",
    icon: "⚡",
    condition: (stats) =>
      (stats.games.minesweeper?.custom?.fastestWin ?? 999) < 60,
  },
];

// ============================================================================
// FILE OPERATIONS
// ============================================================================

function getStatsFile(): string {
  return getDataFilePath(STATS_FILE);
}

function createEmptyStats(): StatsData {
  return {
    version: DATA_VERSION,
    global: { ...DEFAULT_GLOBAL_STATS },
    games: {},
    achievements: [],
  };
}

/**
 * Load stats from disk
 */
export async function loadStats(): Promise<StatsData> {
  try {
    const statsFile = getStatsFile();
    if (!existsSync(statsFile)) {
      return createEmptyStats();
    }

    const content = await readFile(statsFile, "utf-8");
    const data = JSON.parse(content) as StatsData;

    if (data.version !== DATA_VERSION) {
      return createEmptyStats();
    }

    return data;
  } catch {
    return createEmptyStats();
  }
}

/**
 * Save stats to disk
 */
export async function saveStats(data: StatsData): Promise<void> {
  try {
    await ensureDataDir();
    const statsFile = getStatsFile();
    await writeFile(statsFile, JSON.stringify(data, null, 2), "utf-8");
  } catch {
    // Silently fail - stats are nice to have but not critical
  }
}

// ============================================================================
// STATS OPERATIONS
// ============================================================================

/**
 * Get stats for a specific game
 */
export async function getGameStats(gameId: string): Promise<GameStats> {
  const data = await loadStats();
  return data.games[gameId] ?? { ...DEFAULT_GAME_STATS };
}

/**
 * Get global stats
 */
export async function getGlobalStats(): Promise<GlobalStats> {
  const data = await loadStats();
  return data.global;
}

/**
 * Update streak based on today's date
 */
function updateStreak(stats: StatsData): void {
  const today = new Date().toISOString().split("T")[0];
  const lastDate = stats.global.lastStreakDate;

  if (!lastDate) {
    // First time playing
    stats.global.currentStreak = 1;
    stats.global.bestStreak = 1;
    stats.global.lastStreakDate = today;
  } else if (lastDate === today) {
    // Already played today, no change
  } else {
    // Check if yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    if (lastDate === yesterdayStr) {
      // Consecutive day
      stats.global.currentStreak++;
      if (stats.global.currentStreak > stats.global.bestStreak) {
        stats.global.bestStreak = stats.global.currentStreak;
      }
    } else {
      // Streak broken
      stats.global.currentStreak = 1;
    }
    stats.global.lastStreakDate = today;
  }
}

/**
 * Record a game session
 */
export async function recordGameSession(
  gameId: string,
  score: number,
  duration: number,
  won?: boolean,
  customStats?: Record<string, number>
): Promise<string[]> {
  const data = await loadStats();
  const now = new Date().toISOString();

  // Initialize game stats if needed
  if (!data.games[gameId]) {
    data.games[gameId] = { ...DEFAULT_GAME_STATS };
  }

  const gameStats = data.games[gameId];

  // Update game stats
  gameStats.gamesPlayed++;
  gameStats.timePlayed += duration;
  gameStats.totalScore += score;
  if (score > gameStats.highestScore) {
    gameStats.highestScore = score;
  }
  if (won !== undefined) {
    if (won) {
      gameStats.wins++;
    } else {
      gameStats.losses++;
    }
  }
  gameStats.lastPlayed = now;

  // Merge custom stats
  if (customStats) {
    if (!gameStats.custom) {
      gameStats.custom = {};
    }
    for (const [key, value] of Object.entries(customStats)) {
      gameStats.custom[key] = (gameStats.custom[key] ?? 0) + value;
    }
  }

  // Update global stats
  data.global.totalGamesPlayed++;
  data.global.totalTimePlayed += duration;
  if (!data.global.firstPlayed) {
    data.global.firstPlayed = now;
  }
  data.global.lastPlayed = now;

  // Update streak
  updateStreak(data);

  // Check for new achievements
  const newAchievements = checkAchievements(data);

  // Save
  await saveStats(data);

  return newAchievements;
}

/**
 * Record a session start (increment session count)
 */
export async function recordSessionStart(): Promise<void> {
  const data = await loadStats();
  data.global.sessionCount++;
  await saveStats(data);
}

// ============================================================================
// ACHIEVEMENT OPERATIONS
// ============================================================================

/**
 * Check for newly unlocked achievements
 * Returns array of newly unlocked achievement IDs
 */
export function checkAchievements(data: StatsData): string[] {
  const newUnlocks: string[] = [];
  const unlockedIds = new Set(data.achievements.map((a) => a.id));

  for (const achievement of ACHIEVEMENTS) {
    if (!unlockedIds.has(achievement.id) && achievement.condition(data)) {
      newUnlocks.push(achievement.id);
      data.achievements.push({
        id: achievement.id,
        unlockedAt: new Date().toISOString(),
      });
    }
  }

  // Update achievement count
  data.global.achievementsUnlocked = data.achievements.length;

  return newUnlocks;
}

/**
 * Get all achievements with unlock status
 */
export async function getAchievements(): Promise<
  Array<Achievement & { unlocked: boolean; unlockedAt: string | null }>
> {
  const data = await loadStats();
  const unlockedMap = new Map(
    data.achievements.map((a) => [a.id, a.unlockedAt])
  );

  return ACHIEVEMENTS.map((achievement) => ({
    ...achievement,
    unlocked: unlockedMap.has(achievement.id),
    unlockedAt: unlockedMap.get(achievement.id) ?? null,
  }));
}

/**
 * Get achievement by ID
 */
export function getAchievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

/**
 * Get achievement count
 */
export async function getAchievementCount(): Promise<{
  unlocked: number;
  total: number;
}> {
  const data = await loadStats();
  return {
    unlocked: data.achievements.length,
    total: ACHIEVEMENTS.length,
  };
}

/**
 * Get all stats data
 */
export async function getAllStats(): Promise<StatsData> {
  return loadStats();
}

// ============================================================================
// FORMATTING HELPERS
// ============================================================================

/**
 * Format duration in seconds to human-readable string
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.floor(seconds)}s`;
  }
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Format a date string for display
 */
export function formatStatsDate(timestamp: string | null): string {
  if (!timestamp) return "Never";

  const date = new Date(timestamp);
  const now = new Date();

  if (date.toDateString() === now.toDateString()) {
    return "Today";
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}
