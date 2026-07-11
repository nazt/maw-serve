import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Fabric } from "./canvas/Fabric";
import { useCanvas } from "./canvas/useCanvas";
import {
  acquireImageSource,
  createImageBoardItem,
  createNoteBoardItem,
  imageElementProps,
  type BoardItem,
  type NoteBoardItem,
} from "./board/boardItems";
import {
  clearBoardState,
  loadBoardState,
  saveBoardState,
  type PersistedGeometry,
} from "./board/persist";
import TerminalTile, {
  type TerminalTileItem,
} from "./board/TerminalTile";
import OracleTileContent from "./fleet/OracleTileContent";
import StatusBar, { summarizeFleet } from "./fleet/StatusBar";
import {
  normalizeOracleHandle,
  useFleet,
  type CensusOracle,
  type CensusPayload,
  type FleetTileItem,
  type OracleTileItem,
} from "./fleet/useFleet";
import Tile from "./tiles/Tile";

type AppTileItem = FleetTileItem | TerminalTileItem;
type HintState = "visible" | "leaving";

const BOARD_HINT_STORAGE_KEY = "stoa-board-hint-v1";
const BOARD_HINT_VISIBLE_MS = 7_000;
const BOARD_HINT_EXIT_MS = 240;

const STATUS_LEGEND = [
  ["active", "active"],
  ["idle", "idle"],
  ["stale", "stale"],
  ["pinned", "pinned"],
] as const;

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

interface NoteTileContentProps {
  item: NoteBoardItem;
  onChange: (id: string, text: string) => void;
}

