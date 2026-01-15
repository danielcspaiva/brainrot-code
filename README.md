# BrainRot CLI

```
 ____            _       ____        _      ____ _     ___
| __ ) _ __ __ _(_)_ __ |  _ \ ___ | |_   / ___| |   |_ _|
|  _ \| '__/ _` | | '_ \| |_) / _ \| __| | |   | |    | |
| |_) | | | (_| | | | | |  _ < (_) | |_  | |___| |___ | |
|____/|_|  \__,_|_|_| |_|_| \_\___/ \__|  \____|_____|___|
```

> Play games while Claude works

[![Version](https://img.shields.io/badge/version-0.2.1-blue.svg)](package.json)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](package.json)

A terminal-native CLI that wraps Claude Code with built-in games to play while the loop runs. Built with TypeScript, React 19, and OpenTUI.

## Features

- Planning flow: feature input -> plan review -> task breakdown
- Split-pane TUI for Claude output, tasks, and a game
- Four games: Snake, Pong, Tetris, and Minesweeper
- Theme + layout presets with keyboard control
- Auto-pause and attention prompts when Claude needs input
- Persistent stats, achievements, and high scores

## Installation

### Prerequisites

- Node.js 18.0.0 or higher
- [Claude Code](https://claude.ai/code) installed and available in PATH

### Install Globally

```bash
npm install -g brainrot-cli
```

### Or Run from Source

```bash
git clone https://github.com/brainrot-cli/brainrot.git
cd brainrot
bun install
bun run dev
```

## Quick Start

```bash
# Start with defaults
brainrot

# Use a focused layout
brainrot --layout focus

# Adjust pane split ratio
brainrot --split-ratio 0.7

# Switch theme
brainrot --color-scheme retro

# Override Claude executable
brainrot --claude-executable /path/to/claude
```

## Keyboard Shortcuts

Core shortcuts:

- `Tab`: Switch focus between panes
- `?`: Help overlay
- `G`: Game selector
- `S`: Settings
- `V`: Stats
- `Alt+L`: Cycle layouts
- `Alt+Left/Right`: Resize panes
- `T`: Cycle themes
- `Ctrl+C`: Cancel or quit

See `docs/keyboard-shortcuts.md` for the full list.

## Documentation

- `docs/README.md`: Documentation index
- `docs/FEATURES.md`: Feature overview
- `docs/ARCHITECTURE.md`: Architecture and data flow
- `docs/ROADMAP.md`: Roadmap and known gaps

## Games

- **Snake**: Arrow keys or WASD to move. `P` pause, `R` restart, `Q` quit.
- **Pong**: Up/Down or W/S to move. `P` pause, `R` restart, `Q` quit.
- **Tetris**: Left/Right to move, Up/W rotate, Down/S soft drop, Space hard drop.
- **Minesweeper**: Arrow keys (and W/S/A) to move, Space to reveal, `F` to flag.

## Configuration

BrainRot follows XDG directory conventions.

| Type | Location |
|------|----------|
| Config | `~/.config/brainrot-cli/config.json` |
| Loop state | `~/.local/share/brainrot-cli/loop-state.json` |
| High scores | `~/.local/share/brainrot-cli/high-scores.json` |
| Stats | `~/.local/share/brainrot-cli/stats.json` |

Example config:

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
    "outputMode": "stream-json"
  },
  "app": {
    "autoPauseOnInput": true,
    "autoFocusOnInput": true
  },
  "games": {
    "defaultGame": ""
  }
}
```

## License

MIT
