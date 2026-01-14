/**
 * Achievement Notification Component
 *
 * Displays a notification when an achievement is unlocked.
 * Supports queuing multiple achievements and auto-dismiss.
 */

import { Box, Text } from "ink";
import { useState, useEffect, useCallback } from "react";
import { getAchievementById, type Achievement } from "./stats.js";
import { useThemeColors } from "./useTheme.js";

export interface AchievementNotificationProps {
  /** Achievement IDs to display */
  achievementIds: string[];
  /** Callback when all notifications have been shown */
  onComplete?: () => void;
  /** Duration to show each notification (ms) */
  duration?: number;
}

/**
 * Single achievement notification display
 */
function AchievementBanner({ achievement }: { achievement: Achievement }) {
  const colors = useThemeColors();

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={colors.warning}
      paddingX={2}
      paddingY={1}
      alignItems="center"
    >
      <Box>
        <Text color={colors.warning} bold>
          {achievement.icon} ACHIEVEMENT UNLOCKED {achievement.icon}
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text bold color={colors.primary}>
          {achievement.name}
        </Text>
      </Box>
      <Box>
        <Text dimColor>{achievement.description}</Text>
      </Box>
    </Box>
  );
}

/**
 * Achievement notification queue manager
 */
export function AchievementNotification({
  achievementIds,
  onComplete,
  duration = 3000,
}: AchievementNotificationProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentAchievement, setCurrentAchievement] = useState<Achievement | null>(null);

  // Get current achievement details
  useEffect(() => {
    if (currentIndex < achievementIds.length) {
      const achievement = getAchievementById(achievementIds[currentIndex]);
      setCurrentAchievement(achievement ?? null);
    } else {
      setCurrentAchievement(null);
      onComplete?.();
    }
  }, [currentIndex, achievementIds, onComplete]);

  // Auto-advance to next achievement
  useEffect(() => {
    if (!currentAchievement) return;

    const timer = setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
    }, duration);

    return () => clearTimeout(timer);
  }, [currentAchievement, duration]);

  if (!currentAchievement) {
    return null;
  }

  return <AchievementBanner achievement={currentAchievement} />;
}

/**
 * Hook for managing achievement notifications
 */
export function useAchievementNotifications() {
  const [queue, setQueue] = useState<string[]>([]);
  const [isShowing, setIsShowing] = useState(false);

  const addAchievements = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setQueue((prev) => [...prev, ...ids]);
    setIsShowing(true);
  }, []);

  const handleComplete = useCallback(() => {
    setQueue([]);
    setIsShowing(false);
  }, []);

  const NotificationComponent = isShowing && queue.length > 0 ? (
    <AchievementNotification
      achievementIds={queue}
      onComplete={handleComplete}
    />
  ) : null;

  return {
    addAchievements,
    NotificationComponent,
    hasNotifications: isShowing && queue.length > 0,
  };
}

export default AchievementNotification;
