import { expect, test } from "bun:test";

import {
  createSpaceImportPlan,
  fitIntoBoundingBox,
  importSpace,
} from "../web/src/board/spaceImport";
import type { MirrorDisplay, MirrorSpace, MirrorWindow } from "../web/src/mirror/types";

const display: MirrorDisplay = {
  index: 2,
  name: "portrait",
  frame: { x: 100, y: -400, w: 1_000, h: 2_000 },
};
const space: MirrorSpace = {
  index: 3,
  display: 2,
  isVisible: true,
  hasFocus: true,
  pinned: false,
};

function mirrorWindow(
  id: number,
  oracle: string | null,
  frame: MirrorWindow["frame"],
): MirrorWindow {
  return {
    id,
    app: oracle ? "WezTerm" : "Finder",
    display: 2,
    space: 3,
    focus: id === 1,
    frame,
    pinned: false,
    whenIdleOnly: false,
    oracle,
  };
}

test("fitIntoBoundingBox uses one scale and preserves relative topology", () => {
  const positions = [
    { id: "a", window: mirrorWindow(1, "a", { x: 100, y: -400, w: 500, h: 500 }), geometry: { x: 0, y: 0, w: 500, h: 500 } },
    { id: "b", window: mirrorWindow(2, "b", { x: 600, y: 600, w: 500, h: 1_000 }), geometry: { x: 500, y: 1_000, w: 500, h: 1_000 } },
  ];
  const fitted = fitIntoBoundingBox(
    positions,
    { x: 10, y: 20, w: 400, h: 400 },
    { x: 0, y: 0, w: 1_000, h: 2_000 },
  );

  expect(fitted[0].geometry).toEqual({ x: 110, y: 20, w: 100, h: 100 });
  expect(fitted[1].geometry).toEqual({ x: 210, y: 220, w: 100, h: 200 });
});

test("space import dedupes duplicate panes while preserving both window positions", () => {
  const windows = [
    mirrorWindow(1, "agora", { x: 100, y: -400, w: 1_000, h: 1_000 }),
    mirrorWindow(2, "agora", { x: 100, y: 600, w: 1_000, h: 1_000 }),
  ];
  const census = {
    displays: [{ spaces: [{ oracles: [{
      oracle: "agora",
      session: "01-agora",
      pane: "%42",
      status: "active",
      idleSec: 0,
    }] }] }],
  };
  const plan = createSpaceImportPlan({
    spaceRef: { displayIndex: 2, spaceIndex: 3 },
    display,
    space,
    windows,
    census,
    groupId: "group",
    groupGeometry: { x: 500, y: 600, w: 500, h: 500 },
  });

  expect(plan.group.members).toHaveLength(2);
  expect(plan.terminals).toHaveLength(1);
  expect(plan.group.members.map((member) => member.kind)).toEqual(["terminal", "ghost"]);
  expect(plan.group.members[0].geometry.y).not.toBe(plan.group.members[1].geometry.y);
  expect(plan.terminals[0].x).toBe(500 + plan.group.members[0].geometry.x);
  expect(JSON.stringify(plan)).not.toContain("title");
});

test("space import adopts an existing pane and limits distinct live requests to eight", () => {
  const windows = Array.from({ length: 10 }, (_, index) => mirrorWindow(
    index + 1,
    `oracle-${index}`,
    {
      x: 100 + (index % 2) * 500,
      y: -400 + Math.floor(index / 2) * 400,
      w: 500,
      h: 400,
    },
  ));
  const census = {
    displays: [{ spaces: [{ oracles: windows.map((window, index) => ({
      oracle: window.oracle!,
      session: "fleet",
      pane: `%${index}`,
      status: index < 2 ? "active" : "idle",
      idleSec: index,
    })) }] }],
  };
  const existing = {
    id: "terminal:fleet:%0",
    kind: "terminal" as const,
    x: 20,
    y: 30,
    w: 560,
    h: 340,
    zIndex: 12,
    data: { oracle: "oracle-0", session: "fleet", window: "%0" },
  };
  const plan = createSpaceImportPlan({
    spaceRef: { displayIndex: 2, spaceIndex: 3 },
    display,
    space,
    windows,
    census,
    existingTerminals: [existing],
    groupId: "group",
  });

  expect(plan.adoptedTerminalIds).toEqual([existing.id]);
  expect(plan.group.members.find((member) => member.id === existing.id)?.adoptedGeometry)
    .toEqual({ x: 20, y: 30, w: 560, h: 340, zIndex: 12 });
  expect(plan.terminals.filter((item) => item.streamEligible)).toHaveLength(8);
  expect(plan.terminals.filter((item) => !item.streamEligible)).toHaveLength(2);
  expect(plan.livePaneCount).toBe(8);
  expect(plan.polledPaneCount).toBe(2);
});

test("space import uses the readable viewport envelope instead of the old tiny fixed group", () => {
  const plan = createSpaceImportPlan({
    spaceRef: { displayIndex: 2, spaceIndex: 3 },
    display,
    space,
    windows: [],
    census: null,
    groupId: "viewport-group",
    viewportSize: { w: 1_440, h: 900 },
  });

  expect(plan.group.w).toBe(1_008);
  expect(plan.group.h).toBe(720);
});

test("importSpace is a safe no-op without a browser event target", () => {
  expect(importSpace({ displayIndex: 2, spaceIndex: 3 })).toBe(false);
});
