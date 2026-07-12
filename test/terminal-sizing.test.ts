import { expect, test } from "bun:test";

import {
  DEFAULT_TERMINAL_ZOOM,
  MAX_TERMINAL_FONT_SIZE,
  MAX_TERMINAL_ZOOM,
  MIN_TERMINAL_FONT_SIZE,
  MIN_TERMINAL_ZOOM,
  clampTerminalZoom,
  parseTerminalMeta,
  parseTerminalZoom,
  stepTerminalZoom,
  terminalDisplayGrid,
  terminalFontSize,
  terminalRows,
} from "../web/src/board/terminalSizing";

test("terminal metadata accepts bounded source pane dimensions", () => {
  expect(parseTerminalMeta('{"version":1,"cols":109,"rows":40}'))
    .toEqual({ cols: 109, rows: 40 });
  expect(parseTerminalMeta('{"cols":0,"rows":40}')).toBeNull();
  expect(parseTerminalMeta('{"cols":80,"rows":1001}')).toBeNull();
  expect(parseTerminalMeta("not json")).toBeNull();
});

test("terminal font fits source columns, applies zoom, and clamps at readable bounds", () => {
  expect(terminalFontSize(480, 80)).toBe(10);
  expect(terminalFontSize(1_200, 80)).toBe(25);
  expect(terminalFontSize(480, 80, 1.5)).toBe(15);
  expect(terminalFontSize(100, 80)).toBe(MIN_TERMINAL_FONT_SIZE);
  expect(terminalFontSize(2_000, 80)).toBe(MAX_TERMINAL_FONT_SIZE);
  expect(terminalFontSize(480, 0)).toBe(MIN_TERMINAL_FONT_SIZE);
  expect(terminalFontSize(Number.NaN, 80)).toBe(MIN_TERMINAL_FONT_SIZE);
});

test("display rows follow tile height instead of source pane rows", () => {
  expect(terminalRows(500, 10)).toBe(40);
  expect(terminalRows(500, 15)).toBe(26);
  expect(terminalRows(0, 10)).toBe(1);

  expect(terminalDisplayGrid(480, 500, 80)).toEqual({
    cols: 80,
    rows: 40,
    fontSize: 10,
  });
  expect(terminalDisplayGrid(480, 500, 80, 1.5)).toEqual({
    cols: 80,
    rows: 26,
    fontSize: 15,
  });
});

test("terminal zoom parsing and steps stay within the per-tile range", () => {
  expect(parseTerminalZoom(null)).toBe(DEFAULT_TERMINAL_ZOOM);
  expect(parseTerminalZoom("broken")).toBe(DEFAULT_TERMINAL_ZOOM);
  expect(parseTerminalZoom("0.2")).toBe(MIN_TERMINAL_ZOOM);
  expect(parseTerminalZoom("8")).toBe(MAX_TERMINAL_ZOOM);
  expect(stepTerminalZoom(1, 1)).toBe(1.1);
  expect(stepTerminalZoom(1, -1)).toBe(0.9);
  expect(clampTerminalZoom(Number.NaN)).toBe(DEFAULT_TERMINAL_ZOOM);
});
