import { normalizeOracleHandle, type OracleTileItem } from "../fleet/useFleet";
import type { MirrorDisplay, MirrorReport, MirrorSpace, MirrorWindow } from "../mirror/types";

export type PaletteKind = "oracle" | "space";

export interface OraclePaletteItem {
  id: string;
  kind: "oracle";
  name: string;
  path: string;
  searchText: string;
  oracle: OracleTileItem;
  session: string;
  window: string;
  pulseAt: number;
}

export interface SpacePaletteItem {
  id: string;
  kind: "space";
  name: string;
  path: string;
  searchText: string;
  display: MirrorDisplay;
  space: MirrorSpace;
  windows: MirrorWindow[];
  oracleNames: string[];
  liveCount: number;
  pollCount: number;
}

export type PaletteItem = OraclePaletteItem | SpacePaletteItem;

export interface FrecencyEntry {
  count: number;
  lastFocusedAt: number;
}

export type FrecencyMap = Record<string, FrecencyEntry>;

export const PALETTE_FRECENCY_STORAGE_KEY = "stoa.palette.frecency.v1";

function finite(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function loadPaletteFrecency(): FrecencyMap {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PALETTE_FRECENCY_STORAGE_KEY) ?? "{}") as Record<string, unknown>;
    return Object.fromEntries(Object.entries(parsed).flatMap(([key, value]) => {
      if (!value || typeof value !== "object") return [];
      const row = value as Partial<FrecencyEntry>;
      const count = finite(row.count);
      const lastFocusedAt = finite(row.lastFocusedAt);
      return count > 0 && lastFocusedAt > 0
        ? [[key, { count, lastFocusedAt }]]
        : [];
    }));
  } catch {
    return {};
  }
}

export function recordPaletteFocus(targetId: string): FrecencyMap {
  const current = loadPaletteFrecency();
  const previous = current[targetId];
  const next = {
    ...current,
    [targetId]: {
      count: Math.min(10_000, (previous?.count ?? 0) + 1),
      lastFocusedAt: Date.now(),
    },
  };
  try {
    window.localStorage.setItem(PALETTE_FRECENCY_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ranking remains functional when storage is blocked.
  }
  return next;
}

export function fuzzySubsequenceScore(query: string, candidate: string): number | null {
  const needle = query.trim().toLocaleLowerCase();
  const haystack = candidate.toLocaleLowerCase();
  if (!needle) return 0;

  let cursor = -1;
  let score = 0;
  let streak = 0;
  for (const character of needle) {
    const index = haystack.indexOf(character, cursor + 1);
    if (index < 0) return null;
    const boundary = index === 0 || /[\s/._:-]/.test(haystack[index - 1]);
    if (index === cursor + 1) streak += 1;
    else streak = 0;
    score += 18 + streak * 8 + (boundary ? 14 : 0) - Math.max(0, index - cursor - 1) * 1.4;
    cursor = index;
  }
  return score - haystack.length * 0.025 - cursor * 0.08;
}

function emptyQueryScore(item: PaletteItem, frecency: FrecencyMap, now: number): number {
  const entry = frecency[item.id];
  const ageHours = entry ? Math.max(0, now - entry.lastFocusedAt) / 3_600_000 : Number.POSITIVE_INFINITY;
  const recency = entry ? Math.exp(-ageHours / (24 * 14)) : 0;
  const frequency = entry ? 1 + Math.log2(1 + entry.count) : 0;
  const pulse = item.kind === "oracle" && item.pulseAt > 0
    ? Math.max(0, 1 - (now - item.pulseAt) / 120_000)
    : 0;
  const active = item.kind === "oracle" && item.oracle.data.status === "active" ? 0.35 : 0;
  return frequency * recency * 100 + pulse * 8 + active;
}

export function rankPaletteItems(
  items: readonly PaletteItem[],
  query: string,
  frecency: FrecencyMap,
  now = Date.now(),
): PaletteItem[] {
  const trimmed = query.trim();
  return items.flatMap((item) => {
    const score = trimmed
      ? fuzzySubsequenceScore(trimmed, item.searchText)
      : emptyQueryScore(item, frecency, now);
    return score === null ? [] : [{ item, score }];
  }).sort((left, right) => (
    right.score - left.score ||
    Number(left.item.kind === "space") - Number(right.item.kind === "space") ||
    left.item.name.localeCompare(right.item.name)
  )).map(({ item }) => item);
}

export function buildPaletteIndex(
  oracles: readonly OraclePaletteItem[],
  report: MirrorReport | null,
): PaletteItem[] {
  const terminalOracles = new Set(oracles.map((item) => normalizeOracleHandle(item.name)));
  const spaces: SpacePaletteItem[] = [];
  for (const space of report?.spaces ?? []) {
    const display = report?.displays.find((candidate) => candidate.index === space.display);
    if (!display) continue;
    const windows = report?.windows.filter((window) => (
      window.display === display.index && window.space === space.index
    )) ?? [];
    const oracleNames = [...new Set(windows.flatMap((window) => window.oracle ? [window.oracle] : []))];
    const targetCount = oracleNames.filter((name) => terminalOracles.has(normalizeOracleHandle(name))).length;
    const liveCount = Math.min(8, targetCount);
    spaces.push({
      id: `space:${display.index}:${space.index}`,
      kind: "space",
      name: `Space ${space.index}`,
      path: `${display.name} / space ${space.index}`,
      searchText: `${display.name} space ${space.index} ${oracleNames.join(" ")}`,
      display,
      space,
      windows,
      oracleNames,
      liveCount,
      pollCount: Math.max(0, targetCount - liveCount),
    });
  }
  return [...oracles, ...spaces];
}
