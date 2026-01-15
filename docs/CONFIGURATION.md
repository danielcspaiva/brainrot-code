# Configuration

BrainRot uses XDG directories for configuration and data.

- Config directory: `~/.config/brainrot-cli/`
- Config file: `~/.config/brainrot-cli/config.json`

## Config schema

```json
{
  "version": 1,
  "layout": {
    "preset": "default",
    "splitRatio": 0.6,
    "minRatio": 0.2,
    "maxRatio": 0.8,
    "resizeStep": 0.05
  },
  "theme": {
    "scheme": "default"
  },
  "claude": {
    "executablePath": "claude",
    "defaultArgs": [],
    "workingDirectory": null,
    "shutdownTimeout": 5000,
    "outputMode": "stream-json"
  },
  "app": {
    "autoPauseOnInput": true,
    "autoFocusOnInput": true
  },
  "tasks": {
    "autoUpdate": true,
    "showCompleted": true,
    "defaultPriority": "medium"
  },
  "games": {
    "defaultGame": ""
  }
}
```

## Field reference

Layout
- `preset`: `default`, `two-pane`, `focus`, `tasks-focus`
- `splitRatio`: Float between 0 and 1
- `minRatio` / `maxRatio`: Clamp split ratio
- `resizeStep`: Increment for Alt+Left/Right

Theme
- `scheme`: `default`, `dark`, `light`, `retro`

Claude
- `executablePath`: Claude Code binary path
- `defaultArgs`: Default args passed to Claude
- `workingDirectory`: Optional working directory
- `shutdownTimeout`: Time in ms before SIGKILL
- `outputMode`: `stream-json`, `stream-text`, `buffered`

App
- `autoPauseOnInput`: Auto-pause games on attention
- `autoFocusOnInput`: Switch focus to Claude on attention

Tasks
- Reserved for future task behavior controls

Games
- `defaultGame`: Optional default game id
