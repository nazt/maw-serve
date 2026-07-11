import { expect, test } from "bun:test";
import { packItems, renderRectsSVG, type Rect } from "../src/clients/layout-core";

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
