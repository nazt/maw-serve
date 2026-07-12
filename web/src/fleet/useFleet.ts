import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  acquireImageSource,
  createImageBoardItem,
  createNoteBoardItem,
  type BoardItem,
  type BoardPlacement,
  type ImageBoardItem,
  type ImageSourceOptions,
  type NoteBoardItem,
} from "../board/boardItems";
import { apiFetch, API_ENDPOINTS } from "../clients/api";

const DEFAULT_POLL_INTERVAL_MS = 8_000;
const DEFAULT_CENSUS_URL = API_ENDPOINTS.census;
const DEFAULT_USAGE_URL = API_ENDPOINTS.usage;
const ORACLE_WIDTH = 210;
const ORACLE_HEIGHT = 96;
const GRID_STEP_X = 240;
const GRID_STEP_Y = 130;
const GRID_COLUMNS = 6;
const COMPACT_ORACLE_WIDTH = 160;
const COMPACT_ORACLE_HEIGHT = 48;
const COMPACT_GRID_STEP_X = 176;
const COMPACT_GRID_STEP_Y = 64;
const COMPACT_GRID_COLUMNS = 8;

export const LONG_STALE_THRESHOLD_SEC = 60 * 60;

export type OracleStatus = "active" | "idle" | "stale" | "pinned" | "error";
export type AttentionLevel = "none" | "warn" | "critical";

export interface OracleAttention {
  level: AttentionLevel;
  reasons: string[];
}

export interface CensusOracle {
  oracle?: string | null;
  session?: string | null;
  pane?: string | null;
  modelTier?: string | null;
  status?: string | null;
  idleSec?: number | null;
  annotation?: string | null;
  pinned?: boolean | null;
}

export interface CensusPayload {
  schema?: string;
  displays?: Array<{
    name?: string | null;
    spaces?: Array<{
      name?: string | null;
      oracles?: CensusOracle[] | null;
    }> | null;
  }> | null;
}

export interface UsagePayload {
  hosts?: Array<{
    machine?: string | null;
    burn_per_hr?: number | null;
    tokens?: number | null;
  }> | null;
  accounts?: Array<{
    account?: string | null;
    rate_5h_pct?: number | null;
    rate_7d_pct?: number | null;
    [key: string]: unknown;
  }> | null;
  oracles?: Array<{
    oracle?: string | null;
    account?: string | null;
    rate_5h_pct?: number | null;
    rate_7d_pct?: number | null;
  }> | null;
}

export interface TileGeometry {
  x: number;
  y: number;
  w: number;
  h: number;
  zIndex?: number;
}

export interface OracleTileData {
  oracle: string;
  status: OracleStatus;
  modelTier: string;
  idleSec: number | null;
  annotation: string;
  heat: number;
  pinned: boolean;
  display: string;
  space: string;
  density: "standard" | "compact";
}

export interface OracleTileItem extends TileGeometry {
  id: string;
  kind: "oracle";
  data: OracleTileData;
  attention: OracleAttention;
}

export interface AttentionSummary {
  count: number;
  criticalCount: number;
  list: OracleTileItem[];
}

export type NoteTileItem = NoteBoardItem;
export type ImageTileItem = ImageBoardItem;
export type FleetTileItem = OracleTileItem | BoardItem;
export type Point = BoardPlacement;
export type GeometryPatch = Partial<TileGeometry>;

export type {
  BoardItem,
  BoardPlacement,
  ImageBoardItem,
  ImageSourceOptions,
  NoteBoardItem,
} from "../board/boardItems";

interface FleetRecord extends Omit<OracleTileData, "density"> {
  handle: string;
  order: number;
}

export interface UseFleetOptions {
  censusUrl?: string;
  usageUrl?: string;
  pollIntervalMs?: number;
}

export interface UseFleetResult {
  items: FleetTileItem[];
  tiles: FleetTileItem[];
  fleetTiles: OracleTileItem[];
  boardItems: BoardItem[];
  census: CensusPayload | null;
  usage: UsagePayload | null;
  loading: boolean;
  refreshing: boolean;
  error: Error | null;
  censusError: Error | null;
  usageError: Error | null;
  refresh: () => Promise<void>;
  addNote: (placement?: BoardPlacement) => NoteBoardItem;
  addImage: (
    placement?: BoardPlacement,
    options?: ImageSourceOptions,
  ) => Promise<ImageBoardItem | null>;
  removeTile: (id: string) => void;
  updateTileGeometry: (id: string, patch: GeometryPatch) => void;
  updateTile: (next: FleetTileItem) => void;
  updateBoardItem: (next: BoardItem) => void;
  updateNote: (id: string, text: string) => void;
}

