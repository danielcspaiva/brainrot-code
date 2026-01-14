# BrainRot CLI

```
 ____            _       ____        _      ____ _     ___
| __ ) _ __ __ _(_)_ __ |  _ \ ___ | |_   / ___| |   |_ _|
|  _ \| '__/ _` | | '_ \| |_) / _ \| __| | |   | |    | |
| |_) | | | (_| | | | | |  _ < (_) | |_  | |___| |___ | |
|____/|_|  \__,_|_|_| |_|_| \_\___/ \__|  \____|_____|___|
```

> Play games while Claude Code works

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](package.json)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](package.json)

A terminal-native CLI application that wraps Claude Code with built-in games to play while AI agents work. Built with TypeScript, React 19, and Ink 6.

## Features

- **4 Built-in Games**: Snake, Pong, Tetris, and Minesweeper
- **Split-Pane Interface**: Play games while monitoring Claude Code output
- **4 Color Themes**: Default, Dark, Light, and Retro
- **Auto-Pause**: Games pause automatically when Claude Code needs your attention
- **Persistent High Scores**: Compete against yourself with local leaderboards
- **Full Keyboard Navigation**: No mouse needed

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
npm install
npm run build
npm start
```

## Quick Start

```bash
# Start with defaults
brainrot

# Start with vertical layout
brainrot --layout-direction vertical

# Start with dark theme
brainrot --color-scheme dark

# Start directly in Snake
brainrot --default-game snake
```

## Keyboard Shortcuts

### Global Controls

| Key | Action |
|-----|--------|
| `Tab` | Switch focus between game and management panes |
| `?` | Toggle help overlay |
| `Ctrl+S` | Open settings menu |
| `Ctrl+C` | Exit application |
| `[` / `]` | Resize panes (when focused) |

### In-Game Controls

| Key | Action |
|-----|--------|
| `P` | Pause / Resume game |
| `R` | Restart game |
| `Q` or `Esc` | Return to game menu |
| `H` | View high scores (where available) |

## Games

### Snake

Classic snake game - eat food to grow, avoid walls and yourself!

| Key | Action |
|-----|--------|
| `Arrow Keys` or `WASD` | Move snake |
| `P` | Pause |
| `R` | Restart |
| `H` | High scores |

### Pong

Single-player pong against AI - first to 5 wins!

| Key | Action |
|-----|--------|
| `Up/Down` or `W/S` | Move paddle |
| `P` | Pause |
| `R` | Restart |

### Tetris

Classic Tetris - clear lines with falling blocks!

| Key | Action |
|-----|--------|
| `Left/Right` | Move piece |
| `Up` or `W` | Rotate piece |
| `Down` | Soft drop |
| `Space` | Hard drop |
| `P` | Pause |
| `R` | Restart |

### Minesweeper

Find all mines without triggering them!

| Key | Action |
|-----|--------|
| `Arrow Keys` | Move cursor |
| `Space` or `Enter` | Reveal cell |
| `F` | Flag/unflag cell |
| `P` | Pause |
| `R` | Restart |

## Configuration

BrainRot CLI uses XDG Base Directory conventions for configuration storage.

### File Locations

| Type | Location |
|------|----------|
| Config | `~/.config/brainrot-cli/config.json` |
| High Scores | `~/.local/share/brainrot-cli/high-scores.json` |
| Stats | `~/.local/share/brainrot-cli/stats.json` |

### Example Configuration

```json
{
  "version": 1,
  "games": {
    "defaultDifficulty": "medium",
    "snake": {
      "initialSpeed": 5,
      "growthRate": 1
    },
    "tetris": {
      "startingLevel": 1,
      "showGhostPiece": true
    },
    "minesweeper": {
      "defaultDifficulty": "easy",
      "showTimer": true
    },
    "pong": {
      "aiDifficulty": 5,
      "ballSpeedMultiplier": 1.0
    }
  },
  "layout": {
    "direction": "horizontal",
    "splitRatio": 0.5,
    "minRatio": 0.25,
    "maxRatio": 0.75,
    "resizeStep": 0.05,
    "showSecondary": true,
    "defaultFocusedPane": 0
  },
  "theme": {
    "colorScheme": "default",
    "borderStyle": "round",
    "spinnerStyle": "spinner",
    "enableAnimations": true,
    "colors": {
      "primary": "cyan",
      "secondary": "magenta",
      "accent": "yellow"
    }
  },
  "claudeCode": {
    "executablePath": "claude",
    "workingDirectory": null,
    "defaultArgs": [],
    "shutdownTimeout": 5000
  },
  "app": {
    "maxScoresPerGame": 10,
    "defaultGame": null,
    "debugMode": false,
    "logLevel": "info"
  }
}
```

### Configuration Options

#### Games

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `defaultDifficulty` | `easy` \| `medium` \| `hard` | `medium` | Default difficulty for games |
| `snake.initialSpeed` | `1-10` | `5` | Snake movement speed |
| `snake.growthRate` | `number` | `1` | Segments added per food |
| `tetris.startingLevel` | `1-10` | `1` | Starting level |
| `tetris.showGhostPiece` | `boolean` | `true` | Show piece preview |
| `minesweeper.defaultDifficulty` | `easy` \| `medium` \| `hard` | `easy` | Board size/mines |
| `minesweeper.showTimer` | `boolean` | `true` | Display timer |
| `pong.aiDifficulty` | `1-10` | `5` | AI opponent skill |
| `pong.ballSpeedMultiplier` | `0.5-2.0` | `1.0` | Ball speed modifier |

#### Layout

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `direction` | `horizontal` \| `vertical` | `horizontal` | Split direction |
| `splitRatio` | `0.0-1.0` | `0.5` | Initial split ratio |
| `minRatio` | `0.0-1.0` | `0.25` | Minimum pane size |
| `maxRatio` | `0.0-1.0` | `0.75` | Maximum pane size |
| `resizeStep` | `number` | `0.05` | Keyboard resize increment |
| `showSecondary` | `boolean` | `true` | Show management pane |
| `defaultFocusedPane` | `0` \| `1` | `0` | Initial focus (0=game) |

#### Theme

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `colorScheme` | `default` \| `dark` \| `light` \| `retro` | `default` | Color theme |
| `borderStyle` | `single` \| `round` \| `double` \| `heavy` | `round` | Border characters |
| `spinnerStyle` | `spinner` \| `dots` \| `braille` | `spinner` | Loading animation |
| `enableAnimations` | `boolean` | `true` | Enable animations |
| `colors.*` | `string` | varies | Custom color overrides |

#### Claude Code

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `executablePath` | `string` | `claude` | Path to Claude Code |
| `workingDirectory` | `string` | `null` | Default working directory |
| `defaultArgs` | `string[]` | `[]` | CLI arguments to pass |
| `shutdownTimeout` | `number` | `5000` | Graceful shutdown timeout (ms) |

#### App

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxScoresPerGame` | `number` | `10` | Leaderboard entries to keep |
| `defaultGame` | `string` | `null` | Auto-select game on start |
| `debugMode` | `boolean` | `false` | Enable debug output |
| `logLevel` | `error` \| `warn` \| `info` \| `debug` | `info` | Log verbosity |

## Themes

BrainRot CLI includes four color themes:

| Theme | Description |
|-------|-------------|
| `default` | Modern terminal - cyan/magenta/yellow |
| `dark` | Muted colors for extended sessions |
| `light` | High contrast for light backgrounds |
| `retro` | Classic green phosphor terminal |

Switch themes via settings menu (`Ctrl+S`) or CLI flag:

```bash
brainrot --color-scheme retro
```

## CLI Flags

```
USAGE:
  brainrot [OPTIONS]

OPTIONS:
  -h, --help                 Show help message and exit
  -v, --version              Show version and exit
  -c, --config <path>        Use custom config file path

LAYOUT OPTIONS:
  --layout-direction <dir>   Split direction: horizontal, vertical
  --split-ratio <ratio>      Split ratio (0.0-1.0)

THEME OPTIONS:
  --color-scheme <scheme>    Color scheme: default, dark, light, retro
  --border-style <style>     Border style: single, round, double, heavy

CLAUDE CODE OPTIONS:
  --claude-executable <path> Path to Claude Code executable
  --claude-args <args>       Arguments to pass (comma-separated)
  -w, --working-dir <path>   Working directory for Claude Code

APP OPTIONS:
  -d, --debug                Enable debug mode
  --log-level <level>        Log level: error, warn, info, debug
  -g, --default-game <id>    Default game: snake, tetris, pong, minesweeper
```

### Examples

```bash
# Start with vertical layout and 70% game pane
brainrot --layout-direction vertical --split-ratio 0.7

# Use retro theme with heavy borders
brainrot --color-scheme retro --border-style heavy

# Debug mode with verbose logging
brainrot --debug --log-level debug

# Custom config file
brainrot -c ~/.my-brainrot-config.json

# Pass arguments to Claude Code
brainrot --claude-args "--model,claude-3-opus"
```

## Troubleshooting

### Claude Code not found

If you see "claude: command not found":

1. Ensure Claude Code is installed
2. Add it to your PATH, or use `--claude-executable` to specify the full path:
   ```bash
   brainrot --claude-executable /path/to/claude
   ```

### Terminal too small

Games require minimum terminal dimensions. If you see dimension warnings:

1. Resize your terminal window
2. Or try vertical layout which may fit better:
   ```bash
   brainrot --layout-direction vertical
   ```

### Configuration not saving

Ensure you have write permissions to the config directory:

```bash
mkdir -p ~/.config/brainrot-cli
chmod 755 ~/.config/brainrot-cli
```

### Games not responding to input

Make sure the game pane has focus (use `Tab` to switch). The focused pane has a highlighted border.

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

See [docs/GAME_DEVELOPMENT.md](docs/GAME_DEVELOPMENT.md) for creating new games.

## License

MIT License - see [LICENSE](LICENSE) for details.
