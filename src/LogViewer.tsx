/**
 * LogViewer Component
 *
 * Real-time log streaming component with scrollable view,
 * condensed/full view toggle, and formatted output.
 */

import { Box, Text, useInput } from "ink";
import { useState, useEffect, useRef, useMemo, memo, useCallback } from "react";
import type { ClaudeCodeOutput } from "./use-claude-code.js";
import { useThemeColors } from "./useTheme.js";

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
    const content =
      viewMode === "condensed" ? stripAnsi(log.content) : log.content;

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
 * Single log line component - memoized to prevent unnecessary re-renders during scrolling
 */
const LogLineDisplay = memo(function LogLineDisplay({
  line,
  showTimestamp,
  viewMode,
}: {
  line: LogLine;
  showTimestamp: boolean;
  viewMode: "condensed" | "full";
}) {
  const colors = useThemeColors();
  const textColor = line.type === "stderr" ? colors.error : colors.text;

  return (
    <Box>
      {showTimestamp && (
        <Text dimColor>[{formatTimestamp(line.timestamp)}] </Text>
      )}
      {viewMode === "full" && (
        <Text color={line.type === "stderr" ? colors.error : colors.textMuted}>
          {line.type === "stderr" ? "ERR " : "OUT "}
        </Text>
      )}
      <Text color={textColor} wrap="truncate">
        {line.content}
      </Text>
    </Box>
  );
});

/**
 * Scrollbar indicator component - memoized for stable rendering
 */
