/**
 * useSpinner Hook
 *
 * Provides animated spinner functionality for visual feedback
 * during loading states or background operations.
 */

import { useState, useEffect, useCallback } from "react";
import { getSpinnerFrame } from "./theme.js";

export type SpinnerStyle = "spinner" | "dots" | "braille";

export interface UseSpinnerOptions {
  /** Whether the spinner is active */
  isActive?: boolean;
  /** Animation speed in milliseconds */
  interval?: number;
  /** Spinner style */
  style?: SpinnerStyle;
}

export interface UseSpinnerResult {
  /** Current spinner frame character */
  frame: string;
  /** Elapsed time in milliseconds since start */
  elapsedMs: number;
  /** Whether the spinner is currently running */
  isRunning: boolean;
  /** Start the spinner */
  start: () => void;
  /** Stop the spinner */
  stop: () => void;
  /** Reset elapsed time to 0 */
  reset: () => void;
}

/**
 * Hook for animated spinners
 *
 * @example
 * ```tsx
 * const spinner = useSpinner({ isActive: isLoading });
 * return <Text color="cyan">{spinner.frame} Loading...</Text>;
 * ```
 */
export function useSpinner({
  isActive = true,
  interval = 80,
  style = "spinner",
}: UseSpinnerOptions = {}): UseSpinnerResult {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isRunning, setIsRunning] = useState(isActive);

  // Sync with isActive prop
  useEffect(() => {
    setIsRunning(isActive);
    if (isActive) {
      setElapsedMs(0);
    }
  }, [isActive]);

  // Animation loop
  useEffect(() => {
    if (!isRunning) return;

    const startTime = Date.now() - elapsedMs;
    let animationFrame: ReturnType<typeof setTimeout>;

    const tick = () => {
      setElapsedMs(Date.now() - startTime);
      animationFrame = setTimeout(tick, interval);
    };

    tick();

    return () => {
      clearTimeout(animationFrame);
    };
  }, [isRunning, interval]);

  const start = useCallback(() => {
    setIsRunning(true);
    setElapsedMs(0);
  }, []);

  const stop = useCallback(() => {
    setIsRunning(false);
  }, []);

  const reset = useCallback(() => {
    setElapsedMs(0);
  }, []);

  const frame = getSpinnerFrame(elapsedMs, style);

  return {
    frame,
    elapsedMs,
    isRunning,
    start,
    stop,
    reset,
  };
}

/**
 * Simple hook that just returns a spinner frame based on elapsed time
 * Useful when you already track elapsed time elsewhere
 */
export function useSpinnerFrame(
  elapsedMs: number,
  style: SpinnerStyle = "spinner"
): string {
  return getSpinnerFrame(elapsedMs, style);
}

export default useSpinner;
