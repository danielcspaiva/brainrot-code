/**
 * Onboarding Tutorial Component
 *
 * Full-screen modal that displays when no previous loop data exists.
 * Guides new users through the app concept with a welcome screen
 * and multi-step tutorial with progress dots.
 */

import { Box, Text, useInput } from "ink";
import { useState, useCallback, useMemo } from "react";
import { useThemeColors } from "./useTheme.js";
import { navIcons, decorChars, progressChars } from "./theme.js";

// ============================================================================
// TYPES
// ============================================================================

export interface OnboardingTutorialProps {
  /** Whether the tutorial is visible */
  isVisible: boolean;
  /** Callback when tutorial is completed */
  onComplete: () => void;
  /** Whether the component has focus */
  hasFocus: boolean;
  /** Terminal dimensions for centering */
  dimensions?: { width: number; height: number };
}

interface TutorialStep {
  title: string;
  icon: string;
  content: string[];
  hint?: string;
}

// ============================================================================
// TUTORIAL CONTENT
// ============================================================================

const tutorialSteps: TutorialStep[] = [
  {
    title: "Welcome to BrainRot CLI!",
    icon: decorChars.sparkle,
    content: [
      "BrainRot CLI is your companion for productive waiting.",
      "",
      "While Claude Code works on your tasks, you can",
      "play games to pass the time - and even unlock",
      "achievements along the way!",
    ],
    hint: "Press Enter or Space to continue",
  },
  {
    title: "The Loop System",
    icon: progressChars.filled,
    content: [
      "The left panel manages your Claude Code loop.",
      "",
      "Press Ctrl+S to start/stop the loop.",
      "The status bar shows what Claude is doing.",
      "You'll be notified when input is needed.",
    ],
    hint: "Use Tab to switch between panes",
  },
  {
    title: "Play Games While You Wait",
    icon: decorChars.trophy,
    content: [
      "The right panel is your game area.",
      "",
      "Choose from Snake, Pong, Tetris, or Minesweeper.",
      "Games auto-pause when Claude needs your attention.",
      "Earn achievements and climb the leaderboards!",
    ],
    hint: "Press 1-4 to quick-select a game",
  },
  {
    title: "Stay in Control",
    icon: navIcons.pointer,
    content: [
      "Press ? anytime to see all keyboard shortcuts.",
      "",
      "Ctrl+, opens settings to customize your experience.",
      "Your progress is automatically saved.",
      "Stats and achievements persist across sessions.",
    ],
    hint: "Press Escape to exit any overlay",
  },
  {
    title: "You're Ready!",
    icon: decorChars.star,
    content: [
      "That's all you need to know to get started.",
      "",
      "Start by pressing Ctrl+S to launch a Claude loop,",
      "or pick a game to warm up while you wait.",
      "",
      "Happy coding (and gaming)!",
    ],
    hint: "Press Enter to start using BrainRot CLI",
  },
];

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface ProgressDotsProps {
  total: number;
  current: number;
  colors: ReturnType<typeof useThemeColors>;
}

function ProgressDots({ total, current, colors }: ProgressDotsProps) {
  const dots = Array.from({ length: total }, (_, i) => {
    const isActive = i === current;
    const isComplete = i < current;
    return (
      <Text
        key={i}
        color={
          isActive
            ? colors.primary
            : isComplete
              ? colors.success
              : colors.textMuted
        }
        bold={isActive}
      >
        {isActive
          ? navIcons.radioSelected
          : isComplete
            ? navIcons.radioSelected
            : navIcons.radio}
        {i < total - 1 ? " " : ""}
      </Text>
    );
  });

  return <Box justifyContent="center">{dots}</Box>;
}

interface TutorialStepContentProps {
  step: TutorialStep;
  colors: ReturnType<typeof useThemeColors>;
}

