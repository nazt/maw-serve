export type Theme = "plain" | "phosphor";

export const THEME_STORAGE_KEY = "stoa-theme";
export const DEFAULT_THEME: Theme = "plain";

export function isTheme(value: unknown): value is Theme {
  return value === "plain" || value === "phosphor";
}

export function resolveTheme(storedTheme: string | null): Theme {
  return isTheme(storedTheme) ? storedTheme : DEFAULT_THEME;
}
