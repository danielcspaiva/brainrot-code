# Data Persistence

BrainRot stores runtime data using XDG data directories.

- Data directory: `~/.local/share/brainrot-cli/`

## Loop state

File: `loop-state.json`

Stores the current plan, task list, and start time.

Example:

```json
{
  "plan": {
    "name": "Example Feature",
    "description": "Short summary",
    "tasks": [
      { "id": "task-1", "title": "First task", "description": "", "complexity": "small", "dependsOn": [] }
    ]
  },
  "tasks": [
    { "id": "task-1", "title": "First task", "description": "", "complexity": "small", "dependsOn": [], "status": "in_progress" }
  ],
  "currentTaskId": "task-1",
  "startedAt": "2024-01-01T00:00:00.000Z"
}
```

## High scores

File: `high-scores.json`

- Per-game leaderboards.
- Default sort order is descending, except Minesweeper (ascending).

## Stats

File: `stats.json`

- Global stats: total games played and time played.
- Per-game stats: wins, losses, highest score, time played.

Achievements are derived from stats at runtime and are not stored separately.
