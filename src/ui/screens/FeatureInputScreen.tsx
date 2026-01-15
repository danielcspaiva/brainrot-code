/**
 * Feature input screen.
 */

import { useState } from "react";
import { useThemeColors } from "../../theme/ThemeProvider.js";

export interface FeatureInputScreenProps {
  onSubmit: (value: string) => void;
  hasFocus: boolean;
  minChars?: number;
}

const EXAMPLES = [
  "Add dark mode support",
  "Fix login bug on mobile",
  "Create a REST API for user management",
];

export default function FeatureInputScreen({
  onSubmit,
  hasFocus,
  minChars = 10,
}: FeatureInputScreenProps) {
  const colors = useThemeColors();
  const [value, setValue] = useState("");
  const [showError, setShowError] = useState(false);

  const isValid = value.trim().length >= minChars;

  return (
    <box
      style={{
        width: "100%",
        height: "100%",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 2,
      }}
    >
      <box style={{ marginBottom: 1 }}>
        <text fg={colors.primary} bold>
          BRAINROT
        </text>
      </box>

      <box
        style={{
          width: 60,
          border: true,
          borderStyle: "single",
          borderColor: colors.border,
          padding: 1,
          flexDirection: "column",
        }}
      >
        <text fg={colors.text}>What do you want to build?</text>
        <box style={{ marginTop: 1 }}>
          <input
            focused={hasFocus}
            value={value}
            placeholder="Describe your feature..."
            onChange={(next) => {
              setValue(next);
              setShowError(false);
            }}
            onSubmit={() => {
              if (isValid) {
                onSubmit(value.trim());
              } else {
                setShowError(true);
              }
            }}
            style={{
              width: "100%",
              border: true,
              borderStyle: "single",
              borderColor: hasFocus ? colors.borderFocus : colors.border,
              paddingLeft: 1,
            }}
          />
        </box>
        {showError && !isValid && (
          <box style={{ marginTop: 1 }}>
            <text fg={colors.error}>
              Minimum {minChars} characters required
            </text>
          </box>
        )}
      </box>

      <box style={{ marginTop: 2, flexDirection: "column" }}>
        <text fg={colors.textMuted}>Examples:</text>
        {EXAMPLES.map((example) => (
          <text key={example} fg={colors.textMuted}>
            - {example}
          </text>
        ))}
      </box>

      <box style={{ marginTop: 2 }}>
        <text fg={colors.textMuted}>Enter: Plan | ?: Help | Ctrl+C: Quit</text>
      </box>
    </box>
  );
}
