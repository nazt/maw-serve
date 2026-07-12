import { expect, test } from "bun:test";

import {
  defaultSpaceGrid,
  displayPageId,
  fitDisplayFrame,
  layoutWindows,
  parsePulseRows,
  parseSpacePageId,
  pulseFreshness,
  sanitizeSpaceReport,
  spacePageId,
  windowGeometry,
} from "../web/src/mirror/model";
import { decodeSpacesFrame } from "../web/src/mirror/useMirror";
import { normalizeOracleHandle } from "../web/src/fleet/useFleet";
import {
  allocateTerminalBudget,
  terminalPaneKey,
  terminalTarget,
  terminalTargets,
} from "../web/src/mirror/terminalTarget";

const KNOWN_PRIVATE_TITLE = "(3) Facebook - Comet - Nat";

const raw = {
  ts: 123,
  displays: [{ index: 3, name: "DELL U2719DC", frame: { x: -2560, y: 0, w: 2560, h: 1440 } }],
  spaces: [{ index: 7, display: 3, isVisible: true, hasFocus: true }],
  fleet: [{ id: 41, title: "agora", app: "ghostty", display: 3, space: 7 }],
  windows: [{
    id: 41,
    app: "ghostty",
    title: KNOWN_PRIVATE_TITLE,
    display: 3,
    space: 7,
    focus: true,
    frame: { x: -2560, y: 0, w: 1280, h: 720 },
  }],
  profile: { stale: false },
};

test("SpaceReport client boundary permanently omits window titles", () => {
  const safe = sanitizeSpaceReport(raw);
  expect(safe.windows[0]).not.toHaveProperty("title");
  expect(JSON.stringify(safe)).not.toContain(KNOWN_PRIVATE_TITLE);
  expect(safe.windows[0].oracle).toBe("agora");
});

test("display-census production event frames and documented type frames both decode", () => {
  expect(decodeSpacesFrame({ event: "spaces", data: raw })?.displays).toHaveLength(1);
  expect(decodeSpacesFrame({ type: "spaces", data: raw })?.spaces).toHaveLength(1);
  expect(decodeSpacesFrame({ event: "windows", data: raw })).toBeNull();
});

test("mirror windows retain real negative-origin positions", () => {
  const safe = sanitizeSpaceReport(raw);
  expect(layoutWindows(safe.displays[0], safe.spaces[0], safe.windows)[0].rect).toEqual({
    x: 0,
    y: 0,
    w: 0.5,
    h: 0.5,
  });
});

test("portrait display is letterboxed with a single uniform scale", () => {
  const fitted = fitDisplayFrame({ x: 0, y: 0, w: 1440, h: 2560 }, 400, 240);
  expect(fitted.scale).toBeCloseTo(0.09375);
  expect(fitted.w).toBeCloseTo(135);
  expect(fitted.h).toBeCloseTo(240);
  expect(fitted.x).toBeCloseTo(132.5);
  expect(fitted.y).toBe(0);
});

test("display page ids and default space grid are stable and row-major", () => {
  expect(displayPageId({ index: 3, name: "DELL U2719DC" })).toBe("display-3-dell-u2719dc");
  const grid = defaultSpaceGrid(5);
  expect(grid).toHaveLength(5);
  expect(grid[1].x).toBeGreaterThan(grid[0].x);
  const firstNextRow = grid.findIndex((rect) => rect.y > grid[0].y);
  expect(firstNextRow).toBeGreaterThan(1);
  expect(grid.slice(0, firstNextRow).every((rect, index, row) => (
    index === 0 || rect.x > row[index - 1].x
  ))).toBe(true);
});

test("space page ids round-trip and normalized windows recover display-local geometry", () => {
  expect(spacePageId({ index: 3 }, { index: 7 })).toBe("space-3-7");
  expect(parseSpacePageId("space-3-7")).toEqual({ displayIndex: 3, spaceIndex: 7 });
  expect(parseSpacePageId("space-private")).toBeNull();
  expect(windowGeometry(
    { x: 0.25, y: 0.1, w: 0.5, h: 0.4 },
    { frame: { x: -2560, y: 0, w: 2560, h: 1440 } },
  )).toEqual({ x: 640, y: 144, w: 1280, h: 576 });
});

test("Argus pulse parsing filters probes and applies freshness windows", () => {
  const now = 2_000_000_000_000;
  const rows = parsePulseRows([
    { machine: "m5", oracle: "Agora", published_at: now - 10_000 },
    { machine: "m5", oracle: "usage-probe", published_at: now },
  ], now);
  expect(rows).toHaveLength(1);
  expect(rows[0].oracle).toBe("agora");
  expect(pulseFreshness(rows[0].at, now)).toBe("live");
  expect(pulseFreshness(now - 100_000, now)).toBe("cooling");
  expect(pulseFreshness(now - 121_000, now)).toBe("fallback");
});

test("Argus human oracle names join display-census slugs", () => {
  expect(normalizeOracleHandle("wispr flow oracle")).toBe("wispr-flow");
  expect(normalizeOracleHandle("display-census-oracle")).toBe("display-census");
});

test("terminal targets prefer active panes, then least idle, without changing identity", () => {
  const census = {
    displays: [{
      spaces: [{
        oracles: [
          { oracle: "Agora Oracle", session: "s", pane: "old", status: "active", idleSec: 12 },
          { oracle: "agora", session: "s", pane: "idle", status: "idle", idleSec: 0 },
          { oracle: "agora", session: "s", pane: "live", status: "active", idleSec: 0 },
        ],
      }],
    }],
  };

  expect(terminalTargets(census, "agora").map((row) => row.pane)).toEqual([
    "live",
    "old",
    "idle",
  ]);
  expect(terminalPaneKey(terminalTarget(census, "Agora Oracle")!)).toBe("s:live");
});

test("space terminal budget counts distinct panes and preserves duplicate-window streams", () => {
  const rows = Array.from({ length: 10 }, (_, index) => ({
    paneKey: `s:${index}`,
    focus: index === 9,
    pulseLive: index === 8,
    status: index < 2 ? "active" : "idle",
    idleSec: index,
  }));
  rows.push({ ...rows[9] });

  const budget = allocateTerminalBudget(rows, 8);
  expect(budget.streamPaneKeys.size).toBe(8);
  expect(budget.streamPaneKeys.has("s:9")).toBe(true);
  expect(budget.streamPaneKeys.has("s:8")).toBe(true);
  expect(budget.degradedPaneKeys).toHaveLength(2);
});
