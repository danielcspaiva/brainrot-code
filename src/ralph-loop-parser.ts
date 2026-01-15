/**
 * Ralph Loop Status Parser
 *
 * Parses Claude Code output to extract Ralph loop status information
 * for display in the UI.
 */

export type RalphLoopStatus =
  | "idle"
  | "running"
  | "paused"
  | "completed"
  | "errored"
  | "waiting_for_input";

export interface RalphLoopProgress {
  currentStep: number;
  totalSteps: number | null;
  percentage: number | null;
  description: string | null;
}

export interface AgentActivity {
  isActive: boolean;
  currentAction: string | null;
  toolName: string | null;
  timestamp: Date;
}

export interface UserAttentionNeeded {
  needed: boolean;
  reason: string | null;
  type: "question" | "confirmation" | "error" | "permission" | null;
  prompt: string | null;
}

export interface RalphLoopState {
  status: RalphLoopStatus;
  progress: RalphLoopProgress;
  agentActivity: AgentActivity;
  userAttention: UserAttentionNeeded;
  lastUpdated: Date;
  rawOutput: string | null;
}

// Patterns for detecting Ralph loop status from Claude Code output
const PATTERNS = {
  // Loop status patterns
  loopStarted: /(?:ralph[- ]?loop|loop)\s*(?:started|running|active)/i,
  loopPaused: /(?:ralph[- ]?loop|loop)\s*(?:paused|suspended)/i,
  loopCompleted: /(?:ralph[- ]?loop|loop)\s*(?:completed|finished|done)/i,
  loopErrored: /(?:ralph[- ]?loop|loop)\s*(?:error|failed|crashed)/i,
  loopWaiting:
    /(?:waiting\s*for\s*(?:user\s*)?input|needs?\s*input|awaiting\s*response)/i,

  // Progress patterns
  stepProgress: /(?:step|task)\s*(\d+)\s*(?:of|\/)\s*(\d+)/i,
  percentProgress: /(\d+(?:\.\d+)?)\s*%\s*(?:complete|done|progress)/i,
  todoProgress: /(?:todo|task)(?:s)?:\s*(\d+)\s*(?:of|\/)\s*(\d+)/i,
  completingTask: /(?:completing|working\s*on|processing)\s*[:=-]?\s*(.+)/i,

  // Agent activity patterns - enhanced for Claude Code tool detection
  toolUse: /(?:using|calling|invoking)\s*(?:tool\s*)?[:=-]?\s*(\w+)/i,
  toolName: /(?:tool|function)\s*[:=-]?\s*["']?(\w+)["']?/i,
  agentThinking: /(?:thinking|analyzing|processing|reading|writing|searching|examining|checking|reviewing|exploring)/i,
  agentAction:
    /(?:creating|updating|modifying|deleting|reading|writing|running|executing|editing|fixing|implementing|adding|removing)\s+(.+)/i,

  // Claude Code specific tool patterns
  claudeToolRead: /(?:Read|Reading)\s+(?:file|files|from)\s*[:=]?\s*(.+)/i,
  claudeToolWrite: /(?:Write|Writing)\s+(?:to\s+)?(?:file|files)\s*[:=]?\s*(.+)/i,
  claudeToolEdit: /(?:Edit|Editing)\s+(?:file|files)\s*[:=]?\s*(.+)/i,
  claudeToolBash: /(?:Bash|Running|Executing)\s*[:=]?\s*(.+)/i,
  claudeToolGrep: /(?:Grep|Searching|Search)\s+(?:for|in)\s*[:=]?\s*(.+)/i,
  claudeToolGlob: /(?:Glob|Finding|Looking\s+for)\s+(?:files?|patterns?)\s*[:=]?\s*(.+)/i,
  claudeToolTask: /(?:Task|Agent|Subagent)\s*[:=]?\s*(.+)/i,
  // Match "Using <ToolName>" pattern from Claude Code output
  usingTool: /\bUsing\s+(\w+)/i,
  // Match tool invocation markers in Claude Code output
  toolInvocation: /(?:invoke|call(?:ing)?|run(?:ning)?)\s+(\w+)\s+tool/i,

  // User attention patterns
  question: /\?\s*$/,
  questionPrompt: /(?:what|which|how|should|would|do\s*you|can\s*you)\s+.+\?/i,
  confirmation: /(?:confirm|proceed|continue|approve|accept)\s*\?/i,
  permissionRequest: /(?:permission|allow|authorize|grant|enable)/i,
  errorMessage: /(?:error|failed|exception|cannot|unable|invalid)[:\s]/i,
  userPrompt: /(?:enter|input|provide|specify|type)\s*[:=-]?\s*(.+)/i,
  waitingInput: /(?:>|>>|\$|input:)\s*$/,

  // ANSI escape sequence for cleaning
  // eslint-disable-next-line no-control-regex
  ansiEscape: /\x1b\[[0-9;]*[a-zA-Z]/g,
};

/**
 * Creates an initial/default Ralph loop state
 */
export function createInitialState(): RalphLoopState {
  return {
    status: "idle",
    progress: {
      currentStep: 0,
      totalSteps: null,
      percentage: null,
      description: null,
    },
    agentActivity: {
      isActive: false,
      currentAction: null,
      toolName: null,
      timestamp: new Date(),
    },
    userAttention: {
      needed: false,
      reason: null,
      type: null,
      prompt: null,
    },
    lastUpdated: new Date(),
    rawOutput: null,
  };
}

/**
 * Clean ANSI escape sequences from output
 */
function cleanOutput(output: string): string {
  return output.replace(PATTERNS.ansiEscape, "").trim();
}

/**
 * Parse loop status from output
 */
function parseLoopStatus(
  output: string,
  currentStatus: RalphLoopStatus
): RalphLoopStatus {
  const cleanedOutput = cleanOutput(output);

  if (PATTERNS.loopErrored.test(cleanedOutput)) {
    return "errored";
  }

  if (PATTERNS.loopCompleted.test(cleanedOutput)) {
    return "completed";
  }

  if (PATTERNS.loopPaused.test(cleanedOutput)) {
    return "paused";
  }

  if (
    PATTERNS.loopWaiting.test(cleanedOutput) ||
    PATTERNS.waitingInput.test(cleanedOutput)
  ) {
    return "waiting_for_input";
  }

  if (PATTERNS.loopStarted.test(cleanedOutput)) {
    return "running";
  }

  // If we detect agent activity, assume running
  if (
    PATTERNS.agentThinking.test(cleanedOutput) ||
    PATTERNS.toolUse.test(cleanedOutput) ||
    PATTERNS.agentAction.test(cleanedOutput)
  ) {
    return currentStatus === "idle" ? "running" : currentStatus;
  }

  return currentStatus;
}

/**
 * Parse progress information from output
 */
function parseProgress(
  output: string,
  currentProgress: RalphLoopProgress
): RalphLoopProgress {
  const cleanedOutput = cleanOutput(output);
  const progress = { ...currentProgress };

  // Check for step progress (e.g., "Step 2 of 5")
  const stepMatch = cleanedOutput.match(PATTERNS.stepProgress);
  if (stepMatch) {
    progress.currentStep = parseInt(stepMatch[1], 10);
    progress.totalSteps = parseInt(stepMatch[2], 10);
    progress.percentage = Math.round(
      (progress.currentStep / progress.totalSteps) * 100
    );
  }

  // Check for todo progress (e.g., "Todos: 3/10")
  const todoMatch = cleanedOutput.match(PATTERNS.todoProgress);
  if (todoMatch) {
    progress.currentStep = parseInt(todoMatch[1], 10);
    progress.totalSteps = parseInt(todoMatch[2], 10);
    progress.percentage = Math.round(
      (progress.currentStep / progress.totalSteps) * 100
    );
  }

  // Check for percentage progress
  const percentMatch = cleanedOutput.match(PATTERNS.percentProgress);
  if (percentMatch) {
    progress.percentage = parseFloat(percentMatch[1]);
  }

  // Check for task description
  const taskMatch = cleanedOutput.match(PATTERNS.completingTask);
  if (taskMatch) {
    progress.description = taskMatch[1].trim();
  }

  return progress;
}

/**
 * Parse agent activity from output
 */
function parseAgentActivity(
  output: string,
  currentActivity: AgentActivity
): AgentActivity {
  const cleanedOutput = cleanOutput(output);
  const activity = { ...currentActivity, timestamp: new Date() };

  // Check for Claude Code specific tool patterns first (most specific)
  const readMatch = cleanedOutput.match(PATTERNS.claudeToolRead);
  if (readMatch) {
    activity.isActive = true;
    activity.toolName = "Read";
    activity.currentAction = `Reading files...`;
    return activity;
  }

  const writeMatch = cleanedOutput.match(PATTERNS.claudeToolWrite);
  if (writeMatch) {
    activity.isActive = true;
    activity.toolName = "Write";
    activity.currentAction = `Writing code...`;
    return activity;
  }

  const editMatch = cleanedOutput.match(PATTERNS.claudeToolEdit);
  if (editMatch) {
    activity.isActive = true;
    activity.toolName = "Edit";
    activity.currentAction = `Editing files...`;
    return activity;
  }

  const bashMatch = cleanedOutput.match(PATTERNS.claudeToolBash);
  if (bashMatch) {
    activity.isActive = true;
    activity.toolName = "Bash";
    activity.currentAction = `Running command...`;
    return activity;
  }

  const grepMatch = cleanedOutput.match(PATTERNS.claudeToolGrep);
  if (grepMatch) {
    activity.isActive = true;
    activity.toolName = "Grep";
    activity.currentAction = `Searching codebase...`;
    return activity;
  }

  const globMatch = cleanedOutput.match(PATTERNS.claudeToolGlob);
  if (globMatch) {
    activity.isActive = true;
    activity.toolName = "Glob";
    activity.currentAction = `Finding files...`;
    return activity;
  }

  const taskMatch = cleanedOutput.match(PATTERNS.claudeToolTask);
  if (taskMatch) {
    activity.isActive = true;
    activity.toolName = "Task";
    activity.currentAction = `Running agent task...`;
    return activity;
  }

  // Check for "Using <ToolName>" pattern
  const usingToolMatch = cleanedOutput.match(PATTERNS.usingTool);
  if (usingToolMatch) {
    activity.isActive = true;
    activity.toolName = usingToolMatch[1];
    activity.currentAction = `Using ${usingToolMatch[1]}...`;
    return activity;
  }

  // Check for tool invocation pattern
  const invocationMatch = cleanedOutput.match(PATTERNS.toolInvocation);
  if (invocationMatch) {
    activity.isActive = true;
    activity.toolName = invocationMatch[1];
    activity.currentAction = `${invocationMatch[1]}...`;
    return activity;
  }

  // Check for general tool usage
  const toolUseMatch = cleanedOutput.match(PATTERNS.toolUse);
  if (toolUseMatch) {
    activity.isActive = true;
    activity.toolName = toolUseMatch[1];
    activity.currentAction = `Using ${toolUseMatch[1]}`;
    return activity;
  }

  // Check for explicit tool name
  const toolNameMatch = cleanedOutput.match(PATTERNS.toolName);
  if (toolNameMatch) {
    activity.isActive = true;
    activity.toolName = toolNameMatch[1];
  }

  // Check for agent action
  const actionMatch = cleanedOutput.match(PATTERNS.agentAction);
  if (actionMatch) {
    activity.isActive = true;
    activity.currentAction = actionMatch[0].trim();
    return activity;
  }

  // Check for thinking/processing
  if (PATTERNS.agentThinking.test(cleanedOutput)) {
    activity.isActive = true;
    // Extract the matching word
    const thinkingMatch = cleanedOutput.match(PATTERNS.agentThinking);
    if (thinkingMatch) {
      activity.currentAction =
        thinkingMatch[0].charAt(0).toUpperCase() +
        thinkingMatch[0].slice(1).toLowerCase() +
        "...";
    }
    return activity;
  }

  return activity;
}

/**
 * Parse user attention needs from output
 */
function parseUserAttention(
  output: string,
  currentAttention: UserAttentionNeeded
): UserAttentionNeeded {
  const cleanedOutput = cleanOutput(output);
  const attention = { ...currentAttention };

  // Check for error messages
  if (PATTERNS.errorMessage.test(cleanedOutput)) {
    attention.needed = true;
    attention.type = "error";
    attention.reason = "An error occurred";
    attention.prompt = cleanedOutput;
    return attention;
  }

  // Check for permission requests
  if (PATTERNS.permissionRequest.test(cleanedOutput)) {
    attention.needed = true;
    attention.type = "permission";
    attention.reason = "Permission required";
    attention.prompt = cleanedOutput;
    return attention;
  }

  // Check for confirmation prompts
  if (PATTERNS.confirmation.test(cleanedOutput)) {
    attention.needed = true;
    attention.type = "confirmation";
    attention.reason = "Confirmation needed";
    attention.prompt = cleanedOutput;
    return attention;
  }

  // Check for question prompts
  if (
    PATTERNS.questionPrompt.test(cleanedOutput) ||
    PATTERNS.question.test(cleanedOutput)
  ) {
    attention.needed = true;
    attention.type = "question";
    attention.reason = "Question for user";
    attention.prompt = cleanedOutput;
    return attention;
  }

  // Check for explicit user prompts
  const userPromptMatch = cleanedOutput.match(PATTERNS.userPrompt);
  if (userPromptMatch) {
    attention.needed = true;
    attention.type = "question";
    attention.reason = "Input required";
    attention.prompt = userPromptMatch[1] || cleanedOutput;
    return attention;
  }

  // Check for waiting input indicator
  if (PATTERNS.waitingInput.test(cleanedOutput)) {
    attention.needed = true;
    attention.type = "question";
    attention.reason = "Waiting for input";
    attention.prompt = null;
    return attention;
  }

  // Reset attention if no patterns match and output seems like normal processing
  if (
    PATTERNS.agentThinking.test(cleanedOutput) ||
    PATTERNS.agentAction.test(cleanedOutput)
  ) {
    return {
      needed: false,
      reason: null,
      type: null,
      prompt: null,
    };
  }

  return attention;
}

/**
 * Main parser function - parses a single output chunk and updates state
 */
export function parseOutput(
  output: string,
  currentState: RalphLoopState
): RalphLoopState {
  const cleanedOutput = cleanOutput(output);

  if (!cleanedOutput) {
    return currentState;
  }

  return {
    status: parseLoopStatus(cleanedOutput, currentState.status),
    progress: parseProgress(cleanedOutput, currentState.progress),
    agentActivity: parseAgentActivity(
      cleanedOutput,
      currentState.agentActivity
    ),
    userAttention: parseUserAttention(
      cleanedOutput,
      currentState.userAttention
    ),
    lastUpdated: new Date(),
    rawOutput: output,
  };
}

/**
 * Parse multiple output lines and return accumulated state
 */
export function parseOutputLines(
  outputs: string[],
  initialState?: RalphLoopState
): RalphLoopState {
  let state = initialState ?? createInitialState();

  for (const output of outputs) {
    state = parseOutput(output, state);
  }

  return state;
}

/**
 * Check if the loop needs user attention
 */
export function needsUserAttention(state: RalphLoopState): boolean {
  return (
    state.userAttention.needed ||
    state.status === "waiting_for_input" ||
    state.status === "errored"
  );
}

/**
 * Get a human-readable status message
 */
export function getStatusMessage(state: RalphLoopState): string {
  switch (state.status) {
    case "idle":
      return "Ready to start";
    case "running":
      if (state.agentActivity.currentAction) {
        return state.agentActivity.currentAction;
      }
      if (state.progress.description) {
        return state.progress.description;
      }
      return "Running...";
    case "paused":
      return "Paused";
    case "completed":
      return "Completed";
    case "errored":
      return state.userAttention.prompt ?? "Error occurred";
    case "waiting_for_input":
      return state.userAttention.reason ?? "Waiting for input";
    default:
      return "Unknown status";
  }
}

/**
 * Get progress as a formatted string
 */
export function getProgressString(state: RalphLoopState): string | null {
  const { progress } = state;

  if (progress.totalSteps !== null) {
    return `${progress.currentStep}/${progress.totalSteps}`;
  }

  if (progress.percentage !== null) {
    return `${progress.percentage}%`;
  }

  return null;
}
