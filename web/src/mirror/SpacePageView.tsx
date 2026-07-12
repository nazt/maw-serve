import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import PageTabs from "../board/PageTabs";
import type { BoardPage } from "../board/pages";
import { boardPageHref } from "../board/pages";
import {
  loadBoardState,
  saveBoardState,
  type PersistedGeometry,
} from "../board/persist";
import TerminalTile, { type TerminalTileItem } from "../board/TerminalTile";
import CanvasContextMenu, { type CanvasMenuAction } from "../canvas/ContextMenu";
import { Fabric } from "../canvas/Fabric";
import { useCanvas } from "../canvas/useCanvas";
import StatusBar from "../fleet/StatusBar";
import {
  normalizeOracleHandle,
  useFleet,
} from "../fleet/useFleet";
import type { Theme } from "../theme";
import Tile from "../tiles/Tile";
import {
  defaultSpaceGrid,
  displayPageId,
  layoutWindows,
  pulseFreshness,
  windowGeometry,
} from "./model";
import {
  allocateTerminalBudget,
  terminalPaneKey,
  terminalTarget,
} from "./terminalTarget";
import type {
  MirrorConnection,
  MirrorDisplay,
  MirrorReport,
  MirrorSpace,
  MirrorWindow,
  OraclePulseMap,
} from "./types";
import { newestPulseForOracle } from "./useMirror";

const USER_ITEM_MIN_Z = 10;
const STREAM_BUDGET = 8;

interface SpacePageViewProps {
  pageId: string;
  displayIndex: number;
  spaceIndex: number;
  display: MirrorDisplay | null;
  space: MirrorSpace | null;
  report: MirrorReport | null;
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
  theme: Theme;
  onToggleTheme: () => void;
}

interface GhostTileItem {
  id: string;
  kind: "ghost";
  x: number;
  y: number;
  w: number;
  h: number;
  zIndex?: number;
  geometryId: string;
  data: {
    app: string;
    oracle: string | null;
    noLiveSession: boolean;
    windowId: number;
  };
}

interface SpaceTerminalTileItem extends TerminalTileItem {
  geometryId: string;
  mode: "stream" | "poll";
}

type SpaceWindowItem = SpaceTerminalTileItem | GhostTileItem;
type MenuState = { x: number; y: number; id: string | null };

const buttonClass = "min-h-7 rounded-md border border-[var(--line)] bg-[var(--surface)] px-2 font-mono text-xs text-[var(--ink)] hover:bg-[var(--surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--idle)]";

function realPositionDefaults(
  display: MirrorDisplay | null,
  space: MirrorSpace | null,
  windows: readonly MirrorWindow[],
): Record<string, PersistedGeometry> {
  if (!display || !space) return {};
  return Object.fromEntries(layoutWindows(display, space, windows).map(({ window, rect }, index) => [
    `space-window:${window.id}`,
    { ...windowGeometry(rect, display), zIndex: USER_ITEM_MIN_Z + index },
  ]));
}

function GhostFrame({ item }: { item: GhostTileItem }) {
  return (
    <section
      className="flex h-full flex-col overflow-hidden rounded-md border border-[oklch(var(--line-channels)/0.72)] bg-[oklch(var(--surface-channels)/0.54)] text-[var(--ink-faint)]"
      data-ghost-window-id={item.data.windowId}
      data-ghost-reason={item.data.noLiveSession ? "no-live-session" : "app"}
    >
      <header className="flex h-9 shrink-0 items-center gap-2 border-b border-[oklch(var(--line-channels)/0.62)] bg-[oklch(var(--surface-2-channels)/0.42)] px-2.5 font-mono">
        <strong className="min-w-0 flex-1 truncate text-xs font-medium">
          {item.data.oracle || item.data.app}
        </strong>
        {item.data.noLiveSession ? (
          <span className="shrink-0 rounded-sm border border-[var(--line)] px-1 py-0.5 text-[9px]">
            no live session
          </span>
        ) : null}
      </header>
      <div className="grid min-h-0 flex-1 place-items-center px-3 font-mono text-[10px]">
        <span className="truncate">{item.data.app}</span>
      </div>
    </section>
  );
}

