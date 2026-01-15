import { describe, expect, it } from "vitest";
import { ClaudeStreamParser } from "../stream-parser.js";

describe("ClaudeStreamParser", () => {
  it("parses newline-delimited JSON events", () => {
    const parser = new ClaudeStreamParser();
    const input =
      "{\"type\":\"system\",\"content\":\"start\"}\n" +
      "{\"type\":\"assistant\",\"message\":{\"content\":[{\"type\":\"text\",\"text\":\"hello\"}]}}\n";

    const events = parser.feed(input);
    expect(events).toHaveLength(2);
    expect(events[0].event?.type).toBe("system");
    expect(events[1].event?.type).toBe("assistant");
  });

  it("buffers partial lines", () => {
    const parser = new ClaudeStreamParser();
    const first = parser.feed("{\"type\":\"system\"}");
    expect(first).toHaveLength(0);

    const second = parser.feed("\n");
    expect(second).toHaveLength(1);
    expect(second[0].event?.type).toBe("system");
  });
});