const STATUS_ORDER: Record<OracleStatus, number> = {
  active: 0,
  idle: 1,
  pinned: 2,
  error: 3,
  stale: 4,
};

export function normalizeOracleHandle(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+oracle$/i, "")
    .replace(/[\s_]+/g, "-");
}

function normalizeStatus(value: unknown): OracleStatus {
  const status = String(value ?? "stale").trim().toLowerCase();
  if (status === "live") return "active";
  return status in STATUS_ORDER ? (status as OracleStatus) : "stale";
}

function finiteIdle(value: unknown): number {
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : Number.POSITIVE_INFINITY;
}

function byActivity(left: FleetRecord, right: FleetRecord): number {
  const statusDelta = STATUS_ORDER[left.status] - STATUS_ORDER[right.status];
  if (statusDelta !== 0) return statusDelta;

  const leftIdle = finiteIdle(left.idleSec);
  const rightIdle = finiteIdle(right.idleSec);
  if (leftIdle !== rightIdle) return leftIdle < rightIdle ? -1 : 1;
  return left.order - right.order;
}

function clampHeat(value: unknown): number | null {
  const heat = Number(value);
  return Number.isFinite(heat) ? Math.min(100, Math.max(0, heat)) : null;
}

interface UsageRates {
  rate5h: number | null;
  rate7d: number | null;
}

function buildUsageIndex(usage: UsagePayload | null | undefined): Map<string, UsageRates> {
  const accounts = new Map<string, UsageRates>();
  const index = new Map<string, UsageRates>();

  for (const entry of usage?.accounts ?? []) {
    const account = String(entry?.account ?? "").trim().toLowerCase();
    if (!account) continue;
    accounts.set(account, {
      rate5h: clampHeat(entry?.rate_5h_pct),
      rate7d: clampHeat(entry?.rate_7d_pct),
    });
  }

  for (const entry of usage?.oracles ?? []) {
    const handle = normalizeOracleHandle(entry?.oracle);
    if (!handle) continue;

    const account = String(entry?.account ?? "").trim().toLowerCase();
    const accountRates = accounts.get(account);
    index.set(handle, {
      rate5h: accountRates?.rate5h ?? clampHeat(entry?.rate_5h_pct),
      rate7d: accountRates?.rate7d ?? clampHeat(entry?.rate_7d_pct),
    });
  }

  return index;
}

export function computeAttention(
  status: OracleStatus,
  idleSec: number | null,
  rates?: UsageRates,
): OracleAttention {
  const reasons: string[] = [];
  let level: AttentionLevel = "none";

  if (status === "error") {
    reasons.push("error");
    level = "critical";
  }

  if (status === "active" && idleSec !== null && idleSec > 900) {
    reasons.push("stuck");
    if (level === "none") level = "warn";
  }

  for (const [horizon, rate] of [
    ["5h", rates?.rate5h],
    ["7d", rates?.rate7d],
  ] as const) {
    if (rate === null || rate === undefined) continue;

    if (rate > 80) {
      reasons.push(`account ${horizon} near cap (rotate token)`);
      level = "critical";
    } else if (rate > 50) {
      reasons.push(`account watch (${horizon} ${rate}%)`);
      if (level === "none") level = "warn";
    }
  }

  return { level, reasons };
}

function flattenCensus(census: CensusPayload | null | undefined): FleetRecord[] {
  const records: FleetRecord[] = [];
  let order = 0;

  for (const display of census?.displays ?? []) {
    for (const space of display?.spaces ?? []) {
      for (const oracle of space?.oracles ?? []) {
        const oracleName = String(oracle?.oracle ?? "unknown").trim() || "unknown";
        records.push({
          oracle: oracleName,
          handle: normalizeOracleHandle(oracleName) || "unknown",
          status: normalizeStatus(oracle?.status),
          modelTier: String(oracle?.modelTier ?? "unknown"),
          idleSec: Number.isFinite(Number(oracle?.idleSec)) ? Number(oracle?.idleSec) : null,
          annotation: String(oracle?.annotation ?? ""),
          heat: 0,
          pinned: Boolean(oracle?.pinned),
          display: String(display?.name ?? "unassigned"),
          space: String(space?.name ?? "unknown"),
          order: order++,
        });
      }
    }
  }

  return records;
}

function activeRepresentative(records: FleetRecord[]): FleetRecord[] {
  const unique = new Map<string, FleetRecord>();

  for (const record of [...records].sort(byActivity)) {
    if (!unique.has(record.handle)) unique.set(record.handle, record);
  }

  return [...unique.values()].sort(byActivity);
}

