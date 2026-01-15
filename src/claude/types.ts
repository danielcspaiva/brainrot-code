/**
 * Claude stream event and output types.
 */

export type StreamContent =
  | { type: "text"; text: string }
  | { type: "tool_use"; name: string; input?: unknown }
  | { type: "tool_result"; name?: string; content?: string; is_error?: boolean };

export interface StreamMessage {
  content: StreamContent[];
}

export interface ClaudeStreamEvent {
  type: "system" | "assistant" | "user" | "result" | "error" | string;
  message?: StreamMessage;
  content?: string;
  result?: string;
  error?: string;
}

export type OutputLineKind =
  | "text"
  | "tool"
  | "system"
  | "result"
  | "error";

export interface ClaudeOutputLine {
  id: string;
  kind: OutputLineKind;
  text: string;
}

export interface ClaudeActivity {
  status: "idle" | "running" | "waiting" | "error";
  currentTool?: string | null;
}
