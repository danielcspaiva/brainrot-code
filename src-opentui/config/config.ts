/**
 * Configuration File Support for OpenTUI Rewrite
 *
 * Provides persistent configuration storage following XDG Base Directory conventions.
 * Supports JSON format with comprehensive settings for games, layout, theme, and Claude Code.
 */

import { homedir } from "node:os";
import { join } from "node:path";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Game-specific preferences
 */
export interface GamePreferences {
  /** Default difficulty for games that support it */
  defaultDifficulty?: "easy" | "medium" | "hard";
  /** Snake game settings */
  snake?: {
    /** Initial speed (1-10, where 10 is fastest) */
    initialSpeed?: number;
    /** Growth per food item */
    growthRate?: number;
  };
  /** Tetris game settings */
  tetris?: {
    /** Starting level (1-10) */
    startingLevel?: number;
    /** Enable ghost piece preview */
    showGhostPiece?: boolean;
  };
  /** Minesweeper game settings */
  minesweeper?: {
    /** Default difficulty */
    defaultDifficulty?: "easy" | "medium" | "hard";
    /** Show timer */
    showTimer?: boolean;
  };
  /** Pong game settings */
  pong?: {
    /** AI difficulty (1-10) */
    aiDifficulty?: number;
    /** Ball speed multiplier (0.5-2.0) */
    ballSpeedMultiplier?: number;
  };
}

/**
 * Layout preferences for the split-pane interface
 */
export interface LayoutPreferences {
  /** Initial split direction: horizontal (left/right) or vertical (top/bottom) */
  direction?: "horizontal" | "vertical";
  /** Initial split ratio (0.0 - 1.0), proportion of first pane */
  splitRatio?: number;
  /** Minimum split ratio allowed */
  minRatio?: number;
  /** Maximum split ratio allowed */
  maxRatio?: number;
  /** Step size for keyboard resizing */
  resizeStep?: number;
  /** Whether to show the secondary pane (management panel) by default */
  showSecondary?: boolean;
  /** Which pane is focused by default (0 = claude, 1 = game) */
  defaultFocusedPane?: 0 | 1;
  /** Minimum terminal width to show side panel (columns). Default: 120 */
  sidePanelThreshold?: number;
  /** Width of side panel when shown (columns). Default: 35 */
  sidePanelWidth?: number;
}

/**
 * Theme settings for visual customization
 */
export interface ThemePreferences {
  /** Color scheme - multiple themes available */
  colorScheme?: "default" | "dark" | "light" | "retro";
  /** Border style for panels */
  borderStyle?: "single" | "round" | "double" | "heavy";
  /** Spinner animation style */
  spinnerStyle?: "spinner" | "dots" | "braille";
  /** Enable/disable animations */
  enableAnimations?: boolean;
  /** Custom color overrides (hex colors for OpenTUI) */
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    success?: string;
    warning?: string;
    error?: string;
  };
}

/**
 * Output mode for Claude Code
 * - stream-json: Streaming JSON output (default)
 * - stream-text: Streaming text output
 * - buffered: Buffered output (waits for completion)
 */
export type ClaudeOutputMode = "stream-json" | "stream-text" | "buffered";

/**
 * Claude Code integration settings
 */
export interface ClaudeCodeSettings {
  /** Path to Claude Code executable (defaults to 'claude' in PATH) */
  executablePath?: string;
  /** Default working directory for Claude Code sessions */
  workingDirectory?: string;
  /** Default command-line arguments */
  defaultArgs?: string[];
  /** Environment variables to pass to Claude Code */
  environment?: Record<string, string>;
  /** Timeout for graceful shutdown in milliseconds */
  shutdownTimeout?: number;
  /** Output mode: stream-json (default), stream-text, or buffered */
  outputMode?: ClaudeOutputMode;
}

/**
 * Ralph loop specific settings
 */
