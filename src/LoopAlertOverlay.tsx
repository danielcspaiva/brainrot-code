/**
 * Loop Alert Overlay
 *
 * Displays an alert overlay when the loop needs user attention,
 * automatically pausing the game and showing the notification.
 */

import { Box, Text } from "ink";
import type { LoopAttention } from "./game-types.js";

interface LoopAlertOverlayProps {
  attention: LoopAttention;
  onAcknowledge?: () => void;
  onDismiss?: () => void;
}

function getAlertIcon(type: LoopAttention["type"]): string {
  switch (type) {
    case "question":
      return "?";
    case "confirmation":
      return "!";
    case "error":
      return "X";
    case "permission":
      return "*";
    default:
      return "!";
  }
}

function getAlertColor(type: LoopAttention["type"]): string {
  switch (type) {
    case "question":
      return "cyan";
    case "confirmation":
      return "yellow";
    case "error":
      return "red";
    case "permission":
      return "magenta";
    default:
      return "yellow";
  }
}

export function LoopAlertOverlay({
  attention,
}: LoopAlertOverlayProps) {
  const icon = getAlertIcon(attention.type);
  const color = getAlertColor(attention.type);

  return (
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      padding={1}
    >
      <Box borderStyle="round" borderColor={color} paddingX={2} paddingY={1}>
        <Box flexDirection="column" alignItems="center">
          <Text bold color={color}>
            [{icon}] LOOP NEEDS ATTENTION
          </Text>

          {attention.reason && (
            <Box marginTop={1}>
              <Text color={color}>{attention.reason}</Text>
            </Box>
          )}

          {attention.prompt && (
            <Box marginTop={1}>
              <Text dimColor wrap="wrap">
                {attention.prompt.length > 60
                  ? attention.prompt.slice(0, 57) + "..."
                  : attention.prompt}
              </Text>
            </Box>
          )}
        </Box>
      </Box>

      <Box marginTop={1} flexDirection="column" alignItems="center">
        <Text dimColor>Game paused - Loop requires input</Text>
        <Text dimColor>Tab: View/Respond | Enter: Dismiss | P: Resume</Text>
      </Box>
    </Box>
  );
}
