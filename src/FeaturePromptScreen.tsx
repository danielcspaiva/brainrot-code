/**
 * Feature Prompt Screen Component
 *
 * Full-screen modal that asks the user for a feature description.
 * Part of the setup wizard flow after onboarding tutorial.
 */

import { Box, Text, useInput } from "ink";
import { useState, useCallback, useMemo } from "react";
import { useThemeColors } from "./useTheme.js";
import { navIcons, decorChars } from "./theme.js";

// ============================================================================
// TYPES
// ============================================================================

export interface FeaturePromptScreenProps {
  /** Whether the screen is visible */
  isVisible: boolean;
  /** Callback when feature prompt is submitted */
  onComplete: (prompt: string) => void;
  /** Callback when user wants to go back */
  onBack?: () => void;
  /** Whether the component has focus */
  hasFocus: boolean;
  /** Terminal dimensions for centering */
  dimensions?: { width: number; height: number };
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MIN_CHARS = 10;

const PLACEHOLDER_EXAMPLES = [
  "Build a user authentication system with JWT",
  "Create a REST API for task management",
  "Implement a real-time chat feature",
  "Add dark mode support to the UI",
];

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface InputDisplayProps {
  value: string;
  colors: ReturnType<typeof useThemeColors>;
  width: number;
}

function InputDisplay({ value, colors, width }: InputDisplayProps) {
  const displayWidth = Math.max(width - 4, 30);
  const cursorChar = "▌";

  // Show placeholder when empty
  if (!value) {
    return (
      <Box flexDirection="column">
        <Box
          borderStyle="single"
          borderColor={colors.borderFocus}
          paddingX={1}
          width={displayWidth}
        >
          <Text dimColor italic>
            {PLACEHOLDER_EXAMPLES[0]}
          </Text>
          <Text color={colors.primary}>{cursorChar}</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor italic>
            Examples:
          </Text>
        </Box>
        {PLACEHOLDER_EXAMPLES.slice(1).map((example, i) => (
          <Box key={i} paddingLeft={2}>
            <Text dimColor>
              {navIcons.bullet} {example}
            </Text>
          </Box>
        ))}
      </Box>
    );
  }

  // Show input with cursor
  // Wrap text if it exceeds display width
  const maxTextWidth = displayWidth - 4; // Account for padding and cursor
  const lines: string[] = [];
  let remaining = value;

  while (remaining.length > 0) {
    if (remaining.length <= maxTextWidth) {
      lines.push(remaining);
      remaining = "";
    } else {
      // Find a good break point (space) or just cut
      const breakPoint = remaining.lastIndexOf(" ", maxTextWidth);
      const cutPoint =
        breakPoint > maxTextWidth / 2 ? breakPoint : maxTextWidth;
      lines.push(remaining.slice(0, cutPoint));
      remaining = remaining.slice(cutPoint).trimStart();
    }
  }

  return (
    <Box
      borderStyle="single"
      borderColor={colors.borderFocus}
      paddingX={1}
      width={displayWidth}
      flexDirection="column"
    >
      {lines.map((line, i) => (
        <Box key={i}>
          <Text color={colors.text}>{line}</Text>
          {i === lines.length - 1 && (
            <Text color={colors.primary}>{cursorChar}</Text>
          )}
        </Box>
      ))}
    </Box>
  );
}

interface ValidationMessageProps {
  charCount: number;
  colors: ReturnType<typeof useThemeColors>;
  showError: boolean;
}

function ValidationMessage({
  charCount,
  colors,
  showError,
}: ValidationMessageProps) {
  const remaining = MIN_CHARS - charCount;
  const isValid = charCount >= MIN_CHARS;

  return (
    <Box marginTop={1} justifyContent="space-between" width="100%">
      <Box>
        {showError && !isValid && (
          <Text color={colors.error}>
            {navIcons.arrowRight} Minimum {MIN_CHARS} characters required
          </Text>
        )}
      </Box>
      <Box>
        <Text color={isValid ? colors.success : colors.textMuted}>
          {charCount} / {MIN_CHARS}
          {isValid && " ✓"}
          {!isValid && ` (${remaining} more)`}
        </Text>
      </Box>
    </Box>
  );
}

interface NavigationHintsProps {
  colors: ReturnType<typeof useThemeColors>;
  canSubmit: boolean;
  hasBack: boolean;
}

function NavigationHints({ colors, canSubmit, hasBack }: NavigationHintsProps) {
  return (
    <Box justifyContent="center" marginTop={2}>
      {hasBack && <Text color={colors.textMuted}>Esc: Go Back | </Text>}
      <Text color={canSubmit ? colors.primary : colors.textMuted}>
        Enter: {canSubmit ? "Submit" : "Need more text"} {navIcons.arrowRight}
      </Text>
    </Box>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function FeaturePromptScreen({
  isVisible,
  onComplete,
  onBack,
  hasFocus,
  dimensions,
}: FeaturePromptScreenProps) {
  const [inputValue, setInputValue] = useState("");
  const [showError, setShowError] = useState(false);
  const colors = useThemeColors();

  const isValid = inputValue.length >= MIN_CHARS;

  const handleSubmit = useCallback(() => {
    if (isValid) {
      onComplete(inputValue.trim());
    } else {
      setShowError(true);
    }
  }, [inputValue, isValid, onComplete]);

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
    }
  }, [onBack]);

  // Handle keyboard input
  useInput(
    (input, key) => {
      if (!hasFocus || !isVisible) return;

      // Enter to submit
      if (key.return) {
        handleSubmit();
        return;
      }

      // Escape to go back
      if (key.escape) {
        handleBack();
        return;
      }

      // Backspace/Delete to remove characters
      if (key.backspace || key.delete) {
        setInputValue((prev) => prev.slice(0, -1));
        setShowError(false);
        return;
      }

      // Printable characters (ignore control keys)
      if (input && !key.ctrl && !key.meta) {
        setInputValue((prev) => prev + input);
        setShowError(false);
      }
    },
    { isActive: hasFocus && isVisible }
  );

  // Calculate box dimensions
  const boxWidth = useMemo(() => {
    if (dimensions?.width) {
      return Math.min(70, dimensions.width - 4);
    }
    return 70;
  }, [dimensions?.width]);

  if (!isVisible) {
    return null;
  }

  return (
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      width="100%"
      height="100%"
    >
      {/* Main prompt card */}
      <Box
        flexDirection="column"
        borderStyle="double"
        borderColor={colors.primary}
        paddingX={2}
        paddingY={1}
        width={boxWidth}
      >
        {/* Header */}
        <Box justifyContent="center" marginBottom={1}>
          <Text color={colors.secondary} bold>
            {decorChars.sparkle} NEW FEATURE {decorChars.sparkle}
          </Text>
        </Box>

        {/* Question */}
        <Box justifyContent="center" marginBottom={2}>
          <Text color={colors.primary} bold>
            What feature do you want to build?
          </Text>
        </Box>

        {/* Input area */}
        <Box flexDirection="column" alignItems="center">
          <InputDisplay value={inputValue} colors={colors} width={boxWidth} />
        </Box>

        {/* Validation message */}
        <Box paddingX={2}>
          <ValidationMessage
            charCount={inputValue.length}
            colors={colors}
            showError={showError}
          />
        </Box>

        {/* Navigation hints */}
        <NavigationHints
          colors={colors}
          canSubmit={isValid}
          hasBack={!!onBack}
        />
      </Box>

      {/* Tip */}
      <Box marginTop={1}>
        <Text dimColor italic>
          Be specific about what you want to achieve
        </Text>
      </Box>
    </Box>
  );
}

export default FeaturePromptScreen;
