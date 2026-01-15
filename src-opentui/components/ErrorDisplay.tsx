/**
 * Error Display Component for BrainRot CLI v2
 *
 * User-friendly error display with:
 * - Visual error indicator
 * - Error message and details
 * - Recovery action buttons with keyboard shortcuts
 */

import { useKeyboard } from "@opentui/react";
import { useCallback } from "react";
import {
  type AppError,
  type RecoveryAction,
  getRecoveryActionLabel,
  getRecoveryActionHint,
} from "../errors/index.js";

interface ErrorDisplayProps {
  /** The error to display */
  error: AppError;
  /** Whether to show technical details (debug mode) */
  showDetails?: boolean;
  /** Callback when a recovery action is triggered */
  onRecoveryAction?: (action: RecoveryAction) => void;
  /** Whether this component has keyboard focus */
  hasFocus?: boolean;
}

/**
 * Get color based on error severity
 */
function getSeverityColor(severity: AppError["severity"]): string {
  switch (severity) {
    case "warning":
      return "#FFA500"; // Orange
    case "error":
      return "#FF0000"; // Red
    case "fatal":
      return "#FF00FF"; // Magenta
  }
}

/**
 * Get icon based on error severity
 */
function getSeverityIcon(severity: AppError["severity"]): string {
  switch (severity) {
    case "warning":
      return "\u26A0"; // Warning sign
    case "error":
      return "\u2716"; // X mark
    case "fatal":
      return "\u2620"; // Skull
  }
}

/**
 * Get category display label
 */
function getCategoryLabel(category: AppError["category"]): string {
  switch (category) {
    case "process":
      return "Process Error";
    case "prd":
      return "PRD Error";
    case "config":
      return "Config Error";
    case "render":
      return "Display Error";
    case "network":
      return "Network Error";
    case "unknown":
      return "Error";
  }
}

/**
 * Error display component with recovery actions
 */
export function ErrorDisplay({
  error,
  showDetails = false,
  onRecoveryAction,
  hasFocus = true,
}: ErrorDisplayProps) {
  const color = getSeverityColor(error.severity);
  const icon = getSeverityIcon(error.severity);
  const categoryLabel = getCategoryLabel(error.category);

  // Handle keyboard shortcuts for recovery actions
  useKeyboard(
    useCallback(
      (key) => {
        if (!hasFocus || !onRecoveryAction) return;

        // Map keys to recovery actions
        if (key.name === "escape") {
          if (error.recoveryActions.includes("dismiss")) {
            onRecoveryAction("dismiss");
          }
        } else if (key.name === "r" && !key.ctrl) {
          if (error.recoveryActions.includes("retry")) {
            onRecoveryAction("retry");
          }
        } else if (key.name === "r" && key.ctrl) {
          if (error.recoveryActions.includes("restart")) {
            onRecoveryAction("restart");
          }
        } else if (key.name === "c" && !key.ctrl) {
          if (error.recoveryActions.includes("reload_config")) {
            onRecoveryAction("reload_config");
          }
        } else if (key.name === "p" && !key.ctrl) {
          if (error.recoveryActions.includes("reload_prd")) {
            onRecoveryAction("reload_prd");
          }
        } else if (key.name === "k" && !key.ctrl) {
          if (error.recoveryActions.includes("kill_process")) {
            onRecoveryAction("kill_process");
          }
        }
      },
      [hasFocus, onRecoveryAction, error.recoveryActions]
    )
  );

  return (
    <box
      flexDirection="column"
      borderStyle="single"
      borderColor={color}
      padding={1}
      gap={1}
    >
      {/* Header with icon and category */}
      <box flexDirection="row" gap={1}>
        <text color={color}>{icon}</text>
        <text color={color} bold>
          {categoryLabel}
        </text>
        {error.severity === "fatal" && (
          <text color="#888888">(Fatal)</text>
        )}
      </box>

      {/* Error message */}
      <text color="#FFFFFF">{error.message}</text>

      {/* Details (when in debug mode or details are available) */}
      {showDetails && error.details && (
        <box flexDirection="column" marginTop={1}>
          <text color="#888888" dim>
            Details:
          </text>
          <text color="#AAAAAA">{error.details}</text>
        </box>
      )}

      {/* Stack trace (when in debug mode) */}
      {showDetails && error.stack && (
        <box flexDirection="column" marginTop={1}>
          <text color="#888888" dim>
            Stack trace:
          </text>
          <text color="#666666" wrap="truncate">
            {error.stack.split("\n").slice(0, 5).join("\n")}
          </text>
        </box>
      )}

      {/* Recovery actions */}
      {error.recoveryActions.length > 0 && (
        <box flexDirection="row" gap={2} marginTop={1}>
          {error.recoveryActions.map((action) => (
            <text key={action} color="#00FFFF">
              [{getRecoveryActionHint(action)}] {getRecoveryActionLabel(action)}
            </text>
          ))}
        </box>
      )}

      {/* Timestamp and ID for debugging */}
      {showDetails && (
        <box flexDirection="row" gap={2} marginTop={1}>
          <text color="#444444" dim>
            ID: {error.id}
          </text>
          <text color="#444444" dim>
            Time: {error.timestamp.toLocaleTimeString()}
          </text>
        </box>
      )}
    </box>
  );
}

export default ErrorDisplay;
