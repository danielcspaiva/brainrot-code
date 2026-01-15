/**
 * CLI args parsing.
 */

import { parseArgs } from "node:util";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  BrainrotConfig,
  ClaudeOutputMode,
  LayoutPresetId,
  ThemeId,
} from "../data/config.js";

const CLI_OPTIONS = {
  help: { type: "boolean", short: "h" },
  version: { type: "boolean", short: "v" },
  config: { type: "string", short: "c" },

  "layout": { type: "string" },
  "split-ratio": { type: "string" },

  "color-scheme": { type: "string" },

  "claude-executable": { type: "string" },
  "claude-args": { type: "string" },
  "working-dir": { type: "string", short: "w" },
  "output-mode": { type: "string" },
} as const;

const HELP_TEXT = `
brainrot - Play games while Claude works

USAGE:
  brainrot [OPTIONS]

OPTIONS:
  -h, --help                 Show help message and exit
  -v, --version              Show version and exit
  -c, --config <path>        Use custom config file

LAYOUT OPTIONS:
  --layout <preset>          Layout preset: default, two-pane, focus, tasks-focus
  --split-ratio <ratio>      Split ratio (0.0-1.0)

THEME OPTIONS:
  --color-scheme <scheme>    Color scheme: default, dark, light, retro

CLAUDE OPTIONS:
  --claude-executable <path> Path to Claude Code executable
  --claude-args <args>       Comma-separated args passed to Claude
  -w, --working-dir <path>   Working directory for Claude
  --output-mode <mode>       stream-json | stream-text | buffered
`;

function getVersion(): string {
  try {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const packagePath = join(currentDir, "..", "..", "package.json");
    const packageJson = JSON.parse(readFileSync(packagePath, "utf-8"));
    return packageJson.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

export interface CLIArgs {
  help: boolean;
  version: boolean;
  configFile?: string;
  overrides: Partial<BrainrotConfig>;
  positionals: string[];
}

export interface ParseResult {
  args: CLIArgs;
  error?: string;
}

export function parseCLI(argv: string[] = process.argv): ParseResult {
  try {
    const { values, positionals } = parseArgs({
      args: argv.slice(2),
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

    const overrides: Partial<BrainrotConfig> = {};

    if (values.layout || values["split-ratio"]) {
      overrides.layout = {};

      if (values.layout) {
        const preset = values.layout;
        const valid = ["default", "two-pane", "focus", "tasks-focus"];
        if (!valid.includes(preset)) {
          return {
            args,
            error: `Invalid layout preset: "${preset}".`,
          };
        }
        overrides.layout.preset = preset as LayoutPresetId;
      }

      if (values["split-ratio"]) {
        const ratio = parseFloat(values["split-ratio"]);
        if (isNaN(ratio) || ratio < 0 || ratio > 1) {
          return {
            args,
            error: `Invalid split ratio: "${values["split-ratio"]}".`,
          };
        }
        overrides.layout.splitRatio = ratio;
      }
    }

    if (values["color-scheme"]) {
      const scheme = values["color-scheme"];
      const valid = ["default", "dark", "light", "retro"];
      if (!valid.includes(scheme)) {
        return {
          args,
          error: `Invalid color scheme: "${scheme}".`,
        };
      }
      overrides.theme = { scheme: scheme as ThemeId };
    }

    if (
      values["claude-executable"] ||
      values["claude-args"] ||
      values["working-dir"] ||
      values["output-mode"]
    ) {
      overrides.claude = {};

      if (values["claude-executable"]) {
        overrides.claude.executablePath = values["claude-executable"];
      }

      if (values["claude-args"]) {
        overrides.claude.defaultArgs = values["claude-args"]
          .split(",")
          .map((arg) => arg.trim())
          .filter((arg) => arg.length > 0);
      }

      if (values["working-dir"]) {
        overrides.claude.workingDirectory = values["working-dir"];
      }

      if (values["output-mode"]) {
        const mode = values["output-mode"];
        const validModes = ["stream-json", "stream-text", "buffered"];
        if (!validModes.includes(mode)) {
          return {
            args,
            error: `Invalid output mode: "${mode}".`,
          };
        }
        overrides.claude.outputMode = mode as ClaudeOutputMode;
      }
    }

    args.overrides = overrides;

    return { args };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error parsing arguments";

    return {
      args: {
        help: false,
        version: false,
        positionals: [],
        overrides: {},
      },
      error: `Error parsing arguments: ${message}`,
    };
  }
}

export function printHelp(): void {
  console.log(HELP_TEXT);
}

export function printVersion(): void {
  console.log(`brainrot v${getVersion()}`);
}

export function printError(message: string): void {
  console.error(`Error: ${message}`);
}
