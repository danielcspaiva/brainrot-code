/**
 * useGameLoop Hook for OpenTUI
 *
 * Provides a consistent game loop with configurable FPS.
 * Uses setInterval for smooth 30+ FPS updates in terminal.
 */

import { useRef, useEffect, useCallback, useState } from "react";
import type { GameLoopInfo } from "../game-types.js";

export interface UseGameLoopOptions {
  /** Target frames per second (default: 30) */
  targetFps?: number;
  /** Whether the loop is active (default: true) */
  isActive?: boolean;
  /** Callback called each frame */
  onTick?: (info: GameLoopInfo) => void;
}

export interface UseGameLoopResult {
  /** Current loop info */
  loopInfo: GameLoopInfo;
  /** Whether the loop is currently running */
  isRunning: boolean;
  /** Start the game loop */
  start: () => void;
  /** Stop the game loop */
  stop: () => void;
  /** Toggle the game loop */
  toggle: () => void;
  /** Reset the timer */
  reset: () => void;
}

/**
 * Game loop hook that provides smooth frame-based updates
 *
 * @example
 * ```tsx
 * const { loopInfo, isRunning } = useGameLoop({
 *   targetFps: 30,
 *   isActive: gameState.status === 'playing',
 *   onTick: (info) => {
 *     // Update game state based on deltaTime
 *     updateGame(info.deltaTime);
 *   }
 * });
 * ```
 */
export function useGameLoop({
  targetFps = 30,
  isActive = true,
  onTick,
}: UseGameLoopOptions = {}): UseGameLoopResult {
  const [isRunning, setIsRunning] = useState(isActive);
  const [loopInfo, setLoopInfo] = useState<GameLoopInfo>({
    fps: 0,
    deltaTime: 0,
    elapsedTime: 0,
    frameCount: 0,
  });

  // Refs for timing
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const fpsAccumulatorRef = useRef<number[]>([]);

  // Store onTick in ref to avoid re-creating interval
  const onTickRef = useRef(onTick);
  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  // Calculate frame interval in ms
  const frameInterval = Math.floor(1000 / targetFps);

  const tick = useCallback(() => {
    const now = performance.now();

    // Initialize start time on first tick
    if (startTimeRef.current === 0) {
      startTimeRef.current = now;
      lastFrameTimeRef.current = now;
    }

    const deltaTime = now - lastFrameTimeRef.current;
    const elapsedTime = now - startTimeRef.current;
    lastFrameTimeRef.current = now;
    frameCountRef.current += 1;

    // Calculate rolling FPS average (last 10 frames)
    const instantFps = deltaTime > 0 ? 1000 / deltaTime : targetFps;
    fpsAccumulatorRef.current.push(instantFps);
    if (fpsAccumulatorRef.current.length > 10) {
      fpsAccumulatorRef.current.shift();
    }
    const fps = Math.round(
      fpsAccumulatorRef.current.reduce((a, b) => a + b, 0) /
        fpsAccumulatorRef.current.length
    );

    const info: GameLoopInfo = {
      fps,
      deltaTime,
      elapsedTime,
      frameCount: frameCountRef.current,
    };

    setLoopInfo(info);

    // Call onTick callback
    if (onTickRef.current) {
      onTickRef.current(info);
    }
  }, [targetFps]);

  const start = useCallback(() => {
    if (intervalRef.current) return;

    setIsRunning(true);
    intervalRef.current = setInterval(tick, frameInterval);
  }, [tick, frameInterval]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
  }, []);

  const toggle = useCallback(() => {
    if (isRunning) {
      stop();
    } else {
      start();
    }
  }, [isRunning, start, stop]);

  const reset = useCallback(() => {
    startTimeRef.current = 0;
    lastFrameTimeRef.current = 0;
    frameCountRef.current = 0;
    fpsAccumulatorRef.current = [];
    setLoopInfo({
      fps: 0,
      deltaTime: 0,
      elapsedTime: 0,
      frameCount: 0,
    });
  }, []);

  // Start/stop based on isActive prop
  useEffect(() => {
    if (isActive && !intervalRef.current) {
      start();
    } else if (!isActive && intervalRef.current) {
      stop();
    }
  }, [isActive, start, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  return {
    loopInfo,
    isRunning,
    start,
    stop,
    toggle,
    reset,
  };
}

export default useGameLoop;
