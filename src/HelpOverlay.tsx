/**
 * HelpOverlay Component
 *
 * Modal overlay that displays comprehensive keyboard shortcuts organized by context.
 * Triggered by ? or F1 key globally.
 */

import { Box, Text, useInput } from "ink";
import { useState, useMemo } from "react";
import { navIcons } from "./theme.js";
import { useThemeColors } from "./useTheme.js";

// ============================================================================
// TYPES
// ============================================================================

type HelpSection = "global" | "layout" | "games" | "menus" | "navigation";

interface ShortcutEntry {
  key: string;
  description: string;
}

interface ShortcutSection {
  id: HelpSection;
  title: string;
  shortcuts: ShortcutEntry[];
}

export interface HelpOverlayProps {
  /** Whether the overlay has focus */
  hasFocus: boolean;
  /** Callback to close the overlay */
  onClose: () => void;
}

// ============================================================================
// SHORTCUT DEFINITIONS
// ============================================================================

const shortcutSections: ShortcutSection[] = [
  {
    id: "global",
    title: "Global Shortcuts",
    shortcuts: [
      { key: "Ctrl+C", description: "Exit application" },
      { key: "Ctrl+S", description: "Start/Stop Claude Code loop" },
      { key: "Tab", description: "Switch focus between panes" },
      { key: "?", description: "Toggle this help overlay" },
      { key: "Ctrl+,", description: "Open settings (from menu)" },
      { key: "Escape", description: "Close overlay/modal/exit game" },
    ],
  },
  {
    id: "layout",
    title: "Layout Controls",
    shortcuts: [
      { key: "Alt+←/→", description: "Resize panes horizontally" },
      { key: "Alt+↑/↓", description: "Resize panes vertically" },
      { key: "D", description: "Toggle split direction" },
      { key: "H", description: "Hide/Show secondary pane" },
      { key: "R", description: "Reset layout to defaults" },
    ],
  },
  {
    id: "navigation",
    title: "Menu Navigation",
    shortcuts: [
      { key: "↑/↓ or K/J", description: "Navigate up/down" },
      { key: "Enter/Space", description: "Select item" },
      { key: "1-9", description: "Quick select game" },
      { key: "L", description: "View logs" },
      { key: "S", description: "Open stats/achievements" },
      { key: "Q", description: "Back to menu" },
    ],
  },
  {
    id: "games",
    title: "In-Game Controls",
    shortcuts: [
      { key: "↑↓←→ or WASD", description: "Movement (game-specific)" },
      { key: "P", description: "Pause/Resume game" },
      { key: "R", description: "Restart game" },
      { key: "H", description: "Toggle leaderboard (game over)" },
      { key: "Q/Escape", description: "Exit to menu" },
      { key: "Enter", description: "Dismiss loop alert" },
    ],
  },
  {
    id: "menus",
    title: "Settings/Menus",
    shortcuts: [
      { key: "Tab/Shift+Tab", description: "Switch tabs" },
      { key: "↑↓ or K/J", description: "Navigate options" },
      { key: "←→ or H/L", description: "Change value" },
      { key: "Enter", description: "Toggle boolean" },
      { key: "Ctrl+S", description: "Save settings" },
      { key: "Escape/Q", description: "Close" },
    ],
  },
];

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface SectionTabsProps {
  sections: ShortcutSection[];
  activeSection: HelpSection;
}

function SectionTabs({ sections, activeSection }: SectionTabsProps) {
  const colors = useThemeColors();
  return (
    <Box marginBottom={1} flexWrap="wrap">
      {sections.map((section, index) => (
        <Box key={section.id}>
          {index > 0 && <Text dimColor> | </Text>}
          <Text
            bold={activeSection === section.id}
            color={
              activeSection === section.id ? colors.primary : colors.textMuted
            }
          >
            {activeSection === section.id
              ? `[${section.title}]`
              : section.title}
          </Text>
        </Box>
      ))}
    </Box>
  );
}

interface ShortcutListProps {
  shortcuts: ShortcutEntry[];
}

function ShortcutList({ shortcuts }: ShortcutListProps) {
  const colors = useThemeColors();
  return (
    <Box flexDirection="column">
      {shortcuts.map((shortcut) => (
        <Box key={shortcut.key}>
          <Box minWidth={18}>
            <Text bold color={colors.primary}>
              {shortcut.key}
            </Text>
          </Box>
          <Text color={colors.text}>{shortcut.description}</Text>
        </Box>
      ))}
    </Box>
  );
}

function HelpFooter() {
  const colors = useThemeColors();
  return (
    <Box
      marginTop={1}
      paddingTop={1}
      borderStyle="single"
      borderTop
      borderBottom={false}
      borderLeft={false}
      borderRight={false}
      borderColor={colors.border}
    >
      <Text dimColor>
        <Text color={colors.primary}>Tab</Text>: Switch sections |{" "}
        <Text color={colors.primary}>Escape/?</Text>: Close help
      </Text>
    </Box>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function HelpOverlay({ hasFocus, onClose }: HelpOverlayProps) {
  const [activeSection, setActiveSection] = useState<HelpSection>("global");
  const colors = useThemeColors();

  const currentSection = useMemo(
    () =>
      shortcutSections.find((s) => s.id === activeSection) ??
      shortcutSections[0],
    [activeSection]
  );

  // Handle tab switching
  const handleTabChange = (direction: "next" | "prev") => {
    const currentIdx = shortcutSections.findIndex(
      (s) => s.id === activeSection
    );
    let newIdx: number;
    if (direction === "next") {
      newIdx = (currentIdx + 1) % shortcutSections.length;
    } else {
      newIdx = currentIdx <= 0 ? shortcutSections.length - 1 : currentIdx - 1;
    }
    setActiveSection(shortcutSections[newIdx].id);
  };

  // Keyboard input handling
  useInput(
    (input, key) => {
      if (!hasFocus) return;

      // Close overlay
      if (key.escape || input === "?" || input === "q" || input === "Q") {
        onClose();
        return;
      }

      // Switch tabs
      if (key.tab) {
        handleTabChange(key.shift ? "prev" : "next");
        return;
      }

      // Arrow keys for section navigation
      if (key.leftArrow) {
        handleTabChange("prev");
        return;
      }
      if (key.rightArrow) {
        handleTabChange("next");
        return;
      }
    },
    { isActive: hasFocus }
  );

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color={colors.primary}>
          {navIcons.arrowRight} Keyboard Shortcuts
        </Text>
        <Text dimColor> - Press ? or Escape to close</Text>
      </Box>

      {/* Section tabs */}
      <SectionTabs sections={shortcutSections} activeSection={activeSection} />

      {/* Shortcuts list */}
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={colors.border}
        paddingX={1}
        paddingY={1}
      >
        <Box marginBottom={1}>
          <Text bold color={colors.accent}>
            {currentSection.title}
          </Text>
        </Box>
        <ShortcutList shortcuts={currentSection.shortcuts} />
      </Box>

      {/* Footer with navigation hint */}
      <HelpFooter />
    </Box>
  );
}

export default HelpOverlay;
