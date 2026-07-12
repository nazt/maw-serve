import { expect, test } from "bun:test";

import {
  DEFAULT_CANVAS_SAFE_AREA,
  MIN_READABLE_FIT_ZOOM,
  calculateFitView,
} from "../web/src/canvas/useCanvas";

const viewport = { x: 1_280, y: 800 };
const anchor = [160, 100] as const;

function screenPoint(
  world: { x: number; y: number },
  view: { center: readonly [number, number]; zoom: number },
) {
  return {
    x: (viewport.x / 2 - anchor[0] + world.x - view.center[0]) * view.zoom,
    y: (viewport.y / 2 - anchor[1] + world.y - view.center[1]) * view.zoom,
  };
}

test("fit reserves board chrome safe-area when every tile can remain visible", () => {
  const view = calculateFitView(
    [{ x: 0, y: 0, w: 760, h: 504 }],
    {
      viewport,
      anchor,
      padding: 64,
      safeArea: DEFAULT_CANVAS_SAFE_AREA,
    },
  );

  expect(view).not.toBeNull();
  expect(view!.zoom).toBe(1);
  expect(screenPoint({ x: 0, y: 0 }, view!)).toEqual({ x: 260, y: 128 });
  expect(screenPoint({ x: 760, y: 504 }, view!)).toEqual({ x: 1_020, y: 632 });
});

test("fit holds a readable zoom floor and leaves oversized boards pannable", () => {
  const view = calculateFitView(
    [{ x: 0, y: 0, w: 4_000, h: 2_000 }],
    {
      viewport,
      anchor,
      padding: 64,
      safeArea: DEFAULT_CANVAS_SAFE_AREA,
    },
  );

  expect(view).not.toBeNull();
  expect(view!.zoom).toBe(MIN_READABLE_FIT_ZOOM);
  const midpoint = screenPoint({ x: 2_000, y: 1_000 }, view!);
  expect(midpoint.x).toBeCloseTo(640);
  expect(midpoint.y).toBeCloseTo(380);
  expect(screenPoint({ x: 4_000, y: 2_000 }, view!).y).toBeGreaterThan(632);
});
