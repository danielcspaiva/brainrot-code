# BrainRot Rewrite Plan (OpenTUI)

This plan tracks the full rewrite, end-to-end. Statuses will be updated as work progresses.

Status legend:
- not_started
- in_progress
- blocked
- done

## Phase 0 - Repo Reset and Ground Rules
- Task 0.1: Confirm baseline requirements and keybindings. Status: done
- Task 0.2: Create new app skeleton under `src/` (OpenTUI). Status: done
- Task 0.3: Update build/dev scripts to point at new entry. Status: done
- Task 0.4: Remove old `src/` and `src-opentui/` once new shell compiles. Status: done

## Phase 1 - Foundations
- Task 1.1: Renderer bootstrap (alternate screen, resize handling). Status: done
- Task 1.2: Config system (XDG) + CLI overrides. Status: done
- Task 1.3: Theme tokens + theme registry. Status: done
- Task 1.4: Layout presets and layout switcher. Status: done
- Task 1.5: Base app shell + status bar. Status: done

## Phase 2 - Claude Streaming Core
- Task 2.1: Claude process manager (spawn/stop/cancel). Status: done
- Task 2.2: Stream JSON parser with tests. Status: done
- Task 2.3: Output pane (scroll lock, formatting, code block styling). Status: done
- Task 2.4: Activity/elapsed time indicators. Status: done

## Phase 3 - App Flow and UX
- Task 3.1: App state machine (planning -> review -> running -> complete). Status: done
- Task 3.2: Feature input screen. Status: done
- Task 3.3: Planning view with progress. Status: done
- Task 3.4: Plan review and task breakdown screens. Status: done
- Task 3.5: Overlay system (help, attention, selector). Status: done

## Phase 4 - Task System
- Task 4.1: Task model + persistence (loop state). Status: done
- Task 4.2: Task panel UI (current task + list). Status: done
- Task 4.3: Parser integration for task updates. Status: done
- Task 4.4: Manual task edits (create/update/status). Status: done

## Phase 5 - Games Integration
- Task 5.1: Game registry + selector. Status: done
- Task 5.2: Port Snake. Status: done
- Task 5.3: Port Pong. Status: done
- Task 5.4: Port Tetris. Status: done
- Task 5.5: Port Minesweeper. Status: done
- Task 5.6: Auto-pause + attention overlay wiring. Status: done
- Task 5.7: High scores + session stats hooks. Status: done

## Phase 6 - Settings, Stats, Polish
- Task 6.1: Settings overlay (theme/layout/game). Status: done
- Task 6.2: Stats + achievements view. Status: done
- Task 6.3: UX polish (hints, banners, empty states). Status: done
- Task 6.4: Performance and flicker pass. Status: done

## Phase 7 - Hardening and Docs
- Task 7.1: Error recovery paths (process/config/PRD). Status: not_started
- Task 7.2: Snapshot tests for core views. Status: not_started
- Task 7.3: Update README and keyboard shortcut docs. Status: done
- Task 7.4: Mock mode for development and tests. Status: not_started
