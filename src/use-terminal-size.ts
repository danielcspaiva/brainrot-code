/**
 * Hook for tracking terminal dimensions and handling resize events.
 * Provides reactive terminal size state for responsive layouts.
 */

import { useState, useEffect } from "react";
import { useStdout } from "ink";

export interface TerminalSize {
  /** Terminal width in columns */
  width: number;
  /** Terminal height in rows */
  height: number;
}

export interface UseTerminalSizeResult extends TerminalSize {
  /** Whether the terminal is considered "small" */
  isSmall: boolean;
  /** Whether the terminal is too small for the UI */
  isTooSmall: boolean;
}

/** Minimum dimensions for a functional UI */
export const MIN_WIDTH = 40;
export const MIN_HEIGHT = 15;

/** Threshold for "small" terminal classification */
export const SMALL_WIDTH = 80;
export const SMALL_HEIGHT = 24;

/**
 * React hook for tracking terminal size with responsive breakpoints.
 *
 * @returns Terminal dimensions and size classification
 */
export function useTerminalSize(): UseTerminalSizeResult {
  const { stdout } = useStdout();

  const [size, setSize] = useState<TerminalSize>(() => ({
    width: stdout?.columns ?? 80,
    height: stdout?.rows ?? 24,
  }));

  useEffect(() => {
    const handleResize = () => {
      setSize({
        width: stdout?.columns ?? 80,
        height: stdout?.rows ?? 24,
      });
    };

    // Listen for terminal resize events
    if (stdout) {
      stdout.on("resize", handleResize);
      return () => {
        stdout.off("resize", handleResize);
      };
    }
    return undefined;
  }, [stdout]);

  const isSmall = size.width < SMALL_WIDTH || size.height < SMALL_HEIGHT;
  const isTooSmall = size.width < MIN_WIDTH || size.height < MIN_HEIGHT;

  return {
    ...size,
    isSmall,
    isTooSmall,
  };
}
