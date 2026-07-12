import { expect, test } from "bun:test";

import {
  MAX_TERMINAL_FONT_SIZE,
  MIN_TERMINAL_FONT_SIZE,
  parseTerminalMeta,
  terminalFontSize,
} from "../web/src/board/terminalSizing";

test("terminal metadata accepts bounded source pane dimensions", () => {
  expect(parseTerminalMeta('{"version":1,"cols":109,"rows":40}'))
    .toEqual({ cols: 109, rows: 40 });
  expect(parseTerminalMeta('{"cols":0,"rows":40}')).toBeNull();
  expect(parseTerminalMeta('{"cols":80,"rows":1001}')).toBeNull();
  expect(parseTerminalMeta("not json")).toBeNull();
});

test("terminal font scales to source columns and clamps at readable bounds", () => {
  expect(terminalFontSize(480, 80)).toBe(10);
  expect(terminalFontSize(1_200, 80)).toBe(25);
  expect(terminalFontSize(200, 80)).toBe(MIN_TERMINAL_FONT_SIZE);
  expect(terminalFontSize(2_000, 80)).toBe(MAX_TERMINAL_FONT_SIZE);
  expect(terminalFontSize(480, 0)).toBe(MIN_TERMINAL_FONT_SIZE);
  expect(terminalFontSize(Number.NaN, 80)).toBe(MIN_TERMINAL_FONT_SIZE);
});
