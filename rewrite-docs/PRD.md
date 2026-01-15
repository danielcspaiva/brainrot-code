# PRD: BrainRot CLI v2 - OpenTUI Rewrite

## Overview

Rewrite BrainRot CLI from Ink 6 to OpenTUI, with improved Claude Code integration for running Ralph loops while playing terminal games.

---

## 1. Problem Statement

The current BrainRot CLI has several issues:
- **Ink 6 limitations** - Framework is less actively developed; OpenTUI offers better primitives
- **Brittle Claude Code integration** - Regex-based output parsing breaks when Claude's format changes
- **Ralph loop implementation** - Current approach is overly complex; should align with standard Ralph patterns

---

## 2. Goals

1. **Migrate UI to OpenTUI** - Use `@opentui/react` for all terminal rendering
2. **Robust Claude Code integration** - Improve process management and output handling
3. **Proper Ralph loop support** - Implement standard Ralph pattern (bash loop with PRD)
4. **Preserve games** - Keep Snake, Pong, Tetris, Minesweeper playable while loops run
5. **Maintain features** - Split-pane layout, themes, status bar, task tracking

---

## 3. Technical Architecture

### 3.1 UI Framework Migration (Ink → OpenTUI)

**OpenTUI Components to Use:**
```
<box>       - Containers, panels, borders
<text>      - Text display with styling
<input>     - Text input fields
<textarea>  - Multi-line input (PRD editing)
<scrollbox> - Scrollable log output
```

**OpenTUI Hooks:**
```typescript
useKeyboard()           - Input handling (Tab, arrows, game controls)
useTerminalDimensions() - Responsive layout
useRenderer()           - Access to renderer for advanced features
```

**Layout System:**
- OpenTUI uses Yoga (CSS Flexbox) - maps well to current split-pane design
- `flexDirection`, `flexGrow`, `gap` for responsive panels

### 3.2 Core Architecture

```
src/
├── index.tsx                 # Entry point, render(<App />)
├── App.tsx                   # Main app, state machine
├── components/
│   ├── Layout.tsx            # Split-pane container (flexbox)
│   ├── ClaudePanel.tsx       # Claude output + input
│   ├── GamePanel.tsx         # Game container
│   ├── StatusBar.tsx         # Bottom status bar
│   ├── TaskList.tsx          # PRD task tracking
│   └── GameSelector.tsx      # Game picker overlay
├── claude/
│   ├── process.ts            # Child process management
│   ├── ralph-loop.ts         # Ralph loop orchestration
│   └── output-parser.ts      # Structured output parsing
├── games/
│   ├── index.ts              # Game registry
│   ├── Snake.tsx             # Snake game
│   ├── Pong.tsx              # Pong game
│   ├── Tetris.tsx            # Tetris game
│   └── Minesweeper.tsx       # Minesweeper game
├── hooks/
│   ├── useClaudeProcess.ts   # React hook for Claude process
│   ├── useRalphLoop.ts       # Ralph loop state management
│   ├── useGameLoop.ts        # Game frame timing
│   └── useConfig.ts          # Configuration management
├── config/
│   ├── index.ts              # Config loading/saving
│   └── types.ts              # Config TypeScript types
└── themes/
    ├── index.ts              # Theme definitions
    └── provider.tsx          # Theme context
```

### 3.3 Claude Code Integration (Improved)

**Process Management:**
```typescript
class ClaudeProcess {
  // Spawn claude-code CLI as child process
  spawn(args: string[]): void

  // Send input to stdin
  write(input: string): void

  // Graceful shutdown with SIGTERM → timeout → SIGKILL
  kill(): Promise<void>

  // Event emitters
  on('stdout', (data: string) => void)
  on('stderr', (data: string) => void)
  on('exit', (code: number) => void)
}
```

**Ralph Loop Implementation:**
Follow the standard Ralph pattern:
```typescript
interface RalphLoop {
  // Load prd.json and parse tasks
  loadPRD(path: string): Promise<Task[]>

  // Run single iteration
  runIteration(): Promise<IterationResult>

  // Check if all tasks complete
  isComplete(): boolean

  // Current iteration count
  iteration: number
  maxIterations: number
}
```

**Key Improvement:** Instead of complex regex parsing, use:
1. Claude Code's `--output-format json` if available
2. Simpler state detection (running/paused/waiting for input)
3. prd.json file for task tracking (standard Ralph approach)

### 3.4 Game Framework

**Game Interface (unchanged):**
```typescript
interface GameProps {
  hasFocus: boolean
  width: number
  height: number
  onExit: () => void
  onStateChange?: (state: GameState) => void
}
```

