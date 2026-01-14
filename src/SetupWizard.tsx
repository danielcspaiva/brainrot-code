/**
 * Setup Wizard Container Component
 *
 * Orchestrates the entire setup flow for new users and new loop creation.
 * Manages state transitions between steps with progress indication and back navigation.
 *
 * Steps: onboarding -> feature prompt -> interview -> PRD generation -> task breakdown -> review
 */

import { Box, Text } from "ink";
import { useState, useCallback, useMemo } from "react";
import { useThemeColors } from "./useTheme.js";
import { progressChars, navIcons } from "./theme.js";
import { OnboardingTutorial } from "./OnboardingTutorial.js";
import { FeaturePromptScreen } from "./FeaturePromptScreen.js";
import {
  DynamicInterviewFlow,
  type InterviewResult,
} from "./DynamicInterviewFlow.js";
import {
  PrdGenerationScreen,
  type GeneratedPrd,
} from "./PrdGenerationScreen.js";
import { TaskBreakdownScreen } from "./TaskBreakdownScreen.js";
import { PreStartReviewScreen } from "./PreStartReviewScreen.js";

// ============================================================================
// TYPES
// ============================================================================

/** Steps in the setup wizard flow */
export type SetupWizardStep =
  | "onboarding"
  | "feature_prompt"
  | "interview"
  | "prd_generation"
  | "task_breakdown"
  | "review";

/** Result of completing the setup wizard */
export interface SetupWizardResult {
  /** The feature description entered by user */
  featureDescription: string;
  /** Interview responses and analysis */
  interviewResult: InterviewResult;
  /** Generated PRD with tasks */
  generatedPrd: GeneratedPrd;
}

export interface SetupWizardProps {
  /** Whether the wizard is visible */
  isVisible: boolean;
  /** Whether to skip onboarding (for returning users starting new loops) */
  skipOnboarding?: boolean;
  /** Callback when wizard is completed successfully */
  onComplete: (result: SetupWizardResult) => void;
  /** Callback when wizard is cancelled/exited */
  onCancel?: () => void;
  /** Whether the component has focus */
  hasFocus: boolean;
  /** Terminal dimensions */
  dimensions?: { width: number; height: number };
}

// ============================================================================
// STEP CONFIGURATION
// ============================================================================

interface StepConfig {
  id: SetupWizardStep;
  label: string;
  shortLabel: string;
  canGoBack: boolean;
}

const STEP_CONFIG: StepConfig[] = [
  {
    id: "onboarding",
    label: "Welcome",
    shortLabel: "Welcome",
    canGoBack: false,
  },
  {
    id: "feature_prompt",
    label: "Feature Description",
    shortLabel: "Feature",
    canGoBack: true,
  },
  {
    id: "interview",
    label: "Project Details",
    shortLabel: "Details",
    canGoBack: true,
  },
  {
    id: "prd_generation",
    label: "Generating PRD",
    shortLabel: "PRD",
    canGoBack: false, // Can't go back during generation
  },
  {
    id: "task_breakdown",
    label: "Task Review",
    shortLabel: "Tasks",
    canGoBack: false, // Can cancel PRD generation to go back
  },
  {
    id: "review",
    label: "Final Review",
    shortLabel: "Review",
    canGoBack: true,
  },
];

// ============================================================================
// PROGRESS INDICATOR COMPONENT
// ============================================================================

interface ProgressIndicatorProps {
  currentStep: SetupWizardStep;
  skipOnboarding: boolean;
}

