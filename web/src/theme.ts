export type Theme = "dark" | "light";

export const THEME_STORAGE_KEY = "stoa-theme";

export function isTheme(value: unknown): value is Theme {
  return value === "dark" || value === "light";
}

export function resolveTheme(
  storedTheme: string | null,
  prefersDark: boolean,
): Theme {
  return isTheme(storedTheme) ? storedTheme : prefersDark ? "dark" : "light";
}
