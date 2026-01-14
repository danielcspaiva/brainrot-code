/**
 * High Score Persistence System
 *
 * Provides persistent storage for game high scores using the filesystem.
 * Stores scores following XDG Base Directory conventions.
 */

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { getDataFilePath, ensureDataDir } from "./config.js";

/** Single score entry */
export interface ScoreEntry {
  score: number;
  timestamp: string; // ISO date string
  /** Optional additional data (e.g., difficulty for Minesweeper) */
  metadata?: Record<string, string | number>;
}

/** Leaderboard for a single game */
export interface GameLeaderboard {
  gameId: string;
  scores: ScoreEntry[];
}

/** All high scores data */
interface HighScoresData {
  version: number;
  leaderboards: Record<string, GameLeaderboard>;
}

/** Maximum scores to keep per game */
const MAX_SCORES_PER_GAME = 10;

/** Get data file path (uses XDG conventions with legacy fallback) */
function getHighScoresFile(): string {
  return getDataFilePath("high-scores.json");
}

/** Current data format version */
const DATA_VERSION = 1;

/**
 * Load high scores from disk
 */
async function loadHighScores(): Promise<HighScoresData> {
  try {
    const dataFile = getHighScoresFile();
    if (!existsSync(dataFile)) {
      return createEmptyData();
    }

    const content = await readFile(dataFile, "utf-8");
    const data = JSON.parse(content) as HighScoresData;

    // Validate version
    if (data.version !== DATA_VERSION) {
      // Could add migration logic here for future versions
      return createEmptyData();
    }

    return data;
  } catch {
    // If file is corrupted or unreadable, start fresh
    return createEmptyData();
  }
}

/**
 * Save high scores to disk
 */
async function saveHighScores(data: HighScoresData): Promise<void> {
  try {
    // Ensure data directory exists
    await ensureDataDir();

    const dataFile = getHighScoresFile();
    await writeFile(dataFile, JSON.stringify(data, null, 2), "utf-8");
  } catch {
    // Silently fail - high scores are nice to have but not critical
    console.error("Failed to save high scores");
  }
}

/**
 * Create empty data structure
 */
function createEmptyData(): HighScoresData {
  return {
    version: DATA_VERSION,
    leaderboards: {},
  };
}

/**
 * Get leaderboard for a specific game
 */
export async function getLeaderboard(
  gameId: string
): Promise<GameLeaderboard> {
  const data = await loadHighScores();

  if (!data.leaderboards[gameId]) {
    return { gameId, scores: [] };
  }

  return data.leaderboards[gameId];
}

/**
 * Get the highest score for a game
 */
export async function getHighScore(gameId: string): Promise<number> {
  const leaderboard = await getLeaderboard(gameId);

  if (leaderboard.scores.length === 0) {
    return 0;
  }

  return leaderboard.scores[0].score;
}

/**
 * Check if a score qualifies for the leaderboard
 * Returns the position (1-10) if it qualifies, 0 otherwise
 */
export async function checkScorePosition(
  gameId: string,
  score: number
): Promise<number> {
  const leaderboard = await getLeaderboard(gameId);

  // Find position
  for (let i = 0; i < leaderboard.scores.length; i++) {
    if (score > leaderboard.scores[i].score) {
      return i + 1;
    }
  }

  // Check if we have room
  if (leaderboard.scores.length < MAX_SCORES_PER_GAME) {
    return leaderboard.scores.length + 1;
  }

  return 0; // Doesn't qualify
}

/**
 * Submit a new score to the leaderboard
 * Returns the position (1-10) if it made the leaderboard, 0 otherwise
 */
export async function submitScore(
  gameId: string,
  score: number,
  metadata?: Record<string, string | number>
): Promise<number> {
  // Don't record zero scores
  if (score <= 0) {
    return 0;
  }

  const data = await loadHighScores();

  if (!data.leaderboards[gameId]) {
    data.leaderboards[gameId] = { gameId, scores: [] };
  }

  const leaderboard = data.leaderboards[gameId];
  const entry: ScoreEntry = {
    score,
    timestamp: new Date().toISOString(),
    metadata,
  };

  // Find insertion position
  let position = 0;
  for (let i = 0; i < leaderboard.scores.length; i++) {
    if (score > leaderboard.scores[i].score) {
      position = i + 1;
      leaderboard.scores.splice(i, 0, entry);
      break;
    }
  }

  // If not inserted yet, add to end
  if (position === 0 && leaderboard.scores.length < MAX_SCORES_PER_GAME) {
    position = leaderboard.scores.length + 1;
    leaderboard.scores.push(entry);
  }

  // Trim to max size
  if (leaderboard.scores.length > MAX_SCORES_PER_GAME) {
    leaderboard.scores = leaderboard.scores.slice(0, MAX_SCORES_PER_GAME);
  }

  // Save
  await saveHighScores(data);

  return position;
}

/**
 * Get all leaderboards
 */
export async function getAllLeaderboards(): Promise<
  Record<string, GameLeaderboard>
> {
  const data = await loadHighScores();
  return data.leaderboards;
}

/**
 * Clear leaderboard for a specific game (for testing/reset)
 */
export async function clearLeaderboard(gameId: string): Promise<void> {
  const data = await loadHighScores();
  delete data.leaderboards[gameId];
  await saveHighScores(data);
}

/**
 * Format timestamp for display
 */
export function formatScoreDate(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();

  // Check if it's today
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  // Check if it's this year
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  // Full date
  return date.toLocaleDateString([], {
    year: "2-digit",
    month: "short",
    day: "numeric",
  });
}

/**
 * For Minesweeper-style games where lower time is better
 */
export async function submitBestTime(
  gameId: string,
  timeSeconds: number,
  metadata?: Record<string, string | number>
): Promise<number> {
  // Don't record zero or very high times
  if (timeSeconds <= 0 || timeSeconds >= 999) {
    return 0;
  }

  const data = await loadHighScores();

  if (!data.leaderboards[gameId]) {
    data.leaderboards[gameId] = { gameId, scores: [] };
  }

  const leaderboard = data.leaderboards[gameId];
  const entry: ScoreEntry = {
    score: timeSeconds, // Lower is better
    timestamp: new Date().toISOString(),
    metadata,
  };

  // Find insertion position (lower is better)
  let position = 0;
  for (let i = 0; i < leaderboard.scores.length; i++) {
    if (timeSeconds < leaderboard.scores[i].score) {
      position = i + 1;
      leaderboard.scores.splice(i, 0, entry);
      break;
    }
  }

  // If not inserted yet, add to end
  if (position === 0 && leaderboard.scores.length < MAX_SCORES_PER_GAME) {
    position = leaderboard.scores.length + 1;
    leaderboard.scores.push(entry);
  }

  // Trim to max size
  if (leaderboard.scores.length > MAX_SCORES_PER_GAME) {
    leaderboard.scores = leaderboard.scores.slice(0, MAX_SCORES_PER_GAME);
  }

  // Save
  await saveHighScores(data);

  return position;
}

/**
 * Get best time for a game (for Minesweeper-style games)
 */
export async function getBestTime(gameId: string): Promise<number> {
  const leaderboard = await getLeaderboard(gameId);

  if (leaderboard.scores.length === 0) {
    return 999; // Default "no best time"
  }

  return leaderboard.scores[0].score;
}
