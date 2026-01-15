# Architecture

This document describes the runtime architecture and module boundaries for the OpenTUI rewrite.

## Stack

- Runtime: Bun (builds to `dist/` and runs the CLI)
- UI: OpenTUI + React 19
- Language: TypeScript

## Runtime overview

```
bin/brainrot.js
  -> dist/index.js
     -> src/index.tsx
        -> App (ConfigProvider, ThemeProvider, AppShell)
```

### Entry and CLI

- `src/index.tsx` creates the OpenTUI renderer in alternate screen mode.
- `src/cli/args.ts` parses CLI flags and maps them to config overrides.

## App state machine

```
feature_input
  -> planning
     -> plan_review
        -> task_breakdown
           -> loop_running
              -> loop_complete

Any state -> error
```

- Defined in `src/app/state.ts`.
- State transitions live in `src/app/App.tsx`.

## Claude streaming pipeline

```
ClaudeProcess (spawn)
  -> stdout
     -> ClaudeStreamParser
        -> ClaudeOutputLine[]
           -> ClaudePane render
```

- `src/claude/process.ts` spawns and manages the child process.
- `src/claude/stream-parser.ts` parses stream-json lines.
- `src/claude/useClaudeStream.ts` manages output, activity, and elapsed time.

## Data layer

- Configuration
  - `src/data/config.ts` reads and writes XDG config.
- Loop state
  - `src/data/loop-state.ts` stores plan and task state.
- Stats and scores
  - `src/data/stats.ts`, `src/data/high-scores.ts` write to XDG data.

## UI system

- Layout: `src/ui/Layout.tsx` handles split panes and layout presets.
- Banner: `src/ui/LoopBanner.tsx` shows plan title and progress.
- Panes: `src/ui/panes/*` for Claude, tasks, and game.
- Screens: `src/ui/screens/*` for non-loop views.
- Overlays: `src/ui/overlays/*` for help, settings, stats, attention, and game selector.
- Theme: `src/theme/*` defines colors and schemes.

## Games

- Registry: `src/games/index.ts` exposes available games.
- Shared types: `src/game-types.ts` defines game interfaces.
- Loop: `src/hooks/useGameLoop.ts` drives frame updates.

## Data flow summary

```
User input -> planning prompt -> Claude output -> plan parsed
  -> plan review -> task breakdown -> loop state persisted
  -> loop running (Claude output, tasks, game)
```

## Attention flow

- Claude output is scanned for attention phrases.
- If detected, the attention overlay opens and focus shifts to Claude.
- Games auto-pause if auto-pause is enabled.

## Performance notes

- Pane rendering uses memoized nodes where possible.
- Game rendering is isolated to the Game pane.
- Output is truncated to a max line count in the Claude stream hook.
