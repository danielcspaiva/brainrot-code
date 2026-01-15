/**
 * CLI Flag Parser
 *
 * Parses command-line arguments and provides flag overrides for configuration.
 * Uses Node's built-in util.parseArgs() (Node 18+).
 */

import { parseArgs } from "node:util";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  BrainrotConfig,
  ThemePreferences,
  AppSettings,
  ClaudeOutputMode,
} from "./config.js";

// ============================================================================
// VERSION DETECTION
// ============================================================================

/**
 * Get version from package.json
 */
function getVersion(): string {
  try {
    // Handle ESM module path resolution
    const currentDir = dirname(fileURLToPath(import.meta.url));
    // Go up from dist/ or src/ to find package.json
    const packagePath = join(currentDir, "..", "package.json");
    const packageJson = JSON.parse(readFileSync(packagePath, "utf-8"));
    return packageJson.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

// ============================================================================
// CLI FLAG DEFINITIONS
// ============================================================================

/**
 * CLI flag configuration for parseArgs
 */
const CLI_OPTIONS = {
  // Meta flags
  help: { type: "boolean", short: "h" },
  version: { type: "boolean", short: "v" },

  // Config file override
  config: { type: "string", short: "c" },

  // Layout options
  "layout-direction": { type: "string" },
  "split-ratio": { type: "string" },

  // Theme options
  "color-scheme": { type: "string" },
  "border-style": { type: "string" },

  // Claude Code options
  "claude-executable": { type: "string" },
  "claude-args": { type: "string" },
  "working-dir": { type: "string", short: "w" },
  "output-mode": { type: "string" },

  // App options
  debug: { type: "boolean", short: "d" },
  "log-level": { type: "string" },
  "default-game": { type: "string", short: "g" },
} as const;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface CLIArgs {
  /** Show help message and exit */
  help: boolean;
  /** Show version and exit */
  version: boolean;
  /** Custom config file path */
  configFile?: string;
  /** Config overrides from CLI flags */
  overrides: Partial<BrainrotConfig>;
  /** Any positional arguments (unused currently) */
  positionals: string[];
}

export interface ParseResult {
  /** Parsed CLI arguments */
  args: CLIArgs;
  /** Error message if parsing failed */
  error?: string;
}

// ============================================================================
// HELP TEXT
// ============================================================================

const HELP_TEXT = `
brainrot - Play games while Claude Code works

USAGE:
  brainrot [OPTIONS]

OPTIONS:
  -h, --help                 Show this help message and exit
  -v, --version              Show version and exit
  -c, --config <path>        Use custom config file path

LAYOUT OPTIONS:
  --layout-direction <dir>   Split direction: horizontal, vertical
  --split-ratio <ratio>      Split ratio (0.0-1.0, e.g., 0.5)

THEME OPTIONS:
  --color-scheme <scheme>    Color scheme: default, dark, light, high-contrast
  --border-style <style>     Border style: single, round, double, heavy

CLAUDE CODE OPTIONS:
  --claude-executable <path> Path to Claude Code executable
  --claude-args <args>       Arguments to pass to Claude Code (comma-separated)
  -w, --working-dir <path>   Working directory for Claude Code
  --output-mode <mode>       Output mode: stream-json (default), stream-text, buffered

APP OPTIONS:
  -d, --debug                Enable debug mode
  --log-level <level>        Log level: error, warn, info, debug
  -g, --default-game <id>    Default game to select: snake, tetris, pong, minesweeper

EXAMPLES:
  brainrot                              Start with default settings
  brainrot --layout-direction vertical  Use vertical split layout
  brainrot --split-ratio 0.7            Game pane takes 70% of space
  brainrot --debug --log-level debug    Enable debug mode with verbose logging
  brainrot -c ~/.my-brainrot.json       Use custom config file

CONFIG FILE:
  Default location: ~/.config/brainrot-cli/config.json
  CLI flags override config file values.

For more information, visit: https://github.com/brainrot-cli/brainrot
`;

// ============================================================================
// PARSING FUNCTIONS
// ============================================================================

/**
 * Parse command-line arguments
 */
export function parseCLI(argv: string[] = process.argv): ParseResult {
  try {
    const { values, positionals } = parseArgs({
      args: argv.slice(2), // Skip node and script path
      options: CLI_OPTIONS,
      allowPositionals: true,
      strict: true,
    });

    const args: CLIArgs = {
      help: values.help ?? false,
      version: values.version ?? false,
      configFile: values.config,
      positionals,
      overrides: {},
    };

    // Build config overrides from CLI flags
    const overrides: Partial<BrainrotConfig> = {};

    // Layout overrides
    if (values["layout-direction"] || values["split-ratio"]) {
      overrides.layout = {};

      if (values["layout-direction"]) {
        const dir = values["layout-direction"];
        if (dir !== "horizontal" && dir !== "vertical") {
          return {
            args,
            error: `Invalid layout direction: "${dir}". Must be "horizontal" or "vertical".`,
          };
        }
        overrides.layout.direction = dir;
      }

      if (values["split-ratio"]) {
        const ratio = parseFloat(values["split-ratio"]);
        if (isNaN(ratio) || ratio < 0 || ratio > 1) {
          return {
            args,
            error: `Invalid split ratio: "${values["split-ratio"]}". Must be a number between 0.0 and 1.0.`,
          };
        }
        overrides.layout.splitRatio = ratio;
      }
    }

    // Theme overrides
    if (values["color-scheme"] || values["border-style"]) {
      overrides.theme = {};

      if (values["color-scheme"]) {
        const scheme = values["color-scheme"];
        const validSchemes = ["default", "dark", "light", "high-contrast"];
        if (!validSchemes.includes(scheme)) {
          return {
            args,
            error: `Invalid color scheme: "${scheme}". Must be one of: ${validSchemes.join(", ")}.`,
          };
        }
        overrides.theme.colorScheme = scheme as ThemePreferences["colorScheme"];
      }

      if (values["border-style"]) {
        const style = values["border-style"];
        const validStyles = ["single", "round", "double", "heavy"];
        if (!validStyles.includes(style)) {
          return {
            args,
            error: `Invalid border style: "${style}". Must be one of: ${validStyles.join(", ")}.`,
          };
        }
        overrides.theme.borderStyle = style as ThemePreferences["borderStyle"];
      }
    }

    // Claude Code overrides
    if (
      values["claude-executable"] ||
      values["claude-args"] ||
      values["working-dir"] ||
      values["output-mode"]
    ) {
      overrides.claudeCode = {};

      if (values["claude-executable"]) {
        overrides.claudeCode.executablePath = values["claude-executable"];
      }

      if (values["claude-args"]) {
        // Split comma-separated args
        overrides.claudeCode.defaultArgs = values["claude-args"]
          .split(",")
          .map((arg) => arg.trim())
          .filter((arg) => arg.length > 0);
      }

      if (values["working-dir"]) {
        overrides.claudeCode.workingDirectory = values["working-dir"];
      }

      if (values["output-mode"]) {
        const mode = values["output-mode"];
        const validModes = ["stream-json", "stream-text", "buffered"];
        if (!validModes.includes(mode)) {
          return {
            args,
            error: `Invalid output mode: "${mode}". Must be one of: ${validModes.join(", ")}.`,
          };
        }
        overrides.claudeCode.outputMode = mode as ClaudeOutputMode;
      }
    }

    // App overrides
    if (values.debug || values["log-level"] || values["default-game"]) {
      overrides.app = {};

      if (values.debug) {
        overrides.app.debugMode = true;
      }

      if (values["log-level"]) {
        const level = values["log-level"];
        const validLevels = ["error", "warn", "info", "debug"];
        if (!validLevels.includes(level)) {
          return {
            args,
            error: `Invalid log level: "${level}". Must be one of: ${validLevels.join(", ")}.`,
          };
        }
        overrides.app.logLevel = level as AppSettings["logLevel"];
      }

      if (values["default-game"]) {
        overrides.app.defaultGame = values["default-game"];
      }
    }

    args.overrides = overrides;

    return { args };
  } catch (error) {
    // Handle unknown flags or other parsing errors
    const message =
      error instanceof Error
        ? error.message
        : "Unknown error parsing arguments";

    // Provide helpful error message for unknown flags
    if (message.includes("Unknown option")) {
      const match = message.match(/Unknown option '([^']+)'/);
      const flag = match?.[1] ?? "unknown";
      return {
        args: {
          help: false,
          version: false,
          positionals: [],
          overrides: {},
        },
        error: `Unknown option: ${flag}\n\nRun 'brainrot --help' to see available options.`,
      };
    }

    return {
      args: {
        help: false,
        version: false,
        positionals: [],
        overrides: {},
      },
      error: `Error parsing arguments: ${message}\n\nRun 'brainrot --help' to see available options.`,
    };
  }
}

/**
 * Print help message to stdout
 */
export function printHelp(): void {
  console.log(HELP_TEXT);
}

/**
 * Print version to stdout
 */
export function printVersion(): void {
  const version = getVersion();
  console.log(`brainrot v${version}`);
}

/**
 * Print error message to stderr
 */
export function printError(message: string): void {
  console.error(`Error: ${message}`);
}
