import { describe, expect, test } from "bun:test";

import { isTheme, resolveTheme } from "../web/src/theme";

describe("Stoa theme preference", () => {
  test("a saved light or dark choice overrides the system preference", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  test("first visit follows the system preference", () => {
    expect(resolveTheme(null, true)).toBe("dark");
    expect(resolveTheme(null, false)).toBe("light");
  });

  test("the dormant phosphor preset is not a selectable UI theme", () => {
    expect(isTheme("phosphor")).toBe(false);
    expect(resolveTheme("phosphor", false)).toBe("light");
  });
});
