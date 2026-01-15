/**
 * Plan review screen.
 */

import { useKeyboard } from "@opentui/react";
import { useCallback } from "react";
import { useThemeColors } from "../../theme/ThemeProvider.js";
import type { PlanDocument } from "../../app/state.js";

export interface PlanReviewScreenProps {
  plan: PlanDocument;
  hasFocus: boolean;
  onConfirm: () => void;
  onBack: () => void;
}

export default function PlanReviewScreen({
  plan,
  hasFocus,
  onConfirm,
  onBack,
}: PlanReviewScreenProps) {
  const colors = useThemeColors();

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
        Review Plan
      </text>

      <box
        style={{
          border: true,
          borderStyle: "single",
          borderColor: colors.border,
          padding: 1,
        }}
      >
        <text fg={colors.text} bold>
          {plan.name}
        </text>
        <text fg={colors.textMuted}>{plan.description}</text>
      </box>

      <box
        style={{
          border: true,
          borderStyle: "single",
          borderColor: colors.border,
          padding: 1,
          flexGrow: 1,
        }}
      >
        <text fg={colors.textMuted}>Tasks ({plan.tasks.length})</text>
        {plan.tasks.length === 0 ? (
          <text fg={colors.textMuted}>
            No tasks generated. Press Esc to revise the feature.
          </text>
        ) : (
          plan.tasks.map((task, index) => (
            <text key={task.id} fg={colors.text}>
              {index + 1}. {task.title}
              {task.complexity ? ` [${task.complexity}]` : ""}
            </text>
          ))
        )}
      </box>

      <box style={{ flexDirection: "row", gap: 2 }}>
        <text fg={colors.textMuted}>Enter: Continue</text>
        <text fg={colors.textMuted}>Esc: Back</text>
      </box>
    </box>
  );
}
