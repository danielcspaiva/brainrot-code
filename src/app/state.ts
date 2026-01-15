/**
 * App state types.
 */

export type AppState =
  | "feature_input"
  | "planning"
  | "plan_review"
  | "task_breakdown"
  | "loop_running"
  | "loop_complete"
  | "error";

export type TaskComplexity = "small" | "medium" | "large";

export interface PlanTask {
  id: string;
  title: string;
  description?: string;
  complexity?: TaskComplexity;
  dependsOn?: string[];
}

export interface PlanDocument {
  name: string;
  description: string;
  tasks: PlanTask[];
}
