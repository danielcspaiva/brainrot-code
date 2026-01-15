/**
 * BrainRot CLI - OpenTUI entry point
 */

import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import App from "./app/App.js";
import { parseCLI, printError, printHelp, printVersion } from "./cli/args.js";

async function main() {
  const { args, error } = parseCLI();

  if (error) {
    printError(error);
    process.exit(1);
  }

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (args.version) {
    printVersion();
    process.exit(0);
  }

  const renderer = await createCliRenderer({
    useAlternateScreen: true,
    exitOnCtrlC: false,
  });
  const root = createRoot(renderer);
  root.render(<App cliOverrides={args.overrides} configPath={args.configFile} />);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