function NoteTileContent({ item, onChange }: NoteTileContentProps) {
  return (
    <div className="h-full rounded-md border border-[var(--pinned)] bg-[oklch(0.29_0.055_75)] p-2.5 shadow-[0_0_8px_var(--pinned-glow)]">
      <textarea
        className="h-full w-full resize-none border-0 bg-transparent font-mono text-sm leading-relaxed text-[oklch(0.96_0.025_75)] outline-none placeholder:text-[oklch(0.79_0.045_75)]"
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
}

function BoardItemContent({ item, onNoteChange }: BoardItemContentProps) {
  if (item.kind === "note") {
    return <NoteTileContent item={item} onChange={onNoteChange} />;
  }

  return (
    <div className="h-full overflow-hidden rounded-md border border-[var(--line)] bg-[var(--surface)] p-1.5">
      <img
        {...imageElementProps(item)}
        className="h-full w-full select-none rounded-sm object-contain"
      />
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
  onAddNote: () => void;
  onAddImage: () => Promise<void>;
  onFit: () => void;
  onReset: () => void;
  disabled: boolean;
  addingImage: boolean;
}

function BoardToolbar({
  zoom,
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
      >
        Fit
      </button>
      <button
        type="button"
        className={toolbarButtonClass}
        onClick={onReset}
      >
        Reset layout
      </button>
      <output
        className="min-w-12 px-1 text-center font-mono text-xs tabular-nums text-[var(--idle)]"
        aria-label="Canvas zoom"
        aria-live="polite"
      >
        {zoomPercent}
      </output>
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

  const message = loading
    ? "Acquiring fleet telemetry…"
    : error
      ? "Fleet telemetry is unavailable · retrying"
      : "No oracle agents are currently reporting";

  return (
    <p
      className={`pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 font-mono text-sm ${error ? "text-[var(--error)]" : "text-[var(--ink-dim)]"}`}
      role={error ? "alert" : "status"}
    >
      {message}
    </p>
  );
}

function tileClassName(item: AppTileItem): string {
  if (item.kind === "note") {
    return "rounded-md bg-[oklch(0.29_0.055_75)]";
  }

  if (item.kind === "image") {
    return "rounded-md bg-[var(--surface)]";
  }

  if (item.kind === "terminal") {
    return "rounded-md bg-[oklch(0.115_0.018_220)]";
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
  return Number.isFinite(idle) ? idle : Number.POSITIVE_INFINITY;
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

export default function App() {
  const [restoredState] = useState(loadBoardState);
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
  const [hintState, setHintState] = useState<HintState | null>(initialHintState);
  const [layoutEpoch, setLayoutEpoch] = useState(0);
  const [persistenceWarning, setPersistenceWarning] = useState<string | null>(null);
  const [fleetGeometry, setFleetGeometry] = useState<Record<string, PersistedGeometry>>(
    restoredState.fleet,
  );
  const [boardItems, setBoardItems] = useState<BoardItem[]>(() => (
    restoredState.items.filter((item): item is BoardItem => item.kind !== "terminal")
  ));
  const [terminalTiles, setTerminalTiles] = useState<TerminalTileItem[]>(() => (
    restoredState.items.filter((item): item is TerminalTileItem => item.kind === "terminal")
  ));
  const initialFitComplete = useRef(restoredState.restored);
  const positionedFleetTiles = useMemo<OracleTileItem[]>(() => (
    fleetTiles.map((item) => ({ ...item, ...fleetGeometry[item.id] }))
  ), [fleetGeometry, fleetTiles]);
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

  const dismissHint = useCallback(() => {
    setHintState((current) => current === "visible" ? "leaving" : current);
  }, []);

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
      const result = saveBoardState({
        version: 1,
        fleet: fleetGeometry,
        items: [...boardItems, ...terminalTiles],
        canvas: { center: canvas.center, zoom: canvas.zoom },
      });
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
    boardItems,
    canvas.center,
    canvas.zoom,
    fleetGeometry,
    terminalTiles,
  ]);

  const viewportCenter = useCallback(() => {
    const fabric = canvas.fabricRef.current;
    if (!fabric) return canvas.center;

    const bounds = fabric.getBoundingClientRect();
    return canvas.screenToWorld({
      clientX: bounds.left + bounds.width / 2,
      clientY: bounds.top + bounds.height / 2,
    });
  }, [canvas]);

  const addNoteAtViewportCenter = useCallback(() => {
    const note = createNoteBoardItem({ center: viewportCenter() });
    setBoardItems((current) => [...current, note]);
  }, [viewportCenter]);

  const addImageAtViewportCenter = useCallback(async () => {
    setAddingImage(true);
    try {
      const source = await acquireImageSource();
      if (!source) return;
      const image = createImageBoardItem(source, { center: viewportCenter() });
      setBoardItems((current) => [...current, image]);
    } finally {
      setAddingImage(false);
    }
  }, [viewportCenter]);

  const openTerminal = useCallback((oracle: OracleTileItem) => {
    const target = terminalPane(census, oracle);
    if (!target) return;

    const id = `terminal:${target.session}:${target.window}`;
    setTerminalTiles((current) => {
      if (current.some((item) => item.id === id)) return current;
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
          data: {
            oracle: oracle.data.oracle,
            session: target.session,
            window: target.window,
          },
        },
      ];
    });
  }, [census]);

  const updateAppTile = useCallback((next: AppTileItem) => {
    if (next.kind === "oracle") {
      setFleetGeometry((current) => ({
        ...current,
        [next.id]: { x: next.x, y: next.y, w: next.w, h: next.h },
      }));
      return;
    }
    if (next.kind === "terminal") {
      setTerminalTiles((current) => current.map((item) => (
        item.id === next.id ? next : item
      )));
      return;
    }
    setBoardItems((current) => current.map((item) => (
      item.id === next.id ? next : item
    )));
  }, []);

  const updateNote = useCallback((id: string, text: string) => {
    setBoardItems((current) => current.map((item) => (
      item.id === id && item.kind === "note"
        ? { ...item, data: { text } }
        : item
    )));
  }, []);

  const closeTerminal = useCallback((id: string) => {
    setTerminalTiles((current) => current.filter((item) => item.id !== id));
  }, []);

  const resetLayout = useCallback(() => {
    clearBoardState();
    setFleetGeometry({});
    setBoardItems([]);
    setTerminalTiles([]);
    setLayoutEpoch((current) => current + 1);
    setPersistenceWarning(null);
    initialFitComplete.current = true;
    window.requestAnimationFrame(() => canvas.fit(fleetTiles));
  }, [canvas, fleetTiles]);

  return (
    <div
      className="h-dvh w-screen overflow-hidden bg-[var(--bg)] text-[var(--ink)]"
      onPointerDownCapture={dismissHint}
      onWheelCapture={dismissHint}
      onKeyDownCapture={dismissHint}
    >
      <header className="pointer-events-none fixed left-3 top-3 z-40 font-mono">
        <h1 className="text-sm font-bold tracking-tight">STOA · board</h1>
        <time
          className="text-xs tabular-nums text-[var(--ink-dim)]"
          dateTime={now.toISOString()}
        >
          {clockFormatter.format(now)}
        </time>
      </header>

      <Fabric
        canvas={canvas}
        className="bg-[var(--bg)]"
        aria-label="Interactive fleet board"
        aria-busy={loading}
      >
        <BoardState loading={loading} error={error} hasTiles={hasOracleTiles} />
        {allTiles.map((item) => {
          const pane = item.kind === "oracle" ? terminalPane(census, item) : null;
          return (
            <Tile
              key={`${layoutEpoch}:${item.id}`}
              item={item}
              siblings={allTiles}
              canvas={canvas}
              className={tileClassName(item)}
              onChange={updateAppTile}
              onCommit={updateAppTile}
            >
              {item.kind === "oracle" ? (
                <div
                  className="oracle-tile relative h-full"
                  title="Double-click to open terminal preview"
                  onDoubleClick={(event) => {
                    event.stopPropagation();
                    openTerminal(item);
                  }}
                >
                  <OracleTileContent item={item} />
                  {pane ? (
                    <span className="oracle-meta">
                      {pane.session}:{pane.window}
                    </span>
                  ) : null}
                </div>
              ) : item.kind === "terminal" ? (
                <TerminalTile item={item} onClose={closeTerminal} />
              ) : (
                <BoardItemContent item={item} onNoteChange={updateNote} />
              )}
            </Tile>
          );
        })}
      </Fabric>

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
        onAddNote={addNoteAtViewportCenter}
        onAddImage={addImageAtViewportCenter}
        onFit={() => canvas.fit(allTiles)}
        onReset={resetLayout}
        disabled={loading && fleetTiles.length === 0}
        addingImage={addingImage}
      />
      {persistenceWarning ? (
        <p
          className="pointer-events-none fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded bg-[var(--surface)] px-2.5 py-1 font-mono text-[10px] text-[var(--pinned)] shadow-[0_0_0_1px_var(--line)]"
          role="status"
        >
          {persistenceWarning}
        </p>
      ) : null}
      <StatusBar items={statusTiles} usage={usage} error={error} />

      <output className="sr-only" aria-live="polite">
        {totals.active + totals.idle + totals.stale} fleet tiles
      </output>
    </div>
  );
}
