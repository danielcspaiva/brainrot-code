/**
 * High score persistence.
 */

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { ensureDataDir, getDataFilePath } from "./paths.js";

export interface ScoreEntry {
  name: string;
  score: number;
  timestamp: string;
}

export interface GameLeaderboard {
  gameId: string;
  scores: ScoreEntry[];
  sortOrder?: "asc" | "desc";
}

export interface HighScoresData {
  leaderboards: Record<string, GameLeaderboard>;
}

const HIGH_SCORES_FILE = getDataFilePath("high-scores.json");
const DEFAULT_DATA: HighScoresData = { leaderboards: {} };
const MAX_SCORES = 10;

async function loadData(): Promise<HighScoresData> {
  try {
    if (!existsSync(HIGH_SCORES_FILE)) return DEFAULT_DATA;
    const content = await readFile(HIGH_SCORES_FILE, "utf-8");
    return JSON.parse(content) as HighScoresData;
  } catch {
    return DEFAULT_DATA;
  }
}

async function saveData(data: HighScoresData): Promise<void> {
  await ensureDataDir();
  await writeFile(HIGH_SCORES_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export async function getLeaderboard(gameId: string): Promise<GameLeaderboard> {
  const data = await loadData();
  return data.leaderboards[gameId] ?? { gameId, scores: [] };
}

export async function submitScore(
  gameId: string,
  score: number,
  name: string = "Player",
  sortOrder: "asc" | "desc" = "desc"
): Promise<number> {
  const data = await loadData();
  const leaderboard = data.leaderboards[gameId] ?? {
    gameId,
    scores: [],
    sortOrder,
  };

  const entry: ScoreEntry = {
    name,
    score,
    timestamp: new Date().toISOString(),
  };

  leaderboard.scores.push(entry);
  leaderboard.sortOrder = sortOrder;
  if (sortOrder === "asc") {
    leaderboard.scores.sort((a, b) => a.score - b.score);
  } else {
    leaderboard.scores.sort((a, b) => b.score - a.score);
  }
  leaderboard.scores = leaderboard.scores.slice(0, MAX_SCORES);
  data.leaderboards[gameId] = leaderboard;
  await saveData(data);

  return leaderboard.scores.findIndex((s) => s === entry);
}
