/**
 * Configuration and XDG paths.
 */

import { homedir } from "node:os";
import { join } from "node:path";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";

export type LayoutPresetId = "default" | "two-pane" | "focus" | "tasks-focus";
export type ClaudeOutputMode = "stream-json" | "stream-text" | "buffered";
export type ThemeId = "default" | "dark" | "light" | "retro";

export interface LayoutPreferences {
  preset?: LayoutPresetId;
  splitRatio?: number;
  minRatio?: number;
  maxRatio?: number;
  resizeStep?: number;
}

export interface ThemePreferences {
  scheme?: ThemeId;
}

export interface ClaudeSettings {
  executablePath?: string;
  defaultArgs?: string[];
  workingDirectory?: string;
  shutdownTimeout?: number;
  outputMode?: ClaudeOutputMode;
}

export interface AppSettings {
  autoPauseOnInput?: boolean;
  autoFocusOnInput?: boolean;
}

export interface TaskSettings {
  autoUpdate?: boolean;
  showCompleted?: boolean;
  defaultPriority?: "low" | "medium" | "high";
}

export interface GameSettings {
  defaultGame?: string;
}

export interface BrainrotConfig {
  version: number;
  layout?: LayoutPreferences;
  theme?: ThemePreferences;
  claude?: ClaudeSettings;
  app?: AppSettings;
  tasks?: TaskSettings;
  games?: GameSettings;
}

const APP_ID = "brainrot-cli";
const CONFIG_VERSION = 1;

function getXdgConfigHome(): string {
  return process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config");
}

export const CONFIG_DIR = join(getXdgConfigHome(), APP_ID);
export const CONFIG_FILE = join(CONFIG_DIR, "config.json");

export const DEFAULT_CONFIG: BrainrotConfig = {
  version: CONFIG_VERSION,
  layout: {
    preset: "default",
    splitRatio: 0.6,
    minRatio: 0.2,
    maxRatio: 0.8,
    resizeStep: 0.05,
  },
  theme: {
    scheme: "default",
  },
  claude: {
    executablePath: "claude",
    defaultArgs: [],
    shutdownTimeout: 5000,
    outputMode: "stream-json",
  },
  app: {
    autoPauseOnInput: true,
    autoFocusOnInput: true,
  },
  tasks: {
    autoUpdate: true,
    showCompleted: true,
    defaultPriority: "medium",
  },
  games: {
    defaultGame: "",
  },
};

export function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const result = { ...target } as T;

  for (const key of Object.keys(source) as (keyof T)[]) {
    const sourceValue = source[key];
    const targetValue = result[key];

    if (
      sourceValue !== null &&
      sourceValue !== undefined &&
      typeof sourceValue === "object" &&
      !Array.isArray(sourceValue) &&
      typeof targetValue === "object" &&
      targetValue !== null &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(
        targetValue as object,
        sourceValue as object
      ) as T[keyof T];
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue as T[keyof T];
    }
  }

  return result;
}

async function ensureConfigDir(): Promise<void> {
  if (!existsSync(CONFIG_DIR)) {
    await mkdir(CONFIG_DIR, { recursive: true });
  }
}

export function configExists(): boolean {
  return existsSync(CONFIG_FILE);
}

export async function loadConfig(customPath?: string): Promise<BrainrotConfig> {
  const path = customPath ?? CONFIG_FILE;

  try {
    if (!existsSync(path)) {
      return DEFAULT_CONFIG;
    }

    const content = await readFile(path, "utf-8");
    const parsed = JSON.parse(content) as Partial<BrainrotConfig>;

    return deepMerge(DEFAULT_CONFIG, parsed);
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function saveConfig(
  config: BrainrotConfig,
  customPath?: string
): Promise<void> {
  const path = customPath ?? CONFIG_FILE;

  await ensureConfigDir();
  const payload = { ...config, version: CONFIG_VERSION };
  await writeFile(path, JSON.stringify(payload, null, 2), "utf-8");
}

export async function updateConfig(
  updates: Partial<Omit<BrainrotConfig, "version">>,
  customPath?: string
): Promise<BrainrotConfig> {
  const current = await loadConfig(customPath);
  const merged = deepMerge(current, updates as Partial<BrainrotConfig>);
  await saveConfig(merged, customPath);
  return merged;
}