export function buildFleetTiles(
  census: CensusPayload | null | undefined,
  usage: UsagePayload | null | undefined,
): OracleTileItem[] {
  const usageIndex = buildUsageIndex(usage);
  const records = activeRepresentative(flattenCensus(census));

  const tiles: OracleTileItem[] = records.map((record) => {
    const rates = usageIndex.get(record.handle);
    const attention = computeAttention(record.status, record.idleSec, rates);
    const compact = (
      record.status === "stale" &&
      finiteIdle(record.idleSec) >= LONG_STALE_THRESHOLD_SEC &&
      !record.pinned &&
      attention.level === "none"
    );
    return {
      id: record.handle,
      kind: "oracle",
      x: 0,
      y: 0,
      w: compact ? COMPACT_ORACLE_WIDTH : ORACLE_WIDTH,
      h: compact ? COMPACT_ORACLE_HEIGHT : ORACLE_HEIGHT,
      attention,
      data: {
        oracle: record.oracle,
        status: record.status,
        modelTier: record.modelTier,
        idleSec: record.idleSec,
        annotation: record.annotation,
        heat: rates?.rate5h ?? 0,
        pinned: record.pinned,
        display: record.display,
        space: record.space,
        density: compact ? "compact" : "standard",
      },
    };
  });

  const standard = tiles.filter((tile) => tile.data.density === "standard");
  const compact = tiles.filter((tile) => tile.data.density === "compact");
  const compactStartY = Math.ceil(standard.length / GRID_COLUMNS) * GRID_STEP_Y;

  standard.forEach((tile, index) => {
    tile.x = (index % GRID_COLUMNS) * GRID_STEP_X;
    tile.y = Math.floor(index / GRID_COLUMNS) * GRID_STEP_Y;
  });
  compact.forEach((tile, index) => {
    tile.x = (index % COMPACT_GRID_COLUMNS) * COMPACT_GRID_STEP_X;
    tile.y = compactStartY + Math.floor(index / COMPACT_GRID_COLUMNS) * COMPACT_GRID_STEP_Y;
  });

  return [...standard, ...compact];
}

export function summarizeAttention(tiles: readonly FleetTileItem[]): AttentionSummary {
  const list = tiles.filter((tile): tile is OracleTileItem => (
    tile.kind === "oracle" && tile.attention.level !== "none"
  ));

  return {
    count: list.length,
    criticalCount: list.filter((tile) => tile.attention.level === "critical").length,
    list,
  };
}