export default function SpacePageView({
  pageId,
  displayIndex,
  spaceIndex,
  display,
  space,
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
  theme,
  onToggleTheme,
}: SpacePageViewProps) {
  const [restored] = useState(() => loadBoardState(pageId));
  const layouts = useMemo(
    () => display && space ? layoutWindows(display, space, report?.windows ?? []) : [],
    [display, report?.windows, space],
  );
  const defaults = useMemo(
    () => realPositionDefaults(display, space, report?.windows ?? []),
    [display, report?.windows, space],
  );
  const [geometry, setGeometry] = useState<Record<string, PersistedGeometry>>(() => (
    Object.keys(restored.fleet).length > 0 ? restored.fleet : defaults
  ));
  const canvas = useCanvas(restored.canvas);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [now, setNow] = useState(Date.now);
  const initialFit = useRef(restored.restored && Object.keys(restored.fleet).length > 0);
  const { fleetTiles, census, usage, error: fleetError } = useFleet();

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 5_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    setGeometry((current) => {
      let changed = false;
      const next = { ...current };
      for (const [id, value] of Object.entries(defaults)) {
        if (next[id]) continue;
        next[id] = value;
        changed = true;
      }
      return changed ? next : current;
    });
  }, [defaults]);

  const resolved = useMemo(() => layouts.map(({ window }) => {
    const target = window.oracle ? terminalTarget(census, window.oracle) : null;
    const paneKey = target ? terminalPaneKey(target) : null;
    return { window, target, paneKey };
  }), [census, layouts]);

  const budget = useMemo(() => allocateTerminalBudget(resolved.flatMap(({ window, target, paneKey }) => (
    target && paneKey ? [{
      paneKey,
      focus: window.focus,
      pulseLive: pulseFreshness(
        window.oracle ? newestPulseForOracle(pulses, window.oracle)?.at : null,
        now,
      ) === "live",
      status: target.status,
      idleSec: target.idleSec,
    }] : []
  )), STREAM_BUDGET), [now, pulses, resolved]);

  const degradedKey = budget.degradedPaneKeys.join(",");
  useEffect(() => {
    if (!degradedKey) return;
    const degradedPaneKeys = degradedKey.split(",");
    console.warn(
      `[stoa:${pageId}] SSE budget ${STREAM_BUDGET}/${STREAM_BUDGET}; ${degradedPaneKeys.length} panes degraded to poll:`,
      degradedPaneKeys,
    );
  }, [degradedKey, pageId]);

  const items = useMemo<SpaceWindowItem[]>(() => resolved.map(({ window, target, paneKey }) => {
    const id = `space-window:${window.id}`;
    const saved = geometry[id] ?? defaults[id] ?? { x: 0, y: 0, w: 320, h: 200 };
    if (window.oracle && target?.session && target.pane && paneKey) {
      return {
        id: `space-term:${window.id}`,
        kind: "terminal",
        ...saved,
        data: {
          oracle: window.oracle,
          session: target.session,
          window: target.pane,
          model: modelByOracle.get(normalizeOracleHandle(window.oracle)),
        },
        mode: budget.streamPaneKeys.has(paneKey) ? "stream" : "poll",
        geometryId: id,
      };
    }
    return {
      id: `space-ghost:${window.id}`,
      kind: "ghost",
      ...saved,
      data: {
        app: window.app,
        oracle: window.oracle,
        noLiveSession: Boolean(window.oracle),
        windowId: window.id,
      },
      geometryId: id,
    };
  }), [budget.streamPaneKeys, defaults, geometry, modelByOracle, resolved]);

  const topZRef = useRef(USER_ITEM_MIN_Z - 1);
  useEffect(() => {
    topZRef.current = Math.max(
      topZRef.current,
      ...items.map((item) => item.zIndex ?? USER_ITEM_MIN_Z),
    );
  }, [items]);

  const state = useMemo(() => ({
    version: 1 as const,
    fleet: geometry,
    items: [],
    canvas: { center: canvas.center, zoom: canvas.zoom },
  }), [canvas.center, canvas.zoom, geometry]);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (initialFit.current || items.length === 0) return;
    const frame = window.requestAnimationFrame(() => {
      canvas.fit(items);
      initialFit.current = true;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [canvas, items]);

  useEffect(() => {
    const timeout = window.setTimeout(() => saveBoardState(state, pageId), 350);
    return () => window.clearTimeout(timeout);
  }, [pageId, state]);

  useEffect(() => () => {
    saveBoardState(stateRef.current, pageId);
  }, [pageId]);

  const geometryIdFor = useCallback((item: SpaceWindowItem) => item.geometryId, []);

  const updateItem = useCallback((item: SpaceWindowItem) => {
    const id = geometryIdFor(item);
    setGeometry((current) => ({
      ...current,
      [id]: {
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
        zIndex: current[id]?.zIndex ?? item.zIndex,
      },
    }));
  }, [geometryIdFor]);

  const raise = useCallback((item: SpaceWindowItem) => {
    const id = geometryIdFor(item);
    const zIndex = ++topZRef.current;
    setGeometry((current) => current[id]
      ? { ...current, [id]: { ...current[id], zIndex } }
      : current);
  }, [geometryIdFor]);

  const sendBack = useCallback((targetId: string) => {
    setGeometry((current) => {
      const target = items.find((item) => item.id === targetId);
      if (!target) return current;
      const targetGeometryId = geometryIdFor(target);
      const other = Object.entries(current)
        .filter(([id]) => id !== targetGeometryId)
        .map(([, value]) => value.zIndex ?? USER_ITEM_MIN_Z);
      const minimum = Math.min(...other);
      const shift = minimum <= USER_ITEM_MIN_Z;
      const backZ = !Number.isFinite(minimum) || shift ? USER_ITEM_MIN_Z : minimum - 1;
      return Object.fromEntries(Object.entries(current).map(([id, value]) => [
        id,
        {
          ...value,
          zIndex: id === targetGeometryId
            ? backZ
            : (value.zIndex ?? USER_ITEM_MIN_Z) + (shift ? 1 : 0),
        },
      ]));
    });
  }, [geometryIdFor, items]);

  const applyLayout = useCallback((next: Record<string, PersistedGeometry>) => {
    setGeometry(next);
    setSelectedId(null);
    topZRef.current = Math.max(
      USER_ITEM_MIN_Z - 1,
      ...Object.values(next).map((value) => value.zIndex ?? USER_ITEM_MIN_Z),
    );
    window.requestAnimationFrame(() => canvas.fit(Object.values(next)));
  }, [canvas]);

  const resetDisplayLayout = useCallback(() => applyLayout(defaults), [applyLayout, defaults]);
  const tileEvenly = useCallback(() => {
    const rects = defaultSpaceGrid(layouts.length);
    applyLayout(Object.fromEntries(layouts.map(({ window }, index) => [
      `space-window:${window.id}`,
      { ...rects[index], zIndex: USER_ITEM_MIN_Z + index },
    ])));
  }, [applyLayout, layouts]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
      if (event.target instanceof HTMLElement && (
        event.target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName)
      )) return;
      if (event.shiftKey && event.code === "Digit1") {
        event.preventDefault();
        canvas.fit(items);
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
  }, [canvas, items]);

  const menuActions = useMemo<CanvasMenuAction[]>(() => menu?.id ? [
    {
      id: "front",
      label: "Bring to front",
      onSelect: () => {
        const item = items.find((candidate) => candidate.id === menu.id);
        if (item) raise(item);
      },
    },
    { id: "back", label: "Send to back", onSelect: () => sendBack(menu.id!) },
  ] : [
    { id: "fit", label: "Fit all", hint: "⇧1", onSelect: () => canvas.fit(items) },
    { id: "zoom", label: "100%", hint: "0", onSelect: () => canvas.zoomTo(1) },
    { id: "display-layout", label: "Reset to display layout", onSelect: resetDisplayLayout },
    { id: "tile-evenly", label: "Tile evenly", onSelect: tileEvenly },
    {
      id: "toggle-theme",
      label: `Use ${theme === "plain" ? "phosphor" : "plain"} mode`,
      hint: theme === "plain" ? "phosphor" : "plain",
      separatorBefore: true,
      onSelect: onToggleTheme,
    },
  ], [canvas, items, menu, onToggleTheme, raise, resetDisplayLayout, sendBack, theme, tileEvenly]);

  const parentPageId = display ? displayPageId(display) : null;
  const liveCount = items.filter((item) => item.kind === "terminal").length;
  const ghostCount = items.length - liveCount;

  return (
    <div className="h-dvh w-screen overflow-hidden bg-[var(--bg)] text-[var(--ink)]" data-page-id={pageId} data-space-page="true">
      <header className="fixed left-3 top-3 z-40 flex max-w-[calc(100vw-1.5rem)] items-start gap-2 font-mono">
        <div className="shrink-0">
          <h1 className="text-sm font-bold tracking-tight">STOA · space {spaceIndex}</h1>
          {parentPageId ? (
            <a
              className="block max-w-48 truncate text-xs text-[var(--ink-dim)] hover:text-[var(--ink)]"
              href={boardPageHref(parentPageId)}
              onClick={(event) => {
                event.preventDefault();
                onSelectPage(parentPageId);
              }}
            >
              ← {display?.name}
            </a>
          ) : (
            <p className="text-xs text-[var(--ink-dim)]">display {displayIndex}</p>
          )}
        </div>
        <PageTabs pages={pages} activePageId={pageId} onSelect={onSelectPage} onCreate={onCreatePage} onRename={onRenamePage} onDelete={onDeletePage} />
      </header>

      <Fabric
        id="board-fabric"
        canvas={canvas}
        aria-label={`Space ${spaceIndex} live terminal layout`}
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
        {items.map((item) => {
          return (
            <Tile
              key={item.id}
              item={item}
              siblings={items}
              canvas={canvas}
              minWidth={140}
              minHeight={96}
              style={{ zIndex: item.zIndex }}
              className={selectedId === item.id
                ? "rounded-md ring-2 ring-[var(--idle)] ring-offset-2 ring-offset-[var(--bg)]"
                : "rounded-md"}
              onActivate={() => {
                setSelectedId(item.id);
                raise(item);
              }}
              onChange={updateItem}
              onCommit={updateItem}
            >
              {item.kind === "terminal" ? (
                <TerminalTile item={item} theme={theme} mode={item.mode} />
              ) : (
                <GhostFrame item={item} />
              )}
            </Tile>
          );
        })}
      </Fabric>

      {!display || !space ? (
        <section className="pointer-events-none fixed left-1/2 top-1/2 z-30 w-[min(30rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-md bg-[var(--surface)] p-5 text-center shadow-[0_0_0_1px_var(--line)]" role="status">
          <h2 className="font-mono text-sm font-bold">space not found</h2>
          <p className="mt-1 text-sm text-[var(--ink-dim)]">Display {displayIndex}, space {spaceIndex} is not present in the latest census. This tab can still be closed.</p>
        </section>
      ) : items.length === 0 ? (
        <p className="pointer-events-none fixed left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 font-mono text-sm text-[var(--ink-dim)]" role="status">
          no windows in this space
        </p>
      ) : liveCount === 0 ? (
        <p className="pointer-events-none fixed left-1/2 top-16 z-30 -translate-x-1/2 rounded-md bg-[var(--surface)] px-3 py-1.5 font-mono text-[10px] text-[var(--ink-dim)] shadow-[0_0_0_1px_var(--line)]" role="status">
          no live oracles in this space · {ghostCount} app {ghostCount === 1 ? "window" : "windows"}
        </p>
      ) : null}

      <div className="fixed bottom-11 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1.5 rounded-lg bg-[var(--surface)] p-1.5 shadow-[0_0_0_1px_var(--line)]" role="toolbar" aria-label="Space layout controls">
        <button className={buttonClass} type="button" onClick={() => canvas.fit(items)} title="Fit all · Shift+1">Fit all</button>
        <button className={buttonClass} type="button" onClick={resetDisplayLayout}>Reset to display layout</button>
        <button className={buttonClass} type="button" onClick={tileEvenly}>Tile evenly</button>
        <button className={buttonClass} type="button" onClick={() => canvas.zoomBy(1 / 1.2)} aria-label="Zoom out">−</button>
        <button className={`${buttonClass} min-w-12 tabular-nums`} type="button" onClick={() => canvas.zoomTo(1)} aria-label="Reset zoom to 100%">{Math.round(canvas.zoom * 100)}%</button>
        <button className={buttonClass} type="button" onClick={() => canvas.zoomBy(1.2)} aria-label="Zoom in">+</button>
      </div>

      <p className="fixed bottom-12 right-3 z-40 font-mono text-[10px] text-[var(--ink-faint)]" role="status">
        space {connection}{mirrorError ? " · retrying" : ""} · pulse {argusConnected ? "live" : "reconnecting"} · {liveCount} live / {ghostCount} ghost
      </p>

      {menu ? (
        <CanvasContextMenu x={menu.x} y={menu.y} label={menu.id ? "Window tile actions" : "Space canvas actions"} actions={menuActions} onClose={() => setMenu(null)} />
      ) : null}

      <StatusBar items={fleetTiles} usage={usage} error={fleetError} theme={theme} onToggleTheme={onToggleTheme} />
    </div>
  );
}
