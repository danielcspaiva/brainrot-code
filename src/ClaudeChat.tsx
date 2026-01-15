/**
 * Claude Chat Component
 *
 * Displays Claude's planning questions and captures user answers.
 * Used during the "plan mode" phase where Claude asks clarifying questions.
 */

import { Box, Text, useInput } from "ink";
import { useState, useCallback, useMemo, useEffect } from "react";
import { useThemeColors } from "./useTheme.js";
import { Spinner, ProgressBar } from "./styled-components.js";

// ============================================================================
// TYPES
// ============================================================================

export interface ChatMessage {
  /** Message role */
  role: "assistant" | "user";
  /** Message content */
  content: string;
  /** Whether this message is waiting for user input */
  isWaitingForInput?: boolean;
}

export interface ClaudeChatProps {
  /** Feature being planned */
  featureDescription: string;
  /** Chat messages */
  messages: ChatMessage[];
  /** Whether Claude is currently thinking */
  isThinking: boolean;
  /** Progress percentage (0-100) */
  progress: number;
  /** Callback when user submits an answer */
  onSubmitAnswer: (answer: string) => void;
  /** Callback to cancel planning */
  onCancel: () => void;
  /** Whether the component has focus */
  hasFocus: boolean;
  /** Terminal dimensions */
  dimensions: { width: number; height: number };
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ClaudeChat({
  featureDescription,
  messages,
  isThinking,
  progress,
  onSubmitAnswer,
  onCancel,
  hasFocus,
  dimensions,
}: ClaudeChatProps) {
  const [inputValue, setInputValue] = useState("");
  const [elapsedMs, setElapsedMs] = useState(0);
  const colors = useThemeColors();

  // Animate spinner
  useEffect(() => {
    if (!isThinking) return;
    const interval = setInterval(() => {
      setElapsedMs((prev) => prev + 100);
    }, 100);
    return () => clearInterval(interval);
  }, [isThinking]);

  // Check if we're waiting for user input
  const isWaitingForInput = useMemo(() => {
    const lastMessage = messages[messages.length - 1];
    return lastMessage?.role === "assistant" && lastMessage?.isWaitingForInput;
  }, [messages]);

  const handleSubmit = useCallback(() => {
    if (inputValue.trim() && isWaitingForInput) {
      onSubmitAnswer(inputValue.trim());
      setInputValue("");
    }
  }, [inputValue, isWaitingForInput, onSubmitAnswer]);

  // Handle keyboard input
  useInput(
    (input, key) => {
      if (!hasFocus) return;

      // Escape to cancel
      if (key.escape) {
        onCancel();
        return;
      }

      // Only handle input when waiting for user response
      if (!isWaitingForInput) return;

      // Enter to submit
      if (key.return) {
        handleSubmit();
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
    { isActive: hasFocus }
  );

  // Calculate content width
  const contentWidth = useMemo(() => {
    return Math.min(70, dimensions.width - 4);
  }, [dimensions.width]);

  // Calculate available height for messages
  const messagesHeight = useMemo(() => {
    // Header (3) + Progress (2) + Input (4) + Footer (2) + margins
    return Math.max(dimensions.height - 14, 5);
  }, [dimensions.height]);

  const cursorChar = "\u258c";

  return (
    <Box
      flexDirection="column"
      width="100%"
      height="100%"
      paddingX={1}
    >
      {/* Header */}
      <Box
        borderStyle="single"
        borderColor={colors.primary}
        paddingX={2}
        marginBottom={1}
      >
        <Text bold color={colors.primary}>
          BRAINROT
        </Text>
        <Text> | Planning: </Text>
        <Text color={colors.text}>
          {featureDescription.length > 40
            ? featureDescription.slice(0, 40) + "..."
            : featureDescription}
        </Text>
      </Box>

      {/* Messages area */}
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={colors.border}
        paddingX={2}
        paddingY={1}
        height={messagesHeight}
        width={contentWidth}
        overflow="hidden"
      >
        {/* Show thinking indicator or messages */}
        {isThinking && messages.length === 0 ? (
          <Box flexDirection="column" alignItems="center" justifyContent="center" height="100%">
            <Spinner elapsedMs={elapsedMs} label="Claude is analyzing your request..." />
          </Box>
        ) : (
          <Box flexDirection="column">
            {messages.map((msg, idx) => (
              <Box key={idx} flexDirection="column" marginBottom={1}>
                {msg.role === "assistant" ? (
                  <Box flexDirection="column">
                    <Text color={colors.info}>Claude:</Text>
                    <Box paddingLeft={2}>
                      <Text color={colors.text}>{msg.content}</Text>
                    </Box>
                  </Box>
                ) : (
                  <Box flexDirection="column">
                    <Text color={colors.success}>You:</Text>
                    <Box paddingLeft={2}>
                      <Text dimColor>{msg.content}</Text>
                    </Box>
                  </Box>
                )}
              </Box>
            ))}

            {/* Thinking indicator after messages */}
            {isThinking && messages.length > 0 && (
              <Box marginTop={1}>
                <Spinner elapsedMs={elapsedMs} label="Thinking..." />
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* Input area - only show when waiting for input */}
      {isWaitingForInput && (
        <Box
          flexDirection="column"
          marginTop={1}
          width={contentWidth}
        >
          <Box
            borderStyle="single"
            borderColor={hasFocus ? colors.borderFocus : colors.border}
            paddingX={1}
          >
            <Text color={colors.text}>
              {inputValue}
              <Text color={colors.primary}>{cursorChar}</Text>
            </Text>
          </Box>
        </Box>
      )}

      {/* Progress bar */}
      <Box marginTop={1} width={contentWidth}>
        <ProgressBar percentage={progress} width={contentWidth - 10} showLabel />
        <Text dimColor> Planning...</Text>
      </Box>

      {/* Footer */}
      <Box
        position="absolute"
        marginTop={dimensions.height - 2}
        borderStyle="single"
        borderColor={colors.border}
        paddingX={2}
        width={dimensions.width - 4}
      >
        <Text dimColor>
          {isWaitingForInput ? (
            <>
              <Text color={colors.primary}>Enter</Text>: Submit answer |{" "}
            </>
          ) : null}
          <Text color={colors.primary}>Ctrl+C</Text>: Cancel |{" "}
          <Text color={colors.primary}>?</Text>: Help
        </Text>
      </Box>
    </Box>
  );
}

export default ClaudeChat;
