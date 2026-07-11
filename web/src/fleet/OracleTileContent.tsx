import type { CSSProperties } from "react";
import type { OracleStatus, OracleTileItem } from "./useFleet";

export interface OracleTileContentProps {
  item: OracleTileItem;
  className?: string;
}

const STATUS_COLOR: Record<OracleStatus, string> = {
  active: "var(--active, oklch(0.85 0.19 155))",
  idle: "var(--idle, oklch(0.80 0.10 210))",
  stale: "var(--stale, oklch(0.55 0.03 230))",
  pinned: "var(--pinned, oklch(0.82 0.16 75))",
  error: "var(--error, oklch(0.68 0.20 25))",
};

function idleLabel(value: number | null): string {
  if (value === null || !Number.isFinite(value) || value < 0) return "—";
  if (value <= 5) return "live";
  if (value < 60) return `${Math.floor(value)}s`;
  if (value < 3_600) return `${Math.floor(value / 60)}m`;
  return `${Math.floor(value / 3_600)}h`;
}

function heatState(heat: number): "cool" | "warm" | "hot" {
  if (heat >= 85) return "hot";
  if (heat > 70) return "warm";
  return "cool";
}

export function OracleTileContent({ item, className = "" }: OracleTileContentProps) {
  const { oracle, status, modelTier, idleSec, annotation, heat, pinned } = item.data;
  const safeHeat = Math.min(100, Math.max(0, Number.isFinite(heat) ? heat : 0));
  const statusColor = STATUS_COLOR[status];
  const style = {
    "--heat": safeHeat,
    "--node-status": statusColor,
    "--heat-color": pinned ? STATUS_COLOR.pinned : undefined,
  } as CSSProperties;

  return (
    <div
      className={`oracle-tile oracle-content relative h-full min-w-0 overflow-hidden rounded-md border border-[var(--node-status)] p-2.5 ${status === "active" ? "motion-safe:animate-breathe" : ""} ${className}`}
      data-status={status}
      data-heat={heatState(safeHeat)}
      data-pinned={pinned || undefined}
      style={style}
    >
      <span
        className="heat-ring pointer-events-none absolute inset-0 rounded-md"
        role="img"
        aria-label={`${oracle}: ${safeHeat}% five-hour usage`}
      />

      <div className="relative z-10 grid h-full content-center gap-1">
        <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1.5">
          <span
            className="status-dot h-2 w-2 rounded-full"
            style={{
              backgroundColor: statusColor,
              boxShadow: `0 0 7px ${statusColor}`,
            }}
            role="img"
            aria-label={`${status} status`}
          />
          <strong className="truncate font-mono text-sm font-bold tracking-tight text-[var(--ink)]">
            {oracle}
          </strong>
          {modelTier && modelTier.toLowerCase() !== "unknown" ? (
            <span className="max-w-24 truncate rounded-full bg-[var(--surface-2)] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[var(--ink-dim)]">
              {modelTier}
            </span>
          ) : null}
        </div>

        <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-baseline gap-1.5">
          <span
            className="whitespace-nowrap font-mono text-[11px] tabular-nums"
            style={{ color: status === "active" ? statusColor : "var(--ink-dim)" }}
          >
            {idleLabel(idleSec)}
          </span>
          <span
            className="truncate text-xs leading-snug text-[var(--ink-dim)]"
            title={annotation}
          >
            {annotation || "No annotation"}
          </span>
        </div>
      </div>
    </div>
  );
}

export default OracleTileContent;
