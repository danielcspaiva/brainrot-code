# Implementation Plan

This is a step-by-step plan to rebuild BrainRot from scratch with a UX-first focus. Each phase ends with a demoable milestone.

## Phase 0 - Alignment and Scope (1-2 days)
- Decide on the single UI stack (OpenTUI recommended).
- Confirm core features for v1 of the rewrite (games, streaming, focus, tasks).
- Finalize keyboard map and layout rules.
- Define success metrics (time to first output, no flicker, smooth resize).

Deliverable:
- A short, approved scope document and keybindings list.

## Phase 1 - Foundations (3-5 days)
- New app entry and renderer init (alternate screen, resize handling).
- Config loader (XDG) with CLI overrides.
- Theme system with semantic tokens.
- Base layout and status bar shell.
- Layout presets and a simple layout switcher.

Deliverable:
- App boots, shows empty layout, status bar updates on resize.

## Phase 2 - Claude Streaming Core (4-6 days)
- Process manager with clean spawn/stop/cancel logic.
- Stream JSON parser with error handling and tests.
- Output pane with scroll lock and basic formatting.
- Activity and elapsed time indicators.
- Lightweight code block styling or syntax highlight.

Deliverable:
- Live streaming output in the Claude pane with smooth updates.

## Phase 3 - App Flow and UX (5-8 days)
- App state machine for planning -> review -> running -> complete.
- Feature input screen with validation.
- Planning view with progress indicator.
- Plan review and task breakdown screens.
- Overlay system (help, settings placeholder, attention prompt).

Deliverable:
- End-to-end UX flow with placeholder data and smooth transitions.

## Phase 4 - Task System (5-7 days)
- Task panel UI with current task and progress.
- Integrate stream parser to update tasks.
- Manual task edits (create, update, status toggle) if v1 scope allows.
- Persist loop state for resume.

Deliverable:
- Task panel updates in real time as Claude works.

## Phase 5 - Games and Focus (6-10 days)
- Game registry, game selector, focus switching.
- Port the four games or implement minimal versions first.
- Auto-pause and attention handling.
- High scores and stats hooks (minimal).

Deliverable:
- Full game play experience integrated with loop flow.

## Phase 6 - Settings, Stats, Polish (4-7 days)
- Settings overlay (themes, layout, auto-pause).
- Stats and achievements view (optional for v1).
- UX polish: hints, banners, empty states.
- Performance and flicker pass.

Deliverable:
- UX-complete product with settings and polish.

## Phase 7 - Hardening and Docs (3-5 days)
- Error recovery paths.
- Snapshot tests for core views.
- Update README and keyboard shortcut docs.
- Optional mock mode for development and tests.

Deliverable:
- Shippable CLI with documentation and basic tests.

## Parallel Work Suggestions
- UX prototyping can run while streaming parser is implemented.
- Games can be ported in parallel once UI shell exists.
- Theme and settings work can begin after Phase 1.
