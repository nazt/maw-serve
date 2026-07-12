import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import { Fabric } from "./canvas/Fabric";
import CanvasContextMenu, {
  type CanvasMenuAction,
} from "./canvas/ContextMenu";
import { useCanvas, type CanvasPoint } from "./canvas/useCanvas";
import {
  activeHost,
  connectHostUrl,
  shouldOfferHostConnection,
} from "./clients/api";
import {
  acquireImageSource,
  clipboardImageBlobs,
  createImageBoardItem,
  createNoteBoardItem,
  hasSupportedImageData,
  imageAspectRatio,
  imageBlobsFromDataTransfer,
  imageElementProps,
  prepareImageBlob,
  type BoardItem,
  type BoardPoint,
  type NoteBoardItem,
} from "./board/boardItems";
import {
  clearBoardState,
  loadBoardState,
  saveBoardState,
  type PersistedBoardItem,
  type PersistedBoardState,
  type PersistedGeometry,
} from "./board/persist";
import PageTabs from "./board/PageTabs";
import {
  BOARD_PAGES_STORAGE_KEY,
  boardPageHref,
  createBoardPage,
  loadBoardPages,
  pageIdFromHash,
  saveBoardPages,
  useHashPage,
  type BoardPage,
} from "./board/pages";
import TerminalTile, {
  type TerminalTileItem,
} from "./board/TerminalTile";
import OracleTileContent from "./fleet/OracleTileContent";
import StatusBar, { summarizeFleet } from "./fleet/StatusBar";
import type { Theme } from "./theme";
import { useTheme } from "./useTheme";
import {
  normalizeOracleHandle,
  summarizeAttention,
  useFleet,
  type CensusOracle,
  type CensusPayload,
  type FleetTileItem,
  type OracleTileItem,
} from "./fleet/useFleet";
import Tile from "./tiles/Tile";
import MirrorPageView from "./mirror/MirrorPageView";
import { displayPageId } from "./mirror/model";
import { useMirrorOracleModels, useMirrorReport, useOraclePulse } from "./mirror/useMirror";

type AppTileItem = FleetTileItem | TerminalTileItem;
type UserBoardItem = BoardItem | TerminalTileItem;
type HintState = "visible" | "leaving";
type OraclePress = {
  oracle: OracleTileItem;
  pointerId: number;
  clientX: number;
  clientY: number;
  doublePress: boolean;
  moved: boolean;
};
type BoardMenuTarget =
  | { type: "canvas" }
  | { type: "oracle"; id: string }
  | { type: "item"; id: string };
type BoardMenuState = {
  x: number;
  y: number;
  world: CanvasPoint;
  target: BoardMenuTarget;
};

const BOARD_HINT_STORAGE_KEY = "stoa-board-hint-v1";
const BOARD_HINT_VISIBLE_MS = 7_000;
const BOARD_HINT_EXIT_MS = 240;
const ORACLE_SINGLE_CLICK_MS = 280;
const ORACLE_BASE_Z = 1;
const ORACLE_ATTENTION_Z = 6;
const ORACLE_FRONT_Z = 9;
const USER_ITEM_MIN_Z = 10;

const STATUS_LEGEND = [
  ["active", "active"],
  ["idle", "idle"],
  ["stale", "stale"],
  ["pinned", "pinned"],
] as const;

function normalizeUserItemZ(items: readonly PersistedBoardItem[]): PersistedBoardItem[] {
  let topZ = USER_ITEM_MIN_Z - 1;
  return items.map((item) => {
    const savedZ = Number(item.zIndex);
    const zIndex = Number.isFinite(savedZ) && savedZ >= USER_ITEM_MIN_Z
      ? Math.round(savedZ)
      : topZ + 1;
    topZ = Math.max(topZ, zIndex);
    return { ...item, zIndex };
  });
}

function tileZIndex(item: AppTileItem): number {
  const savedZ = Number(item.zIndex);
  if (item.kind === "oracle") {
    if (Number.isFinite(savedZ)) {
      return Math.min(ORACLE_FRONT_Z, Math.max(ORACLE_BASE_Z, Math.round(savedZ)));
    }
    return item.attention.level === "none" ? ORACLE_BASE_Z : ORACLE_ATTENTION_Z;
  }

  return Number.isFinite(savedZ)
    ? Math.max(USER_ITEM_MIN_Z, Math.round(savedZ))
    : USER_ITEM_MIN_Z;
}

const clockFormatter = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function useClock(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(interval);
  }, []);

  return now;
}

function initialHintState(): HintState | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(BOARD_HINT_STORAGE_KEY) === null
      ? "visible"
      : null;
  } catch {
    return "visible";
  }
}

function persistHintDismissal(): void {
  try {
    window.localStorage.setItem(BOARD_HINT_STORAGE_KEY, "dismissed");
  } catch {
    // The hint still leaves when browser storage is unavailable.
  }
}

async function copyText(value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
    return;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
}

interface NoteTileContentProps {
  item: NoteBoardItem;
  onChange: (id: string, text: string) => void;
}

function NoteTileContent({ item, onChange }: NoteTileContentProps) {
  return (
    <div className="h-full rounded-md border border-[var(--pinned)] bg-[var(--note-surface)] p-2.5 shadow-[0_0_8px_var(--pinned-glow)]">
      <textarea
        className="h-full w-full resize-none border-0 bg-transparent font-mono text-sm leading-relaxed text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)]"
        aria-label="Board note"
        placeholder="Write a board note…"
        value={item.data.text}
        onChange={(event) => onChange(item.id, event.target.value)}
      />
    </div>
  );
}

interface BoardItemContentProps {
  item: BoardItem;
  onNoteChange: (id: string, text: string) => void;
  onClose: (id: string) => void;
}

function BoardItemContent({ item, onNoteChange, onClose }: BoardItemContentProps) {
  if (item.kind === "note") {
    return <NoteTileContent item={item} onChange={onNoteChange} />;
  }

  return (
    <div className="image-tile group relative h-full overflow-hidden rounded-md border border-[var(--line)] bg-[var(--surface)] p-1.5 shadow-[0_0_12px_oklch(var(--idle-channels)/0.08)]">
      <img
        {...imageElementProps(item)}
        className="h-full w-full select-none rounded-sm object-contain"
      />
      <button
        type="button"
        className="image-tile__close"
        aria-label="Remove board image"
        title="Remove image"
        onClick={() => onClose(item.id)}
      >
        ×
      </button>
      <span className="image-tile__resize-hint" aria-hidden="true">
        Shift · free resize
      </span>
    </div>
  );
}

