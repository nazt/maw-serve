import type { BoardItem } from "./boardItems";
import type { TerminalTileItem } from "./TerminalTile";

export const BOARD_STORAGE_KEY = "stoa.board.v1";
export const DEFAULT_BOARD_PAGE_ID = "fleet";
export const MAX_PERSISTED_IMAGE_BYTES = 600_000;
export const MAX_BOARD_STORAGE_BYTES = 3_500_000;

export interface PersistedGeometry {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PersistedCanvasView {
  center: readonly [number, number];
  zoom: number;
}

export type PersistedBoardItem = BoardItem | TerminalTileItem;

export interface PersistedBoardState {
  version: 1;
  fleet: Record<string, PersistedGeometry>;
  items: PersistedBoardItem[];
  canvas: PersistedCanvasView;
}

export interface LoadedBoardState extends PersistedBoardState {
  restored: boolean;
}

export interface SaveBoardResult {
  saved: boolean;
  skippedImages: number;
  error: string | null;
}

const EMPTY_BOARD_STATE: LoadedBoardState = {
  version: 1,
  fleet: {},
  items: [],
  canvas: { center: [0, 0], zoom: 1 },
  restored: false,
};

export function boardPageStorageKey(pageId: string): string {
  return `${BOARD_STORAGE_KEY}.page.${encodeURIComponent(pageId)}`;
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function geometry(value: unknown): PersistedGeometry | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<PersistedGeometry>;
  if (
    !finite(candidate.x) ||
    !finite(candidate.y) ||
    !finite(candidate.w) ||
    !finite(candidate.h) ||
    candidate.w <= 0 ||
    candidate.h <= 0
  ) {
    return null;
  }
  return {
    x: candidate.x,
    y: candidate.y,
    w: candidate.w,
    h: candidate.h,
  };
}

function boardItem(value: unknown): PersistedBoardItem | null {
  const itemGeometry = geometry(value);
  if (!itemGeometry || !value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.id !== "string") return null;

  if (candidate.kind === "note") {
    const data = candidate.data as { text?: unknown } | null;
    if (!data || typeof data.text !== "string") return null;
    return {
      id: candidate.id,
      kind: "note",
      ...itemGeometry,
      data: { text: data.text },
    };
  }

  if (candidate.kind === "image" && typeof candidate.data === "string") {
    return {
      id: candidate.id,
      kind: "image",
      ...itemGeometry,
      data: candidate.data,
    };
  }

  if (candidate.kind === "terminal") {
    const data = candidate.data as Record<string, unknown> | null;
    if (
      !data ||
      typeof data.oracle !== "string" ||
      typeof data.session !== "string" ||
      typeof data.window !== "string"
    ) {
      return null;
    }
    return {
      id: candidate.id,
      kind: "terminal",
      ...itemGeometry,
      data: {
        oracle: data.oracle,
        session: data.session,
        window: data.window,
      },
    };
  }

  return null;
}

function canvasView(value: unknown): PersistedCanvasView {
  if (!value || typeof value !== "object") return EMPTY_BOARD_STATE.canvas;
  const candidate = value as { center?: unknown; zoom?: unknown };
  const center = candidate.center;
  if (
    !Array.isArray(center) ||
    !finite(center[0]) ||
    !finite(center[1]) ||
    !finite(candidate.zoom)
  ) {
    return EMPTY_BOARD_STATE.canvas;
  }
  return {
    center: [center[0], center[1]],
    zoom: Math.min(2, Math.max(0.35, candidate.zoom)),
  };
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function localStorageAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return Boolean(window.localStorage);
  } catch {
    return false;
  }
}

export function loadBoardState(pageId = DEFAULT_BOARD_PAGE_ID): LoadedBoardState {
  if (!localStorageAvailable()) return EMPTY_BOARD_STATE;

  try {
    const raw = window.localStorage.getItem(boardPageStorageKey(pageId)) ?? (
      pageId === DEFAULT_BOARD_PAGE_ID
        ? window.localStorage.getItem(BOARD_STORAGE_KEY)
        : null
    );
    if (!raw) return EMPTY_BOARD_STATE;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed.version !== 1) return EMPTY_BOARD_STATE;

    const fleet: Record<string, PersistedGeometry> = {};
    if (parsed.fleet && typeof parsed.fleet === "object") {
      for (const [id, value] of Object.entries(parsed.fleet)) {
        const savedGeometry = geometry(value);
        if (savedGeometry) fleet[id] = savedGeometry;
      }
    }

    const items = Array.isArray(parsed.items)
      ? parsed.items.map(boardItem).filter((item): item is PersistedBoardItem => item !== null)
      : [];

    return {
      version: 1,
      fleet,
      items,
      canvas: canvasView(parsed.canvas),
      restored: true,
    };
  } catch {
    return EMPTY_BOARD_STATE;
  }
}

export function saveBoardState(
  state: PersistedBoardState,
  pageId = DEFAULT_BOARD_PAGE_ID,
): SaveBoardResult {
  if (!localStorageAvailable()) {
    return { saved: false, skippedImages: 0, error: "Layout storage is unavailable" };
  }

  let skippedImages = 0;
  const items = state.items.filter((item) => {
    if (
      item.kind === "image" &&
      item.data.startsWith("data:image/") &&
      byteLength(item.data) > MAX_PERSISTED_IMAGE_BYTES
    ) {
      skippedImages += 1;
      return false;
    }
    return true;
  });
  const snapshot: PersistedBoardState = { ...state, items };
  const serialized = JSON.stringify(snapshot);

  if (byteLength(serialized) > MAX_BOARD_STORAGE_BYTES) {
    return {
      saved: false,
      skippedImages,
      error: "Layout is too large to save locally",
    };
  }

  try {
    window.localStorage.setItem(boardPageStorageKey(pageId), serialized);
    if (pageId === DEFAULT_BOARD_PAGE_ID) {
      window.localStorage.removeItem(BOARD_STORAGE_KEY);
    }
    return { saved: true, skippedImages, error: null };
  } catch {
    return {
      saved: false,
      skippedImages,
      error: "Browser storage quota was exceeded",
    };
  }
}

export function clearBoardState(pageId = DEFAULT_BOARD_PAGE_ID): void {
  if (!localStorageAvailable()) return;
  try {
    window.localStorage.removeItem(boardPageStorageKey(pageId));
    if (pageId === DEFAULT_BOARD_PAGE_ID) {
      window.localStorage.removeItem(BOARD_STORAGE_KEY);
    }
  } catch {
    // Storage may be disabled; the in-memory reset still succeeds.
  }
}
