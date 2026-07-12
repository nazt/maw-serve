import type { FleetTileItem, UsagePayload } from "./useFleet";

export interface StatusBarProps {
  items: FleetTileItem[];
  usage: UsagePayload | null;
  error?: Error | null;
  className?: string;
}

export interface FleetSummary {
  active: number;
  idle: number;
  stale: number;
  burnPerHour: number;
  accounts: number;
}

const compactNumber = new Intl.NumberFormat(undefined, {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function summarizeFleet(items: FleetTileItem[], usage: UsagePayload | null): FleetSummary {
  const summary: FleetSummary = {
    active: 0,
    idle: 0,
    stale: 0,
    burnPerHour: 0,
    accounts: usage?.accounts?.length ?? 0,
  };

  for (const item of items) {
    if (item.kind !== "oracle") continue;
    if (item.data.status === "active") summary.active += 1;
    else if (item.data.status === "idle") summary.idle += 1;
    else summary.stale += 1;
  }

  for (const host of usage?.hosts ?? []) {
    const burn = Number(host?.burn_per_hr);
    if (Number.isFinite(burn)) summary.burnPerHour += burn;
  }

  return summary;
}

interface MetricProps {
  label: string;
  value: string | number;
  color?: string;
}

function Metric({ label, value, color = "var(--ink-dim)" }: MetricProps) {
  return (
    <span className="inline-flex items-baseline gap-1 whitespace-nowrap" style={{ color }}>
      <strong className="font-mono text-xs font-bold tabular-nums text-current">{value}</strong>
      <span className="text-[11px] text-current">{label}</span>
    </span>
  );
}

export function StatusBar({ items, usage, error = null, className = "" }: StatusBarProps) {
  const summary = summarizeFleet(items, usage);
  const label = error
    ? "Fleet telemetry link interrupted"
    : `Fleet status: ${summary.active} active, ${summary.idle} idle, ${summary.stale} stale, ${summary.burnPerHour} tokens per hour, ${summary.accounts} accounts`;

  return (
    <footer
      className={`fixed inset-x-0 bottom-0 z-40 flex h-8 items-center gap-4 border-t border-[var(--line)] bg-[var(--surface)] px-3 font-sans ${className}`}
      aria-label={label}
      aria-live="polite"
    >
      {error ? (
        <span className="font-mono text-xs text-[var(--error)]">
          telemetry interrupted · retrying
        </span>
      ) : (
        <>
          <Metric label="active" value={summary.active} color="var(--active)" />
          <Metric label="idle" value={summary.idle} color="var(--idle)" />
          <Metric label="stale" value={summary.stale} color="var(--stale)" />
          <span className="h-3 w-px bg-[var(--line)]" aria-hidden="true" />
          <Metric label="tok/h" value={compactNumber.format(summary.burnPerHour)} />
          <Metric
            label={summary.accounts === 1 ? "account" : "accounts"}
            value={summary.accounts}
          />
        </>
      )}
    </footer>
  );
}

export default StatusBar;
