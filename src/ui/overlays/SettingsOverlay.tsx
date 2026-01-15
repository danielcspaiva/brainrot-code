/**
 * Settings overlay.
 */

import { useKeyboard } from "@opentui/react";
import { useCallback, useMemo, useState } from "react";
import { useThemeColors } from "../../theme/ThemeProvider.js";
import { getThemeIds, type ThemeId } from "../../theme/themes.js";
import { getLayoutPresetIds, type LayoutPresetId } from "../layouts.js";
import Overlay from "./Overlay.js";

export interface SettingsOverlayProps {
  isVisible: boolean;
  hasFocus: boolean;
  themeId: ThemeId;
  layoutId: LayoutPresetId;
  autoPauseOnInput: boolean;
  onClose: () => void;
  onChangeTheme: (themeId: ThemeId) => void;
  onChangeLayout: (layoutId: LayoutPresetId) => void;
  onToggleAutoPause: () => void;
}

interface SettingRow {
  id: "theme" | "layout" | "autoPause";
  label: string;
}

const SETTINGS: SettingRow[] = [
  { id: "theme", label: "Theme" },
  { id: "layout", label: "Layout" },
  { id: "autoPause", label: "Auto-pause" },
];

export default function SettingsOverlay({
  isVisible,
  hasFocus,
  themeId,
  layoutId,
  autoPauseOnInput,
  onClose,
  onChangeTheme,
  onChangeLayout,
  onToggleAutoPause,
}: SettingsOverlayProps) {
  const colors = useThemeColors();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const themeIds = useMemo(() => getThemeIds(), []);
  const layoutIds = useMemo(() => getLayoutPresetIds(), []);

  const changeTheme = (direction: 1 | -1) => {
    const index = themeIds.indexOf(themeId);
    const nextIndex = (index + direction + themeIds.length) % themeIds.length;
    onChangeTheme(themeIds[nextIndex]);
  };

  const changeLayout = (direction: 1 | -1) => {
    const index = layoutIds.indexOf(layoutId);
    const nextIndex = (index + direction + layoutIds.length) % layoutIds.length;
    onChangeLayout(layoutIds[nextIndex]);
  };

  useKeyboard(
    useCallback(
      (key) => {
        if (!hasFocus) return;
        if (key.name === "escape" || key.name === "q") {
          onClose();
          return;
        }
        if (key.name === "up") {
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : SETTINGS.length - 1));
        }
        if (key.name === "down") {
          setSelectedIndex((prev) => (prev < SETTINGS.length - 1 ? prev + 1 : 0));
        }
        if (key.name === "left") {
          if (SETTINGS[selectedIndex].id === "theme") changeTheme(-1);
          if (SETTINGS[selectedIndex].id === "layout") changeLayout(-1);
          if (SETTINGS[selectedIndex].id === "autoPause") onToggleAutoPause();
        }
        if (key.name === "right") {
          if (SETTINGS[selectedIndex].id === "theme") changeTheme(1);
          if (SETTINGS[selectedIndex].id === "layout") changeLayout(1);
          if (SETTINGS[selectedIndex].id === "autoPause") onToggleAutoPause();
        }
      },
      [
        hasFocus,
        selectedIndex,
        themeId,
        layoutId,
        autoPauseOnInput,
        onClose,
        onChangeTheme,
        onChangeLayout,
        onToggleAutoPause,
      ]
    )
  );

  return (
    <Overlay isVisible={isVisible} title="Settings" width={60} height={16}>
      <box style={{ flexDirection: "column", gap: 1 }}>
        {SETTINGS.map((setting, index) => {
          const isSelected = index === selectedIndex;
          let value = "";
          if (setting.id === "theme") value = themeId;
          if (setting.id === "layout") value = layoutId;
          if (setting.id === "autoPause") value = autoPauseOnInput ? "On" : "Off";

          return (
            <box key={setting.id} style={{ flexDirection: "row", gap: 1 }}>
              <text fg={isSelected ? colors.primary : colors.textMuted}>
                {isSelected ? ">" : " "}
              </text>
              <text fg={isSelected ? colors.text : colors.textMuted} bold={isSelected}>
                {setting.label}
              </text>
              <box style={{ flexGrow: 1 }} />
              <text fg={colors.textMuted}>{value}</text>
            </box>
          );
        })}

        <box style={{ marginTop: 1 }}>
          <text fg={colors.textMuted}>Left/Right: Change | Esc: Close</text>
        </box>
      </box>
    </Overlay>
  );
}
