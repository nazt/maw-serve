import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { loadBoardState, saveBoardState, type PersistedGeometry } from "../board/persist";
import PageTabs from "../board/PageTabs";
import type { BoardPage } from "../board/pages";
import TerminalTile, { type TerminalTileItem } from "../board/TerminalTile";
import CanvasContextMenu, { type CanvasMenuAction } from "../canvas/ContextMenu";
import { Fabric } from "../canvas/Fabric";
import { useCanvas } from "../canvas/useCanvas";
import StatusBar from "../fleet/StatusBar";
import {
  normalizeOracleHandle,
  useFleet,
  type CensusOracle,
  type CensusPayload,
  type OracleStatus,
} from "../fleet/useFleet";
import Tile from "../tiles/Tile";
import { defaultSpaceGrid } from "./model";
import SpaceTileContent, { type SpaceTileItem } from "./SpaceTileContent";
import type { MirrorConnection, MirrorDisplay, MirrorReport, OraclePulseMap } from "./types";

const USER_ITEM_MIN_Z = 10;
const STALE_MESSAGE = "spaces renumbered since reboot — labels may be off until window-arranger re-snapshots";

interface MirrorPageViewProps {
  pageId: string;
  display: MirrorDisplay;
  report: MirrorReport;
  connection: MirrorConnection;
  mirrorError: Error | null;
  argusConnected: boolean;
  pulses: OraclePulseMap;
  modelByOracle: ReadonlyMap<string, string>;
  pages: BoardPage[];
  onSelectPage: (pageId: string) => void;
  onCreatePage: () => void;
  onRenamePage: (pageId: string, name: string) => void;
  onDeletePage: (pageId: string) => void;
}

type MenuState = { x: number; y: number; id: string | null };
type MirrorTileItem = SpaceTileItem | TerminalTileItem;

function terminalTarget(census: CensusPayload | null, oracle: string): CensusOracle | null {
  const target = normalizeOracleHandle(oracle);
  const matches: CensusOracle[] = [];
  for (const display of census?.displays ?? []) {
    for (const space of display.spaces ?? []) {
      for (const row of space.oracles ?? []) {
        if (normalizeOracleHandle(row.oracle) === target && row.session && row.pane) matches.push(row);
      }
    }
  }
  const idle = (value: unknown) => {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : Number.POSITIVE_INFINITY;
  };
  matches.sort((left, right) => (
    Number(String(right.status).toLowerCase() === "active") -
      Number(String(left.status).toLowerCase() === "active") ||
    idle(left.idleSec) - idle(right.idleSec)
  ));
  return matches[0] ?? null;
}

function defaultsFor(items: readonly { index: number }[]): Record<string, PersistedGeometry> {
  const rects = defaultSpaceGrid(items.length);
  return Object.fromEntries(items.map((space, index) => [
    `space-${space.index}`,
    { ...rects[index], zIndex: USER_ITEM_MIN_Z + index },
  ]));
}

const buttonClass = "min-h-7 rounded-md border border-[var(--line)] bg-[var(--surface)] px-2 font-mono text-xs text-[var(--ink)] hover:bg-[var(--surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--idle)]";

