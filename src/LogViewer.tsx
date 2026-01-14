/**
 * LogViewer Component
 *
 * Real-time log streaming component with scrollable view,
 * condensed/full view toggle, and formatted output.
 */

import { Box, Text, useInput } from "ink";
import { useState, useEffect, useRef, useMemo } from "react";
import type { ClaudeCodeOutput } from "./use-claude-code.js";

export interface LogViewerProps {
  /** Array of log outputs from Claude Code */
  logs: ClaudeCodeOutput[];
  /** Maximum number of lines to display in the viewport */
  maxVisibleLines?: number;
  /** Whether the component has focus for keyboard input */
  hasFocus?: boolean;
  /** Height of the log viewer area */
  height?: number;
  /** Initial view mode */
  initialViewMode?: "condensed" | "full";
}

export interface LogLine {
  id: number;
  timestamp: Date;
  type: "stdout" | "stderr";
  content: string;
  /** Original log entry index for tracking */
  sourceIndex: number;
}

// ANSI escape code regex for stripping colors in condensed view
const ANSI_REGEX =
  // eslint-disable-next-line no-control-regex
  /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

/**
 * Strip ANSI escape codes from text
 */
function stripAnsi(text: string): string {
  return text.replace(ANSI_REGEX, "");
}

/**
 * Format timestamp for log display
 */
function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Process logs into display lines
 */
function processLogs(
  logs: ClaudeCodeOutput[],
  viewMode: "condensed" | "full"
): LogLine[] {
  const lines: LogLine[] = [];
  let lineId = 0;

  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    const content = viewMode === "condensed" ? stripAnsi(log.content) : log.content;

    // Split multi-line content into separate lines
    const contentLines = content.split("\n");

    for (const line of contentLines) {
      // In condensed mode, skip empty lines and whitespace-only lines
      if (viewMode === "condensed" && line.trim() === "") {
        continue;
      }

      lines.push({
        id: lineId++,
        timestamp: log.timestamp,
        type: log.type,
        content: line,
        sourceIndex: i,
      });
    }
  }

  return lines;
}

/**
 * Single log line component
 */
function LogLineDisplay({
  line,
  showTimestamp,
  viewMode,
}: {
  line: LogLine;
  showTimestamp: boolean;
  viewMode: "condensed" | "full";
}) {
  const textColor = line.type === "stderr" ? "red" : "white";

  return (
    <Box>
      {showTimestamp && (
        <Text dimColor>[{formatTimestamp(line.timestamp)}] </Text>
      )}
      {viewMode === "full" && (
        <Text color={line.type === "stderr" ? "red" : "gray"}>
          {line.type === "stderr" ? "ERR " : "OUT "}
        </Text>
      )}
      <Text color={textColor} wrap="truncate">
        {line.content}
      </Text>
    </Box>
  );
}

/**
 * Scrollbar indicator component
 */
function ScrollIndicator({
  currentPosition,
  totalLines,
  visibleLines,
}: {
  currentPosition: number;
  totalLines: number;
  visibleLines: number;
}) {
  if (totalLines <= visibleLines) {
    return null;
  }

  const scrollPercentage = totalLines > visibleLines
    ? (currentPosition / (totalLines - visibleLines)) * 100
    : 0;

  return (
    <Box flexDirection="column" marginLeft={1}>
      <Text dimColor>
        {scrollPercentage < 100 ? "^" : " "}
      </Text>
      <Text dimColor>
        {Math.round(scrollPercentage)}%
      </Text>
      <Text dimColor>
        {scrollPercentage > 0 ? "v" : " "}
      </Text>
    </Box>
  );
}

/**
 * Log viewer header with controls
 */
function LogViewerHeader({
  viewMode,
  totalLines,
  autoScroll,
  hasFocus,
}: {
  viewMode: "condensed" | "full";
  totalLines: number;
  autoScroll: boolean;
  hasFocus: boolean;
}) {
  return (
    <Box justifyContent="space-between" marginBottom={1}>
      <Box>
        <Text bold color="cyan">
          Logs
        </Text>
        <Text dimColor> ({totalLines} lines)</Text>
        {autoScroll && <Text color="green"> [AUTO]</Text>}
      </Box>
      <Box>
        <Text dimColor>View: </Text>
        <Text color={viewMode === "full" ? "cyan" : "gray"}>
          {viewMode.toUpperCase()}
        </Text>
        {hasFocus && (
          <Text dimColor> | V: toggle view | J/K: scroll</Text>
        )}
      </Box>
    </Box>
  );
}