function ProgressIndicator({
  currentStep,
  skipOnboarding,
}: ProgressIndicatorProps) {
  const colors = useThemeColors();

  // Filter out onboarding step if skipped
  const visibleSteps = useMemo(() => {
    if (skipOnboarding) {
      return STEP_CONFIG.filter((step) => step.id !== "onboarding");
    }
    return STEP_CONFIG;
  }, [skipOnboarding]);

  const currentIndex = visibleSteps.findIndex((step) => step.id === currentStep);
  const totalSteps = visibleSteps.length;

  return (
    <Box flexDirection="column" alignItems="center" marginBottom={1}>
      {/* Step dots */}
      <Box>
        {visibleSteps.map((step, index) => {
          const isActive = index === currentIndex;
          const isComplete = index < currentIndex;
          const icon = isActive
            ? progressChars.filled
            : isComplete
              ? navIcons.radioSelected
              : navIcons.radio;

          return (
            <Box key={step.id}>
              <Text
                color={
                  isActive
                    ? colors.primary
                    : isComplete
                      ? colors.success
                      : colors.textMuted
                }
                bold={isActive}
              >
                {icon}
              </Text>
              {index < visibleSteps.length - 1 && (
                <Text color={colors.textMuted}> {navIcons.bullet} </Text>
              )}
            </Box>
          );
        })}
      </Box>

      {/* Step label */}
      <Box marginTop={1}>
        <Text color={colors.secondary}>
          Step {currentIndex + 1} of {totalSteps}:{" "}
        </Text>
        <Text color={colors.primary} bold>
          {visibleSteps[currentIndex]?.label ?? "Unknown"}
        </Text>
      </Box>
    </Box>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SetupWizard({
  isVisible,
  skipOnboarding = false,
  onComplete,
  onCancel,
  hasFocus,
  dimensions,
}: SetupWizardProps) {
  // Determine initial step based on skipOnboarding
  const initialStep: SetupWizardStep = skipOnboarding
    ? "feature_prompt"
    : "onboarding";

  // Current step state
  const [currentStep, setCurrentStep] = useState<SetupWizardStep>(initialStep);

  // Data collected through the wizard
  const [featurePromptText, setFeaturePromptText] = useState("");
  const [interviewResult, setInterviewResult] = useState<InterviewResult | null>(
    null
  );
  const [generatedPrd, setGeneratedPrd] = useState<GeneratedPrd | null>(null);

  // ============================================================================
  // STEP TRANSITION HANDLERS
  // ============================================================================

  // Onboarding -> Feature Prompt
  const handleOnboardingComplete = useCallback(() => {
    setCurrentStep("feature_prompt");
  }, []);

  // Feature Prompt -> Interview
  const handleFeaturePromptComplete = useCallback((prompt: string) => {
    setFeaturePromptText(prompt);
    setCurrentStep("interview");
  }, []);

  // Feature Prompt back -> Onboarding (only if not skipped)
  const handleFeaturePromptBack = useCallback(() => {
    if (!skipOnboarding) {
      setCurrentStep("onboarding");
    } else if (onCancel) {
      onCancel();
    }
  }, [skipOnboarding, onCancel]);

  // Interview -> PRD Generation
  const handleInterviewComplete = useCallback((result: InterviewResult) => {
    setInterviewResult(result);
    setCurrentStep("prd_generation");
  }, []);

  // Interview back -> Feature Prompt
  const handleInterviewBack = useCallback(() => {
    setCurrentStep("feature_prompt");
  }, []);

  // PRD Generation -> Task Breakdown
  const handlePrdGenerationComplete = useCallback((prd: GeneratedPrd) => {
    setGeneratedPrd(prd);
    setCurrentStep("task_breakdown");
  }, []);

  // PRD Generation cancelled -> Interview
  const handlePrdGenerationCancel = useCallback(() => {
    setCurrentStep("interview");
  }, []);

  // Task Breakdown -> Review
  const handleTaskBreakdownContinue = useCallback(() => {
    setCurrentStep("review");
  }, []);

  // Review -> Start (complete wizard)
  const handleReviewStart = useCallback(() => {
    if (interviewResult && generatedPrd) {
      onComplete({
        featureDescription: featurePromptText,
        interviewResult,
        generatedPrd,
      });
    }
  }, [featurePromptText, interviewResult, generatedPrd, onComplete]);

  // Review -> Edit Tasks (back to task breakdown)
  const handleReviewEditTasks = useCallback(() => {
    setCurrentStep("task_breakdown");
  }, []);

  // ============================================================================
  // RENDER
  // ============================================================================

  if (!isVisible) {
    return null;
  }

  // Calculate content dimensions
  const contentWidth = dimensions?.width ?? 80;
  const contentHeight = dimensions?.height ?? 24;

  return (
    <Box
      flexDirection="column"
      width={contentWidth}
      height={contentHeight}
      alignItems="center"
      justifyContent="flex-start"
    >
      {/* Progress indicator - shown for all steps */}
      <Box marginTop={1}>
        <ProgressIndicator
          currentStep={currentStep}
          skipOnboarding={skipOnboarding}
        />
      </Box>

      {/* Step content */}
      <Box
        flexGrow={1}
        width="100%"
        alignItems="center"
        justifyContent="center"
      >
        {/* Onboarding Step */}
        {currentStep === "onboarding" && (
          <OnboardingTutorial
            isVisible={true}
            onComplete={handleOnboardingComplete}
            hasFocus={hasFocus}
            dimensions={dimensions}
          />
        )}

        {/* Feature Prompt Step */}
        {currentStep === "feature_prompt" && (
          <FeaturePromptScreen
            isVisible={true}
            onComplete={handleFeaturePromptComplete}
            onBack={handleFeaturePromptBack}
            hasFocus={hasFocus}
            dimensions={dimensions}
          />
        )}

        {/* Interview Step */}
        {currentStep === "interview" && (
          <DynamicInterviewFlow
            isVisible={true}
            featureDescription={featurePromptText}
            onComplete={handleInterviewComplete}
            onBack={handleInterviewBack}
            hasFocus={hasFocus}
            dimensions={dimensions}
          />
        )}

        {/* PRD Generation Step */}
        {currentStep === "prd_generation" && interviewResult && (
          <PrdGenerationScreen
            isVisible={true}
            interviewResult={interviewResult}
            onComplete={handlePrdGenerationComplete}
            onCancel={handlePrdGenerationCancel}
            hasFocus={hasFocus}
            dimensions={dimensions}
          />
        )}

        {/* Task Breakdown Step */}
        {currentStep === "task_breakdown" && generatedPrd && (
          <TaskBreakdownScreen
            isVisible={true}
            tasks={generatedPrd.taskBreakdown}
            featureName={featurePromptText}
            onContinue={handleTaskBreakdownContinue}
            hasFocus={hasFocus}
            dimensions={dimensions}
          />
        )}

        {/* Review Step */}
        {currentStep === "review" && generatedPrd && (
          <PreStartReviewScreen
            isVisible={true}
            generatedPrd={generatedPrd}
            featureName={featurePromptText}
            onStart={handleReviewStart}
            onEditTasks={handleReviewEditTasks}
            hasFocus={hasFocus}
            dimensions={dimensions}
          />
        )}
      </Box>

      {/* Cancel hint - shown only when cancellation is possible */}
      {onCancel && currentStep !== "prd_generation" && (
        <Box marginBottom={1}>
          <Text dimColor>Press Ctrl+C to cancel setup</Text>
        </Box>
      )}
    </Box>
  );
}

export default SetupWizard;
