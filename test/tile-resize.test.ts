import { expect, test } from "bun:test";

import { shouldLockAspectRatio } from "../web/src/tiles/useDrag";

test("space-terminal groups free-resize by default and Shift opts into ratio lock", () => {
  expect(shouldLockAspectRatio(16 / 9, false, "shift")).toBe(false);
  expect(shouldLockAspectRatio(16 / 9, true, "shift")).toBe(true);
});

test("existing non-terminal ratio behavior remains locked unless Shift bypasses it", () => {
  expect(shouldLockAspectRatio(4 / 3, false, "default")).toBe(true);
  expect(shouldLockAspectRatio(4 / 3, true, "default")).toBe(false);
  expect(shouldLockAspectRatio(null, true, "shift")).toBe(false);
});
