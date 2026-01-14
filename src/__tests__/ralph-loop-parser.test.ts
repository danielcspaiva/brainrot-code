import { describe, it, expect } from "vitest";
import {
  createInitialState,
  parseOutput,
  parseOutputLines,
  needsUserAttention,
  getStatusMessage,
  getProgressString,
} from "../ralph-loop-parser.js";

describe("ralph-loop-parser", () => {
  describe("createInitialState", () => {
    it("should create a state with idle status", () => {
      const state = createInitialState();
      expect(state.status).toBe("idle");
    });

    it("should create a state with no user attention needed", () => {
      const state = createInitialState();
      expect(state.userAttention.needed).toBe(false);
    });

    it("should create a state with zero progress", () => {
      const state = createInitialState();
      expect(state.progress.currentStep).toBe(0);
      expect(state.progress.totalSteps).toBeNull();
    });
  });

  describe("parseOutput", () => {
    it("should detect loop started status", () => {
      const state = createInitialState();
      const newState = parseOutput("ralph loop started", state);
      expect(newState.status).toBe("running");
    });

    it("should detect loop completed status", () => {
      const state = createInitialState();
      const newState = parseOutput("loop completed successfully", state);
      expect(newState.status).toBe("completed");
    });

    it("should detect loop errored status", () => {
      const state = createInitialState();
      const newState = parseOutput("loop error: something went wrong", state);
      expect(newState.status).toBe("errored");
    });

    it("should detect waiting for input status", () => {
      const state = createInitialState();
      const newState = parseOutput("waiting for user input", state);
      expect(newState.status).toBe("waiting_for_input");
    });

    it("should parse step progress", () => {
      const state = createInitialState();
      const newState = parseOutput("Step 3 of 10", state);
      expect(newState.progress.currentStep).toBe(3);
      expect(newState.progress.totalSteps).toBe(10);
      expect(newState.progress.percentage).toBe(30);
    });

    it("should parse todo progress", () => {
      const state = createInitialState();
      const newState = parseOutput("Todos: 5/20", state);
      expect(newState.progress.currentStep).toBe(5);
      expect(newState.progress.totalSteps).toBe(20);
      expect(newState.progress.percentage).toBe(25);
    });

    it("should detect tool usage", () => {
      const state = createInitialState();
      const newState = parseOutput("using tool: ReadFile", state);
      expect(newState.agentActivity.isActive).toBe(true);
      expect(newState.agentActivity.toolName).toBe("ReadFile");
    });

    it("should detect error messages requiring attention", () => {
      const state = createInitialState();
      const newState = parseOutput("Error: file not found", state);
      expect(newState.userAttention.needed).toBe(true);
      expect(newState.userAttention.type).toBe("error");
    });

    it("should handle empty output gracefully", () => {
      const state = createInitialState();
      const newState = parseOutput("", state);
      expect(newState).toEqual(state);
    });

    it("should strip ANSI escape sequences", () => {
      const state = createInitialState();
      const newState = parseOutput("\x1b[32mloop started\x1b[0m", state);
      expect(newState.status).toBe("running");
    });
  });

  describe("parseOutputLines", () => {
    it("should accumulate state across multiple lines", () => {
      const lines = ["ralph loop started", "Step 2 of 5", "using tool: Write"];
      const state = parseOutputLines(lines);
      expect(state.status).toBe("running");
      expect(state.progress.currentStep).toBe(2);
      expect(state.agentActivity.toolName).toBe("Write");
    });
  });

  describe("needsUserAttention", () => {
    it("should return true when userAttention.needed is true", () => {
      const state = createInitialState();
      state.userAttention.needed = true;
      expect(needsUserAttention(state)).toBe(true);
    });

    it("should return true when status is waiting_for_input", () => {
      const state = createInitialState();
      state.status = "waiting_for_input";
      expect(needsUserAttention(state)).toBe(true);
    });

    it("should return true when status is errored", () => {
      const state = createInitialState();
      state.status = "errored";
      expect(needsUserAttention(state)).toBe(true);
    });

    it("should return false for normal running state", () => {
      const state = createInitialState();
      state.status = "running";
      expect(needsUserAttention(state)).toBe(false);
    });
  });

  describe("getStatusMessage", () => {
    it("should return 'Ready to start' for idle status", () => {
      const state = createInitialState();
      expect(getStatusMessage(state)).toBe("Ready to start");
    });

    it("should return 'Completed' for completed status", () => {
      const state = createInitialState();
      state.status = "completed";
      expect(getStatusMessage(state)).toBe("Completed");
    });

    it("should return current action when running with activity", () => {
      const state = createInitialState();
      state.status = "running";
      state.agentActivity.currentAction = "Reading files";
      expect(getStatusMessage(state)).toBe("Reading files");
    });
  });

  describe("getProgressString", () => {
    it("should return step progress format", () => {
      const state = createInitialState();
      state.progress.currentStep = 3;
      state.progress.totalSteps = 10;
      expect(getProgressString(state)).toBe("3/10");
    });

    it("should return percentage format when no total steps", () => {
      const state = createInitialState();
      state.progress.percentage = 75;
      expect(getProgressString(state)).toBe("75%");
    });

    it("should return null when no progress info", () => {
      const state = createInitialState();
      expect(getProgressString(state)).toBeNull();
    });
  });
});
