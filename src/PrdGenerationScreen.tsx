/**
 * PRD Generation Screen
 *
 * Displays a loading state while generating a PRD from interview responses.
 * Shows spinner animation, progress messages, and elapsed time.
 * Games are disabled during this phase.
 */

import { Box, Text, useInput } from "ink";
import { useState, useEffect } from "react";
import { useThemeColors } from "./useTheme.js";
import { useSpinner } from "./use-spinner.js";
import { progressChars, alertIcons } from "./theme.js";
import type { InterviewResult } from "./DynamicInterviewFlow.js";
import type { LoopTask } from "./loop-state.js";

// ============================================================================
// TYPES
// ============================================================================

export interface GeneratedPrd {
  /** Feature overview section */
  overview: string;
  /** List of requirements */
  requirements: string[];
  /** Technical approach description */
  technicalApproach: string;
  /** Task breakdown for implementation */
  taskBreakdown: LoopTask[];
  /** Success criteria */
  successCriteria: string[];
  /** Full PRD content as markdown */
  fullContent: string;
}

export interface PrdGenerationScreenProps {
  /** Whether the component is visible */
  isVisible: boolean;
  /** Interview result to generate PRD from */
  interviewResult: InterviewResult;
  /** Callback when PRD generation is complete */
  onComplete: (prd: GeneratedPrd) => void;
  /** Callback when generation is cancelled */
  onCancel?: () => void;
  /** Whether the component has focus */
  hasFocus: boolean;
  /** Terminal dimensions */
  dimensions?: { width: number; height: number };
}

// ============================================================================
// PRD GENERATION LOGIC
// ============================================================================

/**
 * Generate PRD content from interview results using Claude-like analysis
 * This simulates intelligent PRD generation based on interview context
 */
