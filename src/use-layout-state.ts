/**
 * Hook for managing and persisting layout state during a session.
 * Handles split ratios, pane visibility, and layout preferences.
 */

import { useState, useCallback, useMemo } from "react";

export type SplitDirection = "horizontal" | "vertical";

export interface LayoutState {
  /** Split direction: horizontal = left/right, vertical = top/bottom */
  direction: SplitDirection;
  /** Split ratio (0.0 - 1.0) - proportion of first pane */
  splitRatio: number;
  /** Whether the split is currently being resized */
  isResizing: boolean;
  /** Whether to show the secondary pane */
  showSecondary: boolean;
  /** Which pane is focused (0 = first/game, 1 = second/management) */
  focusedPane: 0 | 1;
}

export interface UseLayoutStateOptions {
  /** Initial split direction */
  initialDirection?: SplitDirection;
  /** Initial split ratio (0.0 - 1.0) */
  initialSplitRatio?: number;
  /** Minimum split ratio allowed */
  minRatio?: number;
  /** Maximum split ratio allowed */
  maxRatio?: number;
  /** Step size for keyboard-based resizing */
  resizeStep?: number;
}

export interface UseLayoutStateResult {
  /** Current layout state */
  state: LayoutState;
  /** Set the split ratio */
  setSplitRatio: (ratio: number) => void;
  /** Adjust split ratio by a delta */
  adjustSplitRatio: (delta: number) => void;
  /** Increase the ratio (make first pane larger) */
  increaseRatio: () => void;
  /** Decrease the ratio (make first pane smaller) */
  decreaseRatio: () => void;
  /** Toggle split direction */
  toggleDirection: () => void;
  /** Set split direction */
  setDirection: (direction: SplitDirection) => void;
  /** Toggle secondary pane visibility */
  toggleSecondary: () => void;
  /** Set secondary pane visibility */
  setShowSecondary: (show: boolean) => void;
  /** Set resizing state */
  setResizing: (isResizing: boolean) => void;
  /** Focus a specific pane */
  focusPane: (pane: 0 | 1) => void;
  /** Toggle focus between panes */
  toggleFocus: () => void;
  /** Reset to default layout */
  resetLayout: () => void;
  /** Calculate pixel dimensions based on available space */
  calculateDimensions: (
    availableWidth: number,
    availableHeight: number
  ) => PaneDimensions;
}

export interface PaneDimensions {
  firstPane: { width: number; height: number };
  secondPane: { width: number; height: number };
}

const DEFAULT_OPTIONS: Required<UseLayoutStateOptions> = {
  initialDirection: "horizontal",
  initialSplitRatio: 0.5,
  minRatio: 0.2,
  maxRatio: 0.8,
  resizeStep: 0.05,
};

/**
 * React hook for managing layout state with resizable panes.
 *
 * @param options - Configuration options for the layout
 * @returns Layout state and control functions
 */
export function useLayoutState(
  options: UseLayoutStateOptions = {}
): UseLayoutStateResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const [state, setState] = useState<LayoutState>(() => ({
    direction: opts.initialDirection,
    splitRatio: opts.initialSplitRatio,
    isResizing: false,
    showSecondary: true,
    focusedPane: 0,
  }));

  const clampRatio = useCallback(
    (ratio: number): number => {
      return Math.max(opts.minRatio, Math.min(opts.maxRatio, ratio));
    },
    [opts.minRatio, opts.maxRatio]
  );

  const setSplitRatio = useCallback(
    (ratio: number) => {
      setState((prev) => ({
        ...prev,
        splitRatio: clampRatio(ratio),
      }));
    },
    [clampRatio]
  );

  const adjustSplitRatio = useCallback(
    (delta: number) => {
      setState((prev) => ({
        ...prev,
        splitRatio: clampRatio(prev.splitRatio + delta),
      }));
    },
    [clampRatio]
  );

  const increaseRatio = useCallback(() => {
    adjustSplitRatio(opts.resizeStep);
  }, [adjustSplitRatio, opts.resizeStep]);

  const decreaseRatio = useCallback(() => {
    adjustSplitRatio(-opts.resizeStep);
  }, [adjustSplitRatio, opts.resizeStep]);

  const toggleDirection = useCallback(() => {
    setState((prev) => ({
      ...prev,
      direction: prev.direction === "horizontal" ? "vertical" : "horizontal",
    }));
  }, []);

  const setDirection = useCallback((direction: SplitDirection) => {
    setState((prev) => ({
      ...prev,
      direction,
    }));
  }, []);

  const toggleSecondary = useCallback(() => {
    setState((prev) => ({
      ...prev,
      showSecondary: !prev.showSecondary,
    }));
  }, []);

  const setShowSecondary = useCallback((show: boolean) => {
    setState((prev) => ({
      ...prev,
      showSecondary: show,
    }));
  }, []);

  const setResizing = useCallback((isResizing: boolean) => {
    setState((prev) => ({
      ...prev,
      isResizing,
    }));
  }, []);

  const focusPane = useCallback((pane: 0 | 1) => {
    setState((prev) => ({
      ...prev,
      focusedPane: pane,
    }));
  }, []);

  const toggleFocus = useCallback(() => {
    setState((prev) => ({
      ...prev,
      focusedPane: prev.focusedPane === 0 ? 1 : 0,
    }));
  }, []);

  const resetLayout = useCallback(() => {
    setState({
      direction: opts.initialDirection,
      splitRatio: opts.initialSplitRatio,
      isResizing: false,
      showSecondary: true,
      focusedPane: 0,
    });
  }, [opts.initialDirection, opts.initialSplitRatio]);

  const calculateDimensions = useCallback(
    (availableWidth: number, availableHeight: number): PaneDimensions => {
      if (!state.showSecondary) {
        return {
          firstPane: { width: availableWidth, height: availableHeight },
          secondPane: { width: 0, height: 0 },
        };
      }

      if (state.direction === "horizontal") {
        // Subtract 1 for the divider
        const usableWidth = availableWidth - 1;
        const firstWidth = Math.floor(usableWidth * state.splitRatio);
        const secondWidth = usableWidth - firstWidth;

        return {
          firstPane: { width: firstWidth, height: availableHeight },
          secondPane: { width: secondWidth, height: availableHeight },
        };
      } else {
        // Vertical split - subtract 1 for the divider
        const usableHeight = availableHeight - 1;
        const firstHeight = Math.floor(usableHeight * state.splitRatio);
        const secondHeight = usableHeight - firstHeight;

        return {
          firstPane: { width: availableWidth, height: firstHeight },
          secondPane: { width: availableWidth, height: secondHeight },
        };
      }
    },
    [state.direction, state.splitRatio, state.showSecondary]
  );

  return useMemo(
    () => ({
      state,
      setSplitRatio,
      adjustSplitRatio,
      increaseRatio,
      decreaseRatio,
      toggleDirection,
      setDirection,
      toggleSecondary,
      setShowSecondary,
      setResizing,
      focusPane,
      toggleFocus,
      resetLayout,
      calculateDimensions,
    }),
    [
      state,
      setSplitRatio,
      adjustSplitRatio,
      increaseRatio,
      decreaseRatio,
      toggleDirection,
      setDirection,
      toggleSecondary,
      setShowSecondary,
      setResizing,
      focusPane,
      toggleFocus,
      resetLayout,
      calculateDimensions,
    ]
  );
}
