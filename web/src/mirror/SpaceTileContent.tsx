import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { normalizeOracleHandle, type OracleStatus } from "../fleet/useFleet";
import { fitDisplayFrame, layoutWindows, pulseFreshness } from "./model";
import { newestPulseForOracle } from "./useMirror";
import type {
  MirrorDisplay,
  MirrorSpace,
  MirrorWindow,
  OraclePulseMap,
} from "./types";

export interface SpaceTileData {
  display: MirrorDisplay;
  space: MirrorSpace;
  windows: MirrorWindow[];
}

export interface SpaceTileItem {
  id: string;
  kind: "space";
  x: number;
  y: number;
  w: number;
  h: number;
  zIndex?: number;
  data: SpaceTileData;
}

interface SpaceTileContentProps {
  item: SpaceTileItem;
  pulses: OraclePulseMap;
  statusByOracle: ReadonlyMap<string, OracleStatus>;
  modelByOracle: ReadonlyMap<string, string>;
  onOracleDoubleClick: (oracle: string) => void;
  onExpand: () => void;
}

const STATUS_COLOR: Record<OracleStatus, string> = {
  active: "var(--active)",
  idle: "var(--idle)",
  stale: "var(--stale)",
  pinned: "var(--pinned)",
  error: "var(--error)",
};

export default function SpaceTileContent({
  item,
  pulses,
  statusByOracle,
  modelByOracle,
  onOracleDoubleClick,
  onExpand,
}: SpaceTileContentProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 1, height: 1 });
  const [now, setNow] = useState(Date.now);
  const { display, space, windows } = item.data;
  const layouts = useMemo(
    () => layoutWindows(display, space, windows),
    [display, space, windows],
  );

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const update = () => setSize({ width: body.clientWidth, height: body.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(body);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 5_000);
    return () => window.clearInterval(interval);
  }, []);

  const fitted = fitDisplayFrame(display.frame, size.width, size.height);

  return (
    <section
      className={`mirror-space flex h-full flex-col overflow-hidden rounded-md border bg-[var(--surface)] ${
        space.hasFocus
          ? "border-[var(--active)] shadow-[0_0_15px_var(--active-glow)]"
          : ""
      }`}
      data-display-index={display.index}
      data-space-index={space.index}
      data-space-visible={space.isVisible || undefined}
      data-space-focused={space.hasFocus || undefined}
    >
      <header className="flex h-9 shrink-0 items-center gap-2 border-b border-[var(--mirror-line)] bg-[var(--surface-2)] px-2.5 font-mono">
        <strong className="text-xs text-[var(--ink)]">space {space.index}</strong>
        {space.isVisible ? (
          <span className="rounded-sm bg-[oklch(var(--active-channels)/0.14)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--active)]">
            visible
          </span>
        ) : null}
        {space.hasFocus ? (
          <span className="text-[10px] font-semibold text-[var(--active)]">focus</span>
        ) : null}
        {space.pinned ? (
          <span className="ml-auto text-[10px] font-semibold text-[var(--pinned)]">pin</span>
        ) : null}
        <button
          type="button"
          className={`${space.pinned ? "" : "ml-auto"} grid h-6 w-6 shrink-0 place-items-center rounded text-sm leading-none text-[var(--ink-dim)] transition-colors duration-150 hover:bg-[var(--surface)] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--idle)]`}
          aria-label={`Expand space ${space.index} to full tab`}
          title="Expand space to full tab"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onExpand();
          }}
        >
          <span aria-hidden="true">⤢</span>
        </button>
      </header>

      <div ref={bodyRef} className="relative min-h-0 flex-1 overflow-hidden bg-[var(--bg)]">
        <div
          className="absolute overflow-hidden rounded-[3px] border border-[color:oklch(var(--mirror-line-channels)/0.82)] bg-[oklch(var(--surface-channels)/0.55)]"
          data-display-frame="true"
          style={{
            left: fitted.x,
            top: fitted.y,
            width: fitted.w,
            aspectRatio: `${display.frame.w} / ${display.frame.h}`,
          }}
        >
          {layouts.map(({ window, rect }) => {
            const pulse = window.oracle
              ? newestPulseForOracle(pulses, window.oracle)
              : null;
            const freshness = pulseFreshness(pulse?.at, now);
            const fallback = window.oracle
              ? statusByOracle.get(normalizeOracleHandle(window.oracle)) ?? "stale"
              : "stale";
            const model = window.oracle
              ? modelByOracle.get(normalizeOracleHandle(window.oracle))
              : null;
            const color = window.oracle
              ? freshness === "live"
                ? "var(--active)"
                : freshness === "cooling"
                  ? "var(--pinned)"
                  : STATUS_COLOR[fallback]
              : "var(--line)";
            const style = {
              left: `${rect.x * 100}%`,
              top: `${rect.y * 100}%`,
              width: `${rect.w * 100}%`,
              height: `${rect.h * 100}%`,
              "--mirror-signal": color,
            } as CSSProperties;

            return (
              <div
                key={window.id}
                className={`mirror-window absolute min-h-px min-w-px overflow-hidden rounded-[2px] border bg-[oklch(var(--surface-2-channels)/0.62)] ${
                  window.focus ? "mirror-window--focus" : ""
                } ${window.oracle ? "mirror-window--oracle" : "mirror-window--app"}`}
                data-app={window.app}
                data-mirror-window-id={window.id}
                data-oracle={window.oracle || undefined}
                data-pulse={window.oracle ? freshness : undefined}
                role={window.oracle ? "button" : undefined}
                tabIndex={window.oracle ? 0 : undefined}
                aria-label={window.oracle ? `Open ${window.oracle} live terminal` : undefined}
                style={style}
                onPointerDown={window.oracle ? (event) => event.stopPropagation() : undefined}
                onDoubleClick={window.oracle ? (event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onOracleDoubleClick(window.oracle!);
                } : undefined}
                onKeyDown={window.oracle ? (event) => {
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  event.stopPropagation();
                  onOracleDoubleClick(window.oracle!);
                } : undefined}
              >
                <span className="block truncate px-1 py-0.5 font-mono text-[9px] leading-none">
                  {window.oracle || window.app}
                  {model ? (
                    <small className="ml-1 text-[8px] text-[var(--ink-faint)]">{model}</small>
                  ) : null}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
