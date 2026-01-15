/**
 * Stats hooks.
 */

import { useCallback, useState } from "react";
import { recordGameSession } from "./stats.js";

export interface UseGameSessionResult {
  startSession: () => void;
  endSession: (options: { score: number; won?: boolean }) => Promise<void>;
  isActive: boolean;
}

export function useGameSession(gameId: string): UseGameSessionResult {
  const [startTime, setStartTime] = useState<number | null>(null);

  const startSession = useCallback(() => {
    setStartTime(Date.now());
  }, []);

  const endSession = useCallback(
    async ({ score, won }: { score: number; won?: boolean }) => {
      if (!startTime) return;
      const durationMs = Date.now() - startTime;
      await recordGameSession({
        gameId,
        score,
        durationMs,
        won,
      });
      setStartTime(null);
    },
    [gameId, startTime]
  );

  return {
    startSession,
    endSession,
    isActive: startTime !== null,
  };
}
