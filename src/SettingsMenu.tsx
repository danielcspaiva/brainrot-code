/**
 * SettingsMenu Component
 *
 * In-app settings menu for adjusting theme, layout, and game preferences.
 * Changes can be previewed immediately and saved to the config file.
 */

import { Box, Text, useInput } from "ink";
import { useState, useCallback, useMemo } from "react";
import { navIcons } from "./theme.js";
import { useThemeColors } from "./useTheme.js";
import {
  type BrainrotConfig,
  type ThemePreferences,
  type LayoutPreferences,
  type GamePreferences,
  DEFAULT_CONFIG,
} from "./config.js";

// ============================================================================
// TYPES
// ============================================================================

type SettingsTab = "theme" | "layout" | "games";

interface SettingOption<T = string | number | boolean> {
  label: string;
  key: string;
  value: T;
  options?: { label: string; value: T }[];
  min?: number;
  max?: number;
  step?: number;
  type: "select" | "toggle" | "number";
}

export interface SettingsMenuProps {
  /** Current configuration */
  config: BrainrotConfig;
  /** Whether the settings menu has focus */
  hasFocus: boolean;
  /** Callback to update config (immediate preview) */
  onConfigChange: (updates: Partial<BrainrotConfig>) => void;
  /** Callback to save config to disk */
  onSave: () => Promise<void>;
  /** Callback to close settings */
  onClose: () => void;
}

// ============================================================================
// SETTING DEFINITIONS
// ============================================================================

function getThemeSettings(theme: ThemePreferences): SettingOption[] {
  return [
    {
      label: "Color Scheme",
      key: "colorScheme",
      value: theme.colorScheme ?? "default",
      options: [
        { label: "Default (Cyan/Magenta)", value: "default" },
        { label: "Dark (Blue/Purple)", value: "dark" },
        { label: "Light (High Contrast)", value: "light" },
        { label: "Retro (Green Terminal)", value: "retro" },
      ],
      type: "select",
    },
    {
      label: "Border Style",
      key: "borderStyle",
      value: theme.borderStyle ?? "round",
      options: [
        { label: "Single", value: "single" },
        { label: "Round", value: "round" },
        { label: "Double", value: "double" },
        { label: "Heavy", value: "heavy" },
      ],
      type: "select",
    },
    {
      label: "Spinner Style",
      key: "spinnerStyle",
      value: theme.spinnerStyle ?? "spinner",
      options: [
        { label: "Spinner", value: "spinner" },
        { label: "Dots", value: "dots" },
        { label: "Braille", value: "braille" },
      ],
      type: "select",
    },
    {
      label: "Enable Animations",
      key: "enableAnimations",
      value: theme.enableAnimations ?? true,
      type: "toggle",
    },
  ];
}

function getLayoutSettings(layout: LayoutPreferences): SettingOption[] {
  return [
    {
      label: "Split Direction",
      key: "direction",
      value: layout.direction ?? "horizontal",
      options: [
        { label: "Horizontal (Side by Side)", value: "horizontal" },
        { label: "Vertical (Stacked)", value: "vertical" },
      ],
      type: "select",
    },
    {
      label: "Split Ratio",
      key: "splitRatio",
      value: layout.splitRatio ?? 0.5,
      min: 0.25,
      max: 0.75,
      step: 0.05,
      type: "number",
    },
    {
      label: "Show Secondary Pane",
      key: "showSecondary",
      value: layout.showSecondary ?? true,
      type: "toggle",
    },
    {
      label: "Default Focused Pane",
      key: "defaultFocusedPane",
      value: layout.defaultFocusedPane ?? 0,
      options: [
        { label: "Game Pane", value: 0 },
        { label: "Management Pane", value: 1 },
      ],
      type: "select",
    },
  ];
}

