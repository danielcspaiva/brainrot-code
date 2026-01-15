/**
 * Basic centered overlay wrapper.
 */

import { useTerminalDimensions } from "@opentui/react";
import type { ReactNode } from "react";
import { useThemeColors } from "../../theme/ThemeProvider.js";

export interface OverlayProps {
  isVisible: boolean;
  title?: string;
  width?: number;
  height?: number;
  children: ReactNode;
}

export default function Overlay({
  isVisible,
  title,
  width,
  height,
  children,
}: OverlayProps) {
  const colors = useThemeColors();
  const dimensions = useTerminalDimensions();

  if (!isVisible) return null;

  const overlayWidth = width ?? Math.min(80, dimensions.width - 4);
  const overlayHeight = height ?? Math.min(24, dimensions.height - 4);

  return (
    <box
      style={{
        position: "absolute",
        left: Math.max(0, Math.floor((dimensions.width - overlayWidth) / 2)),
        top: Math.max(0, Math.floor((dimensions.height - overlayHeight) / 2)),
        width: overlayWidth,
        height: overlayHeight,
        border: true,
        borderStyle: "double",
        borderColor: colors.borderFocus,
        padding: 1,
        flexDirection: "column",
        backgroundColor: colors.panelBg,
      }}
      title={title}
    >
      {children}
    </box>
  );
}