const ScrollIndicator = memo(function ScrollIndicator({
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

  const scrollPercentage =
    totalLines > visibleLines
      ? (currentPosition / (totalLines - visibleLines)) * 100
      : 0;

  return (
    <Box flexDirection="column" marginLeft={1}>
      <Text dimColor>{scrollPercentage < 100 ? "^" : " "}</Text>
      <Text dimColor>{Math.round(scrollPercentage)}%</Text>
      <Text dimColor>{scrollPercentage > 0 ? "v" : " "}</Text>
    </Box>
  );
});

/**
 * Log viewer header with controls - memoized for stable rendering
 */
const LogViewerHeader = memo(function LogViewerHeader({
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
  const colors = useThemeColors();
  return (
    <Box justifyContent="space-between" marginBottom={1}>
      <Box>
        <Text bold color={colors.primary}>
          Logs
        </Text>
        <Text dimColor> ({totalLines} lines)</Text>
        {autoScroll && <Text color={colors.success}> [AUTO]</Text>}
      </Box>
      <Box>
        <Text dimColor>View: </Text>
        <Text color={viewMode === "full" ? colors.primary : colors.textMuted}>
          {viewMode.toUpperCase()}
        </Text>
        {hasFocus && <Text dimColor> | V: toggle view | J/K: scroll</Text>}
      </Box>
    </Box>
  );
});

/**
 * Log footer showing scroll position - memoized for stable rendering
 */
const LogFooter = memo(function LogFooter({
  scrollPosition,
  effectiveHeight,
  totalLines,
}: {
  scrollPosition: number;
  effectiveHeight: number;
  totalLines: number;
}) {
  if (totalLines <= effectiveHeight) {
    return null;
  }

  return (
    <Box marginTop={1}>
      <Text dimColor>
        Lines {scrollPosition + 1}-
        {Math.min(scrollPosition + effectiveHeight, totalLines)} of {totalLines}
      </Text>
    </Box>
  );
});

/**
 * Main LogViewer component - optimized with memoization for flicker-free rendering
 */
export const LogViewer = memo(function LogViewer({
  logs,
  maxVisibleLines = 20,
  hasFocus = false,
  height,
  initialViewMode = "condensed",
}: LogViewerProps) {
  const [viewMode, setViewMode] = useState<"condensed" | "full">(
    initialViewMode
  );
  const [scrollPosition, setScrollPosition] = useState(0);
  const [autoScroll, setAutoScroll] = useState(true);
  const lastLogCountRef = useRef(logs.length);

  // Process logs into display lines - memoized to prevent reprocessing
  const displayLines = useMemo(
    () => processLogs(logs, viewMode),
    [logs, viewMode]
  );

  // Calculate visible area - memoized
  const effectiveHeight = useMemo(
    () => (height ? Math.max(height - 4, 5) : maxVisibleLines),
    [height, maxVisibleLines]
  );

  const totalLines = displayLines.length;
  const maxScroll = useMemo(
    () => Math.max(0, totalLines - effectiveHeight),
    [totalLines, effectiveHeight]
  );

  // Auto-scroll when new logs arrive
  useEffect(() => {
    if (logs.length > lastLogCountRef.current && autoScroll) {
      setScrollPosition(maxScroll);
    }
    lastLogCountRef.current = logs.length;
  }, [logs.length, maxScroll, autoScroll]);

  // Memoized scroll handlers using useCallback
  const handleScrollUp = useCallback(() => {
    setScrollPosition((pos) => Math.max(0, pos - 1));
    setAutoScroll(false);
  }, []);

  const handleScrollDown = useCallback(() => {
    setScrollPosition((pos) => {
      const newPos = Math.min(maxScroll, pos + 1);
      if (newPos === maxScroll) {
        setAutoScroll(true);
      }
      return newPos;
    });
  }, [maxScroll]);

  const handlePageUp = useCallback(() => {
    setScrollPosition((pos) => Math.max(0, pos - effectiveHeight));
    setAutoScroll(false);
  }, [effectiveHeight]);

  const handlePageDown = useCallback(() => {
    setScrollPosition((pos) => {
      const newPos = Math.min(maxScroll, pos + effectiveHeight);
      if (newPos === maxScroll) {
        setAutoScroll(true);
      }
      return newPos;
    });
  }, [maxScroll, effectiveHeight]);

  const handleJumpTop = useCallback(() => {
    setScrollPosition(0);
    setAutoScroll(false);
  }, []);

  const handleJumpBottom = useCallback(() => {
    setScrollPosition(maxScroll);
    setAutoScroll(true);
  }, [maxScroll]);

  const handleToggleAutoScroll = useCallback(() => {
    setAutoScroll((current) => {
      if (!current) {
        setScrollPosition(maxScroll);
      }
      return !current;
    });
  }, [maxScroll]);

  const handleToggleViewMode = useCallback(() => {
    setViewMode((current) => (current === "condensed" ? "full" : "condensed"));
  }, []);

  // Handle keyboard input when focused
  useInput(
    (input, key) => {
      if (!hasFocus) return;

      // Toggle view mode with 'v'
      if (input === "v" || input === "V") {
        handleToggleViewMode();
        return;
      }

      // Scroll up with 'k' or arrow up
      if (input === "k" || key.upArrow) {
        handleScrollUp();
        return;
      }

      // Scroll down with 'j' or arrow down
      if (input === "j" || key.downArrow) {
        handleScrollDown();
        return;
      }

      // Page up with 'u' or page up
      if (input === "u" || key.pageUp) {
        handlePageUp();
        return;
      }

      // Page down with 'd' or page down
      if (input === "d" || key.pageDown) {
        handlePageDown();
        return;
      }

      // Jump to top with 'g'
      if (input === "g") {
        handleJumpTop();
        return;
      }

      // Jump to bottom with 'G'
      if (input === "G") {
        handleJumpBottom();
        return;
      }

      // Toggle auto-scroll with 'a'
      if (input === "a" || input === "A") {
        handleToggleAutoScroll();
        return;
      }
    },
    { isActive: hasFocus }
  );

  // Get visible lines based on scroll position - memoized for stable rendering
  const visibleLines = useMemo(
    () => displayLines.slice(scrollPosition, scrollPosition + effectiveHeight),
    [displayLines, scrollPosition, effectiveHeight]
  );

  // Show timestamps only in full mode
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

      <LogFooter
        scrollPosition={scrollPosition}
        effectiveHeight={effectiveHeight}
        totalLines={totalLines}
      />
    </Box>
  );
});

export default LogViewer;
