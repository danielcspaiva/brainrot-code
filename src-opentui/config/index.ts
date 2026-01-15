/**
 * Configuration Module
 *
 * Centralized exports for configuration management.
 */

// Core configuration types and functions
export {
  // Types
  type GamePreferences,
  type LayoutPreferences,
  type ThemePreferences,
  type ClaudeOutputMode,
  type ClaudeCodeSettings,
  type RalphLoopSettings,
  type AppSettings,
  type BrainrotConfig,
  // Constants
  CONFIG_DIR,
  DATA_DIR,
  CONFIG_FILE,
  DEFAULT_CONFIG,
  // File operations
  ensureDataDir,
  loadConfig,
  saveConfig,
  updateConfig,
  resetConfig,
  configExists,
  getDataDir,
  getDataFilePath,
  // Utilities
  deepMerge,
  // Config helpers
  getGameConfig,
  getLayoutOptions,
  getClaudeCodeOptions,
  getRalphLoopOptions,
  getThemeOptions,
  getAppSettings,
  getSidePanelSettings,
} from "./config.js";

// React hooks
export {
  type UseConfigResult,
  useConfig,
  useLayoutConfig,
  useClaudeCodeConfig,
  useRalphLoopConfig,
  useThemeConfig,
  useAppSettings,
} from "./useConfig.js";