/**
 * Main LogViewer component
 */
export function LogViewer({
  logs,
  maxVisibleLines = 20,
  hasFocus = false,
  height,
  initialViewMode = "condensed",
}: LogViewerProps) {
  const [viewMode, setViewMode] = useState<"condensed" | "full">(initialViewMode);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [autoScroll, setAutoScroll] = useState(true);
  const lastLogCountRef = useRef(logs.length);

  // Process logs into display lines
  const displayLines = useMemo(
    () => processLogs(logs, viewMode),
    [logs, viewMode]
  );

  // Calculate visible area
  const effectiveHeight = height ? Math.max(height - 4, 5) : maxVisibleLines;
  const totalLines = displayLines.length;
  const maxScroll = Math.max(0, totalLines - effectiveHeight);

  // Auto-scroll when new logs arrive
  useEffect(() => {
    if (logs.length > lastLogCountRef.current && autoScroll) {
      setScrollPosition(maxScroll);
    }
    lastLogCountRef.current = logs.length;
  }, [logs.length, maxScroll, autoScroll]);

  // Handle keyboard input when focused
  useInput(
    (input, key) => {
      if (!hasFocus) return;

      // Toggle view mode with 'v'
      if (input === "v" || input === "V") {
        setViewMode((current) => (current === "condensed" ? "full" : "condensed"));
        return;
      }

      // Scroll up with 'k' or arrow up
      if (input === "k" || key.upArrow) {
        setScrollPosition((pos) => Math.max(0, pos - 1));
        setAutoScroll(false);
        return;
      }

      // Scroll down with 'j' or arrow down
      if (input === "j" || key.downArrow) {
        setScrollPosition((pos) => {
          const newPos = Math.min(maxScroll, pos + 1);
          // Re-enable auto-scroll if we're at the bottom
          if (newPos === maxScroll) {
            setAutoScroll(true);
          }
          return newPos;
        });
        return;
      }

      // Page up with 'u' or page up
      if (input === "u" || key.pageUp) {
        setScrollPosition((pos) => Math.max(0, pos - effectiveHeight));
        setAutoScroll(false);
        return;
      }

      // Page down with 'd' or page down
      if (input === "d" || key.pageDown) {
        setScrollPosition((pos) => {
          const newPos = Math.min(maxScroll, pos + effectiveHeight);
          if (newPos === maxScroll) {
            setAutoScroll(true);
          }
          return newPos;
        });
        return;
      }

      // Jump to top with 'g'
      if (input === "g") {
        setScrollPosition(0);
        setAutoScroll(false);
        return;
      }

      // Jump to bottom with 'G'
      if (input === "G") {
        setScrollPosition(maxScroll);
        setAutoScroll(true);
        return;
      }

      // Toggle auto-scroll with 'a'
      if (input === "a" || input === "A") {
        setAutoScroll((current) => !current);
        if (!autoScroll) {
          setScrollPosition(maxScroll);
        }
        return;
      }
    },
    { isActive: hasFocus }
  );

  // Get visible lines based on scroll position
  const visibleLines = displayLines.slice(
    scrollPosition,
    scrollPosition + effectiveHeight
  );

  // Show timestamps only in full mode or every few lines in condensed
  const showTimestamps = viewMode === "full";

  return (
    <Box flexDirection="column" height={height} padding={1}>
      <LogViewerHeader
        viewMode={viewMode}
        totalLines={totalLines}
        autoScroll={autoScroll}
        hasFocus={hasFocus}
      />

      <Box flexDirection="row" flexGrow={1}>
        <Box flexDirection="column" flexGrow={1}>
          {visibleLines.length === 0 ? (
            <Text dimColor>No logs yet. Start Claude Code to see output.</Text>
          ) : (
            visibleLines.map((line) => (
              <LogLineDisplay
                key={line.id}
                line={line}
                showTimestamp={showTimestamps}
                viewMode={viewMode}
              />
            ))
          )}
        </Box>

        <ScrollIndicator
          currentPosition={scrollPosition}
          totalLines={totalLines}
          visibleLines={effectiveHeight}
        />
      </Box>

      {/* Footer with scroll info */}
      {totalLines > effectiveHeight && (
        <Box marginTop={1}>
          <Text dimColor>
            Lines {scrollPosition + 1}-
            {Math.min(scrollPosition + effectiveHeight, totalLines)} of{" "}
            {totalLines}
          </Text>
        </Box>
      )}
    </Box>
  );
}

export default LogViewer;
