/**
 * Config provider and hook.
 */

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  DEFAULT_CONFIG,
  deepMerge,
  loadConfig,
  type BrainrotConfig,
} from "./config.js";

export interface ConfigState {
  baseConfig: BrainrotConfig;
  config: BrainrotConfig;
  isLoading: boolean;
  setBaseConfig: (config: BrainrotConfig) => void;
}

const ConfigContext = createContext<ConfigState | null>(null);

export interface ConfigProviderProps {
  children: ReactNode;
  overrides?: Partial<BrainrotConfig>;
  configPath?: string;
}

export function ConfigProvider({
  children,
  overrides = {},
  configPath,
}: ConfigProviderProps) {
  const [baseConfig, setBaseConfig] = useState<BrainrotConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    loadConfig(configPath)
      .then((loaded) => {
        if (isMounted) {
          setBaseConfig(loaded);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [configPath]);

  const config = useMemo(
    () => deepMerge(baseConfig, overrides),
    [baseConfig, overrides]
  );

  return (
    <ConfigContext.Provider
      value={{
        baseConfig,
        config,
        isLoading,
        setBaseConfig,
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig(): ConfigState {
  const ctx = useContext(ConfigContext);
  if (!ctx) {
    throw new Error("useConfig must be used within ConfigProvider");
  }
  return ctx;
}
