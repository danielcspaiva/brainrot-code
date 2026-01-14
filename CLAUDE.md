# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BrainRot CLI is a terminal-native CLI application that wraps Claude Code with built-in games to play while agents work. Built with TypeScript, React 19, and Ink 6 (terminal UI framework).

## Commands

```bash
npm run build         # Compile TypeScript to dist/
npm run dev           # Watch mode for development
npm start             # Run compiled CLI (node dist/index.js)
npm run typecheck     # Type checking without emit
npm run lint          # ESLint on src files
npm run lint:fix      # Auto-fix linting issues
npm run format        # Prettier format code
npm run format:check  # Check formatting
```

After `npm install -g .`, the CLI is available as `brainrot`.

## Architecture

### Core Components

- **Layout.tsx** - Main split-pane container with keyboard navigation
- **SplitPane.tsx** - Resizable pane divider logic
- **StatusBar.tsx** - Persistent status bar footer

### Claude Code Integration

- **claude-code-process.ts** - Spawns Claude Code as child process, captures stdout/stderr
- **ralph-loop-parser.ts** - Parses Claude Code output to extract structured state (running, paused, waiting for input, errors)
- **Hooks/use-claude-code.ts** - React hook managing process lifecycle

### Game Framework

Games are in `src/Games/` and registered via `src/Games/index.ts`. Each game implements `GameComponentProps`:
- Receives focus state, dimensions, input handling
- Gets loop attention notifications (can auto-pause when Claude needs user input)
- Reports state updates to status bar

Four games: Snake, Pong, Tetris, Minesweeper.

### Configuration System (XDG paths)

- Config: `~/.config/brainrot/config.json`
- Stats/achievements: `~/.local/share/brainrot/stats.json`
- High scores: `~/.local/share/brainrot/high-scores.json`

Config merging: file → local overrides → CLI flags.

### Theme System

Multiple themes (default, dark, light, retro) with runtime switching. Defined in `src/themes.ts`, semantic colors in `src/theme.ts`.

## Key Patterns

- **Focus Management**: Tab switches panes; games receive explicit `hasFocus` prop
- **Game Auto-Pause**: When Claude Code needs input, games can auto-pause (configurable)
- **Process Management**: Graceful shutdown with timeout; spawns Claude as child process with stdio piping
- **Stats Async**: Stats/high scores use async file operations but cache in memory

## TypeScript Configuration

Strict mode with all checks enabled (`noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch`). Uses ES2022 target with NodeNext module resolution.
