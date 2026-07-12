import { useCallback, useEffect, useState } from "react";

import {
  isTheme,
  resolveTheme,
  THEME_STORAGE_KEY,
  type Theme,
} from "./theme";

function storedTheme(): string | null {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

function initialTheme(): Theme {
  const bootTheme = document.documentElement.dataset.theme;
  if (isTheme(bootTheme)) return bootTheme;
  return resolveTheme(storedTheme());
}

function applyTheme(theme: Theme, persist: boolean): void {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = "dark";
  if (!persist) return;

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Theme still applies for this page when storage is unavailable.
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(initialTheme);

  const setTheme = useCallback((nextTheme: Theme) => {
    applyTheme(nextTheme, true);
    setThemeState(nextTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "plain" ? "phosphor" : "plain");
  }, [setTheme, theme]);

  useEffect(() => {
    applyTheme(theme, false);
  }, [theme]);

  useEffect(() => {
    const syncStoredTheme = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return;
      setThemeState(resolveTheme(event.newValue));
    };

    window.addEventListener("storage", syncStoredTheme);
    return () => {
      window.removeEventListener("storage", syncStoredTheme);
    };
  }, []);

  return { theme, setTheme, toggleTheme } as const;
}