function TutorialStepContent({ step, colors }: TutorialStepContentProps) {
  return (
    <Box flexDirection="column" alignItems="center" paddingY={1}>
      {/* Step icon and title */}
      <Box marginBottom={1}>
        <Text color={colors.accent} bold>
          {step.icon}{" "}
        </Text>
        <Text color={colors.primary} bold>
          {step.title}
        </Text>
        <Text color={colors.accent} bold>
          {" "}
          {step.icon}
        </Text>
      </Box>

      {/* Content lines */}
      <Box flexDirection="column" alignItems="center" marginY={1}>
        {step.content.map((line, i) => (
          <Text key={i} color={line ? colors.text : undefined}>
            {line || " "}
          </Text>
        ))}
      </Box>

      {/* Hint */}
      {step.hint && (
        <Box marginTop={1}>
          <Text dimColor italic>
            {step.hint}
          </Text>
        </Box>
      )}
    </Box>
  );
}

interface NavigationHintsProps {
  canGoBack: boolean;
  isLastStep: boolean;
  colors: ReturnType<typeof useThemeColors>;
}

function NavigationHints({
  canGoBack,
  isLastStep,
  colors,
}: NavigationHintsProps) {
  return (
    <Box justifyContent="center" marginTop={1}>
      {canGoBack && (
        <Text color={colors.textMuted}>
          {navIcons.arrowLeft} Backspace: Previous{" "}
        </Text>
      )}
      <Text color={colors.textMuted}>
        {canGoBack ? "| " : ""}
        Enter/Space: {isLastStep ? "Finish" : "Next"} {navIcons.arrowRight}
      </Text>
    </Box>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function OnboardingTutorial({
  isVisible,
  onComplete,
  hasFocus,
  dimensions,
}: OnboardingTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const colors = useThemeColors();

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === tutorialSteps.length - 1;
  const currentStepData = tutorialSteps[currentStep];

  const goToNextStep = useCallback(() => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep((prev) => Math.min(prev + 1, tutorialSteps.length - 1));
    }
  }, [isLastStep, onComplete]);

  const goToPreviousStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  // Handle keyboard input
  useInput(
    (input, key) => {
      if (!hasFocus || !isVisible) return;

      // Navigate forward
      if (key.return || input === " ") {
        goToNextStep();
        return;
      }

      // Navigate backward
      if (key.backspace || key.delete) {
        if (!isFirstStep) {
          goToPreviousStep();
        }
        return;
      }

      // Skip to end with Escape
      if (key.escape) {
        onComplete();
        return;
      }

      // Arrow key navigation
      if (key.rightArrow || key.downArrow) {
        goToNextStep();
        return;
      }

      if ((key.leftArrow || key.upArrow) && !isFirstStep) {
        goToPreviousStep();
        return;
      }
    },
    { isActive: hasFocus && isVisible }
  );

  // Calculate box dimensions
  const boxWidth = useMemo(() => {
    if (dimensions?.width) {
      return Math.min(60, dimensions.width - 4);
    }
    return 60;
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
      {/* Main tutorial card */}
      <Box
        flexDirection="column"
        borderStyle="double"
        borderColor={colors.primary}
        paddingX={2}
        paddingY={1}
        width={boxWidth}
      >
        {/* Header with branding */}
        <Box justifyContent="center" marginBottom={1}>
          <Text color={colors.secondary} bold>
            {decorChars.sparkle} BRAINROT CLI {decorChars.sparkle}
          </Text>
        </Box>

        {/* Progress dots */}
        <Box justifyContent="center" marginBottom={1}>
          <ProgressDots
            total={tutorialSteps.length}
            current={currentStep}
            colors={colors}
          />
        </Box>

        {/* Step content */}
        <TutorialStepContent step={currentStepData} colors={colors} />

        {/* Navigation hints */}
        <NavigationHints
          canGoBack={!isFirstStep}
          isLastStep={isLastStep}
          colors={colors}
        />

        {/* Step counter */}
        <Box justifyContent="center" marginTop={1}>
          <Text dimColor>
            Step {currentStep + 1} of {tutorialSteps.length}
          </Text>
        </Box>
      </Box>

      {/* Skip hint */}
      <Box marginTop={1}>
        <Text dimColor italic>
          Press Escape to skip tutorial
        </Text>
      </Box>
    </Box>
  );
}

export default OnboardingTutorial;