export interface RalphLoopSettings {
  /** Maximum iterations for Ralph loop (default: 10) */
  maxIterations?: number;
  /** Default PRD file path */
  defaultPrdPath?: string;
  /** Auto-start loop after loading PRD */
  autoStart?: boolean;
  /** Save PRD after each iteration */
  autoSavePrd?: boolean;
}

/**
 * Application behavior settings
 */
export interface AppSettings {
  /** Maximum scores to keep per game leaderboard */
  maxScoresPerGame?: number;
  /** Default game to select on startup (game ID) */
  defaultGame?: string;
  /** Enable debug mode */
  debugMode?: boolean;
  /** Log verbosity level */
  logLevel?: "error" | "warn" | "info" | "debug";
  /** Auto-pause games when Claude needs input (default: true) */
  autoPauseOnInput?: boolean;
  /** Auto-focus Claude pane when input is requested (default: true) */
  autoFocusOnInput?: boolean;
}

/**
 * Complete configuration structure
 */
export interface BrainrotConfig {
  /** Config file format version */
  version: number;
  /** Game-specific preferences */
  games?: GamePreferences;
  /** Layout preferences */
  layout?: LayoutPreferences;
  /** Theme settings */
  theme?: ThemePreferences;
  /** Claude Code settings */
  claudeCode?: ClaudeCodeSettings;
  /** Ralph loop settings */
  ralphLoop?: RalphLoopSettings;
  /** Application settings */
  app?: AppSettings;
}

// ============================================================================
// XDG DIRECTORY PATHS
// ============================================================================

/**
 * Get XDG config directory
 * Falls back to ~/.config on macOS/Linux if XDG_CONFIG_HOME is not set
 */
function getXdgConfigHome(): string {
  return process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config");
}

/**
 * Get XDG data directory
 * Falls back to ~/.local/share on macOS/Linux if XDG_DATA_HOME is not set
 */
function getXdgDataHome(): string {
  return process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share");
}

/** Application identifier */
const APP_ID = "brainrot-cli";

/** Legacy data directory (for migration) */
const LEGACY_DATA_DIR = join(homedir(), ".brainrot-cli");

/** Config directory following XDG conventions */
export const CONFIG_DIR = join(getXdgConfigHome(), APP_ID);

/** Data directory following XDG conventions */
export const DATA_DIR = join(getXdgDataHome(), APP_ID);

/** Config file path */
export const CONFIG_FILE = join(CONFIG_DIR, "config.json");

/** Current config format version */
const CONFIG_VERSION = 1;

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: BrainrotConfig = {
  version: CONFIG_VERSION,
  games: {
    defaultDifficulty: "medium",
    snake: {
      initialSpeed: 5,
      growthRate: 1,
    },
    tetris: {
      startingLevel: 1,
      showGhostPiece: true,
    },
    minesweeper: {
      defaultDifficulty: "easy",
      showTimer: true,
    },
    pong: {
      aiDifficulty: 5,
      ballSpeedMultiplier: 1.0,
    },
  },
  layout: {
    direction: "horizontal",
    splitRatio: 0.6,
    minRatio: 0.2,
    maxRatio: 0.8,
    resizeStep: 0.05,
    showSecondary: true,
    defaultFocusedPane: 0,
    sidePanelThreshold: 120,
    sidePanelWidth: 35,
  },
  theme: {
    colorScheme: "default",
    borderStyle: "round",
    spinnerStyle: "spinner",
    enableAnimations: true,
  },
  claudeCode: {
    executablePath: "claude",
    shutdownTimeout: 5000,
    outputMode: "stream-json",
  },
  ralphLoop: {
    maxIterations: 10,
    autoStart: false,
    autoSavePrd: true,
  },
  app: {
    maxScoresPerGame: 10,
    debugMode: false,
    logLevel: "info",
    autoPauseOnInput: true,
    autoFocusOnInput: true,
  },
};

// ============================================================================
// CONFIG FILE OPERATIONS
// ============================================================================

/**
 * Ensure config directory exists
 */
async function ensureConfigDir(): Promise<void> {
  if (!existsSync(CONFIG_DIR)) {
    await mkdir(CONFIG_DIR, { recursive: true });
  }
}