function finiteGeometry(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function preserveGeometry(next: OracleTileItem, previous?: OracleTileItem): OracleTileItem {
  if (!previous || previous.data.density !== next.data.density) return next;

  return {
    ...next,
    x: finiteGeometry(previous.x, next.x),
    y: finiteGeometry(previous.y, next.y),
    w: finiteGeometry(previous.w, next.w),
    h: finiteGeometry(previous.h, next.h),
  };
}

export function mergeFleetTiles(
  current: readonly OracleTileItem[],
  nextOracles: OracleTileItem[],
): OracleTileItem[] {
  const currentById = new Map(current.map((item) => [item.id, item]));
  const densityChanged = nextOracles.some((item) => {
    const previous = currentById.get(item.id);
    return previous && previous.data.density !== item.data.density;
  });
  if (densityChanged) return nextOracles;
  return nextOracles.map((item) => preserveGeometry(item, currentById.get(item.id)));
}

export function createNoteTile(placement?: BoardPlacement): NoteBoardItem {
  return createNoteBoardItem(placement);
}

async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await apiFetch(url, {
    signal,
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

export interface FleetRefreshOutcome {
  census: CensusPayload | null;
  usage: UsagePayload | null;
  censusError: Error | null;
  usageError: Error | null;
}

function settledError(result: PromiseSettledResult<unknown>): Error | null {
  if (result.status === "fulfilled") return null;
  return result.reason instanceof Error ? result.reason : new Error(String(result.reason));
}

export function resolveFleetRefresh(
  censusResult: PromiseSettledResult<CensusPayload>,
  usageResult: PromiseSettledResult<UsagePayload>,
  previousCensus: CensusPayload | null,
): FleetRefreshOutcome {
  return {
    census: censusResult.status === "fulfilled" ? censusResult.value : previousCensus,
    usage: usageResult.status === "fulfilled" ? usageResult.value : null,
    censusError: settledError(censusResult),
    usageError: settledError(usageResult),
  };
}

export function useFleet(options: UseFleetOptions = {}): UseFleetResult {
  const censusUrl = options.censusUrl ?? DEFAULT_CENSUS_URL;
  const usageUrl = options.usageUrl ?? DEFAULT_USAGE_URL;
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const [fleetTiles, setFleetTiles] = useState<OracleTileItem[]>([]);
  const [boardItems, setBoardItems] = useState<BoardItem[]>([]);
  const [census, setCensus] = useState<CensusPayload | null>(null);
  const [usage, setUsage] = useState<UsagePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [censusError, setCensusError] = useState<Error | null>(null);
  const [usageError, setUsageError] = useState<Error | null>(null);
  const requestRef = useRef<Promise<void> | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const censusRef = useRef<CensusPayload | null>(null);

  const refresh = useCallback((): Promise<void> => {
    if (requestRef.current) return requestRef.current;

    const controller = new AbortController();
    controllerRef.current = controller;
    setRefreshing(true);
    const request = Promise.allSettled([
      fetchJson<CensusPayload>(censusUrl, controller.signal),
      fetchJson<UsagePayload>(usageUrl, controller.signal),
    ])
      .then(([censusResult, usageResult]) => {
        if (controller.signal.aborted) return;
        const outcome = resolveFleetRefresh(censusResult, usageResult, censusRef.current);

        if (censusResult.status === "fulfilled") {
          censusRef.current = censusResult.value;
          setCensus(censusResult.value);
        }
        setUsage(outcome.usage);
        if (outcome.census) {
          const nextTiles = buildFleetTiles(outcome.census, outcome.usage);
          setFleetTiles((current) => mergeFleetTiles(current, nextTiles));
        }
        setCensusError(outcome.censusError);
        setUsageError(outcome.usageError);
        setLoading(false);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        const nextError = reason instanceof Error ? reason : new Error(String(reason));
        setCensusError(nextError);
        setUsageError(nextError);
        setUsage(null);
        setFleetTiles((current) => (
          censusRef.current
            ? mergeFleetTiles(current, buildFleetTiles(censusRef.current, null))
            : current
        ));
        setLoading(false);
      })
      .finally(() => {
        if (requestRef.current === request) requestRef.current = null;
        if (controllerRef.current === controller) controllerRef.current = null;
        if (!controller.signal.aborted) setRefreshing(false);
      });

    requestRef.current = request;
    return request;
  }, [censusUrl, usageUrl]);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), Math.max(1_000, pollIntervalMs));

    return () => {
      window.clearInterval(interval);
      controllerRef.current?.abort();
      controllerRef.current = null;
      requestRef.current = null;
    };
  }, [pollIntervalMs, refresh]);

  const addNote = useCallback((placement?: BoardPlacement): NoteBoardItem => {
    const note = createNoteBoardItem(placement);
    setBoardItems((current) => [...current, note]);
    return note;
  }, []);

  const addImage = useCallback(async (
    placement?: BoardPlacement,
    imageOptions?: ImageSourceOptions,
  ): Promise<ImageBoardItem | null> => {
    const source = await acquireImageSource(imageOptions);
    if (!source) return null;

    const image = createImageBoardItem(source, placement);
    setBoardItems((current) => [...current, image]);
    return image;
  }, []);

  const removeTile = useCallback((id: string) => {
    setFleetTiles((current) => current.filter((item) => item.id !== id));
    setBoardItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const updateTileGeometry = useCallback((id: string, patch: GeometryPatch) => {
    const update = <T extends FleetTileItem>(current: T[]): T[] => current.map((item) => {
      if (item.id !== id) return item;
      return {
        ...item,
        x: finiteGeometry(patch.x, item.x),
        y: finiteGeometry(patch.y, item.y),
        w: Math.max(1, finiteGeometry(patch.w, item.w)),
        h: Math.max(1, finiteGeometry(patch.h, item.h)),
      } as T;
    });

    setFleetTiles(update);
    setBoardItems(update);
  }, []);

  const updateTile = useCallback((next: FleetTileItem) => {
    if (next.kind === "oracle") {
      setFleetTiles((current) => current.map((item) => item.id === next.id ? next : item));
      return;
    }

    setBoardItems((current) => current.map((item) => item.id === next.id ? next : item));
  }, []);

  const updateBoardItem = useCallback((next: BoardItem) => {
    setBoardItems((current) => current.map((item) => item.id === next.id ? next : item));
  }, []);

  const updateNote = useCallback((id: string, text: string) => {
    setBoardItems((current) => current.map((item) => item.id === id && item.kind === "note"
      ? { ...item, data: { text } }
      : item));
  }, []);

  const items = useMemo<FleetTileItem[]>(
    () => [...fleetTiles, ...boardItems],
    [boardItems, fleetTiles],
  );

  return {
    items,
    tiles: items,
    fleetTiles,
    boardItems,
    census,
    usage,
    loading,
    refreshing,
    error: censusError,
    censusError,
    usageError,
    refresh,
    addNote,
    addImage,
    removeTile,
    updateTileGeometry,
    updateTile,
    updateBoardItem,
    updateNote,
  };
}
