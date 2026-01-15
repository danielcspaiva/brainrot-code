/**
 * Theme Hook and Context
 *
 * Provides the current theme to all components via React context.
 * Supports theme switching and custom color overrides.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  type Theme,
  type ThemeId,
  type ThemeColors,
  getTheme,
  themes,
} from "./themes.js";

// ============================================================================
// THEME CONTEXT
// ============================================================================

/**
 * Theme context value
 */
export interface ThemeContextValue {
  /** Current theme */
  theme: Theme;
  /** Current theme ID */
  themeId: ThemeId;
  /** All available themes for selection */
  availableThemes: typeof themes;
  /** Set a specific theme by ID */
  setTheme: (id: ThemeId) => void;
  /** Toggle between light and dark themes */
  toggleTheme: () => void;
  /** Cycle to next theme */
  nextTheme: () => void;
}

/**
 * Theme context with default theme
 */
const ThemeContext = createContext<ThemeContextValue>({
  theme: getTheme("default"),
  themeId: "default",
  availableThemes: themes,
  setTheme: () => {},
  toggleTheme: () => {},
  nextTheme: () => {},
});

// ============================================================================
// THEME PROVIDER
// ============================================================================

export interface ThemeProviderProps {
  /** Initial theme ID (default: "default") */
  initialTheme?: ThemeId;
  /** Custom color overrides */
  colorOverrides?: Partial<ThemeColors>;
  /** Child components */
  children: ReactNode;
}

/**
 * Theme provider component
 * Wraps the app to provide theme context to all components
 */
export function ThemeProvider({
  initialTheme = "default",
  colorOverrides,
  children,
}: ThemeProviderProps) {
  // Current theme ID state
  const [themeId, setThemeId] = useState<ThemeId>(initialTheme);

  // Set theme by ID
  const setTheme = useCallback((id: ThemeId) => {
    setThemeId(id);
  }, []);

  // Toggle between light and dark themes
  const toggleTheme = useCallback(() => {
    setThemeId((current) => {
      if (current === "light") return "dark";
      if (current === "dark") return "light";
      // For default or retro themes, toggle to dark first
      return "dark";
    });
  }, []);

  // Cycle to next theme
  const nextTheme = useCallback(() => {
    setThemeId((current) => {
      const themeIds: ThemeId[] = ["default", "dark", "light", "retro"];
      const currentIndex = themeIds.indexOf(current);
      const nextIndex = (currentIndex + 1) % themeIds.length;
      return themeIds[nextIndex];
    });
  }, []);

  // Get the base theme
  const baseTheme = useMemo(() => getTheme(themeId), [themeId]);

  // Apply any custom color overrides
  const theme = useMemo((): Theme => {
    if (!colorOverrides) {
      return baseTheme;
    }

    // Merge custom colors into the theme
    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        ...colorOverrides,
      },
    };
  }, [baseTheme, colorOverrides]);

  const contextValue = useMemo(
    () => ({
      theme,
      themeId,
      availableThemes: themes,
      setTheme,
      toggleTheme,
      nextTheme,
    }),
    [theme, themeId, setTheme, toggleTheme, nextTheme]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

// ============================================================================
// THEME HOOKS
// ============================================================================

/**
 * Hook to access the current theme
 * Returns the complete theme context with colors, status colors, etc.
 */
export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

/**
 * Hook to access just the color palette
 * Convenience wrapper for common use case
 */
export function useThemeColors(): ThemeColors {
  const { theme } = useTheme();
  return theme.colors;
}

/**
 * Hook to access status colors
 */
export function useStatusColors() {
  const { theme } = useTheme();
  return theme.statusColors;
}

/**
 * Hook to access alert colors
 */
export function useAlertColors() {
  const { theme } = useTheme();
  return theme.alertColors;
}

/**
 * Hook to access game colors
 */
export function useGameColors() {
  const { theme } = useTheme();
  return theme.gameColors;
}

/**
 * Hook to access rank colors
 */
export function useRankColors() {
  const { theme } = useTheme();
  return theme.rankColors;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get color for a status value using theme
 */
export function getThemedStatusColor(theme: Theme, status: string): string {
  return (
    theme.statusColors[status as keyof Theme["statusColors"]] ??
    theme.colors.textMuted
  );
}

/**
 * Get color for an alert type using theme
 */
export function getThemedAlertColor(theme: Theme, type: string): string {
  return (
    theme.alertColors[type as keyof Theme["alertColors"]] ?? theme.colors.info
  );
}

/**
 * Get color for a rank position using theme
 */
export function getThemedRankColor(
  theme: Theme,
  position: number,
  isHighlighted: boolean = false
): string | undefined {
  if (isHighlighted) return theme.rankColors.highlighted;
  if (position === 1) return theme.rankColors.first;
  if (position <= 3) return theme.rankColors.top3;
  return theme.rankColors.normal;
}

// ============================================================================
// RE-EXPORTS
// ============================================================================

export { ThemeContext };
export type { Theme, ThemeId, ThemeColors } from "./themes.js";