const toolbarButtonClass = [
  "rounded-md",
  "border",
  "border-[var(--line)]",
  "bg-[var(--surface)]",
  "px-2.5",
  "py-1.5",
  "text-xs",
  "font-semibold",
  "text-[var(--ink)]",
  "transition-colors",
  "duration-150",
  "hover:bg-[var(--surface-2)]",
  "focus-visible:outline",
  "focus-visible:outline-2",
  "focus-visible:outline-offset-2",
  "focus-visible:outline-[var(--idle)]",
  "disabled:cursor-not-allowed",
  "disabled:opacity-50",
].join(" ");

interface BoardToolbarProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onJumpToActive: () => void;
  jumpDisabled: boolean;
  onJumpToAttention: () => void;
  attentionCount: number;
  attentionCritical: boolean;
  onAddNote: () => void;
  onAddImage: () => Promise<void>;
  onFit: () => void;
  onReset: () => void;
  disabled: boolean;
  addingImage: boolean;
}

function BoardToolbar({
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onJumpToActive,
  jumpDisabled,
  onJumpToAttention,
  attentionCount,
  attentionCritical,
  onAddNote,
  onAddImage,
  onFit,
  onReset,
  disabled,
  addingImage,
}: BoardToolbarProps) {
  const zoomPercent = `${Math.round(Math.min(2, Math.max(0.35, zoom)) * 100)}%`;

  return (
    <div
      className="fixed bottom-11 left-1/2 z-40 flex max-w-[calc(100vw-1rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-1.5 rounded-lg bg-[var(--surface)] p-1.5 shadow-[0_0_0_1px_var(--line)]"
      role="toolbar"
      aria-label="Board controls"
    >
      <button
        type="button"
        className={`${toolbarButtonClass} flex items-center gap-1.5`}
        onClick={onJumpToActive}
        disabled={jumpDisabled}
        aria-keyshortcuts="J"
        title="Cycle recently active oracles (J)"
      >
        <span>Jump to active</span>
        <kbd className="font-mono text-[10px] font-medium text-[var(--ink-dim)]">J</kbd>
      </button>
      <button
        type="button"
        className={`${toolbarButtonClass} flex items-center gap-1.5 ${
          attentionCritical
            ? "border-[var(--error)] text-[var(--ink)]"
            : attentionCount > 0
              ? "border-[var(--pinned)] text-[var(--ink)]"
              : "text-[var(--ink-dim)]"
        }`}
        onClick={onJumpToAttention}
        disabled={attentionCount === 0}
        aria-keyshortcuts="A"
        aria-label={`${attentionCount} ${attentionCount === 1 ? "oracle needs" : "oracles need"} attention${
          attentionCritical ? ", including critical issues" : ""
        }. Cycle attention targets with A.`}
        title="Cycle oracles that need attention (A)"
      >
        <span aria-hidden="true">⚠ {attentionCount} need attention</span>
        <kbd className="font-mono text-[10px] font-medium text-current">A</kbd>
      </button>
      <button
        type="button"
        className={toolbarButtonClass}
        onClick={onAddNote}
        disabled={disabled}
      >
        Add note
      </button>
      <button
        type="button"
        className={toolbarButtonClass}
        onClick={() => void onAddImage()}
        disabled={disabled || addingImage}
      >
        {addingImage ? "Adding image…" : "Add image"}
      </button>
      <button
        type="button"
        className={toolbarButtonClass}
        onClick={onFit}
        disabled={disabled}
        aria-keyshortcuts="Shift+1"
        title="Fit all tiles · Shift+1"
      >
        Fit all
      </button>
      <button
        type="button"
        className={toolbarButtonClass}
        onClick={onReset}
      >
        Reset layout
      </button>
      <div
        className="flex h-7 items-stretch overflow-visible rounded-md border border-[var(--line)] bg-[var(--surface)]"
        role="group"
        aria-label="Canvas zoom"
      >
        <button
          type="button"
          className="grid min-h-7 min-w-7 place-items-center rounded-l-[5px] text-base leading-none text-[var(--ink)] transition-colors duration-150 hover:bg-[var(--surface-2)] focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--idle)]"
          onClick={onZoomOut}
          aria-label="Zoom out"
          aria-keyshortcuts="-"
          title="Zoom out · ⌘+scroll"
        >
          −
        </button>
        <button
          type="button"
          className="min-h-7 min-w-12 border-x border-[var(--line)] px-1 font-mono text-xs tabular-nums text-[var(--ink-dim)] transition-colors duration-150 hover:bg-[var(--surface-2)] focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--idle)]"
          onClick={onResetZoom}
          aria-label={`Reset canvas zoom to 100%. Current zoom ${zoomPercent}`}
          aria-keyshortcuts="0"
          title="Reset zoom to 100% · 0"
        >
          <span aria-hidden="true">{zoomPercent}</span>
        </button>
        <button
          type="button"
          className="grid min-h-7 min-w-7 place-items-center rounded-r-[5px] text-base leading-none text-[var(--ink)] transition-colors duration-150 hover:bg-[var(--surface-2)] focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--idle)]"
          onClick={onZoomIn}
          aria-label="Zoom in"
          aria-keyshortcuts="= +"
          title="Zoom in · ⌘+scroll"
        >
          +
        </button>
      </div>
    </div>
  );
}

interface BoardStateProps {
  loading: boolean;
  error: Error | null;
  hasTiles: boolean;
}

function BoardState({ loading, error, hasTiles }: BoardStateProps) {
  if (hasTiles) return null;

  if (error && shouldOfferHostConnection()) {
    const exampleHost = "http://localhost:48900";
    return (
      <section
        className="absolute left-1/2 top-1/2 z-10 w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5 font-sans"
        role="alert"
        aria-labelledby="stoa-connect-title"
      >
        <p className="mb-1 font-mono text-[11px] text-[var(--ink-dim)]">local fleet connection</p>
        <h2 id="stoa-connect-title" className="text-lg font-semibold text-[var(--ink)]">
          Point Stoa at your maw-serve
        </h2>
        <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-[var(--ink-dim)]">
          This hosted board is only the interface. Your census, usage, and terminal stream stay
          on your machine and are fetched directly by this browser.
        </p>
        {activeHost ? (
          <p className="mt-3 break-all font-mono text-xs text-[var(--ink)]">
            Could not reach {activeHost}
          </p>
        ) : null}
        <form className="mt-4" method="get">
          <label
            className="mb-1 block font-mono text-[11px] text-[var(--ink-dim)]"
            htmlFor="stoa-host"
          >
            maw-serve URL
          </label>
          <div className="flex gap-2">
            <input
              id="stoa-host"
              name="host"
              type="url"
              required
              defaultValue={activeHost || exampleHost}
              placeholder={exampleHost}
              className="min-h-9 min-w-0 flex-1 rounded-md border border-[var(--line)] bg-[var(--bg)] px-3 font-mono text-xs text-[var(--ink)] outline-none focus:border-[var(--idle)]"
              aria-describedby="stoa-host-hint"
            />
            <button
              className="min-h-9 shrink-0 rounded-md bg-[var(--idle)] px-3 text-sm font-semibold text-[var(--ink-inverse)] transition-colors duration-150 hover:bg-[var(--active)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--idle)]"
              type="submit"
            >
              Connect
            </button>
          </div>
          <p id="stoa-host-hint" className="mt-2 font-mono text-[11px] text-[var(--ink-dim)]">
            Example: {exampleHost}
          </p>
        </form>
        <a
          className="mt-3 inline-flex font-mono text-xs text-[var(--ink-dim)] underline decoration-[var(--line)] underline-offset-4 hover:text-[var(--ink)]"
          href={connectHostUrl("")}
        >
          Use same-origin server
        </a>
      </section>
    );
  }

  const message = loading
    ? "Acquiring fleet telemetry…"
    : error
      ? "Fleet telemetry is unavailable · retrying"
      : "No oracle agents are currently reporting";

  return (
    <p
      className={`pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 font-mono text-sm ${error ? "text-[var(--ink)]" : "text-[var(--ink-dim)]"}`}
      role={error ? "alert" : "status"}
    >
      {message}
    </p>
  );
}

