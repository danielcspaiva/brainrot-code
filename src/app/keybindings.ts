/**
 * Keybinding registry used for help and overlays.
 */

export const KEYBINDINGS = {
  global: [
    { key: "Tab", action: "Switch focus" },
    { key: "Alt+L", action: "Cycle layout preset" },
    { key: "Alt+Left/Right", action: "Resize panes" },
    { key: "T", action: "Cycle theme" },
    { key: "?", action: "Help" },
    { key: "Esc", action: "Close overlay / exit" },
    { key: "Ctrl+C", action: "Cancel or quit" },
  ],
  loop: [
    { key: "G", action: "Game selector" },
    { key: "S", action: "Settings" },
    { key: "V", action: "Stats" },
  ],
  games: [
    { key: "P", action: "Pause" },
    { key: "R", action: "Restart" },
    { key: "Q", action: "Quit game" },
  ],
  tasks: [
    { key: "Up/Down", action: "Select task" },
    { key: "Space", action: "Toggle status" },
    { key: "N", action: "New task" },
    { key: "E", action: "Edit task" },
    { key: "D", action: "Delete task" },
  ],
};
