/**
 * Debug Logger Utility
 *
 * Provides debug logging that:
 * - Writes to both console.error (stderr) and .ralph-tui/debug.log
 * - Respects the --debug CLI flag
 * - Timestamps all messages
 * - Categorizes logs (SPAWN, OUTPUT, EVENT, ERROR, PARSE)
 * - Emits events for UI subscription (debug panel)
 */

import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { EventEmitter } from "node:events";

// ============================================================================
// TYPES
// ============================================================================

export type LogCategory = "SPAWN" | "OUTPUT" | "EVENT" | "ERROR" | "PARSE" | "INIT";

export interface DebugMessage {
  timestamp: string;
  category: LogCategory;
  message: string;
  data?: unknown;
  formatted: string;
}

interface DebugLoggerConfig {
  enabled: boolean;
  workDir: string;
}

// ============================================================================
// EVENT BUS FOR UI SUBSCRIPTION
// ============================================================================

export const debugEvents = new EventEmitter();
debugEvents.setMaxListeners(20); // Allow multiple UI subscribers

// ============================================================================
// GLOBAL STATE
// ============================================================================

let config: DebugLoggerConfig = {
  enabled: false,
  workDir: process.cwd(),
};

let logFileReady = false;
let pendingLogs: string[] = [];

// Store recent messages for new subscribers
const recentMessages: DebugMessage[] = [];
const MAX_RECENT_MESSAGES = 100;

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the debug logger (SYNCHRONOUS for immediate availability)
 * @param enabled Whether debug mode is enabled
 * @param workDir Working directory (for .ralph-tui/debug.log location)
 */
export function initDebugLogger(
  enabled: boolean,
  workDir: string = process.cwd()
): void {
  // Enable immediately so logs work right away
  config = { enabled, workDir };

  if (!enabled) return;

  // File setup runs in background - don't block
  void setupLogFile(workDir);
}

async function setupLogFile(workDir: string): Promise<void> {
  try {
    const ralphDir = join(workDir, ".ralph-tui");
    await mkdir(ralphDir, { recursive: true });

    // Clear previous debug log
    const logPath = join(ralphDir, "debug.log");
    await appendFile(logPath, `\n${"=".repeat(60)}\n`);
    await appendFile(logPath, `Debug session started: ${new Date().toISOString()}\n`);
    await appendFile(logPath, `${"=".repeat(60)}\n\n`);

    logFileReady = true;

    // Flush pending logs
    for (const log of pendingLogs) {
      await writeToFile(log);
    }
    pendingLogs = [];
  } catch (error) {
    console.error("[DEBUG] Failed to initialize log file:", error);
  }
}

// ============================================================================
// LOGGING FUNCTIONS
// ============================================================================

async function writeToFile(message: string): Promise<void> {
  if (!config.enabled) return;

  try {
    const logPath = join(config.workDir, ".ralph-tui", "debug.log");
    await appendFile(logPath, message + "\n");
  } catch {
    // Silently fail - don't break the app for logging
  }
}

/**
 * Log a debug message
 */
export function debugLog(category: LogCategory, message: string, data?: unknown): void {
  if (!config.enabled) return;

  const timestamp = new Date().toISOString().split("T")[1]?.slice(0, 12) ?? "";
  const prefix = `[${timestamp}][${category}]`;
  const fullMessage = data !== undefined
    ? `${prefix} ${message}: ${formatData(data)}`
    : `${prefix} ${message}`;

  // Create debug message object for UI
  const debugMessage: DebugMessage = {
    timestamp,
    category,
    message,
    data,
    formatted: fullMessage,
  };

  // Store for new subscribers
  recentMessages.push(debugMessage);
  if (recentMessages.length > MAX_RECENT_MESSAGES) {
    recentMessages.shift();
  }

  // Emit event for UI subscribers
  debugEvents.emit("message", debugMessage);

  // Always write to stderr (won't interfere with Ink rendering)
  console.error(fullMessage);

  // Write to file
  if (logFileReady) {
    void writeToFile(fullMessage);
  } else {
    pendingLogs.push(fullMessage);
  }
}

function formatData(data: unknown): string {
  if (typeof data === "string") {
    // Truncate long strings
    if (data.length > 200) {
      return `"${data.slice(0, 200)}..." (${data.length} chars)`;
    }
    return `"${data}"`;
  }
  if (typeof data === "number" || typeof data === "boolean") {
    return String(data);
  }
  if (data === null) {
    return "null";
  }
  if (data === undefined) {
    return "undefined";
  }
  if (Array.isArray(data)) {
    return `[${data.length} items]`;
  }
  if (typeof data === "object") {
    try {
      const str = JSON.stringify(data);
      if (str.length > 200) {
        return str.slice(0, 200) + "...";
      }
      return str;
    } catch {
      return "[Object]";
    }
  }
  return String(data);
}

// ============================================================================
// DIAGNOSTIC HELPERS
// ============================================================================

/**
 * Check if Claude CLI is available and log diagnostic info
 */
export function logClaudeDiagnostics(): void {
  if (!config.enabled) return;

  debugLog("INIT", "Running Claude CLI diagnostics...");

  // Check which claude
  try {
    const claudePath = execSync("which claude", { encoding: "utf-8" }).trim();
    debugLog("INIT", "Claude CLI found at", claudePath);
  } catch {
    debugLog("ERROR", "Claude CLI not found in PATH!");
    debugLog("INIT", "PATH", process.env.PATH?.split(":").slice(0, 5).join(":") + "...");
  }

  // Try to get Claude version
  try {
    const version = execSync("claude --version 2>&1", { encoding: "utf-8", timeout: 5000 }).trim();
    debugLog("INIT", "Claude version", version);
  } catch (error) {
    debugLog("ERROR", "Failed to get Claude version", error instanceof Error ? error.message : String(error));
  }

  // Log working directory
  debugLog("INIT", "Working directory", config.workDir);
  debugLog("INIT", "Node version", process.version);
}

/**
 * Log spawn details
 */
export function logSpawnDetails(
  executable: string,
  args: string[],
  cwd: string
): void {
  if (!config.enabled) return;

  debugLog("SPAWN", `Executable: ${executable}`);
  debugLog("SPAWN", `Args: ${args.map(a => a.length > 50 ? a.slice(0, 50) + "..." : a).join(" ")}`);
  debugLog("SPAWN", `CWD: ${cwd}`);
}

/**
 * Log process events
 */
export function logProcessEvent(
  event: "spawn" | "stdout" | "stderr" | "error" | "exit",
  details: string | number | Error
): void {
  if (!config.enabled) return;

  const category: LogCategory = event === "error" ? "ERROR" : "OUTPUT";

  if (event === "error" && details instanceof Error) {
    debugLog(category, `Process ${event}`, `${details.name}: ${details.message}`);
  } else {
    debugLog(category, `Process ${event}`, details);
  }
}

// ============================================================================
// QUICK CHECK & UTILITIES
// ============================================================================

/**
 * Check if debug mode is enabled
 */
export function isDebugEnabled(): boolean {
  return config.enabled;
}

/**
 * Get recent debug messages (for new UI subscribers)
 */
export function getRecentMessages(): DebugMessage[] {
  return [...recentMessages];
}
