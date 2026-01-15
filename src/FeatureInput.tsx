/**
 * Feature Input Screen
 *
 * Clean, minimal first screen that asks the user for a feature description.
 * This is the entry point for the new simplified UI flow.
 */

import { Box, Text, useInput } from "ink";
import { useState, useCallback, useMemo } from "react";
import { useThemeColors } from "./useTheme.js";
import { navIcons } from "./theme.js";

// ============================================================================
// TYPES
// ============================================================================

export interface FeatureInputProps {
  /** Callback when feature is submitted */
  onSubmit: (feature: string) => void;
  /** Whether the component has focus */
  hasFocus: boolean;
  /** Terminal dimensions */
  dimensions: { width: number; height: number };
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MIN_CHARS = 10;

const EXAMPLES = [
  "Create a REST API for user management",
  "Fix the login bug on mobile",
  "Add unit tests for the payment module",
];

// ============================================================================
// COMPONENT
// ============================================================================

export function FeatureInput({
  onSubmit,
  hasFocus,
  dimensions,
}: FeatureInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [showError, setShowError] = useState(false);
  const colors = useThemeColors();

  const isValid = inputValue.length >= MIN_CHARS;

  const handleSubmit = useCallback(() => {
    if (isValid) {
      onSubmit(inputValue.trim());
    } else {
      setShowError(true);
    }
  }, [inputValue, isValid, onSubmit]);

  // Handle keyboard input
  useInput(
    (input, key) => {
      if (!hasFocus) return;

      // Enter to submit
      if (key.return) {
        handleSubmit();
        return;
      }

      // Backspace/Delete to remove characters
      if (key.backspace || key.delete) {
        setInputValue((prev) => prev.slice(0, -1));
        setShowError(false);
        return;
      }

      // Printable characters (ignore control keys)
      if (input && !key.ctrl && !key.meta && !key.escape) {
        setInputValue((prev) => prev + input);
        setShowError(false);
      }
    },
    { isActive: hasFocus }
  );

  // Calculate input box width
  const inputWidth = useMemo(() => {
    return Math.min(55, dimensions.width - 8);
  }, [dimensions.width]);

  const cursorChar = "\u258c";

  return (
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      width="100%"
      height="100%"
    >
      {/* Logo */}
      <Box marginBottom={2}>
        <Text bold color={colors.primary}>
          BRAINROT
        </Text>
      </Box>

      {/* Input card */}
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={colors.border}
        paddingX={2}
        paddingY={1}
        width={inputWidth}
      >
        {/* Question */}
        <Box marginBottom={1}>
          <Text color={colors.text}>What do you want to build?</Text>
        </Box>

        {/* Input area */}
        <Box
          borderStyle="single"
          borderColor={hasFocus ? colors.borderFocus : colors.border}
          paddingX={1}
          minHeight={3}
        >
          {inputValue ? (
            <Text>
              <Text color={colors.text}>{inputValue}</Text>
              <Text color={colors.primary}>{cursorChar}</Text>
            </Text>
          ) : (
            <Text>
              <Text dimColor italic>
                Add dark mode support to the app
              </Text>
              <Text color={colors.primary}>{cursorChar}</Text>
            </Text>
          )}
        </Box>

        {/* Validation */}
        {showError && !isValid && (
          <Box marginTop={1}>
            <Text color={colors.error}>
              {navIcons.arrowRight} Minimum {MIN_CHARS} characters required
            </Text>
          </Box>
        )}
      </Box>

      {/* Examples */}
      <Box flexDirection="column" marginTop={2} paddingX={2}>
        <Text dimColor>Examples:</Text>
        {EXAMPLES.map((example, i) => (
          <Box key={i} paddingLeft={2}>
            <Text dimColor>
              {navIcons.bullet} {example}
            </Text>
          </Box>
        ))}
      </Box>

      {/* Footer hints */}
      <Box
        position="absolute"
        marginTop={dimensions.height - 2}
        borderStyle="single"
        borderColor={colors.border}
        paddingX={2}
        width={dimensions.width - 4}
      >
        <Text dimColor>
          <Text color={colors.primary}>Enter</Text>: Submit |{" "}
          <Text color={colors.primary}>Ctrl+C</Text>: Quit |{" "}
          <Text color={colors.primary}>?</Text>: Help
        </Text>
      </Box>
    </Box>
  );
}

export default FeatureInput;