export default function MirrorPageView({
  pageId,
  display,
  report,
  connection,
  mirrorError,
  argusConnected,
  pulses,
  modelByOracle,
  pages,
  onSelectPage,
  onCreatePage,
  onRenamePage,
  onDeletePage,
}: MirrorPageViewProps) {
  const spaces = useMemo(
    () => report.spaces.filter((space) => space.display === display.index)
      .sort((left, right) => left.index - right.index),
    [display.index, report.spaces],
  );
  const [restored] = useState(() => loadBoardState(pageId));
  const defaultGeometry = useMemo(() => defaultsFor(spaces), [spaces]);
  const [geometry, setGeometry] = useState<Record<string, PersistedGeometry>>(() => (
    Object.keys(restored.fleet).length > 0 ? restored.fleet : defaultGeometry
  ));
  const [terminalTiles, setTerminalTiles] = useState<TerminalTileItem[]>(() => (
    restored.items.filter((item): item is TerminalTileItem => item.kind === "terminal")
      .map((item, index) => ({
        ...item,
        zIndex: Math.max(USER_ITEM_MIN_Z, item.zIndex ?? USER_ITEM_MIN_Z + index),
      }))
  ));
  const canvas = useCanvas(restored.canvas);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const initialFit = useRef(restored.restored && Object.keys(restored.fleet).length > 0);
  const topZRef = useRef(Math.max(
    USER_ITEM_MIN_Z - 1,
    ...Object.values(geometry).map((item) => item.zIndex ?? USER_ITEM_MIN_Z),
    ...terminalTiles.map((item) => item.zIndex ?? USER_ITEM_MIN_Z),
  ));
  const { fleetTiles, census, usage, error: fleetError } = useFleet();
  const statusByOracle = useMemo<ReadonlyMap<string, OracleStatus>>(() => new Map(
    fleetTiles.map((item) => [normalizeOracleHandle(item.data.oracle), item.data.status]),
  ), [fleetTiles]);

  useEffect(() => {
    setGeometry((current) => {
      let changed = false;
      const next = { ...current };
      for (const [id, value] of Object.entries(defaultGeometry)) {
        if (next[id]) continue;
        next[id] = value;
        changed = true;
      }
      return changed ? next : current;
    });
  }, [defaultGeometry]);

  const spaceItems = useMemo<SpaceTileItem[]>(() => spaces.map((space) => {
    const id = `space-${space.index}`;
    const saved = geometry[id] ?? defaultGeometry[id];
    return {
      id,
      kind: "space",
      ...saved,
      data: {
        display,
        space,
        windows: report.windows,
      },
    };
  }), [defaultGeometry, display, geometry, report.windows, spaces]);
  const allItems = useMemo<MirrorTileItem[]>(
    () => [...spaceItems, ...terminalTiles],
    [spaceItems, terminalTiles],
  );

  const state = useMemo(() => ({
    version: 1 as const,
    fleet: geometry,
    items: terminalTiles,
    canvas: { center: canvas.center, zoom: canvas.zoom },
  }), [canvas.center, canvas.zoom, geometry, terminalTiles]);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (initialFit.current || allItems.length === 0) return;
    const frame = window.requestAnimationFrame(() => {
      canvas.fit(allItems);
      initialFit.current = true;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [allItems, canvas]);

  useEffect(() => {
    const timeout = window.setTimeout(() => saveBoardState(state, pageId), 350);
    return () => window.clearTimeout(timeout);
  }, [pageId, state]);

  useEffect(() => () => {
    saveBoardState(stateRef.current, pageId);
  }, [pageId]);

  const updateItem = useCallback((item: MirrorTileItem) => {
    if (item.kind === "terminal") {
      setTerminalTiles((current) => current.map((candidate) => (
        candidate.id === item.id
          ? { ...item, zIndex: candidate.zIndex ?? item.zIndex }
          : candidate
      )));
      return;
    }
    setGeometry((current) => ({
      ...current,
      [item.id]: {
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
        zIndex: current[item.id]?.zIndex ?? item.zIndex,
      },
    }));
  }, []);

  const raise = useCallback((id: string) => {
    const zIndex = ++topZRef.current;
    setGeometry((current) => current[id]
      ? { ...current, [id]: { ...current[id], zIndex } }
      : current);
    setTerminalTiles((current) => current.map((item) => (
      item.id === id ? { ...item, zIndex } : item
    )));
  }, []);

  const openTerminal = useCallback((oracle: string, source: SpaceTileItem) => {
    const target = terminalTarget(census, oracle);
    if (!target?.session || !target.pane) return;
    const id = `terminal:${target.session}:${target.pane}`;
    const zIndex = ++topZRef.current;
    setTerminalTiles((current) => {
      const existing = current.find((item) => item.id === id);
      if (existing) return current.map((item) => item.id === id ? { ...item, zIndex } : item);
      return [...current, {
        id,
        kind: "terminal",
        x: source.x + source.w + 28,
        y: source.y + 28,
        w: 560,
        h: 340,
        zIndex,
        data: { oracle, session: target.session!, window: target.pane! },
      }];
    });
  }, [census]);

  const sendBack = useCallback((id: string) => {
    const otherZ = [
      ...Object.entries(geometry).filter(([key]) => key !== id).map(([, item]) => item.zIndex ?? USER_ITEM_MIN_Z),
      ...terminalTiles.filter((item) => item.id !== id).map((item) => item.zIndex ?? USER_ITEM_MIN_Z),
    ];
    const minimum = Math.min(...otherZ);
    const shift = minimum <= USER_ITEM_MIN_Z;
    const backZ = !Number.isFinite(minimum) || shift ? USER_ITEM_MIN_Z : minimum - 1;
    setGeometry((current) => Object.fromEntries(Object.entries(current).map(([key, item]) => [
      key,
      { ...item, zIndex: key === id ? backZ : (item.zIndex ?? USER_ITEM_MIN_Z) + (shift ? 1 : 0) },
    ])));
    setTerminalTiles((current) => current.map((item) => ({
      ...item,
      zIndex: item.id === id ? backZ : (item.zIndex ?? USER_ITEM_MIN_Z) + (shift ? 1 : 0),
    })));
  }, [geometry, terminalTiles]);

  const reset = useCallback(() => {
    setGeometry(defaultGeometry);
    topZRef.current = USER_ITEM_MIN_Z + spaces.length - 1;
    setSelectedId(null);
    window.requestAnimationFrame(() => canvas.fit(
      spaces.map((space) => ({ id: `space-${space.index}`, ...defaultGeometry[`space-${space.index}`] })),
    ));
  }, [canvas, defaultGeometry, spaces]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
      if (event.target instanceof HTMLElement && (
        event.target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName)
      )) return;
      if (event.shiftKey && event.code === "Digit1") {
        event.preventDefault();
        canvas.fit(allItems);
      } else if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        canvas.zoomBy(1.2);
      } else if (event.key === "-") {
        event.preventDefault();
        canvas.zoomBy(1 / 1.2);
      } else if (event.key === "0") {
        event.preventDefault();
        canvas.zoomTo(1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [allItems, canvas]);

  const menuActions = useMemo<CanvasMenuAction[]>(() => menu?.id ? [
    { id: "front", label: "Bring to front", onSelect: () => raise(menu.id!) },
    { id: "back", label: "Send to back", onSelect: () => sendBack(menu.id!) },
    ...(terminalTiles.some((item) => item.id === menu.id) ? [{
      id: "delete",
      label: "Delete",
      onSelect: () => setTerminalTiles((current) => current.filter((item) => item.id !== menu.id)),
    }] : []),
  ] : [
    { id: "fit", label: "Fit all", hint: "⇧1", onSelect: () => canvas.fit(allItems) },
    { id: "zoom", label: "100%", hint: "0", onSelect: () => canvas.zoomTo(1) },
    { id: "reset", label: "Reset layout", onSelect: reset },
  ], [allItems, canvas, menu, raise, reset, sendBack, terminalTiles]);

  return (
    <div className="h-dvh w-screen overflow-hidden bg-[var(--bg)] text-[var(--ink)]" data-page-id={pageId} data-mirror-connection={connection}>
      <header className="fixed left-3 top-3 z-40 flex max-w-[calc(100vw-1.5rem)] items-start gap-2 font-mono">
        <div className="pointer-events-none shrink-0">
          <h1 className="text-sm font-bold tracking-tight">STOA · mirror</h1>
          <p className="max-w-40 truncate text-xs text-[var(--ink-dim)]">{display.name} · {spaces.length} spaces</p>
        </div>
        <PageTabs pages={pages} activePageId={pageId} onSelect={onSelectPage} onCreate={onCreatePage} onRename={onRenamePage} onDelete={onDeletePage} />
      </header>

      {report.profile.stale ? (
        <p className="fixed left-1/2 top-14 z-40 -translate-x-1/2 rounded-md border border-[var(--pinned)] bg-[var(--surface-2)] px-3 py-1.5 font-mono text-[11px] text-[var(--pinned)] shadow-[0_0_10px_var(--pinned-glow)]" role="status">
          {STALE_MESSAGE}
        </p>
      ) : null}

      <Fabric
        id="board-fabric"
        canvas={canvas}
        aria-label={`${display.name} physical display mirror`}
        onClick={(event) => {
          if (event.target === event.currentTarget) setSelectedId(null);
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          const tile = event.target instanceof Element
            ? event.target.closest<HTMLElement>("[data-tile-id]")
            : null;
          setMenu({ x: event.clientX, y: event.clientY, id: tile?.dataset.tileId ?? null });
        }}
      >
        {allItems.map((item) => (
          <Tile
            key={item.id}
            item={item}
            siblings={allItems}
            canvas={canvas}
            minWidth={item.kind === "space" ? 220 : undefined}
            minHeight={item.kind === "space" ? 170 : undefined}
            style={{ zIndex: item.zIndex }}
            className={`${item.kind === "terminal" ? "bg-[oklch(0.115_0.018_220)]" : ""} ${
              selectedId === item.id
                ? "rounded-md ring-2 ring-[var(--idle)] ring-offset-2 ring-offset-[var(--bg)]"
                : "rounded-md"
            }`}
            onActivate={() => {
              setSelectedId(item.id);
              raise(item.id);
            }}
            onChange={updateItem}
            onCommit={updateItem}
          >
            {item.kind === "space" ? (
              <SpaceTileContent
                item={item}
                pulses={pulses}
                statusByOracle={statusByOracle}
                modelByOracle={modelByOracle}
                onOracleDoubleClick={(oracle) => openTerminal(oracle, item)}
              />
            ) : (
              <TerminalTile
                item={item}
                onClose={(id) => setTerminalTiles((current) => current.filter((tile) => tile.id !== id))}
              />
            )}
          </Tile>
        ))}
      </Fabric>

      <div className="fixed bottom-11 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1.5 rounded-lg bg-[var(--surface)] p-1.5 shadow-[0_0_0_1px_var(--line)]" role="toolbar" aria-label="Mirror controls">
        <button className={buttonClass} type="button" onClick={() => canvas.fit(allItems)} title="Fit all · Shift+1">Fit all</button>
        <button className={buttonClass} type="button" onClick={reset}>Reset layout</button>
        <button className={buttonClass} type="button" onClick={() => canvas.zoomBy(1 / 1.2)} aria-label="Zoom out">−</button>
        <button className={`${buttonClass} min-w-12 tabular-nums`} type="button" onClick={() => canvas.zoomTo(1)} aria-label="Reset zoom to 100%">{Math.round(canvas.zoom * 100)}%</button>
        <button className={buttonClass} type="button" onClick={() => canvas.zoomBy(1.2)} aria-label="Zoom in">+</button>
      </div>

      <p className="fixed bottom-12 right-3 z-40 font-mono text-[10px] text-[var(--ink-faint)]" role="status">
        mirror {connection}{mirrorError ? " · retrying" : ""} · pulse {argusConnected ? "live" : "reconnecting"}
      </p>

      {menu ? (
        <CanvasContextMenu x={menu.x} y={menu.y} label={menu.id ? "Space tile actions" : "Mirror canvas actions"} actions={menuActions} onClose={() => setMenu(null)} />
      ) : null}

      <StatusBar items={fleetTiles} usage={usage} error={fleetError} />
    </div>
  );
}
