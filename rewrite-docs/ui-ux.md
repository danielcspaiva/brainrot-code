# UI/UX Plan

This is a UX-first design plan for a clean, coherent BrainRot experience. It balances fast feedback, clear state, and playful game moments.

## UX Goals
- Make "what is happening" obvious at all times.
- Minimize cognitive load for first-time users.
- Keep focus on the user's current intent (watch Claude, play a game, respond to a prompt).
- Avoid flicker, layout jump, and confusing state changes.
- Respect terminal constraints (small screens, limited color, no mouse).

## UX Principles
- Clarity over density. Fewer panes, better information hierarchy.
- Consistent key bindings across every view and overlay.
- Focus is always visible.
- Animations only when they explain progress (spinner, pulse, elapsed time).
- Error states are actionable with clear recovery options.

## Primary Flows

### 1) First Run
1. Welcome screen with 30-second overview of controls.
2. Prompt: "Start a new loop" or "Just play a game".
3. Minimal settings hint (themes, layout).

### 2) Start a New Loop
1. Feature prompt (single input, example suggestions).
2. Planning phase (streaming output with clear status).
3. Plan review and task breakdown (short summary + expanded detail).
4. Game selection (quick select with number keys).
5. Loop running view.

### 3) Loop Running
1. Claude output stream is visible at all times.
2. Game runs in parallel.
3. Task panel shows progress and current task.
4. Status bar shows elapsed time, current phase, tool usage.
5. Prompt overlay appears when Claude needs input, auto-pauses the game.

### 4) Resume Existing Loop
1. Resume prompt with last activity time and completion ratio.
2. Option to resume or start fresh.

### 5) Loop Complete
1. Summary view with tasks completed, duration, and game stats.
2. Actions: start new loop, keep playing, quit.

## Layout System

### Default Layout (wide terminals)
```
---------------------------------------------------------
| Claude Output (left) | Tasks (top-right) | Games (bot) |
---------------------------------------------------------
| Status Bar                                         |
---------------------------------------------------------
```

### Narrow Layout (small terminals)
- Tabbed right pane: Tasks or Game, never both.
- Output pane always visible.
- Status bar always visible.

### Layout Presets
- Default: output left, tasks + games stacked right.
- Two-pane: output left, game right (tasks as overlay).
- Focus: output full width (game as overlay).
- Tasks focus: tasks left, output right (game as overlay).
- Quick toggle to cycle presets and a direct select menu.

### Overlay Strategy
- Overlays are always modal and centered.
- Overlays do not resize the base layout.
- Examples: help, settings, stats, attention prompt, game selector.

## UI Components and Behavior

### Claude Output Pane
- Streaming output with clear separators for messages and tools.
- Code blocks highlighted (use simple styling if highlighter unavailable).
- Auto-scroll with manual scroll lock.
- Activity line: current tool, elapsed time, last update.

### Task Panel
- Always shows current task and progress.
- Optional full task list with details.
- Supports quick edit and status changes (if enabled).
- Visual priority indicators that do not rely on color only.
  - Example: [P1], [P2], [P3] text tags.
  - Inline status toggles and an edit overlay for details.

### Game Pane
- Clear focus state and controls hint.
- Pause banner with reason when auto-paused.
- Minimal header with score and status.

### Status Bar
- Left: loop state, current task, progress percent.
- Center: focus indicator, game status, theme.
- Right: key hints that adapt by mode.

## Interaction Model (Key Bindings)
These should be consistent across all screens:
- Tab: switch focus between panes.
- G: open game selector.
- T: cycle theme.
- S: open settings.
- ?: help overlay.
- Esc: close overlays or exit current game.
- Ctrl+C: cancel current action or exit.
- Left/Right (with modifier): resize panes.

## Visual Design and Theming
- Use a limited palette with semantic meaning (success, warning, error).
- Avoid heavy borders everywhere; use contrast and spacing to separate.
- Emphasize focus using border style and brightness, not just color.
- Provide a high-contrast theme for accessibility.

## Motion and Feedback
- Use spinners only for active work (planning, tool runs).
- Use a heartbeat indicator for long-running operations.
- Use short confirmation banners for key actions (game switched, settings saved).

## Error and Recovery UX
- Errors are displayed in a single pattern with severity.
- Always show a next step (retry, reload config, restart, dismiss).
- Keep partial output visible for context.

## UX Tasks to Prototype Early
- Layout and focus switching.
- Streaming output and scroll lock.
- Attention overlay and auto-pause behavior.
- Task panel density in wide vs narrow terminals.
