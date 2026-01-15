/**
 * Layout presets and helpers.
 */

export type LayoutPresetId = "default" | "two-pane" | "focus" | "tasks-focus";

export interface LayoutPreset {
  id: LayoutPresetId;
  name: string;
  description: string;
}

export const layoutPresets: LayoutPreset[] = [
  {
    id: "default",
    name: "Default",
    description: "Claude left, tasks + game stacked right",
  },
  {
    id: "two-pane",
    name: "Two Pane",
    description: "Claude left, game right (tasks overlay)",
  },
  {
    id: "focus",
    name: "Focus",
    description: "Claude full width (overlays only)",
  },
  {
    id: "tasks-focus",
    name: "Tasks Focus",
    description: "Tasks left, Claude right (game overlay)",
  },
];

export function getLayoutPreset(id: LayoutPresetId): LayoutPreset {
  return layoutPresets.find((preset) => preset.id === id) ?? layoutPresets[0];
}

export function getLayoutPresetIds(): LayoutPresetId[] {
  return layoutPresets.map((preset) => preset.id);
}

export function getNextLayoutId(current: LayoutPresetId): LayoutPresetId {
  const ids = getLayoutPresetIds();
  const index = ids.indexOf(current);
  const nextIndex = index === -1 ? 0 : (index + 1) % ids.length;
  return ids[nextIndex];
}
