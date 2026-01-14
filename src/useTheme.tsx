/**
 * Theme Hook and Context
 *
 * Provides the current theme to all components via React context.
 * Reads the theme preference from config and applies it consistently.
 */

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { type Theme, type ThemeId, getTheme, themes } from "./themes.js";
import type { BrainrotConfig } from "./config.js";

// ============================================================================
// THEME CONTEXT
// ============================================================================

/**
 * Theme context value
 */
interface ThemeContextValue {
  /** Current theme */
  theme: Theme;
  /** Current theme ID */
  themeId: ThemeId;
  /** All available themes for selection */
  availableThemes: typeof themes;
}

/**
 * Theme context with default theme
 */
const ThemeContext = createContext<ThemeContextValue>({
  theme: getTheme("default"),
  themeId: "default",
  availableThemes: themes,
});

// ============================================================================
// THEME PROVIDER
// ============================================================================

export interface ThemeProviderProps {
  /** Current configuration containing theme preferences */
  config: BrainrotConfig;
  /** Child components */
  children: ReactNode;
}

/**
 * Theme provider component
 * Wraps the app to provide theme context to all components
 */
export function ThemeProvider({ config, children }: ThemeProviderProps) {
  const themePrefs = config.theme ?? {};

  // Determine the theme ID from config
  const themeId = useMemo((): ThemeId => {
    const colorScheme = themePrefs.colorScheme ?? "default";
    return colorScheme as ThemeId;
  }, [themePrefs.colorScheme]);

  // Get the base theme
  const baseTheme = useMemo(() => getTheme(themeId), [themeId]);

  // Apply any custom color overrides from config
  const theme = useMemo((): Theme => {
    const customColors = themePrefs.colors;
    if (!customColors) {
      return baseTheme;
    }

    // Merge custom colors into the theme
    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        ...(customColors.primary && { primary: customColors.primary }),
        ...(customColors.secondary && { secondary: customColors.secondary }),
        ...(customColors.accent && { accent: customColors.accent }),
        ...(customColors.success && { success: customColors.success }),
        ...(customColors.warning && { warning: customColors.warning }),
        ...(customColors.error && { error: customColors.error }),
      },
    };
  }, [baseTheme, themePrefs.colors]);

  const contextValue = useMemo(
    () => ({
      theme,
      themeId,
      availableThemes: themes,
    }),
    [theme, themeId]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

// ============================================================================
// THEME HOOK
// ============================================================================

/**
 * Hook to access the current theme
 * Returns the complete theme object with colors, status colors, etc.
 */
export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

/**
 * Hook to access just the color palette
 * Convenience wrapper for common use case
 */
export function useThemeColors() {
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
export function getThemedStatusColor(
  theme: Theme,
  status: string
): string {
  return (
    theme.statusColors[status as keyof Theme["statusColors"]] ??
    theme.colors.textMuted
  );
}

/**
 * Get color for an alert type using theme
 */
export function getThemedAlertColor(
  theme: Theme,
  type: string
): string {
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
// RE-EXPORTS FOR CONVENIENCE
// ============================================================================

export { ThemeContext };
export type { Theme, ThemeId, ThemeColors } from "./themes.js";
