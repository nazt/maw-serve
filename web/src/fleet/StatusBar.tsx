import { useEffect, useState } from "react";

import { activeHost, apiFetch, API_ENDPOINTS } from "../clients/api";
import type { Theme } from "../theme";
import type { FleetTileItem, UsagePayload } from "./useFleet";

export interface StatusBarProps {
  items: FleetTileItem[];
  usage: UsagePayload | null;
  error?: Error | null;
  usageError?: Error | null;
  theme: Theme;
  onToggleTheme: () => void;
  className?: string;
}

export interface FleetSummary {
  active: number;
  idle: number;
  stale: number;
  burnPerHour: number;
  accounts: number;
}

interface ServerBuildIdentity {
  branch: string;
  commit: string;
  builder: string;
  buildTime: string;
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
}

function Metric({ label, value }: MetricProps) {
  return (
    <span className="inline-flex items-baseline gap-1 whitespace-nowrap">
      <strong className="font-mono text-xs font-bold tabular-nums text-[var(--ink)]">{value}</strong>
      <span className="text-[11px] text-[var(--ink-dim)]">{label}</span>
    </span>
  );
}

export function StatusBar({
  items,
  usage,
  error = null,
  usageError = null,
  theme,
  onToggleTheme,
  className = "",
}: StatusBarProps) {
  const summary = summarizeFleet(items, usage);
  const [serverBuild, setServerBuild] = useState<ServerBuildIdentity | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void apiFetch(API_ENDPOINTS.version, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) return;
      const candidate = await response.json() as Partial<ServerBuildIdentity>;
      if ([candidate.branch, candidate.commit, candidate.builder, candidate.buildTime]
        .every((value) => typeof value === "string" && value.length > 0)) {
        setServerBuild(candidate as ServerBuildIdentity);
      }
    }).catch(() => {
      // Fleet polling owns the user-facing connectivity state.
    });
    return () => controller.abort();
  }, []);

  const buildBadge = `build ${__STOA_BUILD__.branch}@${__STOA_BUILD__.commit}`;
  const label = error
    ? "Fleet telemetry link interrupted"
    : usageError
      ? `Fleet status: ${summary.active} active, ${summary.idle} idle, ${summary.stale} stale; usage rates unavailable`
    : `Fleet status: ${summary.active} active, ${summary.idle} idle, ${summary.stale} stale, ${summary.burnPerHour} tokens per hour, ${summary.accounts} accounts`;
  const nextTheme = theme === "plain" ? "phosphor" : "plain";

  return (
    <footer
      className={`fixed inset-x-0 bottom-0 z-40 flex h-8 items-center gap-2 border-t border-[var(--line)] bg-[var(--surface)] px-3 font-sans sm:gap-4 ${className}`}
      aria-label={label}
      aria-live="polite"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden sm:gap-4">
        {error ? (
          <span className="truncate font-mono text-xs text-[var(--ink)]">
            telemetry interrupted · retrying
          </span>
        ) : (
          <>
            <Metric
              label="tok/h"
              value={usageError ? "—" : compactNumber.format(summary.burnPerHour)}
            />
            <span className="h-3 w-px shrink-0 bg-[var(--line)]" aria-hidden="true" />
            <Metric label="active" value={summary.active} />
            <Metric label="idle" value={summary.idle} />
            <Metric label="stale" value={summary.stale} />
            <Metric
              label={usageError ? "rates unavailable" : summary.accounts === 1 ? "account" : "accounts"}
              value={usageError ? "—" : summary.accounts}
            />
          </>
        )}
      </div>
      <button
        type="button"
        className="hidden h-6 shrink-0 items-center gap-1.5 rounded border border-[var(--line)] bg-[var(--surface-2)] px-2 font-mono text-[10px] font-semibold leading-none text-[var(--ink-dim)] transition-colors duration-150 hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--idle)] motion-reduce:transition-none sm:inline-flex"
        aria-label={`Switch to ${nextTheme} mode`}
        title={`Current mode: ${theme}. Switch to ${nextTheme}.`}
        data-theme-toggle={theme}
        onClick={onToggleTheme}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--active)] shadow-[0_0_5px_var(--active-glow)]" aria-hidden="true" />
        <span>{theme}</span>
      </button>
      <details className="build-badge group relative hidden shrink-0 font-mono sm:block">
        <summary
          className="inline-flex h-6 cursor-pointer items-center gap-1.5 rounded border border-[var(--line)] bg-[var(--surface-2)] px-2 text-[10px] font-semibold leading-none tabular-nums text-[var(--ink-faint)] transition-colors duration-150 hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--idle)] motion-reduce:transition-none"
          aria-label={`${buildBadge}. Open build details.`}
          title="Build details"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--ink-faint)]" aria-hidden="true" />
          <span>{buildBadge}</span>
        </summary>
        <div className="absolute bottom-[calc(100%+0.5rem)] right-0 w-[min(24rem,calc(100vw-1.5rem))] rounded-md border border-[var(--line)] bg-[var(--surface-2)] p-3 text-[11px] leading-relaxed text-[var(--ink-dim)] shadow-[0_4px_8px_var(--elevation-shadow)]">
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1">
            <dt className="font-semibold text-[var(--ink)]">interface</dt>
            <dd className="min-w-0 break-words tabular-nums">
              {__STOA_BUILD__.branch}@{__STOA_BUILD__.commit} · {__STOA_BUILD__.builder}
            </dd>
            <dt className="font-semibold text-[var(--ink)]">built</dt>
            <dd className="min-w-0 break-words tabular-nums">{__STOA_BUILD__.buildTime}</dd>
            <dt className="font-semibold text-[var(--ink)]">data</dt>
            <dd className="min-w-0 break-words tabular-nums">
              {serverBuild
                ? `${serverBuild.branch}@${serverBuild.commit} · ${serverBuild.builder}`
                : activeHost || "identity unavailable"}
            </dd>
            {serverBuild ? (
              <>
                <dt className="font-semibold text-[var(--ink)]">updated</dt>
                <dd className="min-w-0 break-words tabular-nums">{serverBuild.buildTime}</dd>
              </>
            ) : null}
          </dl>
        </div>
      </details>
    </footer>
  );
}

export default StatusBar;
