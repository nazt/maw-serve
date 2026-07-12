import { describe, expect, test } from "bun:test";

import { isTheme, resolveTheme } from "../web/src/theme";

describe("Stoa theme preference", () => {
  test("a saved plain or phosphor choice is restored", () => {
    expect(resolveTheme("plain")).toBe("plain");
    expect(resolveTheme("phosphor")).toBe("phosphor");
  });

  test("plain is the default when no choice has been saved", () => {
    expect(resolveTheme(null)).toBe("plain");
  });

  test("legacy and dormant light values fall back to plain", () => {
    expect(isTheme("light")).toBe(false);
    expect(isTheme("dark")).toBe(false);
    expect(resolveTheme("light")).toBe("plain");
    expect(resolveTheme("dark")).toBe("plain");
  });
});