/**
 * Ensure data directory exists
 */
export async function ensureDataDir(): Promise<void> {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
}

/**
 * Deep merge two objects, with source taking precedence
 * Exported for use in CLI override merging
 */
export function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key of Object.keys(source) as (keyof T)[]) {
    const sourceValue = source[key];
    const targetValue = target[key];

    if (
      sourceValue !== undefined &&
      sourceValue !== null &&
      typeof sourceValue === "object" &&
      !Array.isArray(sourceValue) &&
      typeof targetValue === "object" &&
      targetValue !== null &&
      !Array.isArray(targetValue)
    ) {
      // Recursively merge objects
      result[key] = deepMerge(
        targetValue as object,
        sourceValue as object
      ) as T[keyof T];
    } else if (sourceValue !== undefined) {
      // Use source value directly
      result[key] = sourceValue as T[keyof T];
    }
  }

  return result;
}

/**
 * Load configuration from disk
 * Returns merged config with defaults for any missing values
 */
export async function loadConfig(): Promise<BrainrotConfig> {
  try {
    if (!existsSync(CONFIG_FILE)) {
      return DEFAULT_CONFIG;
    }

    const content = await readFile(CONFIG_FILE, "utf-8");
    const userConfig = JSON.parse(content) as Partial<BrainrotConfig>;

    // Handle version migration if needed
    if (userConfig.version !== CONFIG_VERSION) {
      // For now, just merge with defaults
      // Future versions can add migration logic here
    }

    // Deep merge with defaults to fill in any missing values
    return deepMerge(DEFAULT_CONFIG, userConfig);
  } catch {
    // If file is corrupted or unreadable, return defaults
    return DEFAULT_CONFIG;
  }
}

/**
 * Save configuration to disk
 */
export async function saveConfig(config: BrainrotConfig): Promise<void> {
  try {
    await ensureConfigDir();

    // Ensure version is set
    const configToSave = {
      ...config,
      version: CONFIG_VERSION,
    };

    await writeFile(
      CONFIG_FILE,
      JSON.stringify(configToSave, null, 2),
      "utf-8"
    );
  } catch (error) {
    // Log error but don't throw - config saving is not critical
    console.error("Failed to save configuration:", error);
  }
}

/**
 * Update specific configuration sections
 */
export async function updateConfig(
  updates: Partial<Omit<BrainrotConfig, "version">>
): Promise<BrainrotConfig> {
  const current = await loadConfig();
  const updated = deepMerge(current, updates as Partial<BrainrotConfig>);
  await saveConfig(updated);
  return updated;
}

/**
 * Reset configuration to defaults
 */
export async function resetConfig(): Promise<void> {
  await saveConfig(DEFAULT_CONFIG);
}

/**
 * Check if a config file exists
 */
export function configExists(): boolean {
  return existsSync(CONFIG_FILE);
}

/**
 * Get the effective data directory (handles legacy migration)
 * If legacy directory exists and XDG directory doesn't, returns legacy
 * Otherwise returns XDG directory
 */
export function getDataDir(): string {
  // If XDG data dir exists, use it
  if (existsSync(DATA_DIR)) {
    return DATA_DIR;
  }

  // If legacy dir exists and XDG doesn't, use legacy for backwards compatibility
  if (existsSync(LEGACY_DATA_DIR)) {
    return LEGACY_DATA_DIR;
  }

  // Default to XDG
  return DATA_DIR;
}

/**
 * Get path for a data file
 */
export function getDataFilePath(filename: string): string {
  return join(getDataDir(), filename);
}

// ============================================================================
// CONFIGURATION HELPERS
// ============================================================================

/**
 * Get game preferences with defaults filled in
 */
export function getGameConfig(
  config: BrainrotConfig,
  gameId: string
): GamePreferences[keyof GamePreferences] | undefined {
  return config.games?.[gameId as keyof GamePreferences];
}

