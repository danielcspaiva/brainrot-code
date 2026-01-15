# Feature Inventory (Current Repo)

This is a consolidated view of features inferred from `README.md`, `src/`, `src-opentui/`, and `tasks/` PRDs. It is meant to guide scope decisions for the rewrite.

## Core Product Behavior
- Run a terminal UI that wraps the Claude Code CLI.
- Split-pane experience: Claude output on one side, games on the other.
- Keyboard-first navigation: focus switching, resizing, overlays, and game control.
- Games are playable while Claude works and can auto-pause for attention.
- Persistent data: config, high scores, stats, achievements, and loop state.

## Claude Loop and Planning Features (Ink path)
- Planning flow: feature input -> planning -> plan review -> task breakdown -> game selection -> loop running -> loop complete.
- Ralph loop manager for PRD generation and execution with iterative tasks.
- Attention overlay that prompts the user for Claude input.
- Resume flow for existing loop state.
- Logs overlay and debug logger.

## UI and Overlay Features (Ink path)
- Onboarding tutorial.
- Help overlay with keyboard shortcuts.
- Settings menu (theme, layout, games).
- Stats and achievements menu.
- Game selector overlays.
- PRD overlay and task breakdown screens.
- Status bars (full and minimal variants).

## Games and Game UX
- Games: Snake, Pong, Tetris, Minesweeper.
- Per-game controls, pause/resume, restart.
- Leaderboards and high score banners.
- Game stats tracking and achievements.
- Auto-pause on Claude input (configurable).

## Persistence and Config
- XDG config and data paths.
- Config schema for games, layout, theme, Claude settings, loop settings, app settings.
- High scores stored locally.
- Stats and achievements stored locally.

## Themes and Styling
- Themes: default, dark, light, retro.
- Theme-specific colors, borders, icons, and status indicators.

## OpenTUI Rewrite (current partial state)
- App shell with layout, status bar, game selector, error handling.
- Theme system in OpenTUI.
- Claude process and Ralph loop in progress.
- Games partially ported.
- Missing: full planning UX, task panel, overlay system, settings/stats menus.

## Known State Issues
- Two UI stacks: Ink (`src/`) and OpenTUI (`src-opentui/`).
- Build uses Bun + OpenTUI entry, while `src/index.tsx` targets Ink.
- Feature set is split and inconsistent between the two stacks.

## Scope Candidates for Rewrite
Must keep:
- Claude output streaming and attention handling.
- Split-pane UI with focus and resize.
- Games and auto-pause.
- Config and persistence.

Nice-to-keep:
- Onboarding and setup wizard.
- Stats, achievements, leaderboards.
- Task breakdown and PRD review flows.
- Logs overlay and debug tools.
