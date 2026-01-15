/**
 * React Error Boundary for BrainRot CLI v2
 *
 * Catches React rendering errors and displays a fallback UI.
 * Uses class component pattern (required for error boundaries in React).
 */

import { Component, type ReactNode } from "react";
import { type AppError, createRenderError } from "../errors/index.js";

interface ErrorBoundaryProps {
  /** Child components to wrap */
  children: ReactNode;
  /** Callback when an error is caught */
  onError?: (error: AppError) => void;
  /** Custom fallback UI renderer */
  fallback?: (props: {
    error: AppError;
    reset: () => void;
  }) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: AppError | null;
}

/**
 * Error boundary component that catches React rendering errors.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary onError={handleError}>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Convert to AppError and update state
    const appError = createRenderError(error);
    return { hasError: true, error: appError };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error details
    console.error("ErrorBoundary caught an error:", error);
    console.error("Component stack:", errorInfo.componentStack);

    // Notify parent via callback
    if (this.props.onError && this.state.error) {
      this.props.onError(this.state.error);
    }
  }

  /**
   * Reset the error boundary to try rendering again
   */
  reset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          reset: this.reset,
        });
      }

      // Default fallback - simple text display
      // (ErrorDisplay component can be used as custom fallback)
      return (
        <box
          flexDirection="column"
          padding={1}
          borderStyle="single"
          borderColor="#FF0000"
        >
          <text color="#FF0000" bold>
            Something went wrong
          </text>
          <text color="#888888">{this.state.error.message}</text>
          <text color="#666666">Press R to retry</text>
        </box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