**Game Loop Hook:**
```typescript
function useGameLoop(fps: number, callback: () => void) {
  // RAF-style timing for terminal
  // Pause when game loses focus
}
```

### 3.5 Application State Machine

```
States:
  INIT          → Load config, check Claude CLI
  PRD_INPUT     → User enters/loads PRD
  LOOP_RUNNING  → Ralph loop executing, game playable
  PAUSED        → Loop paused (user input needed)
  COMPLETE      → All tasks done
  ERROR         → Error state with recovery options

Transitions:
  INIT → PRD_INPUT (on startup)
  PRD_INPUT → LOOP_RUNNING (on PRD confirmed)
  LOOP_RUNNING → PAUSED (on user input needed)
  PAUSED → LOOP_RUNNING (on input provided)
  LOOP_RUNNING → COMPLETE (all PRD tasks done)
  any → ERROR (on error)
```

---

## 4. Feature Specifications

### 4.1 Split-Pane Layout
- Left: Claude Code output (scrollable)
- Right: Game panel
- Resizable with keyboard (Alt+arrows)
- Collapsible panels (H key)

### 4.2 Status Bar
- Loop status: iteration X/N, current task
- Game info: name, score, high score
- Key hints

### 4.3 Task Tracking
- Parse prd.json for task list
- Show progress (X/Y tasks complete)
- Highlight current task

### 4.4 Games
- Preserve existing game logic
- Adapt rendering to OpenTUI `<box>` and `<text>`
- Auto-pause when Claude needs input (configurable)

### 4.5 Themes
- Keep existing theme system
- Map colors to OpenTUI `fg`, `bg` props

---

## 5. Migration Strategy

### Phase 1: Core Setup
1. Set up new project with OpenTUI dependencies
2. Create basic render loop and App shell
3. Implement useKeyboard navigation

### Phase 2: Layout System
1. Build split-pane with flexbox
2. Implement resize controls
3. Add status bar

### Phase 3: Claude Integration
1. Port process management (mostly unchanged)
2. Implement simplified Ralph loop
3. Build output display with scrollbox

### Phase 4: Games
1. Port game logic (unchanged)
2. Adapt rendering to OpenTUI components
3. Wire up focus/pause system

### Phase 5: Polish
1. Theme system
2. Configuration
3. Error handling
4. Testing

---

## 6. Files to Create/Modify

### New Files (OpenTUI-based):
- `src/index.tsx` - Entry point
- `src/App.tsx` - Main application
- `src/components/*.tsx` - All UI components
- `src/claude/*.ts` - Claude integration
- `src/hooks/*.ts` - React hooks

### Preserve (Logic unchanged):
- `src/games/*.tsx` - Game logic (adapt rendering only)
- `src/config/*.ts` - Configuration system
- `src/themes/*.ts` - Theme definitions

### Delete:
- All Ink-specific code
- Current Layout.tsx, SplitPane.tsx (rewrite)
- styled-components.tsx (not needed)

---

## 7. Dependencies

```json
{
  "dependencies": {
    "@opentui/react": "^0.1.72",
    "@opentui/core": "^0.1.72",
    "react": "^19.0.0"
  }
}
```

**Note:** OpenTUI requires Zig for building native components.

---

## 8. Verification Plan

1. **Build passes:** `npm run build` succeeds
2. **App launches:** `npm start` shows split-pane UI
3. **Keyboard works:** Tab switches focus, game controls work
4. **Ralph loop:** Can load PRD and run iterations
5. **Games playable:** All 4 games render and respond to input
6. **Themes work:** Can switch themes at runtime

---

## 9. Design Decisions

1. **PRD format:** `prd.json` - Structured JSON for easier programmatic parsing
2. **Claude output mode:** Streaming - Real-time output display as Claude works
3. **Backward compatibility:** Fresh start - New config format, no migration needed
4. **Default max iterations:** 10 (configurable)

### prd.json Format
```json
{
  "title": "Project Name",
  "tasks": [
    {
      "id": "task-1",
      "title": "Implement feature X",
      "description": "Details...",
      "status": "pending | in_progress | completed",
      "iteration": null
    }
  ],
  "currentTask": "task-1",
  "iteration": 0,
  "maxIterations": 10
}
```

---

## Sources

- [OpenTUI GitHub](https://github.com/anomalyco/opentui)
- [Ralph Wiggum Autonomous Loops](https://paddo.dev/blog/ralph-wiggum-autonomous-loops/)
- [Getting Started With Ralph](https://www.aihero.dev/getting-started-with-ralph)
- [Ralph GitHub (snarktank)](https://github.com/snarktank/ralph)
