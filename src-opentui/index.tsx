/**
 * BrainRot CLI v2 - OpenTUI Rewrite
 * Entry point for the terminal application
 */

import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import App from "./App.js";

async function main() {
  const renderer = await createCliRenderer();
  const root = createRoot(renderer);
  root.render(<App />);
}

main().catch(console.error);
