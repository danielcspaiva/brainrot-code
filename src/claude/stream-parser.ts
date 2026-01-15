/**
 * Stream JSON parser for Claude output.
 */

import type { ClaudeStreamEvent } from "./types.js";

export interface ParsedEvent {
  event: ClaudeStreamEvent | null;
  raw: string;
  error?: string;
}

export class ClaudeStreamParser {
  private buffer = "";

  feed(chunk: string): ParsedEvent[] {
    this.buffer += chunk;
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() ?? "";

    const parsed: ParsedEvent[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const event = JSON.parse(trimmed) as ClaudeStreamEvent;
        parsed.push({ event, raw: trimmed });
      } catch (error) {
        parsed.push({
          event: null,
          raw: trimmed,
          error: error instanceof Error ? error.message : "Parse error",
        });
      }
    }

    return parsed;
  }

  flush(): ParsedEvent[] {
    if (!this.buffer.trim()) {
      this.buffer = "";
      return [];
    }

    const leftover = this.buffer;
    this.buffer = "";
    return this.feed(leftover + "\n");
  }
}
