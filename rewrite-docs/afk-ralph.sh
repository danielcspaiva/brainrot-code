#!/bin/bash
set -e

# AFK Ralph Loop for BrainRot CLI v2 - OpenTUI Rewrite
# Run from project root: ./rewrite-docs/afk-ralph.sh <iterations>

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PRD_FILE="$SCRIPT_DIR/PRD.md"
PROGRESS_FILE="$SCRIPT_DIR/progress.txt"

cd "$PROJECT_ROOT"

if [ -z "$1" ]; then
  echo "Usage: $0 <iterations>"
  echo "Example: $0 10"
  exit 1
fi

echo "Starting Ralph loop with $1 iterations..."
echo "PRD: $PRD_FILE"
echo "Progress: $PROGRESS_FILE"
echo ""

for ((i=1; i<=$1; i++)); do
  echo "=== Iteration $i/$1 ==="

  result=$(claude --dangerously-skip-permissions -p "@$PRD_FILE @$PROGRESS_FILE \
  You are implementing the BrainRot CLI v2 rewrite from Ink to OpenTUI.

  1. Read the PRD and progress file carefully.
  2. Find the next incomplete task from the migration phases.
  3. Implement ONLY that single task.
  4. Run 'npm run typecheck' and 'npm run build' to verify.
  5. Update progress.txt with what you completed.
  6. Commit your changes with a clear message.

  IMPORTANT: Only work on ONE task per iteration.
  If all tasks in the PRD are complete, output <promise>COMPLETE</promise>.")

  echo "$result"
  echo ""

  if [[ "$result" == *"<promise>COMPLETE</promise>"* ]]; then
    echo "PRD complete after $i iterations!"
    exit 0
  fi
done

echo "Completed $1 iterations. Run again to continue."
