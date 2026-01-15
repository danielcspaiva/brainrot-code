/**
 * React Hook for Configuration Management
 *
 * Provides access to the application configuration in React components.
 * Handles async loading with proper state management.
 */

import { useState, useEffect, useCallback } from "react";
import {
  type BrainrotConfig,
  loadConfig,
  saveConfig,
  updateConfig,
  resetConfig,
  DEFAULT_CONFIG,
  getLayoutOptions,
  getClaudeCodeOptions,
  getAppSettings,
} from "./config.js";

export interface UseConfigResult {
  /** Current configuration (defaults while loading) */
  config: BrainrotConfig;
  /** Whether config is still loading */
  isLoading: boolean;
  /** Error if config failed to load */
  error: Error | null;
  /** Reload configuration from disk */
  reload: () => Promise<void>;
  /** Update configuration */
  update: (updates: Partial<Omit<BrainrotConfig, "version">>) => Promise<void>;
  /** Reset configuration to defaults */
  reset: () => Promise<void>;
  /** Save entire configuration */
  save: (config: BrainrotConfig) => Promise<void>;
}

/**
 * React hook for accessing and managing application configuration.
 *
 * @example
 * ```tsx
 * const { config, isLoading } = useConfig();
 *
 * if (isLoading) return <Text>Loading config...</Text>;
 *
 * return <Text>Split ratio: {config.layout?.splitRatio}</Text>;
 * ```
 */
export function useConfig(): UseConfigResult {
  const [config, setConfig] = useState<BrainrotConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadConfigFromDisk = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const loaded = await loadConfig();
      setConfig(loaded);
    } catch (e) {
      setError(e instanceof Error ? e : new Error("Failed to load config"));
      // Keep defaults on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConfigFromDisk();
  }, [loadConfigFromDisk]);

  const reload = useCallback(async () => {
    await loadConfigFromDisk();
  }, [loadConfigFromDisk]);

  const update = useCallback(
    async (updates: Partial<Omit<BrainrotConfig, "version">>) => {
      try {
        const updated = await updateConfig(updates);
        setConfig(updated);
      } catch (e) {
        setError(e instanceof Error ? e : new Error("Failed to update config"));
      }
    },
    []
  );

  const reset = useCallback(async () => {
    try {
      await resetConfig();
      setConfig(DEFAULT_CONFIG);
    } catch (e) {
      setError(e instanceof Error ? e : new Error("Failed to reset config"));
    }
  }, []);

  const save = useCallback(async (newConfig: BrainrotConfig) => {
    try {
      await saveConfig(newConfig);
      setConfig(newConfig);
    } catch (e) {
      setError(e instanceof Error ? e : new Error("Failed to save config"));
    }
  }, []);

  return {
    config,
    isLoading,
    error,
    reload,
    update,
    reset,
    save,
  };
}

/**
 * Hook to get layout options from config, ready for useLayoutState
 */
export function useLayoutConfig(): {
  options: ReturnType<typeof getLayoutOptions>;
  isLoading: boolean;
} {
  const { config, isLoading } = useConfig();
  return {
    options: getLayoutOptions(config),
    isLoading,
  };
}

/**
 * Hook to get Claude Code options from config
 */
export function useClaudeCodeConfig(): {
  options: ReturnType<typeof getClaudeCodeOptions>;
  isLoading: boolean;
} {
  const { config, isLoading } = useConfig();
  return {
    options: getClaudeCodeOptions(config),
    isLoading,
  };
}

/**
 * Hook to get app settings from config
 */
export function useAppSettings(): {
  settings: ReturnType<typeof getAppSettings>;
  isLoading: boolean;
} {
  const { config, isLoading } = useConfig();
  return {
    settings: getAppSettings(config),
    isLoading,
  };
}
