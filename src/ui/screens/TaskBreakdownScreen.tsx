/**
 * Task breakdown screen.
 */

import { useKeyboard } from "@opentui/react";
import { useCallback, useMemo } from "react";
import { useThemeColors } from "../../theme/ThemeProvider.js";
import type { PlanDocument } from "../../app/state.js";

export interface TaskBreakdownScreenProps {
  plan: PlanDocument;
  hasFocus: boolean;
  onConfirm: () => void;
  onBack: () => void;
}

export default function TaskBreakdownScreen({
  plan,
  hasFocus,
  onConfirm,
  onBack,
}: TaskBreakdownScreenProps) {
  const colors = useThemeColors();

  const stats = useMemo(() => {
    const totals = { small: 0, medium: 0, large: 0 };
    for (const task of plan.tasks) {
      if (task.complexity === "small") totals.small += 1;
      if (task.complexity === "medium") totals.medium += 1;
      if (task.complexity === "large") totals.large += 1;
    }
    return totals;
  }, [plan.tasks]);

  useKeyboard(
    useCallback(
      (key) => {
        if (!hasFocus) return;
        if (key.name === "return" || key.name === "enter") {
          onConfirm();
        }
        if (key.name === "escape") {
          onBack();
        }
      },
      [hasFocus, onConfirm, onBack]
    )
  );

  return (
    <box
      style={{
        width: "100%",
        height: "100%",
        flexDirection: "column",
        padding: 2,
        gap: 1,
      }}
    >
      <text fg={colors.primary} bold>
        Task Breakdown
      </text>

      <box style={{ flexDirection: "row", gap: 2 }}>
        <text fg={colors.textMuted}>Small: {stats.small}</text>
        <text fg={colors.textMuted}>Medium: {stats.medium}</text>
        <text fg={colors.textMuted}>Large: {stats.large}</text>
      </box>

      <box
        style={{
          border: true,
          borderStyle: "single",
          borderColor: colors.border,
          flexGrow: 1,
          padding: 1,
        }}
      >
        <scrollbox stickyScroll={false}>
          {plan.tasks.length === 0 ? (
            <text fg={colors.textMuted}>
              No tasks generated. Press Esc to revise the feature.
            </text>
          ) : (
            plan.tasks.map((task, index) => (
              <box key={task.id} style={{ flexDirection: "column" }}>
                <text fg={colors.text} bold>
                  {index + 1}. {task.title}
                </text>
                {task.description ? (
                  <text fg={colors.textMuted}>{task.description}</text>
                ) : null}
                {task.complexity ? (
                  <text fg={colors.textMuted}>
                    Complexity: {task.complexity}
                  </text>
                ) : null}
                {task.dependsOn && task.dependsOn.length > 0 ? (
                  <text fg={colors.textMuted}>
                    Depends on: {task.dependsOn.join(", ")}
                  </text>
                ) : null}
                <box style={{ marginBottom: 1 }} />
              </box>
            ))
          )}
        </scrollbox>
      </box>

      <box style={{ flexDirection: "row", gap: 2 }}>
        <text fg={colors.textMuted}>Enter: Continue</text>
        <text fg={colors.textMuted}>Esc: Back</text>
      </box>
    </box>
  );
}
