import { describe, expect, test } from "bun:test";

import { landItem } from "../web/src/board/landing";
import {
  fuzzySubsequenceScore,
  rankPaletteItems,
  type PaletteItem,
} from "../web/src/board/paletteIndex";

describe("command palette ranking", () => {
  test("fzf-style matching rewards contiguous and boundary matches", () => {
    expect(fuzzySubsequenceScore("agora", "agora / fleet")).toBeGreaterThan(
      fuzzySubsequenceScore("agora", "a-g-o-r-a / fleet") ?? -Infinity,
    );
    expect(fuzzySubsequenceScore("sto", "space / topology")).not.toBeNull();
    expect(fuzzySubsequenceScore("xyz", "agora / fleet")).toBeNull();
  });

  test("empty query uses stored frecency before the activity tiebreak", () => {
    const oracle = (id: string): PaletteItem => ({
      id,
      kind: "oracle",
      name: id,
      path: "fleet / one",
      searchText: id,
      oracle: { id, kind: "oracle", x: 0, y: 0, w: 1, h: 1, data: { status: "active" } } as never,
      session: "fleet",
      window: id,
      pulseAt: 0,
    });
    const now = 1_000_000;
    const ranked = rankPaletteItems(
      [oracle("new"), oracle("frequent")],
      "",
      { frequent: { count: 8, lastFocusedAt: now - 1_000 } },
      now,
    );
    expect(ranked[0].id).toBe("frequent");
  });
});

describe("palette landing engine", () => {
  const identity = (item: { id: string }) => item.id.split("#")[0];

  test("lands at viewport center and reserves an empty rect", () => {
    const result = landItem(
      { id: "new", x: 0, y: 0, w: 100, h: 80 },
      {
        items: [{ id: "occupied", x: 150, y: 160, w: 100, h: 80 }],
        viewportCenter: { x: 200, y: 200 },
        targetKey: identity,
      },
    );
    expect(result.action).toBe("landed");
    if (result.action === "landed") {
      expect([result.item.x, result.item.y]).not.toEqual([150, 160]);
    }
  });

  test("dedupes by target identity instead of spawning a second tile", () => {
    const existing = { id: "oracle#old", x: 10, y: 20, w: 100, h: 80 };
    const result = landItem(
      { id: "oracle#new", x: 0, y: 0, w: 100, h: 80 },
      {
        items: [existing],
        viewportCenter: { x: 200, y: 200 },
        targetKey: identity,
      },
    );
    expect(result).toEqual({ action: "existing", item: existing });
  });
});
