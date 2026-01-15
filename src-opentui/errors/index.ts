/**
 * Error handling module exports
 */

export {
  type ErrorCategory,
  type ErrorSeverity,
  type RecoveryAction,
  type AppError,
  createAppError,
  createProcessError,
  createPRDError,
  createConfigError,
  createRenderError,
  formatErrorMessage,
  formatErrorDetails,
  getRecoveryActionLabel,
  getRecoveryActionHint,
} from "./types.js";
