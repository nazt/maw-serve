import { expect, test } from "bun:test";
import {
  nextRovingTileId,
  rovingActionTabIndex,
  rovingTileTabIndex,
  type RovingTile,
} from "../web/src/tiles/rovingFocus";

const tiles: RovingTile[] = [
  { id: "alpha", x: 0, y: 0, w: 160, h: 48 },
  { id: "beta", x: 176, y: 0, w: 160, h: 48 },
  { id: "gamma", x: 0, y: 64, w: 160, h: 48 },
  { id: "delta", x: 176, y: 64, w: 160, h: 48 },
];

test("roving tile focus follows the visual fleet layout", () => {
  expect(nextRovingTileId(tiles, "alpha", "right")).toBe("beta");
  expect(nextRovingTileId(tiles, "alpha", "down")).toBe("gamma");
  expect(nextRovingTileId(tiles, "delta", "left")).toBe("gamma");
  expect(nextRovingTileId(tiles, "delta", "up")).toBe("beta");
});

test("roving tile focus stops at an outer edge", () => {
  expect(nextRovingTileId(tiles, "alpha", "left")).toBeNull();
  expect(nextRovingTileId(tiles, "alpha", "up")).toBeNull();
  expect(nextRovingTileId(tiles, "delta", "right")).toBeNull();
  expect(nextRovingTileId(tiles, "delta", "down")).toBeNull();
});

test("only the roving tile and selected tile actions enter the Tab order", () => {
  expect(rovingTileTabIndex("alpha", "alpha")).toBe(0);
  expect(rovingTileTabIndex("beta", "alpha")).toBe(-1);
  expect(rovingActionTabIndex("alpha", null)).toBe(-1);
  expect(rovingActionTabIndex("alpha", "alpha")).toBe(0);
  expect(rovingActionTabIndex("beta", "alpha")).toBe(-1);
});
