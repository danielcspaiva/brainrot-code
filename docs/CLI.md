# CLI

## Usage

```
brainrot [options]
```

## Options

- `-h`, `--help`: Show help and exit.
- `-v`, `--version`: Show version and exit.
- `-c`, `--config <path>`: Use a custom config file.

Layout
- `--layout <preset>`: `default`, `two-pane`, `focus`, `tasks-focus`
- `--split-ratio <ratio>`: Float between 0 and 1

Theme
- `--color-scheme <scheme>`: `default`, `dark`, `light`, `retro`

Claude
- `--claude-executable <path>`: Path to Claude binary
- `--claude-args <args>`: Comma-separated args passed to Claude
- `-w`, `--working-dir <path>`: Working directory for Claude
- `--output-mode <mode>`: `stream-json`, `stream-text`, `buffered`

## Examples

```bash
brainrot --layout focus
brainrot --split-ratio 0.7
brainrot --color-scheme retro
brainrot --claude-executable /path/to/claude
```