/**
 * Get layout options suitable for layout components
 */
export function getLayoutOptions(config: BrainrotConfig): {
  initialDirection: "horizontal" | "vertical";
  initialSplitRatio: number;
  minRatio: number;
  maxRatio: number;
  resizeStep: number;
  showSecondary: boolean;
  defaultFocusedPane: 0 | 1;
} {
  const layout = config.layout ?? DEFAULT_CONFIG.layout!;
  return {
    initialDirection: layout.direction ?? "horizontal",
    initialSplitRatio: layout.splitRatio ?? 0.6,
    minRatio: layout.minRatio ?? 0.2,
    maxRatio: layout.maxRatio ?? 0.8,
    resizeStep: layout.resizeStep ?? 0.05,
    showSecondary: layout.showSecondary ?? true,
    defaultFocusedPane: layout.defaultFocusedPane ?? 0,
  };
}

/**
 * Get Claude Code spawn options
 */
export function getClaudeCodeOptions(config: BrainrotConfig): {
  executablePath: string;
  defaultArgs: string[];
  workingDirectory?: string;
  environment?: Record<string, string>;
  shutdownTimeout: number;
  outputMode: ClaudeOutputMode;
} {
  const claudeCode = config.claudeCode ?? DEFAULT_CONFIG.claudeCode!;
  return {
    executablePath: claudeCode.executablePath ?? "claude",
    defaultArgs: claudeCode.defaultArgs ?? [],
    workingDirectory: claudeCode.workingDirectory,
    environment: claudeCode.environment,
    shutdownTimeout: claudeCode.shutdownTimeout ?? 5000,
    outputMode: claudeCode.outputMode ?? "stream-json",
  };
}

/**
 * Get Ralph loop options
 */
export function getRalphLoopOptions(config: BrainrotConfig): {
  maxIterations: number;
  defaultPrdPath?: string;
  autoStart: boolean;
  autoSavePrd: boolean;
} {
  const ralphLoop = config.ralphLoop ?? DEFAULT_CONFIG.ralphLoop!;
  return {
    maxIterations: ralphLoop.maxIterations ?? 10,
    defaultPrdPath: ralphLoop.defaultPrdPath,
    autoStart: ralphLoop.autoStart ?? false,
    autoSavePrd: ralphLoop.autoSavePrd ?? true,
  };
}

/**
 * Get theme options
 */
export function getThemeOptions(config: BrainrotConfig): {
  colorScheme: "default" | "dark" | "light" | "retro";
  borderStyle: "single" | "round" | "double" | "heavy";
  spinnerStyle: "spinner" | "dots" | "braille";
  enableAnimations: boolean;
  colorOverrides?: ThemePreferences["colors"];
} {
  const theme = config.theme ?? DEFAULT_CONFIG.theme!;
  return {
    colorScheme: theme.colorScheme ?? "default",
    borderStyle: theme.borderStyle ?? "round",
    spinnerStyle: theme.spinnerStyle ?? "spinner",
    enableAnimations: theme.enableAnimations ?? true,
    colorOverrides: theme.colors,
  };
}

/**
 * Get app settings
 */
export function getAppSettings(config: BrainrotConfig): Required<AppSettings> {
  const app = config.app ?? DEFAULT_CONFIG.app!;
  return {
    maxScoresPerGame: app.maxScoresPerGame ?? 10,
    defaultGame: app.defaultGame ?? "",
    debugMode: app.debugMode ?? false,
    logLevel: app.logLevel ?? "info",
    autoPauseOnInput: app.autoPauseOnInput ?? true,
    autoFocusOnInput: app.autoFocusOnInput ?? true,
  };
}

/**
 * Get side panel layout settings
 */
export function getSidePanelSettings(config: BrainrotConfig): {
  threshold: number;
  width: number;
} {
  const layout = config.layout ?? DEFAULT_CONFIG.layout!;
  return {
    threshold: layout.sidePanelThreshold ?? 120,
    width: layout.sidePanelWidth ?? 35,
  };
}
