/**
 * Main App component - placeholder for OpenTUI rewrite
 * Will be expanded with full functionality in subsequent phases
 */

import { useKeyboard } from "@opentui/react";

export default function App() {
  useKeyboard((key) => {
    if (key.name === "escape" || (key.ctrl && key.name === "c")) {
      process.exit(0);
    }
  });

  return (
    <box
      style={{
        flexDirection: "column",
        padding: 1,
        border: true,
        flexGrow: 1,
      }}
    >
      <text fg="#00FF00">BrainRot CLI v2 - OpenTUI</text>
      <text fg="#888888">Press ESC or Ctrl+C to exit</text>
    </box>
  );
}
