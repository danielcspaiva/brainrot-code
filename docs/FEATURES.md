# Features

This document describes the current feature set and behavior in the OpenTUI rewrite.

## Loop planning flow

1. Feature input screen
   - Enter a short feature description.
   - Submits a planning prompt to Claude.

2. Planning
   - Streams Claude output (stream-json or stream-text).
   - Extracts a JSON plan from output.

3. Plan review
   - Shows the plan name, summary, and task list.

4. Task breakdown
   - Displays task details and complexity summary.
   - On confirm, tasks are persisted and the loop starts.

5. Loop running
   - Claude output, task list, and game run side by side.
   - Tasks can be edited manually.
   - Attention prompts can interrupt and request input.

6. Loop complete
   - Displays completion summary and duration.

7. Error state
   - Displays fatal errors (plan parsing, Claude crash).

## TUI layout and navigation

- Layout presets:
  - `default`: Claude left, tasks and game stacked on the right.
  - `two-pane`: Claude left, game right (tasks hidden).
  - `focus`: Claude only.
  - `tasks-focus`: Tasks left, Claude right.
- Pane focus:
  - `Tab` swaps focus between Claude and Game panes.
- Resizing:
  - `Alt+Left/Right` adjusts split ratio.
- Layout switching:
  - `Alt+L` cycles layouts.

## Claude integration

- Spawns Claude Code as a child process with configurable args.
- Supports output modes:
  - `stream-json`: line-delimited JSON events (preferred).
  - `stream-text`: raw text.
  - `buffered`: captures output in larger chunks.
- Stream parser:
  - Parses JSON events, categorizes tool calls, results, and errors.
- Output view:
  - Highlights tool calls and code blocks.
  - Shows activity status and elapsed time.

## Task system

- Task model includes title, optional description, complexity, and dependencies.
- Manual editing:
  - Create, edit, delete, and toggle status from the Task pane.
- Auto updates:
  - Simple heuristics detect "task complete" phrases in Claude output.
- Persistence:
  - Loop tasks and the current task id are saved to disk.

## Games

- Included games:
  - Snake
  - Pong
  - Tetris
  - Minesweeper
- Game selector overlay (`G`) picks the active game.
- Auto-pause:
  - Games pause when Claude needs input (toggle in Settings).
- Scores and stats:
  - Persistent leaderboards per game.
  - Session stats (games played, time played, wins/losses).
  - Achievements derived from stats.

## Themes and settings

- Theme schemes: `default`, `dark`, `light`, `retro`.
- Settings overlay lets you:
  - Switch theme.
  - Switch layout preset.
  - Toggle auto-pause on attention.

## Persistence

All files use XDG locations (see `docs/CONFIGURATION.md` and `docs/DATA-PERSISTENCE.md`).

## Known gaps and limitations

- Loop execution beyond planning is not implemented yet (tasks are manual).
- Attention detection relies on simple phrase matching in Claude output.
