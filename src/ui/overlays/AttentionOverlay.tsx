/**
 * Attention overlay for Claude input.
 */

import { useKeyboard } from "@opentui/react";
import { useCallback, useEffect, useState } from "react";
import { useThemeColors } from "../../theme/ThemeProvider.js";
import Overlay from "./Overlay.js";

export interface AttentionOverlayProps {
  isVisible: boolean;
  prompt: string;
  hasFocus: boolean;
  onSubmit: (value: string) => void;
  onSkip: () => void;
}

export default function AttentionOverlay({
  isVisible,
  prompt,
  hasFocus,
  onSubmit,
  onSkip,
}: AttentionOverlayProps) {
  const colors = useThemeColors();
  const [value, setValue] = useState("");

  useEffect(() => {
    if (isVisible) {
      setValue("");
    }
  }, [isVisible, prompt]);

  useKeyboard(
    useCallback(
      (key) => {
        if (!hasFocus) return;
        if (key.name === "escape") {
          onSkip();
        }
      },
      [hasFocus, onSkip]
    )
  );

  if (!isVisible) return null;

  return (
    <Overlay isVisible={isVisible} title="Claude Needs Input" width={70} height={10}>
      <box style={{ flexDirection: "column", gap: 1 }}>
        <text fg={colors.text}>{prompt}</text>
        <input
          focused={hasFocus}
          value={value}
          placeholder="Type your response..."
          onChange={setValue}
          onSubmit={() => {
            if (value.trim().length > 0) {
              onSubmit(value.trim());
              setValue("");
            }
          }}
          style={{
            border: true,
            borderStyle: "single",
            borderColor: hasFocus ? colors.borderFocus : colors.border,
            paddingLeft: 1,
          }}
        />
        <box style={{ flexDirection: "row", gap: 2 }}>
          <text fg={colors.textMuted}>Enter: Send</text>
          <text fg={colors.textMuted}>Esc: Skip</text>
        </box>
      </box>
    </Overlay>
  );
}
