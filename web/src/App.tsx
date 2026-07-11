import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Fabric } from "./canvas/Fabric";
import { useCanvas } from "./canvas/useCanvas";
import OracleTileContent from "./fleet/OracleTileContent";
import StatusBar, { summarizeFleet } from "./fleet/StatusBar";
import Toolbar from "./fleet/Toolbar";
import {
  useFleet,
  type FleetTileItem,
  type NoteTileItem,
} from "./fleet/useFleet";
import Tile from "./tiles/Tile";

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

interface NoteTileContentProps {
  item: NoteTileItem;
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

function tileClassName(item: FleetTileItem): string {
  if (item.kind === "note") {
    return "rounded-md bg-[oklch(0.29_0.055_75)]";
  }

  return [
    "rounded-md",
    "bg-[var(--surface)]",
    "tile-glow",
    `tile-glow-${item.data.status}`,
  ].join(" ");
}

export default function App() {
  const canvas = useCanvas();
  const {
    tiles,
    usage,
    loading,
    error,
    addNote,
    updateTile,
    updateNote,
  } = useFleet();
  const now = useClock();
  const initialFitComplete = useRef(false);
  const totals = useMemo(() => summarizeFleet(tiles, usage), [tiles, usage]);
  const hasOracleTiles = useMemo(
    () => tiles.some((item) => item.kind === "oracle"),
    [tiles],
  );

  useEffect(() => {
    if (initialFitComplete.current || !hasOracleTiles) return;

    const frame = window.requestAnimationFrame(() => {
      canvas.fit(tiles);
      initialFitComplete.current = true;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [canvas, hasOracleTiles, tiles]);

  const addNoteAtViewportCenter = useCallback(() => {
    const fabric = canvas.fabricRef.current;
    if (!fabric) {
      addNote(canvas.center);
      return;
    }

    const bounds = fabric.getBoundingClientRect();
    addNote(
      canvas.screenToWorld({
        clientX: bounds.left + bounds.width / 2,
        clientY: bounds.top + bounds.height / 2,
      }),
    );
  }, [addNote, canvas]);

  return (
    <div className="h-dvh w-screen overflow-hidden bg-[var(--bg)] text-[var(--ink)]">
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
        {tiles.map((item) => (
          <Tile
            key={item.id}
            item={item}
            siblings={tiles}
            canvas={canvas}
            className={tileClassName(item)}
            onChange={updateTile}
            onCommit={updateTile}
          >
            {item.kind === "oracle" ? (
              <OracleTileContent item={item} />
            ) : (
              <NoteTileContent item={item} onChange={updateNote} />
            )}
          </Tile>
        ))}
      </Fabric>

      <Toolbar
        zoom={canvas.zoom}
        onAddNote={addNoteAtViewportCenter}
        onFit={canvas.fit}
        disabled={loading && tiles.length === 0}
      />
      <StatusBar items={tiles} usage={usage} error={error} />

      <output className="sr-only" aria-live="polite">
        {totals.active + totals.idle + totals.stale} fleet tiles
      </output>
    </div>
  );
}
