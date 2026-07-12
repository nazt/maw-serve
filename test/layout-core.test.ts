import { expect, test } from "bun:test";
import { normalizeRectToFrame, packItems, renderRectsSVG, type Rect } from "../src/clients/layout-core";

test("layout-core packItems returns indexed rects", () => {
  const outer: Rect = { x: 0, y: 0, w: 900, h: 600 };
  const items = packItems(outer, 4, 12, "grid");
  expect(items).toHaveLength(4);
  expect(items[0].index).toBe(0);
  expect(items[0].rect).toEqual(expect.objectContaining({ x: expect.any(Number), w: expect.any(Number) }));
});

test("layout-core renderRectsSVG returns svg markup", () => {
  const outer: Rect = { x: 0, y: 0, w: 900, h: 600 };
  const items = packItems(outer, 3, 8, "spiral");
  const svg = renderRectsSVG(outer, items.map((it) => ({ rect: it.rect, label: String(it.index) })));
  expect(svg.length).toBeGreaterThan(0);
  expect(svg).toContain("<svg");
});

test("normalizeRectToFrame subtracts a negative display origin", () => {
  const display = { x: -2560, y: 0, w: 2560, h: 1440 };
  expect(normalizeRectToFrame({ x: -2560, y: 0, w: 1280, h: 720 }, display)).toEqual({
    x: 0,
    y: 0,
    w: 0.5,
    h: 0.5,
  });
});

test("normalizeRectToFrame preserves portrait logical-point proportions", () => {
  const display = { x: 4736, y: -836, w: 1440, h: 2560 };
  expect(normalizeRectToFrame({ x: 5096, y: -196, w: 720, h: 1280 }, display)).toEqual({
    x: 0.25,
    y: 0.25,
    w: 0.5,
    h: 0.5,
  });
});
