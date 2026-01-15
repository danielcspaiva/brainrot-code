/**
 * Error Types and Utilities for BrainRot CLI v2
 *
 * Provides centralized error handling infrastructure with:
 * - Typed error categories for different failure modes
 * - Error severity levels for UI feedback
 * - Recovery action suggestions
 */

/**
 * Error categories for different failure modes
 */
export type ErrorCategory =
  | "process" // Claude Code process errors
  | "prd" // PRD loading/parsing errors
  | "config" // Configuration errors
  | "render" // React rendering errors
  | "network" // Network/connectivity errors
  | "unknown"; // Unclassified errors

/**
 * Error severity levels for UI feedback
 */
export type ErrorSeverity =
  | "warning" // Non-blocking, can continue
  | "error" // Blocking but recoverable
  | "fatal"; // Requires restart

/**
 * Recovery actions that can be suggested to the user
 */
export type RecoveryAction =
  | "retry" // Try the operation again
  | "restart" // Restart the application
  | "reload_config" // Reload configuration
  | "reload_prd" // Reload PRD file
  | "kill_process" // Force kill Claude process
  | "dismiss"; // Just dismiss the error

/**
 * Structured application error with context
 */
export interface AppError {
  /** Unique error ID for logging/tracking */
  id: string;
  /** Error category for routing to appropriate handler */
  category: ErrorCategory;
  /** Severity level for UI feedback */
  severity: ErrorSeverity;
  /** User-friendly error message */
  message: string;
  /** Technical details (for debug mode) */
  details?: string;
  /** Stack trace (for debug mode) */
  stack?: string;
  /** When the error occurred */
  timestamp: Date;
  /** Suggested recovery actions */
  recoveryActions: RecoveryAction[];
  /** Original error if wrapped */
  cause?: Error;
}

/**
 * Generate a unique error ID
 */
function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Create an AppError from various error sources
 */
export function createAppError(
  category: ErrorCategory,
  message: string,
  options: {
    severity?: ErrorSeverity;
    details?: string;
    cause?: Error;
    recoveryActions?: RecoveryAction[];
  } = {}
): AppError {
  const {
    severity = "error",
    details,
    cause,
    recoveryActions = getDefaultRecoveryActions(category, severity),
  } = options;

  return {
    id: generateErrorId(),
    category,
    severity,
    message,
    details: details ?? cause?.message,
    stack: cause?.stack,
    timestamp: new Date(),
    recoveryActions,
    cause,
  };
}

/**
 * Get default recovery actions based on error category and severity
 */
function getDefaultRecoveryActions(
  category: ErrorCategory,
  severity: ErrorSeverity
): RecoveryAction[] {
  if (severity === "fatal") {
    return ["restart"];
  }

  switch (category) {
    case "process":
      return ["retry", "kill_process", "dismiss"];
    case "prd":
      return ["reload_prd", "retry", "dismiss"];
    case "config":
      return ["reload_config", "dismiss"];
    case "render":
      return ["retry", "restart"];
    case "network":
      return ["retry", "dismiss"];
    default:
      return ["retry", "dismiss"];
  }
}

/**
 * Create a process error (Claude Code)
 */
export function createProcessError(
  message: string,
  options: {
    exitCode?: number | null;
    signal?: string | null;
    cause?: Error;
  } = {}
): AppError {
  const { exitCode, signal, cause } = options;

  let details = "";
  if (exitCode !== undefined && exitCode !== null) {
    details += `Exit code: ${exitCode}`;
  }
  if (signal) {
    details += details ? `, Signal: ${signal}` : `Signal: ${signal}`;
  }

  // Determine severity based on exit code
  const severity: ErrorSeverity =
    exitCode === null && signal === "SIGKILL" ? "warning" : "error";

  return createAppError("process", message, {
    severity,
    details: details || undefined,
    cause,
    recoveryActions: ["retry", "kill_process", "dismiss"],
  });
}

/**
 * Create a PRD error
 */
export function createPRDError(
  message: string,
  options: {
    filePath?: string;
    cause?: Error;
  } = {}
): AppError {
  const { filePath, cause } = options;

  return createAppError("prd", message, {
    severity: "error",
    details: filePath ? `File: ${filePath}` : undefined,
    cause,
    recoveryActions: ["reload_prd", "retry", "dismiss"],
  });
}

/**
 * Create a configuration error
 */
export function createConfigError(
  message: string,
  options: {
    cause?: Error;
  } = {}
): AppError {
  return createAppError("config", message, {
    severity: "warning", // Config errors are usually recoverable with defaults
    cause: options.cause,
    recoveryActions: ["reload_config", "dismiss"],
  });
}

/**
 * Create a render error (from React error boundary)
 */
export function createRenderError(error: Error): AppError {
  return createAppError("render", "A display error occurred", {
    severity: "error",
    details: error.message,
    cause: error,
    recoveryActions: ["retry", "restart"],
  });
}

/**
 * Format error for display
 */
export function formatErrorMessage(error: AppError): string {
  return error.message;
}

/**
 * Format error details for debug mode
 */
export function formatErrorDetails(error: AppError): string {
  const lines: string[] = [];

  lines.push(`Category: ${error.category}`);
  lines.push(`Severity: ${error.severity}`);
  lines.push(`ID: ${error.id}`);

  if (error.details) {
    lines.push(`Details: ${error.details}`);
  }

  if (error.stack) {
    lines.push("");
    lines.push("Stack trace:");
    lines.push(error.stack);
  }

  return lines.join("\n");
}

/**
 * Get recovery action display label
 */
export function getRecoveryActionLabel(action: RecoveryAction): string {
  switch (action) {
    case "retry":
      return "Try Again";
    case "restart":
      return "Restart App";
    case "reload_config":
      return "Reload Config";
    case "reload_prd":
      return "Reload PRD";
    case "kill_process":
      return "Force Stop";
    case "dismiss":
      return "Dismiss";
  }
}

/**
 * Get recovery action keyboard shortcut hint
 */
export function getRecoveryActionHint(action: RecoveryAction): string {
  switch (action) {
    case "retry":
      return "R";
    case "restart":
      return "Ctrl+R";
    case "reload_config":
      return "C";
    case "reload_prd":
      return "P";
    case "kill_process":
      return "K";
    case "dismiss":
      return "Esc";
  }
}
