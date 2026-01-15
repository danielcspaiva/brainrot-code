/**
 * Base split layout shell.
 */

import { useTerminalDimensions } from "@opentui/react";
import { memo } from "react";
import type { ReactNode } from "react";
import type { LayoutPresetId } from "./layouts.js";

export interface LayoutProps {
  layoutId: LayoutPresetId;
  splitRatio: number;
  banner?: ReactNode;
  claude: ReactNode;
  tasks: ReactNode;
  game: ReactNode;
  status: ReactNode;
}

const MIN_PANE_WIDTH = 20;

const Layout = memo(function Layout({
  layoutId,
  splitRatio,
  banner,
  claude,
  tasks,
  game,
  status,
}: LayoutProps) {
  const { width } = useTerminalDimensions();

  const leftWidth = Math.max(MIN_PANE_WIDTH, Math.floor(width * splitRatio) - 1);
  const rightWidth = Math.max(MIN_PANE_WIDTH, width - leftWidth - 1);

  const showTasks = layoutId === "default" || layoutId === "tasks-focus";
  const showGame = layoutId !== "focus";

  return (
    <box
      style={{
        flexDirection: "column",
        width: "100%",
        height: "100%",
      }}
    >
      {banner}
      {layoutId === "focus" ? (
        <box style={{ flexGrow: 1, flexDirection: "column" }}>{claude}</box>
      ) : (
        <box
          style={{
            flexDirection: "row",
            flexGrow: 1,
            gap: 1,
          }}
        >
          {layoutId === "tasks-focus" ? (
            <>
              <box style={{ width: leftWidth, flexDirection: "column" }}>
                {tasks}
              </box>
              <box style={{ width: rightWidth, flexDirection: "column" }}>
                {claude}
              </box>
            </>
          ) : (
            <>
              <box style={{ width: leftWidth, flexDirection: "column" }}>
                {claude}
              </box>
              <box style={{ width: rightWidth, flexDirection: "column" }}>
                {showTasks && showGame ? (
                  <box style={{ flexDirection: "column", flexGrow: 1, gap: 1 }}>
                    <box style={{ flexGrow: 1 }}>{tasks}</box>
                    <box style={{ flexGrow: 1 }}>{game}</box>
                  </box>
                ) : (
                  <box style={{ flexGrow: 1 }}>{game}</box>
                )}
              </box>
            </>
          )}
        </box>
      )}
      {status}
    </box>
  );
});

export default Layout;
