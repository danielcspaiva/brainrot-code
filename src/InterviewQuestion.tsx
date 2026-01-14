/**
 * Interview Question Component
 *
 * Displays interview questions with 4 pre-filled options (A-D) plus
 * a 5th custom input option (E). Part of the setup wizard flow.
 */

import { Box, Text, useInput } from "ink";
import { useState, useCallback, useMemo } from "react";
import { useThemeColors } from "./useTheme.js";
import { navIcons, decorChars } from "./theme.js";

// ============================================================================
// TYPES
// ============================================================================

export interface InterviewOption {
  /** Display label for the option */
  label: string;
  /** Value returned when selected */
  value: string;
}

export interface InterviewQuestionProps {
  /** Whether the component is visible */
  isVisible: boolean;
  /** The question to display */
  question: string;
  /** Pre-filled options (A-D) */
  options: InterviewOption[];
  /** Callback when an answer is submitted */
  onAnswer: (answer: string) => void;
  /** Callback when user wants to go back */
  onBack?: () => void;
  /** Whether the component has focus */
  hasFocus: boolean;
  /** Terminal dimensions for centering */
  dimensions?: { width: number; height: number };
  /** Optional header text above the question */
  header?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const OPTION_LETTERS = ["A", "B", "C", "D", "E"] as const;
const CUSTOM_OPTION_INDEX = 4; // Index for the custom input option (E)

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface OptionItemProps {
  letter: string;
  label: string;
  isSelected: boolean;
  isCustom?: boolean;
  colors: ReturnType<typeof useThemeColors>;
}

function OptionItem({ letter, label, isSelected, isCustom, colors }: OptionItemProps) {
  return (
    <Box>
      <Text
        color={isSelected ? colors.primary : colors.textMuted}
        bold={isSelected}
      >
        {isSelected ? navIcons.radioSelected : navIcons.radio}
      </Text>
      <Text color={isSelected ? colors.primary : colors.text}>
        {" "}
        {letter}.{" "}
      </Text>
      <Text
        color={isSelected ? colors.primary : colors.text}
        bold={isSelected}
        italic={isCustom}
      >
        {label}
      </Text>
    </Box>
  );
}

interface CustomInputProps {
  value: string;
  isActive: boolean;
  colors: ReturnType<typeof useThemeColors>;
  width: number;
}

function CustomInput({ value, isActive, colors, width }: CustomInputProps) {
  const displayWidth = Math.max(width - 8, 20);
  const cursorChar = "▌";

  return (
    <Box marginLeft={3} marginTop={1}>
      <Box
        borderStyle="single"
        borderColor={isActive ? colors.borderFocus : colors.border}
        paddingX={1}
        width={displayWidth}
      >
        {value ? (
          <Text color={colors.text}>{value}</Text>
        ) : (
          <Text dimColor italic>
            Type your custom response...
          </Text>
        )}
        {isActive && <Text color={colors.primary}>{cursorChar}</Text>}
      </Box>
    </Box>
  );
}

interface NavigationHintsProps {
  colors: ReturnType<typeof useThemeColors>;
  selectedIndex: number;
  hasCustomValue: boolean;
  hasBack: boolean;
}

function NavigationHints({ colors, selectedIndex, hasCustomValue, hasBack }: NavigationHintsProps) {
  const isCustomSelected = selectedIndex === CUSTOM_OPTION_INDEX;
  const canSubmit = !isCustomSelected || hasCustomValue;

  return (
    <Box justifyContent="center" marginTop={2} flexDirection="column" alignItems="center">
      <Box>
        <Text color={colors.textMuted}>
          {navIcons.arrowUp}/{navIcons.arrowDown}: Navigate | Enter: Select
        </Text>
      </Box>
      <Box marginTop={1}>
        {hasBack && (
          <Text color={colors.textMuted}>
            Esc: Go Back |{" "}
          </Text>
        )}
        <Text color={canSubmit ? colors.primary : colors.textMuted}>
          {isCustomSelected
            ? hasCustomValue
              ? "Enter: Submit custom answer"
              : "Type your answer..."
            : "Enter: Select option"
          }
        </Text>
      </Box>
    </Box>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function InterviewQuestion({
  isVisible,
  question,
  options,
  onAnswer,
  onBack,
  hasFocus,
  dimensions,
  header,
}: InterviewQuestionProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [customValue, setCustomValue] = useState("");
  const colors = useThemeColors();

  // Ensure we have exactly 4 options (pad or trim if needed)
  const displayOptions = useMemo(() => {
    const opts = options.slice(0, 4);
    while (opts.length < 4) {
      opts.push({ label: "Option " + (opts.length + 1), value: "option" + (opts.length + 1) });
    }
    return opts;
  }, [options]);

  const isCustomInputActive = selectedIndex === CUSTOM_OPTION_INDEX;

  const handleSubmit = useCallback(() => {
    if (isCustomInputActive) {
      // Custom input must have a value
      if (customValue.trim()) {
        onAnswer(customValue.trim());
      }
    } else {
      // Pre-filled option selected
      const selected = displayOptions[selectedIndex];
      if (selected) {
        onAnswer(selected.value);
      }
    }
  }, [selectedIndex, customValue, displayOptions, onAnswer, isCustomInputActive]);

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
    }
  }, [onBack]);

