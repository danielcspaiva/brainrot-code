#!/usr/bin/env node
/**
 * BrainRot CLI Entry Point
 *
 * A terminal-native CLI that wraps Claude Code with built-in games
 * to play while agents work.
 */

import { render } from "ink";
import { parseCLI, printHelp, printVersion, printError } from "./cli.js";
import { AppNew } from "./AppNew.js";

/**
 * Main entry point - parses CLI args and renders the app
 */
function main(): void {
  // Parse CLI arguments
  const { args, error } = parseCLI();

  // Handle parsing errors
  if (error) {
    printError(error);
    process.exit(1);
  }

  // Handle --help flag
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  // Handle --version flag
  if (args.version) {
    printVersion();
    process.exit(0);
  }

  // Render the app with CLI overrides
  render(<AppNew cliOverrides={args.overrides} />);
}

// Run main
main();
