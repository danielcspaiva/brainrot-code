# Roadmap

This roadmap reflects current implementation and known gaps. It is a living document.

## Now (stabilize)

- Add robust error recovery for Claude crashes and parse failures.
- Add snapshot tests for core screens and overlays.
- Add a mock mode for local development and CI.
- Improve attention detection and reduce false positives.
- Add a resume flow when loop state exists.

## Next (loop execution)

- Implement a loop runner that sends tasks to Claude and advances status.
- Add task-level prompts and richer progress telemetry.
- Improve task parsing to map outputs to specific task ids.

## Later (productization)

- Plugin system for custom games.
- Layout customization beyond presets (pane visibility, docking).
- More advanced achievements and leaderboards.
- Multi-session history and exportable run logs.