interface ImageDropGhostProps {
  x: number;
  y: number;
  w: number;
  h: number;
  style?: CSSProperties;
}

function ImageDropGhost({ style }: ImageDropGhostProps) {
  return (
    <div
      className="image-drop-ghost"
      data-image-drop-ghost="true"
      style={style}
      aria-hidden="true"
    >
      <span className="image-drop-ghost__icon">↘</span>
      <strong>drop image</strong>
      <span>PNG · JPG · WebP · GIF</span>
    </div>
  );
}

function tileClassName(item: AppTileItem): string {
  if (item.kind === "note") {
    return "rounded-md bg-[var(--note-surface)]";
  }

  if (item.kind === "image") {
    return "rounded-md bg-[var(--surface)]";
  }

  if (item.kind === "terminal") {
    return "rounded-md bg-[var(--terminal-surface)]";
  }

  return [
    "rounded-md",
    "bg-[var(--surface)]",
    "tile-glow",
    `tile-glow-${item.data.status}`,
  ].join(" ");
}

function finiteIdle(value: number | null | undefined): number {
  const idle = Number(value);
  return Number.isFinite(idle) && idle >= 0 ? idle : Number.POSITIVE_INFINITY;
}

function idleDetail(value: number | null): string {
  if (value === null || !Number.isFinite(value) || value < 0) return "—";
  if (value <= 5) return "live";
  if (value < 60) return `${Math.floor(value)}s`;
  if (value < 3_600) return `${Math.floor(value / 60)}m`;
  return `${Math.floor(value / 3_600)}h`;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable ||
    ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName);
}

function terminalPane(
  census: CensusPayload | null,
  tile: OracleTileItem,
): { session: string; window: string } | null {
  const candidates: CensusOracle[] = [];

  for (const display of census?.displays ?? []) {
    for (const space of display.spaces ?? []) {
      for (const oracle of space.oracles ?? []) {
        if (
          normalizeOracleHandle(oracle.oracle) === tile.id &&
          oracle.session &&
          oracle.pane
        ) {
          candidates.push(oracle);
        }
      }
    }
  }

  candidates.sort((left, right) => {
    const leftStatus = String(left.status ?? "stale").toLowerCase();
    const rightStatus = String(right.status ?? "stale").toLowerCase();
    const statusMatch = (
      Number(rightStatus === tile.data.status) -
      Number(leftStatus === tile.data.status)
    );
    return statusMatch || finiteIdle(left.idleSec) - finiteIdle(right.idleSec);
  });

  const target = candidates[0];
  return target?.session && target.pane
    ? { session: target.session, window: target.pane }
    : null;
}

interface BoardPageViewProps {
  pageId: string;
  pages: BoardPage[];
  onSelectPage: (pageId: string) => void;
  onCreatePage: () => void;
  onRenamePage: (pageId: string, name: string) => void;
  onDeletePage: (pageId: string) => void;
  oracleDisplayPages: ReadonlyMap<string, string>;
  theme: Theme;
  onToggleTheme: () => void;
}

