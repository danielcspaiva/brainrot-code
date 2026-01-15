/**
 * Minimal stats persistence.
 */

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { ensureDataDir, getDataFilePath } from "./paths.js";

export interface GameStats {
  gamesPlayed: number;
  totalScore: number;
  highestScore: number;
  timePlayedMs: number;
  wins: number;
  losses: number;
  lastPlayed: string | null;
}

export interface GlobalStats {
  totalGamesPlayed: number;
  totalTimePlayedMs: number;
  firstPlayed: string | null;
  lastPlayed: string | null;
}

export interface StatsData {
  global: GlobalStats;
  games: Record<string, GameStats>;
}

const STATS_FILE = getDataFilePath("stats.json");

const DEFAULT_GAME_STATS: GameStats = {
  gamesPlayed: 0,
  totalScore: 0,
  highestScore: 0,
  timePlayedMs: 0,
  wins: 0,
  losses: 0,
  lastPlayed: null,
};

const DEFAULT_STATS: StatsData = {
  global: {
    totalGamesPlayed: 0,
    totalTimePlayedMs: 0,
    firstPlayed: null,
    lastPlayed: null,
  },
  games: {},
};

async function loadStats(): Promise<StatsData> {
  try {
    if (!existsSync(STATS_FILE)) return DEFAULT_STATS;
    const content = await readFile(STATS_FILE, "utf-8");
    return JSON.parse(content) as StatsData;
  } catch {
    return DEFAULT_STATS;
  }
}

async function saveStats(data: StatsData): Promise<void> {
  await ensureDataDir();
  await writeFile(STATS_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export async function recordGameSession(options: {
  gameId: string;
  score: number;
  durationMs: number;
  won?: boolean;
}): Promise<void> {
  const { gameId, score, durationMs, won } = options;
  const data = await loadStats();
  const now = new Date().toISOString();

  if (!data.global.firstPlayed) {
    data.global.firstPlayed = now;
  }
  data.global.lastPlayed = now;
  data.global.totalGamesPlayed += 1;
  data.global.totalTimePlayedMs += durationMs;

  const gameStats = data.games[gameId] ?? { ...DEFAULT_GAME_STATS };
  gameStats.gamesPlayed += 1;
  gameStats.totalScore += score;
  gameStats.highestScore = Math.max(gameStats.highestScore, score);
  gameStats.timePlayedMs += durationMs;
  gameStats.lastPlayed = now;
  if (won === true) gameStats.wins += 1;
  if (won === false) gameStats.losses += 1;

  data.games[gameId] = gameStats;
  await saveStats(data);
}

export async function getGameStats(gameId: string): Promise<GameStats> {
  const data = await loadStats();
  return data.games[gameId] ?? { ...DEFAULT_GAME_STATS };
}

export async function getGlobalStats(): Promise<GlobalStats> {
  const data = await loadStats();
  return data.global;
}

export async function getAllStats(): Promise<StatsData> {
  return loadStats();
}
