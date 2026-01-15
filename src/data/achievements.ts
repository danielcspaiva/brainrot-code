/**
 * Simple achievements derived from stats.
 */

import { getAllStats, type StatsData } from "./stats.js";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
}

interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  condition: (stats: StatsData) => boolean;
}

const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: "first_game",
    title: "First Game",
    description: "Play your first game.",
    condition: (stats) => stats.global.totalGamesPlayed >= 1,
  },
  {
    id: "five_games",
    title: "Five Games",
    description: "Play 5 games in total.",
    condition: (stats) => stats.global.totalGamesPlayed >= 5,
  },
  {
    id: "score_1000",
    title: "Score 1000",
    description: "Reach a total score of 1000 across games.",
    condition: (stats) =>
      Object.values(stats.games).reduce((sum, game) => sum + game.totalScore, 0) >=
      1000,
  },
];

export async function getAchievements(): Promise<Achievement[]> {
  const stats = await getAllStats();
  return ACHIEVEMENTS.map((achievement) => ({
    id: achievement.id,
    title: achievement.title,
    description: achievement.description,
    unlocked: achievement.condition(stats),
  }));
}
