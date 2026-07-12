import {
  gridRects,
  normalizeRectToFrame,
  type NormRect,
  type Rect,
} from "../clients/layout-core";
import { normalizeOracleHandle } from "../fleet/useFleet";
import type {
  MirrorDisplay,
  MirrorFleetRow,
  MirrorProfile,
  MirrorReport,
  MirrorSpace,
  MirrorWindow,
  MirrorWindowLayout,
  OraclePulse,
  PulseFreshness,
} from "./types";

type UnknownRecord = Record<string, unknown>;

const NOISE_ORACLES = new Set(["usage-probe", "probe-cwd"]);

function record(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" ? value as UnknownRecord : null;
}

function finite(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function integer(value: unknown): number | null {
  const number = finite(value);
  return number === null ? null : Math.round(number);
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function frame(value: unknown): Rect | null {
  const candidate = record(value);
  if (!candidate) return null;
  const x = finite(candidate.x);
  const y = finite(candidate.y);
  const w = finite(candidate.w);
  const h = finite(candidate.h);
  if (x === null || y === null || w === null || h === null || w <= 0 || h <= 0) {
    return null;
  }
  return { x, y, w, h };
}

function parseDisplays(value: unknown): MirrorDisplay[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const candidate = record(entry);
    const index = integer(candidate?.index);
    const displayFrame = frame(candidate?.frame);
    if (!candidate || index === null || !displayFrame) return [];
    return [{
      index,
      name: text(candidate.name) || `display ${index}`,
      frame: displayFrame,
    }];
  });
}

function parseSpaces(value: unknown): MirrorSpace[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const candidate = record(entry);
    const index = integer(candidate?.index);
    const display = integer(candidate?.display);
    if (!candidate || index === null || display === null) return [];
    return [{
      index,
      display,
      isVisible: Boolean(candidate.isVisible),
      hasFocus: Boolean(candidate.hasFocus),
      pinned: Boolean(candidate.pinned),
    }];
  });
}

function parseFleet(value: unknown): MirrorFleetRow[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const candidate = record(entry);
    const oracle = text(candidate?.title);
    const display = integer(candidate?.display);
    const space = integer(candidate?.space);
    if (!candidate || !oracle || display === null || space === null) return [];
    return [{
      oracle,
      app: text(candidate.app),
      id: integer(candidate.id),
      display,
      space,
      focus: Boolean(candidate.focus),
      displayName: text(candidate.displayName),
      isShell: Boolean(candidate.isShell),
    }];
  });
}

function parseWindows(value: unknown, fleet: readonly MirrorFleetRow[]): MirrorWindow[] {
  if (!Array.isArray(value)) return [];
  const fleetById = new Map<number, MirrorFleetRow>();
  for (const row of fleet) {
    if (row.id !== null) fleetById.set(row.id, row);
  }

  return value.flatMap((entry) => {
    const candidate = record(entry);
    const id = integer(candidate?.id);
    const display = integer(candidate?.display);
    const space = integer(candidate?.space);
    const windowFrame = frame(candidate?.frame);
    if (!candidate || id === null || display === null || space === null || !windowFrame) {
      return [];
    }
    const fleetRow = fleetById.get(id);
    const oracle = fleetRow && fleetRow.display === display && fleetRow.space === space
      ? fleetRow.oracle
      : null;
    return [{
      id,
      app: text(candidate.app) || "app",
      display,
      space,
      focus: Boolean(candidate.focus),
      frame: windowFrame,
      pinned: Boolean(candidate.pinned),
      whenIdleOnly: Boolean(candidate.whenIdleOnly),
      oracle,
    }];
  });
}

function parseProfile(value: unknown): MirrorProfile {
  const candidate = record(value);
  return {
    stale: Boolean(candidate?.stale),
    reason: text(candidate?.reason),
  };
}

/** Converts a raw SpaceReport into the title-free model stored by React. */
export function sanitizeSpaceReport(value: unknown): MirrorReport {
  const source = record(value);
  if (!source) throw new Error("SpaceReport must be an object");
  const displays = parseDisplays(source.displays);
  const spaces = parseSpaces(source.spaces);
  const fleet = parseFleet(source.fleet);
  const windows = parseWindows(source.windows, fleet);
  return {
    ts: finite(source.ts) ?? Date.now(),
    displays,
    spaces,
    fleet,
    windows,
    profile: parseProfile(source.profile),
  };
}

export function displayPageId(display: Pick<MirrorDisplay, "index" | "name">): string {
  const slug = display.name.toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "display";
  return `display-${display.index}-${slug}`;
}

export function clampNormRect(rect: NormRect): NormRect {
  const x = Math.min(1, Math.max(0, rect.x));
  const y = Math.min(1, Math.max(0, rect.y));
  return {
    x,
    y,
    w: Math.max(0, Math.min(1 - x, rect.w - Math.max(0, -rect.x))),
    h: Math.max(0, Math.min(1 - y, rect.h - Math.max(0, -rect.y))),
  };
}

export function layoutWindows(
  display: MirrorDisplay,
  space: MirrorSpace,
  windows: readonly MirrorWindow[],
): MirrorWindowLayout[] {
  return windows
    .filter((window) => window.display === display.index && window.space === space.index)
    .map((window) => ({
      window,
      rect: clampNormRect(normalizeRectToFrame(window.frame, display.frame)),
    }));
}

export function pulseKey(machine: string, oracle: string): string {
  return `${machine.trim().toLowerCase()}|${normalizeOracleHandle(oracle)}`;
}

export function parsePulseRows(rows: unknown, at: number): OraclePulse[] {
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((entry) => {
    const candidate = record(entry);
    const oracle = normalizeOracleHandle(candidate?.oracle);
    const machine = text(candidate?.machine).toLowerCase();
    if (!candidate || !oracle || !machine || NOISE_ORACLES.has(oracle)) return [];
    return [{
      machine,
      oracle,
      at: finite(candidate.published_at) ?? finite(candidate.timestamp) ?? at,
    }];
  });
}

export function pulseFreshness(at: number | null | undefined, now = Date.now()): PulseFreshness {
  if (!Number.isFinite(at)) return "fallback";
  const timestamp = Number(at) < 1_000_000_000_000 ? Number(at) * 1_000 : Number(at);
  const age = Math.max(0, now - timestamp);
  if (age < 90_000) return "live";
  if (age <= 120_000) return "cooling";
  return "fallback";
}

export interface FittedFrame {
  x: number;
  y: number;
  w: number;
  h: number;
  scale: number;
}

/** Uniformly fits a physical display into a tile body without stretching it. */
export function fitDisplayFrame(frame: Rect, width: number, height: number): FittedFrame {
  const scale = Math.max(0, Math.min(width / frame.w, height / frame.h));
  const w = frame.w * scale;
  const h = frame.h * scale;
  return { x: (width - w) / 2, y: (height - h) / 2, w, h, scale };
}

export function defaultSpaceGrid(count: number): Rect[] {
  if (count <= 0) return [];
  const gap = 28;
  const columns = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / columns);
  const capacity = columns * rows;
  return gridRects({
    x: 0,
    y: 0,
    w: columns * 420 + (columns - 1) * gap,
    h: rows * 300 + (rows - 1) * gap,
  }, capacity, gap).slice(0, count);
}
