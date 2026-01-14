#!/usr/bin/env node
import { render, Box, Text } from "ink";

function App() {
  return (
    <Box flexDirection="column" padding={1}>
      <Box borderStyle="round" borderColor="cyan" paddingX={2} paddingY={1}>
        <Text bold color="cyan">
          BRAINROT CLI
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text>
          Welcome to Brainrot CLI - your terminal companion for Claude Code
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Press Ctrl+C to exit</Text>
      </Box>
    </Box>
  );
}

render(<App />);
