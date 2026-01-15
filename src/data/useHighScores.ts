/**
 * Hook for high score persistence.
 */

import { useCallback, useEffect, useState } from "react";
import { getLeaderboard, submitScore, type ScoreEntry } from "./high-scores.js";

export interface UseHighScoresResult {
  highScore: number;
  leaderboard: ScoreEntry[];
  submit: (score: number, name?: string) => Promise<number>;
  refresh: () => Promise<void>;
}

export function useHighScores(
  gameId: string,
  sortOrder: "asc" | "desc" = "desc"
): UseHighScoresResult {
  const [leaderboard, setLeaderboard] = useState<ScoreEntry[]>([]);
  const [highScore, setHighScore] = useState(0);

  const refresh = useCallback(async () => {
    const board = await getLeaderboard(gameId);
    setLeaderboard(board.scores);
    setHighScore(board.scores[0]?.score ?? 0);
  }, [gameId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const submit = useCallback(
    async (score: number, name?: string) => {
      const position = await submitScore(gameId, score, name, sortOrder);
      await refresh();
      return position;
    },
    [gameId, refresh, sortOrder]
  );

  return { highScore, leaderboard, submit, refresh };
}
