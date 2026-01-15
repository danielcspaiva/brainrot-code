/**
 * Dynamic Interview Flow Component
 *
 * Manages a multi-question interview flow with dynamic question generation.
 * Questions cover: scope, users, technical constraints, integration, success criteria, edge cases, priorities.
 * Progress indicator shows 'Question X of ~Y' (approximate since questions may be added/removed).
 */

import { Box, Text } from "ink";
import { useState, useCallback, useMemo, useEffect } from "react";
import { useThemeColors } from "./useTheme.js";
import { navIcons } from "./theme.js";
import {
  InterviewQuestion,
  type InterviewOption,
} from "./InterviewQuestion.js";

// ============================================================================
// TYPES
// ============================================================================

/** Question category for organizing interview flow */
export type QuestionCategory =
  | "scope"
  | "users"
  | "technical"
  | "integration"
  | "success"
  | "edge_cases"
  | "priorities";

/** A single interview question definition */
export interface InterviewQuestionDef {
  /** Unique question identifier */
  id: string;
  /** Question category */
  category: QuestionCategory;
  /** The question text */
  question: string;
  /** Header displayed above the question */
  header: string;
  /** Pre-defined answer options (A-D) */
  options: InterviewOption[];
  /** Whether this question can trigger follow-up questions */
  canTriggerFollowUp?: boolean;
  /** Condition for showing this question (based on previous answers) */
  showIf?: (answers: InterviewAnswers) => boolean;
}

/** User's answer to a question */
export interface InterviewAnswer {
  questionId: string;
  answer: string;
  timestamp: string;
}

/** Map of all collected answers */
export type InterviewAnswers = Record<string, string>;

/** Complete interview result */
export interface InterviewResult {
  /** All answers collected */
  answers: InterviewAnswers;
  /** Original feature description */
  featureDescription: string;
  /** Estimated complexity */
  complexity: "small" | "medium" | "large";
  /** Summary generated from answers */
  summary: string;
}

export interface DynamicInterviewFlowProps {
  /** Whether the component is visible */
  isVisible: boolean;
  /** The feature description entered by user */
  featureDescription: string;
  /** Callback when interview is complete */
  onComplete: (result: InterviewResult) => void;
  /** Callback when user wants to go back */
  onBack?: () => void;
  /** Whether the component has focus */
  hasFocus: boolean;
  /** Terminal dimensions for centering */
  dimensions?: { width: number; height: number };
}

// ============================================================================
// QUESTION TEMPLATES
// ============================================================================

/**
 * Core interview questions covering all required topics.
 * Questions are ordered by priority and may be conditionally shown.
 */
const CORE_QUESTIONS: InterviewQuestionDef[] = [
  // Scope questions
  {
    id: "scope_type",
    category: "scope",
    question: "What type of project is this?",
    header: "Project Scope",
    options: [
      { label: "Web application (frontend/fullstack)", value: "web" },
      { label: "Backend API or service", value: "backend" },
      { label: "CLI tool or script", value: "cli" },
      { label: "Mobile app", value: "mobile" },
    ],
  },
  {
    id: "scope_size",
    category: "scope",
    question: "How would you describe the scope of this feature?",
    header: "Feature Size",
    options: [
      { label: "Small - single file or function", value: "small" },
      { label: "Medium - multiple files/components", value: "medium" },
      { label: "Large - new system or major changes", value: "large" },
      { label: "Unclear - need to explore first", value: "unclear" },
    ],
    canTriggerFollowUp: true,
  },

  // User questions
  {
    id: "users_primary",
    category: "users",
    question: "Who is the primary user of this feature?",
    header: "Target Users",
    options: [
      { label: "End users (customers)", value: "end_users" },
      { label: "Developers (internal/external)", value: "developers" },
      { label: "Admins or operators", value: "admins" },
      { label: "Automated systems/services", value: "automated" },
    ],
  },

  // Technical constraints
  {
    id: "tech_constraints",
    category: "technical",
    question: "Are there specific technical constraints to consider?",
    header: "Technical Constraints",
    options: [
      {
        label: "Must use existing codebase patterns",
        value: "existing_patterns",
      },
      { label: "Performance is critical", value: "performance" },
      { label: "Security/authentication required", value: "security" },
      { label: "No specific constraints", value: "none" },
    ],
  },
  {
    id: "tech_testing",
    category: "technical",
    question: "What testing approach should be used?",
    header: "Testing Strategy",
    options: [
      { label: "Unit tests for core logic", value: "unit" },
      { label: "Integration/E2E tests", value: "integration" },
      { label: "Both unit and integration", value: "both" },
      { label: "Manual testing only", value: "manual" },
    ],
    showIf: (answers) => answers.scope_size !== "small",
  },

  // Integration
  {
    id: "integration_external",
    category: "integration",
    question: "Does this feature need to integrate with external services?",
    header: "External Integration",
    options: [
      { label: "Yes - APIs/third-party services", value: "external_api" },
      { label: "Yes - database/storage", value: "database" },
      { label: "Yes - authentication provider", value: "auth" },
      { label: "No external integrations needed", value: "none" },
    ],
    showIf: (answers) => answers.scope_type !== "cli",
  },

  // Success criteria
  {
    id: "success_criteria",
    category: "success",
    question: "How will you know when this feature is complete?",
    header: "Success Criteria",
    options: [
      { label: "All tests pass", value: "tests" },
      { label: "Feature works as specified", value: "functional" },
      { label: "Code reviewed and merged", value: "merged" },
      { label: "Deployed to production", value: "deployed" },
    ],
  },

  // Edge cases
  {
    id: "edge_cases",
    category: "edge_cases",
    question: "What edge cases should be handled?",
    header: "Edge Cases",
    options: [
      { label: "Error handling and recovery", value: "errors" },
      { label: "Empty/null input handling", value: "empty_input" },
      { label: "Performance under load", value: "load" },
      { label: "All of the above", value: "all" },
    ],
    showIf: (answers) => answers.scope_size !== "small",
  },

  // Priorities
  {
    id: "priority_focus",
    category: "priorities",
    question: "What should Claude prioritize?",
    header: "Priority Focus",
    options: [
      { label: "Code quality and maintainability", value: "quality" },
      { label: "Speed of implementation", value: "speed" },
      { label: "Comprehensive documentation", value: "docs" },
      { label: "Balance all aspects equally", value: "balanced" },
    ],
  },
];

