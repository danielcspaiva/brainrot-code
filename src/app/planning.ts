/**
 * Planning helpers.
 */

import type { PlanDocument, PlanTask } from "./state.js";

export function buildPlanningPrompt(feature: string): string {
  return `You are generating a plan for this feature:\n\n${feature}\n\nReturn ONLY raw JSON with this exact structure:\n{\n  \"name\": \"Short name\",\n  \"description\": \"Summary\",\n  \"tasks\": [\n    {\n      \"id\": \"task-1\",\n      \"title\": \"Task title\",\n      \"description\": \"What to do\",\n      \"complexity\": \"small|medium|large\",\n      \"dependsOn\": []\n    }\n  ]\n}\n\nRules:\n- Keep tasks ordered by dependencies\n- Keep tasks atomic and specific\n- Use complexity small/medium/large\n- No markdown or code blocks in the response`; 
}

export function parsePlanFromOutput(output: string): PlanDocument | null {
  const codeBlockMatch = output.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    const parsed = safeParse(codeBlockMatch[1]);
    if (parsed) return parsed;
  }

  const jsonMatch = output.match(/\{[\s\S]*\"tasks\"\s*:\s*\[[\s\S]*\][\s\S]*\}/);
  if (jsonMatch) {
    const parsed = safeParse(jsonMatch[0]);
    if (parsed) return parsed;
  }

  return null;
}

function safeParse(json: string): PlanDocument | null {
  try {
    const parsed = JSON.parse(json) as PlanDocument;
    if (!parsed.name || !parsed.tasks || !Array.isArray(parsed.tasks)) {
      return null;
    }

    const tasks: PlanTask[] = parsed.tasks.map((task, index) => ({
      id: task.id ?? `task-${index + 1}`,
      title: task.title ?? `Task ${index + 1}`,
      description: task.description ?? "",
      complexity: task.complexity,
      dependsOn: task.dependsOn ?? [],
    }));

    return {
      name: parsed.name,
      description: parsed.description ?? "",
      tasks,
    };
  } catch {
    return null;
  }
}
