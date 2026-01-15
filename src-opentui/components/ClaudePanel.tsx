/**
 * ClaudePanel component for BrainRot CLI v2
 *
 * Displays Claude Code output in a scrollable panel with:
 * - Border indicating focus state
 * - Scrollable output area
 * - Input area for user prompts
 */

export interface ClaudePanelProps {
  /** Whether this panel has focus */
  hasFocus: boolean;
  /** Claude output lines to display */
  output?: string[];
  /** Error message to display */
  error?: string | null;
}

export default function ClaudePanel({
  hasFocus,
  output = [],
  error,
}: ClaudePanelProps) {
  return (
    <box
      title="Claude"
      style={{
        border: true,
        borderStyle: hasFocus ? "double" : "single",
        borderColor: hasFocus ? "#00FF00" : "#444444",
        flexGrow: 1,
        flexDirection: "column",
        padding: 1,
      }}
    >
      {/* Header */}
      <text fg="#00FF00" bold>
        BrainRot CLI v2 - OpenTUI
      </text>

      {/* Output area */}
      {output.length > 0 ? (
        <scrollbox style={{ flexGrow: 1 }}>
          {output.map((line, i) => (
            <text key={i} fg="#CCCCCC">
              {line}
            </text>
          ))}
        </scrollbox>
      ) : (
        <box style={{ flexGrow: 1, justifyContent: "center" }}>
          <text fg="#888888">Claude Code output will appear here</text>
          <text fg="#666666">Start a Ralph loop to begin</text>
        </box>
      )}

      {/* Error display */}
      {error && (
        <box
          style={{
            backgroundColor: "#330000",
            padding: 1,
            marginTop: 1,
          }}
        >
          <text fg="#FF0000" bold>
            Error: {error}
          </text>
        </box>
      )}

      {/* Input hint when focused */}
      {hasFocus && (
        <box
          style={{
            borderTop: true,
            borderColor: "#444444",
            marginTop: 1,
            paddingTop: 1,
          }}
        >
          <text fg="#666666">Press Enter to send input to Claude</text>
        </box>
      )}
    </box>
  );
}
