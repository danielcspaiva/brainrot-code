/**
 * Task list pane with basic editing.
 */

import { useKeyboard } from "@opentui/react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useThemeColors } from "../../theme/ThemeProvider.js";
import type { LoopTask } from "../../data/loop-state.js";

export interface TaskPaneProps {
  hasFocus: boolean;
  tasks: LoopTask[];
  currentTaskId?: string | null;
  onToggleStatus: (taskId: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<LoopTask>) => void;
  onCreateTask: (title: string) => void;
  onDeleteTask: (taskId: string) => void;
}

function statusLabel(status: LoopTask["status"]): string {
  if (status === "completed") return "[x]";
  if (status === "in_progress") return "[>]";
  return "[ ]";
}

const TaskPane = memo(function TaskPane({
  hasFocus,
  tasks,
  currentTaskId,
  onToggleStatus,
  onUpdateTask,
  onCreateTask,
  onDeleteTask,
}: TaskPaneProps) {
  const colors = useThemeColors();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editValue, setEditValue] = useState("");

  const selectedTask = tasks[selectedIndex] ?? null;

  useEffect(() => {
    if (selectedIndex >= tasks.length) {
      setSelectedIndex(Math.max(0, tasks.length - 1));
    }
  }, [selectedIndex, tasks.length]);

  const header = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((task) => task.status === "completed").length;
    return `${completed}/${total} completed`;
  }, [tasks]);

  const currentTask = useMemo(() => {
    if (!currentTaskId) return null;
    return tasks.find((task) => task.id === currentTaskId) ?? null;
  }, [currentTaskId, tasks]);

  const currentTaskLabel = currentTask
    ? `Current: ${currentTask.title}`
    : "Current: -";

  const statusColor = useCallback(
    (status: LoopTask["status"]) => {
      if (status === "completed") return colors.success;
      if (status === "in_progress") return colors.warning;
      return colors.textMuted;
    },
    [colors]
  );

  useKeyboard(
    useCallback(
      (key) => {
        if (!hasFocus) return;

        if (isEditing) {
          if (key.name === "escape") {
            setIsEditing(false);
            setIsCreating(false);
            setEditValue("");
          }
          return;
        }

        if (key.name === "up" || key.name === "k") {
          if (tasks.length === 0) return;
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : tasks.length - 1));
        }

        if (key.name === "down" || key.name === "j") {
          if (tasks.length === 0) return;
          setSelectedIndex((prev) => (prev < tasks.length - 1 ? prev + 1 : 0));
        }

        if (key.name === "space") {
          if (selectedTask) {
            onToggleStatus(selectedTask.id);
          }
        }

        if (key.name === "n") {
          setIsCreating(true);
          setIsEditing(true);
          setEditValue("");
        }

        if (key.name === "e" && selectedTask) {
          setIsCreating(false);
          setIsEditing(true);
          setEditValue(selectedTask.title);
        }

        if (key.name === "d" && selectedTask) {
          onDeleteTask(selectedTask.id);
        }
      },
      [
        hasFocus,
        isEditing,
        onDeleteTask,
        onToggleStatus,
        selectedTask,
        tasks.length,
      ]
    )
  );

  return (
    <box
      title="Tasks"
      style={{
        border: true,
        borderStyle: hasFocus ? "double" : "single",
        borderColor: hasFocus ? colors.borderFocus : colors.border,
        flexGrow: 1,
        flexDirection: "column",
        padding: 1,
      }}
    >
      <box style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <text fg={colors.textMuted}>{header}</text>
        <text fg={colors.textMuted}>{hasFocus ? "N:New E:Edit D:Delete" : ""}</text>
      </box>
      <box style={{ marginTop: 1 }}>
        <text fg={colors.textMuted}>{currentTaskLabel}</text>
      </box>

      {isEditing ? (
        <box style={{ marginTop: 1, flexDirection: "column", gap: 1 }}>
          <text fg={colors.text}>
            {isCreating ? "New task" : "Edit task"}
          </text>
          <input
            focused={hasFocus}
            value={editValue}
            placeholder="Task title"
            onChange={setEditValue}
            onSubmit={() => {
              if (editValue.trim().length === 0) return;
              if (isCreating) {
                onCreateTask(editValue.trim());
              } else if (selectedTask) {
                onUpdateTask(selectedTask.id, { title: editValue.trim() });
              }
              setIsEditing(false);
              setIsCreating(false);
              setEditValue("");
            }}
            style={{
              border: true,
              borderStyle: "single",
              borderColor: hasFocus ? colors.borderFocus : colors.border,
              paddingLeft: 1,
            }}
          />
          <text fg={colors.textMuted}>Enter: Save | Esc: Cancel</text>
        </box>
      ) : tasks.length === 0 ? (
        <box
          style={{
            flexGrow: 1,
            justifyContent: "center",
            flexDirection: "column",
            gap: 1,
          }}
        >
          <text fg={colors.textMuted}>No tasks yet</text>
          <text fg={colors.textMuted}>
            Run planning or press N to add a task.
          </text>
        </box>
      ) : (
        <scrollbox stickyScroll={false} focused={hasFocus}>
          {tasks.map((task, index) => {
            const isSelected = index === selectedIndex;
            const isCurrent = task.id === currentTaskId;
            return (
              <box key={task.id} style={{ flexDirection: "row", gap: 1 }}>
                <text fg={isSelected ? colors.primary : colors.textMuted}>
                  {isSelected ? ">" : " "}
                </text>
                <text fg={statusColor(task.status)}>{statusLabel(task.status)}</text>
                <text
                  fg={isSelected ? colors.text : isCurrent ? colors.warning : colors.textMuted}
                  bold={isSelected || isCurrent}
                >
                  {task.title}
                </text>
              </box>
            );
          })}
        </scrollbox>
      )}

      {!isEditing && (
        <box style={{ marginTop: 1 }}>
          <text fg={colors.textMuted}>Space: Toggle status | N: New task</text>
        </box>
      )}
    </box>
  );
});

export default TaskPane;
