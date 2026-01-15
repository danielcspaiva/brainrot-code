/**
 * Attention Overlay
 *
 * Modal overlay that appears when Claude needs user input.
 * Pauses the game and displays Claude's question with an input field.
 */

import { Box, Text, useInput } from "ink";
import { useState, useCallback, useMemo } from "react";
import { useThemeColors } from "./useTheme.js";
import { alertIcons } from "./theme.js";

// ============================================================================
// TYPES
// ============================================================================

export interface AttentionOverlayProps {
  /** Whether the overlay is visible */
  isVisible: boolean;
  /** The question or prompt from Claude */
  prompt: string;
  /** Type of attention needed */
  type: "question" | "confirmation" | "error" | "permission" | null;
  /** Callback when user submits a response */
  onSubmit: (response: string) => void;
  /** Callback when user skips (lets Claude decide) */
  onSkip: () => void;
  /** Whether the component has focus */
  hasFocus: boolean;
  /** Terminal dimensions */
  dimensions: { width: number; height: number };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getIcon(type: AttentionOverlayProps["type"]): string {
  switch (type) {
    case "question":
      return alertIcons.question || "?";
    case "confirmation":
      return alertIcons.confirmation || "!";
    case "error":
      return alertIcons.error || "\u2717";
    case "permission":
      return alertIcons.permission || "\u26BF";
    default:
      return alertIcons.warning || "\u26A0";
  }
}

function getTitle(type: AttentionOverlayProps["type"]): string {
  switch (type) {
    case "question":
      return "CLAUDE HAS A QUESTION";
    case "confirmation":
      return "CONFIRMATION NEEDED";
    case "error":
      return "ERROR OCCURRED";
    case "permission":
      return "PERMISSION REQUIRED";
    default:
      return "CLAUDE NEEDS YOUR INPUT";
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AttentionOverlay({
  isVisible,
  prompt,
  type,
  onSubmit,
  onSkip,
  hasFocus,
  dimensions,
}: AttentionOverlayProps) {
  const [inputValue, setInputValue] = useState("");
  const colors = useThemeColors();

  const handleSubmit = useCallback(() => {
    if (inputValue.trim()) {
      onSubmit(inputValue.trim());
      setInputValue("");
    }
  }, [inputValue, onSubmit]);

  // Handle keyboard input
  useInput(
    (input, key) => {
      if (!hasFocus || !isVisible) return;

      // Enter to submit
      if (key.return) {
        handleSubmit();
        return;
      }

      // Escape to skip
      if (key.escape) {
        onSkip();
        return;
      }

      // Backspace/Delete to remove characters
      if (key.backspace || key.delete) {
        setInputValue((prev) => prev.slice(0, -1));
        return;
      }

      // Printable characters (ignore control keys)
      if (input && !key.ctrl && !key.meta) {
        setInputValue((prev) => prev + input);
      }
    },
    { isActive: hasFocus && isVisible }
  );

  // Calculate overlay dimensions
  const overlayWidth = useMemo(() => {
    return Math.min(60, dimensions.width - 8);
  }, [dimensions.width]);

  if (!isVisible) {
    return null;
  }

  const icon = getIcon(type);
  const title = getTitle(type);
  const cursorChar = "\u258c";

  return (
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      width="100%"
      height="100%"
    >
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={colors.warning}
        paddingX={2}
        paddingY={1}
        width={overlayWidth}
      >
        {/* Header */}
        <Box justifyContent="center" marginBottom={1}>
          <Text bold color={colors.warning}>
            {icon} {title}
          </Text>
        </Box>

        {/* Divider */}
        <Box marginBottom={1}>
          <Text dimColor>{"─".repeat(overlayWidth - 6)}</Text>
        </Box>

        {/* Prompt content */}
        <Box flexDirection="column" marginBottom={2}>
          <Text color={colors.text}>{prompt}</Text>
        </Box>

        {/* Input field */}
        <Box
          borderStyle="single"
          borderColor={colors.borderFocus}
          paddingX={1}
          marginBottom={1}
        >
          <Text>
            <Text color={colors.primary}>{"> "}</Text>
            <Text color={colors.text}>{inputValue}</Text>
            <Text color={colors.primary}>{cursorChar}</Text>
          </Text>
        </Box>

        {/* Footer hints */}
        <Box justifyContent="center">
          <Text dimColor>
            <Text color={colors.primary}>Enter</Text>: Submit |{" "}
            <Text color={colors.primary}>Esc</Text>: Skip (let Claude decide)
          </Text>
        </Box>
      </Box>

      {/* Game paused indicator */}
      <Box marginTop={2}>
        <Text dimColor italic>Game paused</Text>
      </Box>
    </Box>
  );
}

export default AttentionOverlay;
