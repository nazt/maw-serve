import { describe, expect, test } from "bun:test";
import {
  buildFleetTiles,
  LONG_STALE_THRESHOLD_SEC,
  mergeFleetTiles,
  type CensusPayload,
  type UsagePayload,
} from "../web/src/fleet/useFleet";
import { oracleHasConnectAffordance } from "../web/src/fleet/OracleTileContent";

function census(oracles: NonNullable<NonNullable<CensusPayload["displays"]>[number]["spaces"]>[number]["oracles"]): CensusPayload {
  return {
    displays: [{
      name: "display",
      spaces: [{ name: "space", oracles }],
    }],
  };
}

describe("fleet stale density", () => {
  test("packs long-stale oracles after the readable fleet cards", () => {
    const tiles = buildFleetTiles(census([
      { oracle: "live", status: "active", idleSec: 0 },
      { oracle: "recent", status: "stale", idleSec: LONG_STALE_THRESHOLD_SEC - 1 },
      { oracle: "old-a", status: "stale", idleSec: LONG_STALE_THRESHOLD_SEC },
      { oracle: "old-b", status: "stale", idleSec: LONG_STALE_THRESHOLD_SEC * 2 },
    ]), null);

    expect(tiles.map((tile) => tile.id)).toEqual(["live", "recent", "old-a", "old-b"]);
    expect(tiles.find((tile) => tile.id === "recent")?.data.density).toBe("standard");
    expect(tiles.find((tile) => tile.id === "old-a")).toMatchObject({
      x: 0,
      y: 130,
      w: 160,
      h: 48,
      data: { density: "compact" },
    });
    expect(tiles.find((tile) => tile.id === "old-b")).toMatchObject({
      x: 176,
      y: 130,
      w: 160,
      h: 48,
      data: { density: "compact" },
    });
    expect(oracleHasConnectAffordance(tiles.find((tile) => tile.id === "live")!)).toBeTrue();
    expect(oracleHasConnectAffordance(tiles.find((tile) => tile.id === "old-a")!)).toBeFalse();
  });

  test("keeps pinned and attention-bearing stale oracles full size", () => {
    const usage: UsagePayload = {
      accounts: [{ account: "hot", rate_5h_pct: 90 }],
      oracles: [{ oracle: "attention", account: "hot" }],
    };
    const tiles = buildFleetTiles(census([
      { oracle: "attention", status: "stale", idleSec: LONG_STALE_THRESHOLD_SEC * 2 },
      { oracle: "pinned", status: "stale", idleSec: LONG_STALE_THRESHOLD_SEC * 2, pinned: true },
      { oracle: "ordinary", status: "stale", idleSec: LONG_STALE_THRESHOLD_SEC * 2 },
    ]), usage);

    expect(tiles.find((tile) => tile.id === "attention")).toMatchObject({
      w: 210,
      h: 96,
      attention: { level: "critical" },
      data: { density: "standard" },
    });
    expect(tiles.find((tile) => tile.id === "pinned")).toMatchObject({
      w: 210,
      h: 96,
      data: { density: "standard" },
    });
    expect(tiles.find((tile) => tile.id === "ordinary")?.data.density).toBe("compact");
  });

  test("reflows when an oracle crosses the density or attention boundary", () => {
    const recent = buildFleetTiles(census([
      { oracle: "changing", status: "stale", idleSec: LONG_STALE_THRESHOLD_SEC - 1 },
    ]), null);
    const old = buildFleetTiles(census([
      { oracle: "changing", status: "stale", idleSec: LONG_STALE_THRESHOLD_SEC },
    ]), null);
    const compacted = mergeFleetTiles(recent, old);

    expect(compacted[0]).toMatchObject({
      w: 160,
      h: 48,
      data: { density: "compact" },
    });

    const attentionUsage: UsagePayload = {
      accounts: [{ account: "hot", rate_5h_pct: 90 }],
      oracles: [{ oracle: "changing", account: "hot" }],
    };
    const attention = buildFleetTiles(census([
      { oracle: "changing", status: "stale", idleSec: LONG_STALE_THRESHOLD_SEC },
    ]), attentionUsage);

    expect(mergeFleetTiles(compacted, attention)[0]).toMatchObject({
      w: 210,
      h: 96,
      attention: { level: "critical" },
      data: { density: "standard" },
    });
  });
});
