/**
 * XDG data paths.
 */

import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";

const APP_ID = "brainrot-cli";

function getXdgDataHome(): string {
  return process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share");
}

export const DATA_DIR = join(getXdgDataHome(), APP_ID);

export async function ensureDataDir(): Promise<void> {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
}

export function getDataFilePath(filename: string): string {
  return join(DATA_DIR, filename);
}