async function generatePrdFromInterview(
  interviewResult: InterviewResult,
  onProgress: (message: string) => void
): Promise<GeneratedPrd> {
  const { answers, featureDescription, complexity } = interviewResult;

  // Phase 1: Analyzing responses
  onProgress("Analyzing interview responses...");
  await delay(800);

  // Phase 2: Generating overview
  onProgress("Generating feature overview...");
  await delay(600);
  const overview = generateOverview(featureDescription, answers);

  // Phase 3: Extracting requirements
  onProgress("Extracting requirements...");
  await delay(700);
  const requirements = generateRequirements(answers, complexity);

  // Phase 4: Planning technical approach
  onProgress("Planning technical approach...");
  await delay(800);
  const technicalApproach = generateTechnicalApproach(answers);

  // Phase 5: Breaking down tasks
  onProgress("Breaking down tasks...");
  await delay(900);
  const taskBreakdown = generateTaskBreakdown(
    featureDescription,
    answers,
    complexity
  );

  // Phase 6: Defining success criteria
  onProgress("Defining success criteria...");
  await delay(500);
  const successCriteria = generateSuccessCriteria(answers);

  // Phase 7: Compiling final PRD
  onProgress("Compiling PRD document...");
  await delay(400);
  const fullContent = compilePrdContent(
    featureDescription,
    overview,
    requirements,
    technicalApproach,
    taskBreakdown,
    successCriteria
  );

  return {
    overview,
    requirements,
    technicalApproach,
    taskBreakdown,
    successCriteria,
    fullContent,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function generateOverview(
  featureDescription: string,
  answers: Record<string, string>
): string {
  const projectType = answers.scope_type || "project";
  const targetUsers = answers.users_primary || "users";
  const priority = answers.priority_focus || "balanced";

  return (
    `This ${projectType} feature will ${featureDescription.toLowerCase()}. ` +
    `The primary audience is ${targetUsers.replace("_", " ")}, ` +
    `with a focus on ${priority.replace("_", " ")} implementation.`
  );
}

function generateRequirements(
  answers: Record<string, string>,
  complexity: "small" | "medium" | "large"
): string[] {
  const requirements: string[] = [];

  // Core functionality requirement
  requirements.push("Implement core feature functionality as specified");

  // User-based requirements
  if (answers.users_primary === "end_users") {
    requirements.push("Ensure intuitive user interface and experience");
  } else if (answers.users_primary === "developers") {
    requirements.push("Provide clear API documentation and examples");
  } else if (answers.users_primary === "admins") {
    requirements.push("Include administrative controls and monitoring");
  }

  // Technical constraint requirements
  if (answers.tech_constraints === "performance") {
    requirements.push("Optimize for performance and response time");
  } else if (answers.tech_constraints === "security") {
    requirements.push("Implement security best practices and authentication");
  } else if (answers.tech_constraints === "existing_patterns") {
    requirements.push("Follow existing codebase patterns and conventions");
  }

  // Testing requirements
  if (answers.tech_testing === "unit") {
    requirements.push("Write unit tests for core logic");
  } else if (answers.tech_testing === "integration") {
    requirements.push("Create integration/E2E tests");
  } else if (answers.tech_testing === "both") {
    requirements.push("Write comprehensive unit and integration tests");
  }

  // Integration requirements
  if (answers.integration_external === "external_api") {
    requirements.push("Integrate with external APIs/third-party services");
  } else if (answers.integration_external === "database") {
    requirements.push("Set up database/storage integration");
  } else if (answers.integration_external === "auth") {
    requirements.push("Integrate authentication provider");
  }

  // Edge case requirements for larger features
  if (complexity !== "small" && answers.edge_cases) {
    if (answers.edge_cases === "all" || answers.edge_cases === "errors") {
      requirements.push("Implement comprehensive error handling");
    }
    if (answers.edge_cases === "all" || answers.edge_cases === "empty_input") {
      requirements.push("Handle edge cases for empty/null inputs");
    }
    if (answers.edge_cases === "all" || answers.edge_cases === "load") {
      requirements.push("Ensure performance under load");
    }
  }

  return requirements;
}

function generateTechnicalApproach(answers: Record<string, string>): string {
  const parts: string[] = [];

  // Project type approach
  const projectApproaches: Record<string, string> = {
    web: "Build using modern web technologies with component-based architecture",
    backend:
      "Implement RESTful API endpoints with proper service layer separation",
    cli: "Create command-line interface with clear argument parsing and help text",
    mobile: "Develop mobile-first UI with responsive design patterns",
  };
  parts.push(
    projectApproaches[answers.scope_type] ||
      "Follow standard development practices"
  );

  // Constraint-based approach
  if (answers.tech_constraints === "performance") {
    parts.push(
      "Profile and optimize critical paths, implement caching where appropriate"
    );
  } else if (answers.tech_constraints === "security") {
    parts.push(
      "Apply security headers, input validation, and authentication middleware"
    );
  }

  // Testing approach
  if (answers.tech_testing && answers.tech_testing !== "manual") {
    parts.push(
      `Set up ${answers.tech_testing} testing framework with CI integration`
    );
  }

  // Scope approach
  if (answers.scope_clarify === "refactor") {
    parts.push("Refactor incrementally with backwards compatibility");
  } else if (answers.scope_clarify === "extend") {
    parts.push("Extend existing functionality while maintaining API stability");
  }

  return parts.join(". ") + ".";
}

function generateTaskBreakdown(
  featureDescription: string,
  answers: Record<string, string>,
  complexity: "small" | "medium" | "large"
): LoopTask[] {
  const tasks: LoopTask[] = [];
  let taskNum = 1;

  // Initial setup task (Task 1 - no dependencies)
  const setupTaskId = `task-${taskNum}`;
  tasks.push({
    id: setupTaskId,
    title: `${taskNum}. Project setup and initial scaffolding`,
    description: "Set up project structure and initial configuration",
    status: "pending",
    complexity: "small",
    dependsOn: [],
  });
  taskNum++;

  // Track core task IDs for dependency chaining
  const coreTaskIds: string[] = [];

  // Core implementation task(s) based on complexity
  if (complexity === "small") {
    const coreTaskId = `task-${taskNum}`;
    coreTaskIds.push(coreTaskId);
    tasks.push({
      id: coreTaskId,
      title: `${taskNum}. Implement ${featureDescription.slice(0, 40)}`,
      description: "Core feature implementation",
      status: "pending",
      complexity: "small",
      dependsOn: [setupTaskId],
    });
    taskNum++;
  } else {
    const coreLogicTaskId = `task-${taskNum}`;
    coreTaskIds.push(coreLogicTaskId);
    tasks.push({
      id: coreLogicTaskId,
      title: `${taskNum}. Implement core feature logic`,
      description: "Build the main functionality",
      status: "pending",
      complexity: complexity === "large" ? "medium" : "small",
      dependsOn: [setupTaskId],
    });
    taskNum++;

    if (answers.scope_type === "web" || answers.scope_type === "mobile") {
      const uiTaskId = `task-${taskNum}`;
      coreTaskIds.push(uiTaskId);
      tasks.push({
        id: uiTaskId,
        title: `${taskNum}. Build user interface components`,
        description: "Create UI components and views",
        status: "pending",
        complexity: "medium",
        dependsOn: [coreLogicTaskId],
      });
      taskNum++;
    }

    if (answers.scope_type === "backend") {
      const apiTaskId = `task-${taskNum}`;
      coreTaskIds.push(apiTaskId);
      tasks.push({
        id: apiTaskId,
        title: `${taskNum}. Create API endpoints`,
        description: "Implement REST API routes and handlers",
        status: "pending",
        complexity: "medium",
        dependsOn: [coreLogicTaskId],
      });
      taskNum++;
    }
  }

  // Track last task ID for dependency chaining
  let lastTaskId = coreTaskIds[coreTaskIds.length - 1] ?? setupTaskId;

  // Integration task
  if (answers.integration_external && answers.integration_external !== "none") {
    const integrationTaskId = `task-${taskNum}`;
    tasks.push({
      id: integrationTaskId,
      title: `${taskNum}. Set up external integrations`,
      description: `Integrate with ${answers.integration_external.replace("_", " ")}`,
      status: "pending",
      complexity: "medium",
      dependsOn: [lastTaskId],
    });
    lastTaskId = integrationTaskId;
    taskNum++;
  }

  // Testing task
  if (answers.tech_testing && answers.tech_testing !== "manual") {
    const testingTaskId = `task-${taskNum}`;
    tasks.push({
      id: testingTaskId,
      title: `${taskNum}. Write tests`,
      description: `Create ${answers.tech_testing} tests`,
      status: "pending",
      complexity: complexity === "small" ? "small" : "medium",
      dependsOn: [lastTaskId],
    });
    lastTaskId = testingTaskId;
    taskNum++;
  }

  // Documentation task for larger features
  if (complexity !== "small" && answers.priority_focus === "docs") {
    const docsTaskId = `task-${taskNum}`;
    tasks.push({
      id: docsTaskId,
      title: `${taskNum}. Write documentation`,
      description: "Create comprehensive documentation",
      status: "pending",
      complexity: "small",
      dependsOn: [lastTaskId],
    });
    lastTaskId = docsTaskId;
    taskNum++;
  }

  // Final review task
  tasks.push({
    id: `task-${taskNum}`,
    title: `${taskNum}. Code review and final polish`,
    description: "Review implementation and fix any issues",
    status: "pending",
    complexity: "small",
    dependsOn: [lastTaskId],
  });

  return tasks;
}

function generateSuccessCriteria(answers: Record<string, string>): string[] {
  const criteria: string[] = [];

  // Primary success criteria
  const successMap: Record<string, string> = {
    tests: "All automated tests pass",
    functional: "Feature works as specified in requirements",
    merged: "Code reviewed and merged to main branch",
    deployed: "Successfully deployed to production environment",
  };
  criteria.push(
    successMap[answers.success_criteria] || "Feature implementation complete"
  );

  // Additional criteria based on constraints
  if (answers.tech_constraints === "performance") {
    criteria.push("Performance benchmarks met");
  }
  if (answers.tech_constraints === "security") {
    criteria.push("Security review passed");
  }

  // Testing criteria
  if (answers.tech_testing === "both") {
    criteria.push("Unit and integration test coverage adequate");
  }

  // Edge case criteria
  if (answers.edge_cases === "all") {
    criteria.push("All edge cases handled gracefully");
  }

  return criteria;
}

function compilePrdContent(
  featureDescription: string,
  overview: string,
  requirements: string[],
  technicalApproach: string,
  taskBreakdown: LoopTask[],
  successCriteria: string[]
): string {
  const sections: string[] = [];

  // Title
  sections.push(`# PRD: ${featureDescription}\n`);

  // Overview
  sections.push("## Overview\n");
  sections.push(`${overview}\n`);

  // Requirements
  sections.push("## Requirements\n");
  requirements.forEach((req, i) => {
    sections.push(`${i + 1}. ${req}`);
  });
  sections.push("");

  // Technical Approach
  sections.push("## Technical Approach\n");
  sections.push(`${technicalApproach}\n`);

  // Task Breakdown
  sections.push("## Task Breakdown\n");
  taskBreakdown.forEach((task) => {
    sections.push(`- **${task.title}** [${task.complexity}]`);
    if (task.description) {
      sections.push(`  - ${task.description}`);
    }
    if (task.dependsOn && task.dependsOn.length > 0) {
      const depNums = task.dependsOn
        .map((dep) => dep.replace("task-", "#"))
        .join(", ");
      sections.push(`  - Dependencies: ${depNums}`);
    }
  });
  sections.push("");

  // Success Criteria
  sections.push("## Success Criteria\n");
  successCriteria.forEach((criterion) => {
    sections.push(`- [ ] ${criterion}`);
  });

  return sections.join("\n");
}

// ============================================================================
// PROGRESS MESSAGE COMPONENT
// ============================================================================

interface ProgressMessageProps {
  message: string;
  colors: ReturnType<typeof useThemeColors>;
}

function ProgressMessage({ message, colors }: ProgressMessageProps) {
  return (
    <Box marginY={1}>
      <Text color={colors.textMuted}>{message}</Text>
    </Box>
  );
}

// ============================================================================
// ELAPSED TIME DISPLAY
// ============================================================================

interface ElapsedTimeProps {
  elapsedMs: number;
}

function ElapsedTime({ elapsedMs }: ElapsedTimeProps) {
  const seconds = Math.floor(elapsedMs / 1000);
  const formattedTime =
    seconds < 60
      ? `${seconds}s`
      : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;

  return (
    <Box marginTop={1}>
      <Text dimColor>Elapsed: {formattedTime}</Text>
    </Box>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PrdGenerationScreen({
  isVisible,
  interviewResult,
  onComplete,
  onCancel,
  hasFocus,
  dimensions,
}: PrdGenerationScreenProps) {
  const colors = useThemeColors();
  const [progressMessage, setProgressMessage] = useState(
    "Initializing PRD generation..."
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Spinner animation
  const spinner = useSpinner({
    isActive: isGenerating,
    interval: 80,
    style: "braille",
  });

  // Handle escape to cancel
  useInput(
    (_input, key) => {
      if (key.escape && onCancel) {
        onCancel();
      }
    },
    { isActive: hasFocus && isVisible }
  );

  // Start generation when visible
  useEffect(() => {
    if (!isVisible || isGenerating) return;

    setIsGenerating(true);
    setError(null);

    generatePrdFromInterview(interviewResult, setProgressMessage)
      .then((prd) => {
        setProgressMessage("PRD generation complete!");
        setIsGenerating(false);
        // Small delay before calling complete for visual feedback
        setTimeout(() => {
          onComplete(prd);
        }, 500);
      })
      .catch((err) => {
        setIsGenerating(false);
        setError(err instanceof Error ? err.message : "Failed to generate PRD");
      });
  }, [isVisible, interviewResult, onComplete]);

  if (!isVisible) {
    return null;
  }

  const contentWidth = Math.min(60, (dimensions?.width ?? 80) - 10);

  return (
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      width="100%"
      height="100%"
    >
      {/* Title */}
      <Box marginBottom={2}>
        <Text bold color={colors.primary}>
          {progressChars.braille[0]} PRD Generation
        </Text>
      </Box>

      {/* Main content box */}
      <Box
        flexDirection="column"
        alignItems="center"
        borderStyle="round"
        borderColor={colors.secondary}
        paddingX={3}
        paddingY={2}
        width={contentWidth}
      >
        {error ? (
          // Error state
          <>
            <Box marginBottom={1}>
              <Text color={colors.error}>
                {alertIcons.error} Generation Failed
              </Text>
            </Box>
            <Text color={colors.textMuted}>{error}</Text>
            <Box marginTop={2}>
              <Text dimColor>Press Esc to go back</Text>
            </Box>
          </>
        ) : (
          // Loading state
          <>
            {/* Spinner with message */}
            <Box marginBottom={1}>
              <Text color={colors.primary}>{spinner.frame}</Text>
              <Text> </Text>
              <Text bold color={colors.text}>
                Generating PRD...
              </Text>
            </Box>

            {/* Progress message */}
            <ProgressMessage message={progressMessage} colors={colors} />

            {/* Progress indicator dots */}
            <Box marginTop={1}>
              <Text color={colors.secondary}>
                {progressChars.dots.join(" ")}
              </Text>
            </Box>

            {/* Elapsed time */}
            <ElapsedTime elapsedMs={spinner.elapsedMs} />

            {/* Cancel hint */}
            {onCancel && (
              <Box marginTop={2}>
                <Text dimColor>Press Esc to cancel</Text>
              </Box>
            )}
          </>
        )}
      </Box>

      {/* Feature context */}
      <Box marginTop={2} paddingX={2} width={contentWidth}>
        <Text dimColor italic>
          Building:{" "}
          {interviewResult.featureDescription.length > 40
            ? interviewResult.featureDescription.slice(0, 40) + "..."
            : interviewResult.featureDescription}
        </Text>
      </Box>

      {/* Games disabled notice */}
      <Box marginTop={2}>
        <Text color={colors.warning}>
          {alertIcons.info} Games paused during PRD generation
        </Text>
      </Box>
    </Box>
  );
}

export default PrdGenerationScreen;
