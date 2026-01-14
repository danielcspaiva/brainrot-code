# Contributing to BrainRot CLI

Thank you for your interest in contributing to BrainRot CLI! This guide will help you get started.

## Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** (comes with Node.js)
- **Git**
- A terminal with good Unicode support

## Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/brainrot-cli/brainrot.git
cd brainrot
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build the Project

```bash
npm run build
```

### 4. Run in Development Mode

```bash
# Watch mode - rebuilds on file changes
npm run dev

# In another terminal, run the app
npm start
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run dev` | Watch mode for development |
| `npm start` | Run the compiled CLI |
| `npm run typecheck` | Type checking without emit |
| `npm run lint` | Run ESLint on source files |
| `npm run lint:fix` | Auto-fix linting issues |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check code formatting |

## Project Structure

```
brainrot-cli/
├── src/
│   ├── index.tsx              # Main entry point
│   ├── cli.ts                 # CLI argument parsing
│   ├── config.ts              # Configuration management
│   │
│   ├── Games/                 # Game implementations
│   │   ├── index.ts           # Game registry
│   │   ├── SnakeGame.tsx
│   │   ├── PongGame.tsx
│   │   ├── TetrisGame.tsx
│   │   └── MinesweeperGame.tsx
│   │
│   ├── game-types.ts          # Game framework types
│   ├── use-game-loop.ts       # Game loop hook
│   ├── use-high-scores.ts     # High scores persistence
│   ├── use-stats.ts           # Stats tracking
│   │
│   ├── Layout.tsx             # Split-pane layout
│   ├── SplitPane.tsx          # Pane divider logic
│   ├── StatusBar.tsx          # Status bar component
│   ├── GameSelector.tsx       # Game selection menu
│   ├── SettingsMenu.tsx       # Settings UI
│   │
│   ├── claude-code-process.ts # Claude Code spawning
│   ├── use-claude-code.ts     # Claude Code hook
│   ├── ralph-loop-parser.ts   # Output parsing
│   │
│   ├── themes.ts              # Theme definitions
│   ├── theme.ts               # Theme utilities
│   └── useTheme.tsx           # Theme context
│
├── package.json
├── tsconfig.json
├── eslint.config.js
└── CLAUDE.md                  # Claude Code guidance
```

## Architecture Overview

### Technology Stack

- **TypeScript** - Type-safe JavaScript
- **React 19** - UI component framework
- **Ink 6** - React renderer for terminal UIs
- **Node.js** - Runtime environment

### Key Patterns

#### Component Structure

All UI components are functional React components using hooks. The main app is rendered with Ink:

```tsx
import { render } from "ink";
import { App } from "./App.js";

render(<App />);
```

#### Focus Management

The app uses a focus system where only one pane responds to input at a time. Components receive a `hasFocus` prop:

```tsx
function MyComponent({ hasFocus }: { hasFocus: boolean }) {
  useInput((input, key) => {
    if (!hasFocus) return;
    // Handle input
  }, { isActive: hasFocus });
}
```

#### Game Framework

Games implement the `GameComponentProps` interface and are registered in `src/Games/index.ts`. See [docs/GAME_DEVELOPMENT.md](docs/GAME_DEVELOPMENT.md) for details.

#### Process Management

Claude Code runs as a child process managed by `ClaudeCodeProcess` class. It emits events for stdout, stderr, and status changes.

## Code Style

### TypeScript

- Strict mode enabled with all checks
- No unused locals or parameters
- Explicit return types on exported functions

### ESLint

We use ESLint with TypeScript and React plugins. Run before committing:

```bash
npm run lint
```

### Prettier

Code formatting is enforced with Prettier. Run before committing:

```bash
npm run format
```

### Pre-commit Checklist

Before committing, ensure:

1. `npm run typecheck` passes
2. `npm run lint` passes
3. `npm run format:check` passes
4. `npm run build` succeeds

## Adding a New Game

See the detailed guide: [docs/GAME_DEVELOPMENT.md](docs/GAME_DEVELOPMENT.md)

Quick summary:

1. Create `src/Games/YourGame.tsx`
2. Export `GameInfo` and the component
3. Register in `src/Games/index.ts`

## Pull Request Guidelines

### Before Submitting

1. Create a feature branch from `main`
2. Make your changes with clear, focused commits
3. Ensure all checks pass
4. Update documentation if needed

### PR Description

Include:

- **What** - Brief description of changes
- **Why** - Motivation or issue being addressed
- **How** - Technical approach if non-obvious
- **Testing** - How you verified the changes

### Review Process

1. PRs require at least one approval
2. All CI checks must pass
3. Address review feedback promptly
4. Squash commits before merging if requested

## Reporting Issues

When reporting bugs, include:

- Node.js version (`node --version`)
- Operating system
- Terminal emulator
- Steps to reproduce
- Expected vs actual behavior
- Any error messages

## Getting Help

- Check existing issues for similar problems
- Read the documentation in `docs/`
- Look at existing code for patterns

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