  // Handle keyboard input
  useInput(
    (input, key) => {
      if (!hasFocus || !isVisible) return;

      // Navigation with arrow keys (when not typing in custom input)
      if (!isCustomInputActive || !customValue) {
        if (key.upArrow || input === "k" || input === "K") {
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : CUSTOM_OPTION_INDEX));
          return;
        }
        if (key.downArrow || input === "j" || input === "J") {
          setSelectedIndex((prev) => (prev < CUSTOM_OPTION_INDEX ? prev + 1 : 0));
          return;
        }
      }

      // Quick select with letter keys (only when not in custom input mode)
      if (!isCustomInputActive) {
        const letterIndex = ["a", "b", "c", "d", "e"].indexOf(input.toLowerCase());
        if (letterIndex !== -1) {
          if (letterIndex === CUSTOM_OPTION_INDEX) {
            // Selecting E switches to custom input mode
            setSelectedIndex(CUSTOM_OPTION_INDEX);
          } else {
            // Direct selection of A-D submits immediately
            const selected = displayOptions[letterIndex];
            if (selected) {
              onAnswer(selected.value);
            }
          }
          return;
        }
      }

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

      // Custom input handling when E is selected
      if (isCustomInputActive) {
        // Backspace/Delete to remove characters
        if (key.backspace || key.delete) {
          setCustomValue((prev) => prev.slice(0, -1));
          return;
        }

        // Printable characters (ignore control keys)
        if (input && !key.ctrl && !key.meta && !key.upArrow && !key.downArrow) {
          setCustomValue((prev) => prev + input);
        }
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
      {/* Main question card */}
      <Box
        flexDirection="column"
        borderStyle="double"
        borderColor={colors.primary}
        paddingX={2}
        paddingY={1}
        width={boxWidth}
      >
        {/* Header */}
        {header && (
          <Box justifyContent="center" marginBottom={1}>
            <Text color={colors.secondary} bold>
              {decorChars.sparkle} {header.toUpperCase()} {decorChars.sparkle}
            </Text>
          </Box>
        )}

        {/* Question */}
        <Box justifyContent="center" marginBottom={2}>
          <Text color={colors.primary} bold>
            {question}
          </Text>
        </Box>

        {/* Options */}
        <Box flexDirection="column" paddingX={2}>
          {displayOptions.map((option, index) => (
            <Box key={index} marginBottom={index < displayOptions.length - 1 ? 1 : 0}>
              <OptionItem
                letter={OPTION_LETTERS[index]}
                label={option.label}
                isSelected={selectedIndex === index}
                colors={colors}
              />
            </Box>
          ))}

          {/* Custom input option (E) */}
          <Box marginTop={1} flexDirection="column">
            <OptionItem
              letter="E"
              label="Custom answer"
              isSelected={selectedIndex === CUSTOM_OPTION_INDEX}
              isCustom={true}
              colors={colors}
            />
            {selectedIndex === CUSTOM_OPTION_INDEX && (
              <CustomInput
                value={customValue}
                isActive={isCustomInputActive}
                colors={colors}
                width={boxWidth}
              />
            )}
          </Box>
        </Box>

        {/* Navigation hints */}
        <NavigationHints
          colors={colors}
          selectedIndex={selectedIndex}
          hasCustomValue={customValue.trim().length > 0}
          hasBack={!!onBack}
        />
      </Box>

      {/* Tip */}
      <Box marginTop={1}>
        <Text dimColor italic>
          Press A-D to quickly select, or E for a custom response
        </Text>
      </Box>
    </Box>
  );
}

export default InterviewQuestion;