/**
 * Follow-up questions that may be added based on answers
 */
const FOLLOWUP_QUESTIONS: InterviewQuestionDef[] = [
  {
    id: "scope_clarify",
    category: "scope",
    question: "Can you be more specific about the scope?",
    header: "Scope Clarification",
    options: [
      { label: "It's a new feature from scratch", value: "new" },
      { label: "Extending existing functionality", value: "extend" },
      { label: "Refactoring/improving existing code", value: "refactor" },
      { label: "Fixing a bug or issue", value: "bugfix" },
    ],
    showIf: (answers) => answers.scope_size === "unclear",
  },
  {
    id: "security_details",
    category: "technical",
    question: "What security considerations are important?",
    header: "Security Details",
    options: [
      { label: "User authentication/authorization", value: "auth" },
      { label: "Data encryption/privacy", value: "encryption" },
      { label: "Input validation/sanitization", value: "validation" },
      { label: "All security best practices", value: "all" },
    ],
    showIf: (answers) => answers.tech_constraints === "security",
  },
  {
    id: "performance_targets",
    category: "technical",
    question: "What performance targets should be met?",
    header: "Performance Goals",
    options: [
      { label: "Sub-second response times", value: "fast" },
      { label: "Handle high concurrent load", value: "scalable" },
      { label: "Minimize memory usage", value: "memory" },
      { label: "General optimization", value: "general" },
    ],
    showIf: (answers) => answers.tech_constraints === "performance",
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate interview complexity based on feature description
 */
function estimateComplexity(
  featureDescription: string
): "small" | "medium" | "large" {
  const words = featureDescription.split(/\s+/).length;
  const hasComplexKeywords =
    /system|integration|auth|api|database|migration/i.test(featureDescription);

  if (words > 50 || hasComplexKeywords) {
    return "large";
  } else if (words > 20) {
    return "medium";
  }
  return "small";
}

/**
 * Determine which questions to show based on answers and complexity
 */
function getActiveQuestions(
  answers: InterviewAnswers,
  complexity: "small" | "medium" | "large"
): InterviewQuestionDef[] {
  // Start with core questions
  let questions = [...CORE_QUESTIONS];

  // Add follow-up questions based on answers
  for (const followUp of FOLLOWUP_QUESTIONS) {
    if (followUp.showIf && followUp.showIf(answers)) {
      // Insert follow-up after related question
      const relatedIdx = questions.findIndex(
        (q) => q.category === followUp.category
      );
      if (relatedIdx >= 0) {
        questions.splice(relatedIdx + 1, 0, followUp);
      } else {
        questions.push(followUp);
      }
    }
  }

  // Filter out questions that shouldn't be shown
  questions = questions.filter((q) => {
    if (q.showIf) {
      return q.showIf(answers);
    }
    return true;
  });

  // For small complexity, reduce questions
  if (complexity === "small") {
    // Keep only essential questions for small features
    const essentialIds = [
      "scope_type",
      "scope_size",
      "users_primary",
      "success_criteria",
      "priority_focus",
    ];
    questions = questions.filter(
      (q) => essentialIds.includes(q.id) || q.showIf?.(answers)
    );
  }

  return questions;
}

/**
 * Generate a summary from interview answers
 */
function generateSummary(answers: InterviewAnswers): string {
  const parts: string[] = [];

  if (answers.scope_type) {
    parts.push(`Project type: ${answers.scope_type}`);
  }
  if (answers.scope_size) {
    parts.push(`Scope: ${answers.scope_size}`);
  }
  if (answers.users_primary) {
    parts.push(`Target users: ${answers.users_primary}`);
  }
  if (answers.priority_focus) {
    parts.push(`Priority: ${answers.priority_focus}`);
  }

  return parts.join(" | ");
}

// ============================================================================
// PROGRESS INDICATOR COMPONENT
// ============================================================================

interface ProgressIndicatorProps {
  current: number;
  estimated: number;
  colors: ReturnType<typeof useThemeColors>;
}

function ProgressIndicator({
  current,
  estimated,
  colors,
}: ProgressIndicatorProps) {
  // Show approximate with ~ since questions may change
  const progressText = `Question ${current} of ~${estimated}`;
  const percentage = Math.round((current / estimated) * 100);

  // Visual progress bar
  const barWidth = 20;
  const filled = Math.round((current / estimated) * barWidth);
  const empty = barWidth - filled;
  const bar = `${"█".repeat(filled)}${"░".repeat(empty)}`;

  return (
    <Box flexDirection="column" alignItems="center" marginBottom={1}>
      <Text color={colors.secondary}>{progressText}</Text>
      <Box marginTop={1}>
        <Text color={colors.primary}>{bar}</Text>
        <Text color={colors.textMuted}> {percentage}%</Text>
      </Box>
    </Box>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DynamicInterviewFlow({
  isVisible,
  featureDescription,
  onComplete,
  onBack,
  hasFocus,
  dimensions,
}: DynamicInterviewFlowProps) {
  const colors = useThemeColors();

  // Track current question index and answers
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<InterviewAnswers>({});

  // Calculate complexity from feature description
  const complexity = useMemo(
    () => estimateComplexity(featureDescription),
    [featureDescription]
  );

  // Get active questions based on current answers and complexity
  const activeQuestions = useMemo(
    () => getActiveQuestions(answers, complexity),
    [answers, complexity]
  );

  // Current question
  const currentQuestion = activeQuestions[currentIndex];

  // Estimated total (may change as answers are given)
  const estimatedTotal = activeQuestions.length;

  // Handle answer submission
  const handleAnswer = useCallback(
    (answer: string) => {
      if (!currentQuestion) return;

      // Store answer
      const newAnswers = {
        ...answers,
        [currentQuestion.id]: answer,
      };
      setAnswers(newAnswers);

      // Check if this is the last question
      const updatedQuestions = getActiveQuestions(newAnswers, complexity);
      const nextIndex = currentIndex + 1;

      if (nextIndex >= updatedQuestions.length) {
        // Interview complete
        const result: InterviewResult = {
          answers: newAnswers,
          featureDescription,
          complexity:
            (newAnswers.scope_size as "small" | "medium" | "large") ||
            complexity,
          summary: generateSummary(newAnswers),
        };
        onComplete(result);
      } else {
        // Move to next question
        setCurrentIndex(nextIndex);
      }
    },
    [
      currentQuestion,
      answers,
      currentIndex,
      complexity,
      featureDescription,
      onComplete,
    ]
  );

  // Handle going back to previous question
  const handleBack = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else if (onBack) {
      onBack();
    }
  }, [currentIndex, onBack]);

  // Reset when interview starts
  useEffect(() => {
    if (isVisible) {
      setCurrentIndex(0);
      setAnswers({});
    }
  }, [isVisible, featureDescription]);

  if (!isVisible || !currentQuestion) {
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
      {/* Progress indicator */}
      <ProgressIndicator
        current={currentIndex + 1}
        estimated={estimatedTotal}
        colors={colors}
      />

      {/* Category badge */}
      <Box marginBottom={1}>
        <Text dimColor>
          {navIcons.bullet}{" "}
          {currentQuestion.category.toUpperCase().replace("_", " ")}{" "}
          {navIcons.bullet}
        </Text>
      </Box>

      {/* Interview question */}
      <InterviewQuestion
        isVisible={true}
        question={currentQuestion.question}
        header={currentQuestion.header}
        options={currentQuestion.options}
        onAnswer={handleAnswer}
        onBack={handleBack}
        hasFocus={hasFocus}
        dimensions={dimensions}
      />

      {/* Feature context reminder */}
      <Box
        marginTop={2}
        paddingX={2}
        width={Math.min(70, (dimensions?.width ?? 80) - 4)}
      >
        <Text dimColor italic>
          Building:{" "}
          {featureDescription.length > 50
            ? featureDescription.slice(0, 50) + "..."
            : featureDescription}
        </Text>
      </Box>
    </Box>
  );
}

export default DynamicInterviewFlow;
