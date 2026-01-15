# Architecture Plan

This plan is for a clean, single-stack implementation with clear module boundaries and testable core logic.

## Recommended Stack
- UI: OpenTUI React (`@opentui/react` + `@opentui/core`).
- Runtime: Bun (aligned with `package.json` and OpenTUI build).
- Language: TypeScript, ES modules.

If OpenTUI is not acceptable, replace it with Ink and keep the same module boundaries.

## Key Decisions to Make Up Front
- Single UI stack only (remove dual Ink/OpenTUI paths).
- Streaming mode default: `stream-json`.
- One state machine for the app flow (no duplicated flows).
- Single config schema that covers layout, theme, games, and Claude.

## High-Level Modules

### 1) CLI and App Boot
- Parse CLI flags.
- Load config and apply overrides.
- Initialize renderer and enter alternate screen mode.
- Start root React component.

### 2) App State Machine
- Single source of truth for app modes:
  - idle, planning, review, running, paused, complete, error.
- Handles transitions and guards.

### 3) Claude Process Manager
- Spawn and manage Claude process.
- Output mode: stream-json (fallback to stream-text or buffered).
- Graceful shutdown and cancellation.

### 4) Stream Parser
- Parse newline-delimited JSON events.
- Emit events: text output, tool usage, task updates, completion.
- Provide clean data for UI and task system.

### 5) Task System
- Store tasks, current task, completion.
- Support updates from stream parser and optional manual edits.
- Persist loop state to disk for resume.
 - Optional CRUD layer for manual task creation and editing.

### 6) UI Shell
- Layout engine (split panes, tabs for narrow terminals).
- Focus management.
- Status bar.
- Overlay manager.
 - Layout presets loaded from config.

### 7) Games Subsystem
- Game registry and selection.
- Game lifecycle (start, pause, exit).
- High score and stats integration.

### 8) Data Layer
- Config (XDG).
- Stats and achievements.
- High scores.
- Logs and debug output.

## Suggested Folder Layout
```
src/
  app/
    App.tsx
    state.ts
    routes.ts
  cli/
    index.ts
    args.ts
  claude/
    process.ts
    stream-parser.ts
    types.ts
  ui/
    Layout.tsx
    StatusBar.tsx
    panes/
    overlays/
  games/
    index.ts
    Snake.tsx
    Pong.tsx
    Tetris.tsx
    Minesweeper.tsx
  data/
    config.ts
    stats.ts
    scores.ts
    loop-state.ts
  theme/
    tokens.ts
    themes.ts
```

## Data Flow (Simplified)
1. CLI -> load config -> App init.
2. App state machine starts planning or loop.
3. Claude process streams JSON events.
4. Stream parser emits structured updates.
5. UI consumes updates for output pane and task panel.
6. Games run independently but listen for attention events.

## Error Handling
- Central `AppError` type with severity and recovery actions.
- Error overlay with clear steps.
- All errors logged to file in debug mode.

## Testing Strategy (Architecture)
- Unit test parser and task logic.
- Integration test process manager with mock streams.
- Snapshot test key UI states.

## Output Rendering Notes
- Output pane should detect code blocks and apply a lightweight syntax theme.
- If a full highlighter is not available, use basic styling and clear separators.

## Migration Strategy
- Start in a new directory or new `src-v3` while keeping old code untouched.
- After parity, switch entry to new path and remove old stacks.