function getGameSettings(games: GamePreferences): SettingOption[] {
  return [
    {
      label: "Default Difficulty",
      key: "defaultDifficulty",
      value: games.defaultDifficulty ?? "medium",
      options: [
        { label: "Easy", value: "easy" },
        { label: "Medium", value: "medium" },
        { label: "Hard", value: "hard" },
      ],
      type: "select",
    },
    {
      label: "Snake Initial Speed",
      key: "snake.initialSpeed",
      value: games.snake?.initialSpeed ?? 5,
      min: 1,
      max: 10,
      step: 1,
      type: "number",
    },
    {
      label: "Tetris Starting Level",
      key: "tetris.startingLevel",
      value: games.tetris?.startingLevel ?? 1,
      min: 1,
      max: 10,
      step: 1,
      type: "number",
    },
    {
      label: "Tetris Show Ghost Piece",
      key: "tetris.showGhostPiece",
      value: games.tetris?.showGhostPiece ?? true,
      type: "toggle",
    },
    {
      label: "Minesweeper Default Difficulty",
      key: "minesweeper.defaultDifficulty",
      value: games.minesweeper?.defaultDifficulty ?? "easy",
      options: [
        { label: "Easy (9x9, 10 mines)", value: "easy" },
        { label: "Medium (16x16, 40 mines)", value: "medium" },
        { label: "Hard (16x30, 99 mines)", value: "hard" },
      ],
      type: "select",
    },
    {
      label: "Minesweeper Show Timer",
      key: "minesweeper.showTimer",
      value: games.minesweeper?.showTimer ?? true,
      type: "toggle",
    },
    {
      label: "Pong AI Difficulty",
      key: "pong.aiDifficulty",
      value: games.pong?.aiDifficulty ?? 5,
      min: 1,
      max: 10,
      step: 1,
      type: "number",
    },
    {
      label: "Pong Ball Speed",
      key: "pong.ballSpeedMultiplier",
      value: games.pong?.ballSpeedMultiplier ?? 1.0,
      min: 0.5,
      max: 2.0,
      step: 0.1,
      type: "number",
    },
  ];
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface TabHeaderProps {
  tabs: { id: SettingsTab; label: string }[];
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
}

function TabHeader({ tabs, activeTab }: TabHeaderProps) {
  const colors = useThemeColors();
  return (
    <Box marginBottom={1}>
      {tabs.map((tab, index) => (
        <Box key={tab.id}>
          {index > 0 && <Text dimColor> | </Text>}
          <Text
            bold={activeTab === tab.id}
            color={activeTab === tab.id ? colors.primary : colors.textMuted}
          >
            {activeTab === tab.id ? `[${tab.label}]` : tab.label}
          </Text>
        </Box>
      ))}
    </Box>
  );
}

interface SettingRowProps {
  setting: SettingOption;
  isSelected: boolean;
  isEditing: boolean;
}

function SettingRow({ setting, isSelected, isEditing }: SettingRowProps) {
  const colors = useThemeColors();
  const borderColor = isSelected ? colors.primary : colors.border;
  const labelColor = isSelected ? colors.primary : colors.text;

  // Format the displayed value
  let displayValue: string;
  if (setting.type === "toggle") {
    displayValue = setting.value ? "ON" : "OFF";
  } else if (setting.type === "number" && typeof setting.value === "number") {
    displayValue = setting.value.toFixed(setting.step && setting.step < 1 ? 1 : 0);
  } else if (setting.options) {
    const opt = setting.options.find((o) => o.value === setting.value);
    displayValue = opt?.label ?? String(setting.value);
  } else {
    displayValue = String(setting.value);
  }

  return (
    <Box>
      <Text color={labelColor}>
        {isSelected ? `${navIcons.arrowRight} ` : "  "}
        {setting.label}:
      </Text>
      <Text> </Text>
      <Box borderStyle={isEditing ? "round" : undefined} borderColor={borderColor}>
        <Text bold color={isSelected ? colors.accent : colors.textMuted}>
          {isEditing ? `< ${displayValue} >` : displayValue}
        </Text>
      </Box>
    </Box>
  );
}

interface SettingsFooterProps {
  hasChanges: boolean;
  isSaving: boolean;
}

function SettingsFooter({ hasChanges, isSaving }: SettingsFooterProps) {
  const colors = useThemeColors();
  return (
    <Box flexDirection="column" marginTop={1} paddingTop={1} borderStyle="single" borderTop borderBottom={false} borderLeft={false} borderRight={false} borderColor={colors.border}>
      <Box>
        <Text dimColor>
          <Text color={colors.primary}>Tab</Text>: Switch sections |{" "}
          <Text color={colors.primary}>↑↓</Text>: Navigate |{" "}
          <Text color={colors.primary}>←→/Enter</Text>: Change value
        </Text>
      </Box>
      <Box>
        <Text dimColor>
          <Text color={colors.primary}>Ctrl+S</Text>: Save to file |{" "}
          <Text color={colors.primary}>Esc/Q</Text>: Close
        </Text>
        {hasChanges && (
          <Text color={colors.warning}> | Unsaved changes</Text>
        )}
        {isSaving && (
          <Text color={colors.success}> | Saving...</Text>
        )}
      </Box>
    </Box>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SettingsMenu({
  config,
  hasFocus,
  onConfigChange,
  onSave,
  onClose,
}: SettingsMenuProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("theme");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const colors = useThemeColors();

  const tabs = useMemo<{ id: SettingsTab; label: string }[]>(
    () => [
      { id: "theme", label: "Theme" },
      { id: "layout", label: "Layout" },
      { id: "games", label: "Games" },
    ],
    []
  );

  // Get current settings for active tab
  const currentSettings = useMemo(() => {
    switch (activeTab) {
      case "theme":
        return getThemeSettings(config.theme ?? DEFAULT_CONFIG.theme!);
      case "layout":
        return getLayoutSettings(config.layout ?? DEFAULT_CONFIG.layout!);
      case "games":
        return getGameSettings(config.games ?? DEFAULT_CONFIG.games!);
    }
  }, [activeTab, config]);

  // Handle setting value change
  const handleValueChange = useCallback(
    (setting: SettingOption, direction: "next" | "prev") => {
      let newValue: string | number | boolean;

      if (setting.type === "toggle") {
        newValue = !setting.value;
      } else if (setting.type === "number" && typeof setting.value === "number") {
        const step = setting.step ?? 1;
        if (direction === "next") {
          newValue = Math.min(setting.value + step, setting.max ?? 100);
        } else {
          newValue = Math.max(setting.value - step, setting.min ?? 0);
        }
        // Round to avoid floating point issues
        newValue = Math.round(newValue * 100) / 100;
      } else if (setting.options) {
        const currentIdx = setting.options.findIndex((o) => o.value === setting.value);
        if (direction === "next") {
          const nextIdx = (currentIdx + 1) % setting.options.length;
          newValue = setting.options[nextIdx].value;
        } else {
          const prevIdx = currentIdx <= 0 ? setting.options.length - 1 : currentIdx - 1;
          newValue = setting.options[prevIdx].value;
        }
      } else {
        return;
      }

      // Build the config update based on the key
      const keyParts = setting.key.split(".");
      let updates: Partial<BrainrotConfig>;

      if (activeTab === "theme") {
        updates = { theme: { [keyParts[0]]: newValue } as Partial<ThemePreferences> };
      } else if (activeTab === "layout") {
        updates = { layout: { [keyParts[0]]: newValue } as Partial<LayoutPreferences> };
      } else {
        // Games have nested keys like "snake.initialSpeed"
        if (keyParts.length === 2) {
          updates = {
            games: {
              [keyParts[0]]: { [keyParts[1]]: newValue },
            } as Partial<GamePreferences>,
          };
        } else {
          updates = { games: { [keyParts[0]]: newValue } as Partial<GamePreferences> };
        }
      }

      onConfigChange(updates);
      setHasChanges(true);
    },
    [activeTab, onConfigChange]
  );

  // Handle save
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await onSave();
      setHasChanges(false);
    } finally {
      setIsSaving(false);
    }
  }, [onSave]);

  // Handle tab change
  const handleTabChange = useCallback((direction: "next" | "prev") => {
    const currentIdx = tabs.findIndex((t) => t.id === activeTab);
    let newIdx: number;
    if (direction === "next") {
      newIdx = (currentIdx + 1) % tabs.length;
    } else {
      newIdx = currentIdx <= 0 ? tabs.length - 1 : currentIdx - 1;
    }
    setActiveTab(tabs[newIdx].id);
    setSelectedIndex(0);
    setIsEditing(false);
  }, [activeTab, tabs]);

  // Keyboard input handling
  useInput(
    (input, key) => {
      if (!hasFocus) return;

      // Close settings
      if (key.escape || input === "q" || input === "Q") {
        onClose();
        return;
      }

      // Save settings
      if (key.ctrl && input === "s") {
        void handleSave();
        return;
      }

      // Switch tabs
      if (key.tab) {
        handleTabChange(key.shift ? "prev" : "next");
        return;
      }

      // Navigate up
      if (key.upArrow || input === "k") {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : currentSettings.length - 1));
        setIsEditing(false);
        return;
      }

      // Navigate down
      if (key.downArrow || input === "j") {
        setSelectedIndex((prev) => (prev < currentSettings.length - 1 ? prev + 1 : 0));
        setIsEditing(false);
        return;
      }

      // Change value (left/right or enter for toggle)
      const setting = currentSettings[selectedIndex];
      if (setting) {
        if (key.leftArrow || input === "h") {
          handleValueChange(setting, "prev");
          setIsEditing(true);
          return;
        }

        if (key.rightArrow || input === "l") {
          handleValueChange(setting, "next");
          setIsEditing(true);
          return;
        }

        if (key.return && setting.type === "toggle") {
          handleValueChange(setting, "next");
          return;
        }
      }
    },
    { isActive: hasFocus }
  );

  // Keep selected index in bounds
  if (selectedIndex >= currentSettings.length && currentSettings.length > 0) {
    setSelectedIndex(currentSettings.length - 1);
  }

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color={colors.primary}>
          {navIcons.arrowRight} Settings
        </Text>
      </Box>

      {/* Tab navigation */}
      <TabHeader tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Settings list */}
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={colors.border}
        paddingX={1}
        paddingY={1}
      >
        {currentSettings.map((setting, index) => (
          <SettingRow
            key={setting.key}
            setting={setting}
            isSelected={index === selectedIndex}
            isEditing={isEditing && index === selectedIndex}
          />
        ))}
      </Box>

      {/* Footer with controls */}
      <SettingsFooter hasChanges={hasChanges} isSaving={isSaving} />
    </Box>
  );
}

export default SettingsMenu;