function BoardPageView({
  pageId,
  pages,
  onSelectPage,
  onCreatePage,
  onRenamePage,
  onDeletePage,
  oracleDisplayPages,
  theme,
  onToggleTheme,
}: BoardPageViewProps) {
  const [restoredState] = useState(() => loadBoardState(pageId));
  const [restoredItems] = useState(() => normalizeUserItemZ(restoredState.items));
  const canvas = useCanvas(restoredState.canvas);
  const {
    fleetTiles,
    census,
    usage,
    loading,
    error,
  } = useFleet();
  const now = useClock();
  const [addingImage, setAddingImage] = useState(false);
  const [boardMenu, setBoardMenu] = useState<BoardMenuState | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const [dropPoint, setDropPoint] = useState<{ x: number; y: number } | null>(null);
  const [hintState, setHintState] = useState<HintState | null>(initialHintState);
  const [layoutEpoch, setLayoutEpoch] = useState(0);
  const [persistenceWarning, setPersistenceWarning] = useState<string | null>(null);
  const [selectedOracleId, setSelectedOracleId] = useState<string | null>(null);
  const oracleClickTimerRef = useRef<number | null>(null);
  const pendingOracleIdRef = useRef<string | null>(null);
  const oraclePressRef = useRef<OraclePress | null>(null);
  const jumpCursorRef = useRef<string | null>(null);
  const attentionCursorRef = useRef<string | null>(null);
  const topZRef = useRef(restoredItems.reduce(
    (top, item) => Math.max(top, Number(item.zIndex) || USER_ITEM_MIN_Z),
    USER_ITEM_MIN_Z - 1,
  ));
  const [fleetGeometry, setFleetGeometry] = useState<Record<string, PersistedGeometry>>(
    restoredState.fleet,
  );
  const [boardItems, setBoardItems] = useState<BoardItem[]>(() => (
    restoredItems.filter((item): item is BoardItem => item.kind !== "terminal")
  ));
  const [terminalTiles, setTerminalTiles] = useState<TerminalTileItem[]>(() => (
    restoredItems.filter((item): item is TerminalTileItem => item.kind === "terminal")
  ));
  const initialFitComplete = useRef(restoredState.restored);
  const positionedFleetTiles = useMemo<OracleTileItem[]>(() => (
    fleetTiles.map((item) => ({ ...item, ...fleetGeometry[item.id] }))
  ), [fleetGeometry, fleetTiles]);
  const jumpTargets = useMemo<OracleTileItem[]>(() => {
    const byActivity = (left: OracleTileItem, right: OracleTileItem) => (
      finiteIdle(left.data.idleSec) - finiteIdle(right.data.idleSec) ||
      left.id.localeCompare(right.id)
    );
    const active = positionedFleetTiles
      .filter((item) => item.data.status === "active")
      .sort(byActivity);
    if (active.length > 0) return active;
    return [...positionedFleetTiles].sort(byActivity).slice(0, 1);
  }, [positionedFleetTiles]);
  const attentionSummary = useMemo(
    () => summarizeAttention(positionedFleetTiles),
    [positionedFleetTiles],
  );
  const attentionTargets = useMemo<OracleTileItem[]>(() => (
    [...attentionSummary.list].sort((left, right) => (
      Number(right.attention.level === "critical") -
        Number(left.attention.level === "critical") ||
      finiteIdle(left.data.idleSec) - finiteIdle(right.data.idleSec) ||
      left.id.localeCompare(right.id)
    ))
  ), [attentionSummary.list]);
  const statusTiles = useMemo<FleetTileItem[]>(
    () => [...positionedFleetTiles, ...boardItems],
    [boardItems, positionedFleetTiles],
  );
  const allTiles = useMemo<AppTileItem[]>(
    () => [...statusTiles, ...terminalTiles],
    [statusTiles, terminalTiles],
  );
  const totals = useMemo(() => summarizeFleet(statusTiles, usage), [statusTiles, usage]);
  const hasOracleTiles = positionedFleetTiles.length > 0;
  const persistedState: PersistedBoardState = useMemo(() => ({
    version: 1,
    fleet: fleetGeometry,
    items: [...boardItems, ...terminalTiles],
    canvas: { center: canvas.center, zoom: canvas.zoom },
  }), [boardItems, canvas.center, canvas.zoom, fleetGeometry, terminalTiles]);
  const persistedStateRef = useRef(persistedState);
  persistedStateRef.current = persistedState;

  const dismissHint = useCallback(() => {
    setHintState((current) => current === "visible" ? "leaving" : current);
  }, []);
  const closeBoardMenu = useCallback(() => setBoardMenu(null), []);

  useEffect(() => {
    if (hintState === null) return;

    if (hintState === "visible") {
      const timeout = window.setTimeout(dismissHint, BOARD_HINT_VISIBLE_MS);
      return () => window.clearTimeout(timeout);
    }

    persistHintDismissal();
    const timeout = window.setTimeout(() => setHintState(null), BOARD_HINT_EXIT_MS);
    return () => window.clearTimeout(timeout);
  }, [dismissHint, hintState]);

  const cancelOracleClick = useCallback(() => {
    if (oracleClickTimerRef.current !== null) {
      window.clearTimeout(oracleClickTimerRef.current);
    }
    oracleClickTimerRef.current = null;
    pendingOracleIdRef.current = null;
  }, []);

  useEffect(() => cancelOracleClick, [cancelOracleClick]);

  useEffect(() => {
    if (initialFitComplete.current || !hasOracleTiles) return;

    const frame = window.requestAnimationFrame(() => {
      canvas.fit(positionedFleetTiles);
      initialFitComplete.current = true;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [canvas, hasOracleTiles, positionedFleetTiles]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const result = saveBoardState(persistedState, pageId);
      setPersistenceWarning(
        result.error ?? (
          result.skippedImages > 0
            ? `${result.skippedImages} large image${
              result.skippedImages === 1 ? " was" : "s were"
            } omitted from saved layout`
            : null
        ),
      );
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [
    pageId,
    persistedState,
  ]);

  useEffect(() => () => {
    saveBoardState(persistedStateRef.current, pageId);
  }, [pageId]);

  const viewportCenter = useCallback(() => {
    const fabric = canvas.fabricRef.current;
    if (!fabric) return { x: canvas.center[0], y: canvas.center[1] };

    const bounds = fabric.getBoundingClientRect();
    return canvas.screenToWorld({
      clientX: bounds.left + bounds.width / 2,
      clientY: bounds.top + bounds.height / 2,
    });
  }, [canvas]);

  const nextUserZ = useCallback(() => {
    topZRef.current = Math.max(USER_ITEM_MIN_Z - 1, topZRef.current) + 1;
    return topZRef.current;
  }, []);

  const raiseUserItem = useCallback((id: string) => {
    const zIndex = nextUserZ();
    setBoardItems((current) => current.map((item) => (
      item.id === id ? { ...item, zIndex } : item
    )));
    setTerminalTiles((current) => current.map((item) => (
      item.id === id ? { ...item, zIndex } : item
    )));
  }, [nextUserZ]);

  const raiseOracle = useCallback((oracle: OracleTileItem) => {
    setFleetGeometry((current) => {
      const next = Object.fromEntries(Object.entries(current).map(([id, geometry]) => [
        id,
        id !== oracle.id && geometry.zIndex === ORACLE_FRONT_Z
          ? { ...geometry, zIndex: ORACLE_FRONT_Z - 1 }
          : geometry,
      ]));
      next[oracle.id] = {
        ...(current[oracle.id] ?? {
          x: oracle.x,
          y: oracle.y,
          w: oracle.w,
          h: oracle.h,
        }),
        zIndex: ORACLE_FRONT_Z,
      };
      return next;
    });
  }, []);

  const activateTile = useCallback((item: AppTileItem) => {
    if (item.kind === "oracle") raiseOracle(item);
    else raiseUserItem(item.id);
  }, [raiseOracle, raiseUserItem]);

  const addNoteAt = useCallback((point: CanvasPoint) => {
    const note = {
      ...createNoteBoardItem({ center: point }),
      zIndex: nextUserZ(),
    };
    setBoardItems((current) => [...current, note]);
  }, [nextUserZ]);

  const addImageBlobs = useCallback(async (
    blobs: readonly Blob[],
    center: BoardPoint,
  ) => {
    if (blobs.length === 0) return;
    setAddingImage(true);
    try {
      const anchor = Array.isArray(center)
        ? { x: center[0], y: center[1] }
        : center as { x: number; y: number };
      const prepared = [];
      for (const blob of blobs) {
        prepared.push(await prepareImageBlob(blob));
      }
      const images = prepared.map((source, index) => createImageBoardItem(source, {
        center: {
          x: anchor.x + index * 28,
          y: anchor.y + index * 28,
        },
      })).map((image) => ({ ...image, zIndex: nextUserZ() }));
      setBoardItems((current) => [...current, ...images]);
      setPersistenceWarning(null);
    } catch (cause) {
      setPersistenceWarning(
        cause instanceof Error ? cause.message : "Image could not be added",
      );
    } finally {
      setAddingImage(false);
    }
  }, [nextUserZ]);

  const addImageAt = useCallback(async (point: CanvasPoint) => {
    setAddingImage(true);
    try {
      const blobs = await clipboardImageBlobs();
      if (blobs.length > 0) {
        await addImageBlobs(blobs, point);
        return;
      }
      const source = await acquireImageSource({ clipboard: null });
      if (!source) return;
      const image = {
        ...createImageBoardItem(source, { center: point }),
        zIndex: nextUserZ(),
      };
      setBoardItems((current) => [...current, image]);
    } finally {
      setAddingImage(false);
    }
  }, [addImageBlobs, nextUserZ]);

  const addNoteAtViewportCenter = useCallback(
    () => addNoteAt(viewportCenter()),
    [addNoteAt, viewportCenter],
  );

  const addImageAtViewportCenter = useCallback(
    () => addImageAt(viewportCenter()),
    [addImageAt, viewportCenter],
  );

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (isEditableTarget(event.target)) return;
      const immediate = imageBlobsFromDataTransfer(event.clipboardData);
      if (immediate.length > 0) {
        event.preventDefault();
        void addImageBlobs(immediate, viewportCenter());
        return;
      }

      void clipboardImageBlobs().then((blobs) => {
        if (blobs.length > 0) void addImageBlobs(blobs, viewportCenter());
      });
    };

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [addImageBlobs, viewportCenter]);

  const openTerminal = useCallback((oracle: OracleTileItem) => {
    const target = terminalPane(census, oracle);
    if (!target) return;

    const id = `terminal:${target.session}:${target.window}`;
    const zIndex = nextUserZ();
    setTerminalTiles((current) => {
      if (current.some((item) => item.id === id)) {
        return current.map((item) => item.id === id ? { ...item, zIndex } : item);
      }
      const offset = (current.length % 5) * 24;
      return [
        ...current,
        {
          id,
          kind: "terminal",
          x: oracle.x + 36 + offset,
          y: oracle.y + oracle.h + 28 + offset,
          w: 560,
          h: 340,
          zIndex,
          data: {
            oracle: oracle.data.oracle,
            session: target.session,
            window: target.window,
          },
        },
      ];
    });
  }, [census, nextUserZ]);

  const focusOracle = useCallback((oracle: OracleTileItem) => {
    raiseOracle(oracle);
    setSelectedOracleId(oracle.id);
    canvas.focusOn({ x: oracle.x, y: oracle.y, w: oracle.w, h: oracle.h });
  }, [canvas, raiseOracle]);

  const jumpToActive = useCallback(() => {
    cancelOracleClick();
    if (jumpTargets.length === 0) return;
    attentionCursorRef.current = null;
    const cursorIndex = jumpTargets.findIndex(
      (item) => item.id === jumpCursorRef.current,
    );
    const next = jumpTargets[(cursorIndex + 1) % jumpTargets.length];
    jumpCursorRef.current = next.id;
    focusOracle(next);
  }, [cancelOracleClick, focusOracle, jumpTargets]);

  const jumpToAttention = useCallback(() => {
    cancelOracleClick();
    if (attentionTargets.length === 0) return;
    jumpCursorRef.current = null;
    const cursorIndex = attentionTargets.findIndex(
      (item) => item.id === attentionCursorRef.current,
    );
    const next = attentionTargets[(cursorIndex + 1) % attentionTargets.length];
    attentionCursorRef.current = next.id;
    focusOracle(next);
  }, [attentionTargets, cancelOracleClick, focusOracle]);

  const selectedTile = useMemo(
    () => selectedOracleId
      ? allTiles.find((item) => item.id === selectedOracleId) ?? null
      : null,
    [allTiles, selectedOracleId],
  );
  const fitAll = useCallback(() => canvas.fit(allTiles), [allTiles, canvas]);
  const fitSelection = useCallback(() => {
    if (selectedTile) canvas.fit([selectedTile]);
  }, [canvas, selectedTile]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.repeat ||
        isEditableTarget(event.target)
      ) {
        return;
      }

      if (event.shiftKey && (event.code === "Digit1" || event.code === "Digit2")) {
        event.preventDefault();
        if (event.code === "Digit1") fitAll();
        else fitSelection();
        return;
      }

      if (key === "j" || key === "a") {
        event.preventDefault();
        if (key === "a") jumpToAttention();
        else jumpToActive();
        return;
      }

      if (key === "+" || key === "=") {
        event.preventDefault();
        canvas.zoomBy(1.2);
      } else if (key === "-") {
        event.preventDefault();
        canvas.zoomBy(1 / 1.2);
      } else if (key === "0") {
        event.preventDefault();
        canvas.zoomTo(1);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    canvas.zoomBy,
    canvas.zoomTo,
    fitAll,
    fitSelection,
    jumpToActive,
    jumpToAttention,
  ]);

  const handleOracleClick = useCallback((oracle: OracleTileItem) => {
    cancelOracleClick();
    pendingOracleIdRef.current = oracle.id;
    oracleClickTimerRef.current = window.setTimeout(() => {
      oracleClickTimerRef.current = null;
      pendingOracleIdRef.current = null;
      jumpCursorRef.current = null;
      attentionCursorRef.current = null;
      focusOracle(oracle);
    }, ORACLE_SINGLE_CLICK_MS);
  }, [cancelOracleClick, focusOracle]);

  const handleOracleDoubleClick = useCallback((oracle: OracleTileItem) => {
    cancelOracleClick();
    openTerminal(oracle);
  }, [cancelOracleClick, openTerminal]);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const press = oraclePressRef.current;
      if (!press || press.pointerId !== event.pointerId) return;
      press.moved ||= Math.hypot(
        event.clientX - press.clientX,
        event.clientY - press.clientY,
      ) > 5;
    };
    const onPointerEnd = (event: PointerEvent) => {
      const press = oraclePressRef.current;
      if (!press || press.pointerId !== event.pointerId) return;
      oraclePressRef.current = null;
      if (event.type === "pointercancel" || press.moved) return;
      if (press.doublePress) handleOracleDoubleClick(press.oracle);
      else handleOracleClick(press.oracle);
    };

    window.addEventListener("pointermove", onPointerMove, true);
    window.addEventListener("pointerup", onPointerEnd, true);
    window.addEventListener("pointercancel", onPointerEnd, true);
    return () => {
      window.removeEventListener("pointermove", onPointerMove, true);
      window.removeEventListener("pointerup", onPointerEnd, true);
      window.removeEventListener("pointercancel", onPointerEnd, true);
    };
  }, [handleOracleClick, handleOracleDoubleClick]);

  const updateAppTile = useCallback((next: AppTileItem) => {
    if (next.kind === "oracle") {
      setFleetGeometry((current) => {
        const savedZ = current[next.id]?.zIndex;
        return {
          ...current,
          [next.id]: {
            x: next.x,
            y: next.y,
            w: next.w,
            h: next.h,
            ...(Number.isFinite(savedZ) ? { zIndex: savedZ } : {}),
          },
        };
      });
      return;
    }
    if (next.kind === "terminal") {
      setTerminalTiles((current) => current.map((item) => (
        item.id === next.id
          ? { ...next, zIndex: Math.max(tileZIndex(item), tileZIndex(next)) }
          : item
      )));
      return;
    }
    setBoardItems((current) => current.map((item) => (
      item.id === next.id
        ? { ...next, zIndex: Math.max(tileZIndex(item), tileZIndex(next)) }
        : item
    )));
  }, []);

  const updateNote = useCallback((id: string, text: string) => {
    setBoardItems((current) => current.map((item) => (
      item.id === id && item.kind === "note"
        ? { ...item, data: { text } }
        : item
    )));
  }, []);

  const closeBoardItem = useCallback((id: string) => {
    setBoardItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const closeTerminal = useCallback((id: string) => {
    setTerminalTiles((current) => current.filter((item) => item.id !== id));
  }, []);

  const sendToBack = useCallback((id: string) => {
    const items: UserBoardItem[] = [...boardItems, ...terminalTiles];
    const others = items.filter((item) => item.id !== id);
    const minimumOtherZ = others.reduce(
      (minimum, item) => Math.min(minimum, tileZIndex(item)),
      Number.POSITIVE_INFINITY,
    );
    const shiftOthers = minimumOtherZ <= USER_ITEM_MIN_Z;
    const backZ = shiftOthers
      ? USER_ITEM_MIN_Z
      : Number.isFinite(minimumOtherZ)
        ? minimumOtherZ - 1
        : USER_ITEM_MIN_Z;
    const reorder = <Item extends UserBoardItem>(item: Item): Item => {
      if (item.id === id) return { ...item, zIndex: backZ };
      if (shiftOthers) return { ...item, zIndex: tileZIndex(item) + 1 };
      return item;
    };

    const nextBoardItems = boardItems.map(reorder);
    const nextTerminalTiles = terminalTiles.map(reorder);
    topZRef.current = Math.max(
      topZRef.current,
      ...nextBoardItems.map(tileZIndex),
      ...nextTerminalTiles.map(tileZIndex),
    );
    setBoardItems(nextBoardItems);
    setTerminalTiles(nextTerminalTiles);
  }, [boardItems, terminalTiles]);

  const deleteBoardItem = useCallback((id: string) => {
    setBoardItems((current) => current.filter((item) => item.id !== id));
    setTerminalTiles((current) => current.filter((item) => item.id !== id));
  }, []);

  const resetLayout = useCallback(() => {
    clearBoardState(pageId);
    setFleetGeometry({});
    setBoardItems([]);
    setTerminalTiles([]);
    topZRef.current = USER_ITEM_MIN_Z - 1;
    setSelectedOracleId(null);
    jumpCursorRef.current = null;
    attentionCursorRef.current = null;
    setLayoutEpoch((current) => current + 1);
    setPersistenceWarning(null);
    initialFitComplete.current = true;
    window.requestAnimationFrame(() => canvas.fit(fleetTiles));
  }, [canvas, fleetTiles, pageId]);

  const boardMenuActions = useMemo<CanvasMenuAction[]>(() => {
    if (!boardMenu) return [];

    if (boardMenu.target.type === "canvas") {
      return [
        {
          id: "add-note",
          label: "Add note here",
          onSelect: () => addNoteAt(boardMenu.world),
        },
        {
          id: "add-image",
          label: "Add image here",
          disabled: addingImage,
          onSelect: () => addImageAt(boardMenu.world),
        },
        {
          id: "fit",
          label: "Fit all",
          hint: "⇧1",
          onSelect: fitAll,
        },
        {
          id: "fit-selection",
          label: "Fit selection",
          hint: "⇧2",
          disabled: selectedTile === null,
          onSelect: fitSelection,
        },
        {
          id: "zoom-reset",
          label: "100%",
          hint: "0",
          onSelect: () => canvas.zoomTo(1),
        },
        {
          id: "reset-layout",
          label: "Reset layout",
          onSelect: resetLayout,
        },
        {
          id: "toggle-theme",
          label: `Use ${theme === "plain" ? "phosphor" : "plain"} mode`,
          hint: theme === "plain" ? "phosphor" : "plain",
          separatorBefore: true,
          onSelect: onToggleTheme,
        },
      ];
    }

    const targetId = boardMenu.target.id;
    const target = allTiles.find((item) => item.id === targetId);
    if (!target) return [];

    if (target.kind === "oracle") {
      const pane = terminalPane(census, target);
      return [
        {
          id: "open-terminal",
          label: "Open terminal",
          disabled: pane === null,
          onSelect: () => openTerminal(target),
        },
        {
          id: "focus",
          label: "Focus",
          onSelect: () => focusOracle(target),
        },
        {
          id: "copy-pane",
          label: "Copy session:window",
          disabled: pane === null,
          onSelect: () => pane ? copyText(`${pane.session}:${pane.window}`) : undefined,
        },
      ];
    }

    return [
      {
        id: "bring-front",
        label: "Bring to front",
        onSelect: () => raiseUserItem(target.id),
      },
      {
        id: "send-back",
        label: "Send to back",
        onSelect: () => sendToBack(target.id),
      },
      {
        id: "delete",
        label: "Delete",
        onSelect: () => deleteBoardItem(target.id),
      },
    ];
  }, [
    addImageAt,
    addNoteAt,
    addingImage,
    allTiles,
    boardMenu,
    canvas,
    census,
    deleteBoardItem,
    focusOracle,
    fitAll,
    fitSelection,
    openTerminal,
    onToggleTheme,
    raiseUserItem,
    resetLayout,
    selectedTile,
    sendToBack,
    theme,
  ]);

  return (
    <div
      className="h-dvh w-screen overflow-hidden bg-[var(--bg)] text-[var(--ink)]"
      data-page-id={pageId}
      onPointerDownCapture={dismissHint}
      onWheelCapture={dismissHint}
      onKeyDownCapture={dismissHint}
    >
      <header className="fixed left-3 top-3 z-40 flex max-w-[calc(100vw-1.5rem)] items-start gap-2 font-mono">
        <div className="pointer-events-none shrink-0">
          <h1 className="text-sm font-bold tracking-tight">STOA · board</h1>
          <time
            className="block text-xs tabular-nums text-[var(--ink-dim)]"
            dateTime={now.toISOString()}
          >
            {clockFormatter.format(now)}
          </time>
        </div>
        <PageTabs
          pages={pages}
          activePageId={pageId}
          onSelect={onSelectPage}
          onCreate={onCreatePage}
          onRename={onRenamePage}
          onDelete={onDeletePage}
        />
      </header>

      <Fabric
        id="board-fabric"
        canvas={canvas}
        className="bg-[var(--bg)]"
        data-drop-active={dropActive || undefined}
        aria-label="Interactive fleet board"
        aria-busy={loading}
        onContextMenu={(event) => {
          event.preventDefault();
          const tile = event.target instanceof Element
            ? event.target.closest<HTMLElement>("[data-tile-id]")
            : null;
          const item = tile
            ? allTiles.find((candidate) => candidate.id === tile.dataset.tileId)
            : null;
          const target: BoardMenuTarget = item
            ? item.kind === "oracle"
              ? { type: "oracle", id: item.id }
              : { type: "item", id: item.id }
            : { type: "canvas" };

          setBoardMenu({
            x: event.clientX,
            y: event.clientY,
            world: canvas.screenToWorld({
              clientX: event.clientX,
              clientY: event.clientY,
            }),
            target,
          });
        }}
        onDragEnter={(event) => {
          if (!hasSupportedImageData(event.dataTransfer)) return;
          event.preventDefault();
          setDropActive(true);
          setDropPoint(canvas.screenToWorld({
            clientX: event.clientX,
            clientY: event.clientY,
          }));
        }}
        onDragOver={(event) => {
          if (!hasSupportedImageData(event.dataTransfer)) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
          setDropActive(true);
          setDropPoint(canvas.screenToWorld({
            clientX: event.clientX,
            clientY: event.clientY,
          }));
        }}
        onDragLeave={(event) => {
          const related = event.relatedTarget;
          if (related instanceof Node && event.currentTarget.contains(related)) return;
          setDropActive(false);
          setDropPoint(null);
        }}
        onDrop={(event) => {
          const blobs = imageBlobsFromDataTransfer(event.dataTransfer);
          setDropActive(false);
          setDropPoint(null);
          if (blobs.length === 0) return;
          event.preventDefault();
          event.stopPropagation();
          void addImageBlobs(blobs, canvas.screenToWorld({
            clientX: event.clientX,
            clientY: event.clientY,
          }));
        }}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          jumpCursorRef.current = null;
          attentionCursorRef.current = null;
          setSelectedOracleId(null);
        }}
      >
        <BoardState loading={loading} error={error} hasTiles={hasOracleTiles} />
        {dropActive && dropPoint ? (
          <ImageDropGhost
            x={dropPoint.x - 180}
            y={dropPoint.y - 120}
            w={360}
            h={240}
          />
        ) : null}
        {allTiles.map((item) => {
          const pane = item.kind === "oracle" ? terminalPane(census, item) : null;
          const selected = item.kind === "oracle" && item.id === selectedOracleId;
          return (
            <Tile
              key={`${layoutEpoch}:${item.id}`}
              item={item}
              siblings={allTiles}
              canvas={canvas}
              style={{ zIndex: tileZIndex(item) }}
              minWidth={item.kind === "image" ? 64 : undefined}
              minHeight={item.kind === "image" ? 48 : undefined}
              aspectRatio={item.kind === "image" ? imageAspectRatio(item) : null}
              className={`${tileClassName(item)} ${
                selected
                  ? "selected ring-2 ring-[var(--idle)] ring-offset-2 ring-offset-[var(--bg)] shadow-[0_0_14px_var(--idle-glow)]"
                  : ""
              }`}
              onActivate={activateTile}
              onChange={updateAppTile}
              onCommit={updateAppTile}
            >
              {item.kind === "oracle" ? (
                <div
                  ref={(element) => {
                    const tile = element?.closest<HTMLElement>(".tile");
                    if (!tile) return;
                    if (item.attention.level === "none") {
                      tile.removeAttribute("data-attention");
                    } else {
                      tile.dataset.attention = item.attention.level;
                    }
                  }}
                  className="oracle-tile relative h-full"
                  data-attention={item.attention.level}
                  title="Double-click to open terminal preview"
                  onPointerDown={(event) => {
                    if (event.button !== 0) return;
                    const doublePress = pendingOracleIdRef.current === item.id;
                    cancelOracleClick();
                    oraclePressRef.current = {
                      oracle: item,
                      pointerId: event.pointerId,
                      clientX: event.clientX,
                      clientY: event.clientY,
                      doublePress,
                      moved: false,
                    };
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                  }}
                  onDoubleClick={(event) => {
                    event.stopPropagation();
                    handleOracleDoubleClick(item);
                  }}
                >
                  <OracleTileContent item={item} />
                  {oracleDisplayPages.get(normalizeOracleHandle(item.data.oracle)) ? (
                    <a
                      className="absolute right-1.5 top-1.5 z-20 grid h-6 w-6 place-items-center rounded border border-[var(--line)] bg-[var(--surface-2)] font-mono text-xs text-[var(--ink-dim)] hover:border-[var(--idle)] hover:text-[var(--ink)]"
                      href={boardPageHref(oracleDisplayPages.get(normalizeOracleHandle(item.data.oracle))!)}
                      aria-label={`Open ${item.data.oracle} physical display mirror`}
                      title="Open physical display mirror"
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => event.stopPropagation()}
                    >
                      &gt;
                    </a>
                  ) : null}
                  {pane || selected ? (
                    <span
                      className={`oracle-meta ${
                        selected
                          ? "!whitespace-normal !opacity-100 [translate:0_0]"
                          : ""
                      }`}
                    >
                      {pane ? `${pane.session}:${pane.window}` : "no live pane"}
                      {selected ? (
                        <>
                          {` · model ${item.data.modelTier || "unknown"}`}
                          {` · idle ${idleDetail(item.data.idleSec)}`}
                          {item.attention.level !== "none" ? (
                            ` · attention ${item.attention.reasons.join("; ")}`
                          ) : null}
                        </>
                      ) : null}
                    </span>
                  ) : null}
                </div>
              ) : item.kind === "terminal" ? (
                <TerminalTile item={item} onClose={closeTerminal} theme={theme} />
              ) : (
                <BoardItemContent
                  item={item}
                  onNoteChange={updateNote}
                  onClose={closeBoardItem}
                />
              )}
            </Tile>
          );
        })}
      </Fabric>

      {boardMenu && boardMenuActions.length > 0 ? (
        <CanvasContextMenu
          x={boardMenu.x}
          y={boardMenu.y}
          label={
            boardMenu.target.type === "canvas"
              ? "Canvas actions"
              : boardMenu.target.type === "oracle"
                ? "Oracle actions"
                : "Board item actions"
          }
          actions={boardMenuActions}
          onClose={closeBoardMenu}
        />
      ) : null}

      {hintState ? (
        <aside className="board-hint" data-state={hintState} role="status">
          <span>
            double-click an oracle for its live terminal · drag to arrange · Add note/image
          </span>
          <button
            type="button"
            className="board-hint__dismiss"
            aria-label="Dismiss board hint"
            onClick={dismissHint}
          >
            ×
          </button>
        </aside>
      ) : null}

      <aside className="status-legend" aria-label="Oracle status legend">
        {STATUS_LEGEND.map(([status, label]) => (
          <span className="status-legend__item" key={status}>
            <span
              className="status-legend__dot"
              data-status={status}
              aria-hidden="true"
            />
            <span>{label}</span>
          </span>
        ))}
      </aside>

      <BoardToolbar
        zoom={canvas.zoom}
        onZoomIn={() => canvas.zoomBy(1.2)}
        onZoomOut={() => canvas.zoomBy(1 / 1.2)}
        onResetZoom={() => canvas.zoomTo(1)}
        onJumpToActive={jumpToActive}
        jumpDisabled={jumpTargets.length === 0}
        onJumpToAttention={jumpToAttention}
        attentionCount={attentionSummary.count}
        attentionCritical={attentionSummary.criticalCount > 0}
        onAddNote={addNoteAtViewportCenter}
        onAddImage={addImageAtViewportCenter}
        onFit={fitAll}
        onReset={resetLayout}
        disabled={loading && fleetTiles.length === 0}
        addingImage={addingImage}
      />
      {persistenceWarning ? (
        <p
          className="board-toast"
          data-board-toast="warning"
          role="alert"
        >
          {persistenceWarning}
        </p>
      ) : null}
      <StatusBar
        items={statusTiles}
        usage={usage}
        error={error}
        theme={theme}
        onToggleTheme={onToggleTheme}
      />

      <output className="sr-only" aria-live="polite">
        {totals.active + totals.idle + totals.stale} fleet tiles
      </output>
    </div>
  );
}

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [manualPages, setManualPages] = useState(loadBoardPages);
  const mirror = useMirrorReport();
  const pulse = useOraclePulse();
  const mirrorModels = useMirrorOracleModels();
  const displayPages = useMemo<BoardPage[]>(() => (mirror.report?.displays ?? [])
    .map((display) => ({
      id: displayPageId(display),
      name: display.name,
      system: "display" as const,
      displayIndex: display.index,
    })), [mirror.report?.displays]);
  const pendingDisplayPage = useMemo<BoardPage | null>(() => {
    if (mirror.report || typeof window === "undefined") return null;
    const requested = pageIdFromHash(window.location.hash);
    return requested?.startsWith("display-")
      ? { id: requested, name: "display", system: "display" }
      : null;
  }, [mirror.report]);
  const pages = useMemo(() => {
    const manualIds = new Set(manualPages.map((page) => page.id));
    const auto = [...displayPages];
    if (pendingDisplayPage && !auto.some((page) => page.id === pendingDisplayPage.id)) {
      auto.push(pendingDisplayPage);
    }
    return [...manualPages, ...auto.filter((page) => !manualIds.has(page.id))];
  }, [displayPages, manualPages, pendingDisplayPage]);
  const { pageId, navigate } = useHashPage(pages);
  const oracleDisplayPages = useMemo(() => {
    const byDisplay = new Map((mirror.report?.displays ?? []).map((display) => [
      display.index,
      displayPageId(display),
    ]));
    return new Map((mirror.report?.fleet ?? []).flatMap((row) => {
      const target = byDisplay.get(row.display);
      return target ? [[normalizeOracleHandle(row.oracle), target] as const] : [];
    }));
  }, [mirror.report]);

  useEffect(() => saveBoardPages(manualPages), [manualPages]);

  useEffect(() => {
    const syncPages = (event: StorageEvent) => {
      if (event.key !== BOARD_PAGES_STORAGE_KEY) return;
      const next = loadBoardPages();
      setManualPages((current) => (
        JSON.stringify(current) === JSON.stringify(next) ? current : next
      ));
    };
    window.addEventListener("storage", syncPages);
    return () => window.removeEventListener("storage", syncPages);
  }, []);

  const createPage = useCallback(() => {
    const page = createBoardPage(manualPages);
    setManualPages((current) => [...current, page]);
    navigate(page.id);
  }, [manualPages, navigate]);

  const renamePage = useCallback((targetPageId: string, name: string) => {
    const nextName = name.trim().slice(0, 40);
    if (!nextName) return;
    if (displayPages.some((page) => page.id === targetPageId)) return;
    setManualPages((current) => current.map((page) => (
      page.id === targetPageId ? { ...page, name: nextName } : page
    )));
  }, []);

  const deletePage = useCallback((targetPageId: string) => {
    if (pages.length <= 1) return;
    const page = pages.find((candidate) => candidate.id === targetPageId);
    if (!page) return;
    if (page.system === "display") {
      return;
    }
    if (!window.confirm(`Delete board page “${page.name}”?`)) return;

    const targetIndex = pages.findIndex((candidate) => candidate.id === targetPageId);
    const remaining = pages.filter((candidate) => candidate.id !== targetPageId);
    if (pageId === targetPageId) {
      const fallback = remaining[Math.min(targetIndex, remaining.length - 1)];
      navigate(fallback.id);
    }
    setManualPages((current) => current.filter((candidate) => candidate.id !== targetPageId));
    window.setTimeout(() => clearBoardState(targetPageId), 0);
  }, [navigate, pageId, pages]);

  useEffect(() => {
    const cyclePages = (event: KeyboardEvent) => {
      if (
        (event.key !== "[" && event.key !== "]") ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.repeat ||
        isEditableTarget(event.target)
      ) {
        return;
      }
      const currentIndex = pages.findIndex((page) => page.id === pageId);
      if (currentIndex < 0 || pages.length < 2) return;
      event.preventDefault();
      const direction = event.key === "]" ? 1 : -1;
      const nextIndex = (currentIndex + direction + pages.length) % pages.length;
      navigate(pages[nextIndex].id);
    };

    window.addEventListener("keydown", cyclePages);
    return () => window.removeEventListener("keydown", cyclePages);
  }, [navigate, pageId, pages]);

  const activeDisplay = mirror.report?.displays.find(
    (display) => displayPageId(display) === pageId,
  );

  if (activeDisplay && mirror.report) {
    return (
      <MirrorPageView
        key={pageId}
        pageId={pageId}
        display={activeDisplay}
        report={mirror.report}
        connection={mirror.connection}
        mirrorError={mirror.error}
        argusConnected={pulse.connected}
        pulses={pulse.pulses}
        modelByOracle={mirrorModels}
        pages={pages}
        onSelectPage={navigate}
        onCreatePage={createPage}
        onRenamePage={renamePage}
        onDeletePage={deletePage}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  return (
    <BoardPageView
      key={pageId}
      pageId={pageId}
      pages={pages}
      onSelectPage={navigate}
      onCreatePage={createPage}
      onRenamePage={renamePage}
      onDeletePage={deletePage}
      oracleDisplayPages={oracleDisplayPages}
      theme={theme}
      onToggleTheme={toggleTheme}
    />
  );
}
