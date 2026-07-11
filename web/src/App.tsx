import { useEffect, useMemo, useState } from "react";

export const CENSUS_URL = "/api/agora/census";
export const USAGE_URL = "/api/agora/usage";
export const POLL_INTERVAL_MS = 8_000;

type OracleStatus = "active" | "idle" | "stale" | "pinned" | "error";

type Census = {
  displays?: Array<{
    spaces?: Array<{
      oracles?: Array<{ status?: OracleStatus }>;
    }>;
  }>;
};

type Usage = {
  hosts?: Array<{ burn_per_hr?: number }>;
  accounts?: unknown[];
};

type Telemetry = {
  census: Census | null;
  usage: Usage | null;
  loading: boolean;
  error: string | null;
};

type FleetTotals = {
  active: number;
  idle: number;
  stale: number;
  burn: number;
  accounts: number;
};

const initialTelemetry: Telemetry = {
  census: null,
  usage: null,
  loading: true,
  error: null,
};

function useTelemetryPoll(): Telemetry {
  const [telemetry, setTelemetry] = useState(initialTelemetry);

  useEffect(() => {
    let mounted = true;
    let controller: AbortController | null = null;

    async function poll() {
      controller?.abort();
      controller = new AbortController();

      try {
        const responses = await Promise.all([
          fetch(CENSUS_URL, {
            headers: { Accept: "application/json" },
            cache: "no-store",
            signal: controller.signal,
          }),
          fetch(USAGE_URL, {
            headers: { Accept: "application/json" },
            cache: "no-store",
            signal: controller.signal,
          }),
        ]);

        for (const response of responses) {
          if (!response.ok) {
            throw new Error(`Telemetry request returned HTTP ${response.status}`);
          }
        }

        const [census, usage] = (await Promise.all(
          responses.map((response) => response.json()),
        )) as [Census, Usage];

        if (mounted) {
          setTelemetry({ census, usage, loading: false, error: null });
        }
      } catch (error) {
        if (!mounted || (error instanceof DOMException && error.name === "AbortError")) {
          return;
        }

        setTelemetry((current) => ({
          ...current,
          loading: false,
          error: error instanceof Error ? error.message : "Telemetry is unavailable",
        }));
      }
    }

    void poll();
    const interval = window.setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      mounted = false;
      controller?.abort();
      window.clearInterval(interval);
    };
  }, []);

  return telemetry;
}

function fleetTotals(census: Census | null, usage: Usage | null): FleetTotals {
  const totals: FleetTotals = {
    active: 0,
    idle: 0,
    stale: 0,
    burn: 0,
    accounts: usage?.accounts?.length ?? 0,
  };

  for (const display of census?.displays ?? []) {
    for (const space of display.spaces ?? []) {
      for (const oracle of space.oracles ?? []) {
        if (oracle.status === "active") totals.active += 1;
        if (oracle.status === "idle") totals.idle += 1;
        if (oracle.status === "stale") totals.stale += 1;
      }
    }
  }

  totals.burn = (usage?.hosts ?? []).reduce(
    (sum, host) => sum + (Number(host.burn_per_hr) || 0),
    0,
  );

  return totals;
}

function useClock(): string {
  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }),
    [],
  );
  const [time, setTime] = useState(() => formatter.format(new Date()));

  useEffect(() => {
    const interval = window.setInterval(
      () => setTime(formatter.format(new Date())),
      1_000,
    );
    return () => window.clearInterval(interval);
  }, [formatter]);

  return time;
}

type FabricProps = Pick<Telemetry, "loading" | "error"> & {
  hasData: boolean;
  noteCount: number;
};

function Fabric({ loading, error, hasData, noteCount }: FabricProps) {
  let message = "Fleet canvas ready";
  if (loading) message = "Acquiring fleet telemetry…";
  else if (error && !hasData) message = "Fleet telemetry is unavailable";
  else if (!hasData) message = "No oracle agents are currently reporting";

  return (
    <main
      id="fabric"
      className="fixed inset-0 overflow-hidden bg-[var(--bg)] text-[var(--ink)]"
      aria-label="Interactive fleet board"
      aria-busy={loading}
      data-notes={noteCount}
    >
      <p className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-mono text-sm text-[var(--ink-dim)]">
        {message}
      </p>
    </main>
  );
}

type ToolbarProps = {
  zoom: number;
  onAddNote: () => void;
  onFit: () => void;
};

function Toolbar({ zoom, onAddNote, onFit }: ToolbarProps) {
  return (
    <div
      className="fixed right-3 top-3 z-40 flex items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-1 font-mono text-xs"
      role="toolbar"
      aria-label="Board controls"
    >
      <button type="button" onClick={onAddNote}>
        Add note
      </button>
      <button type="button" onClick={onFit}>
        Fit
      </button>
      <output className="min-w-14 text-center text-[var(--idle)]" aria-label="Canvas zoom">
        {Math.round(zoom * 100)}%
      </output>
    </div>
  );
}

type StatusBarProps = {
  totals: FleetTotals;
  error: string | null;
};

function StatusBar({ totals, error }: StatusBarProps) {
  const burn = new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(totals.burn);

  return (
    <footer
      id="statusbar"
      className="fixed inset-x-0 bottom-0 z-40 flex min-h-11 items-center gap-5 border-t border-[var(--line)] bg-[var(--surface-2)] px-4 font-mono text-xs text-[var(--ink-dim)]"
      aria-live="polite"
    >
      {error ? (
        <span className="text-[var(--error)]">Telemetry interrupted · retrying</span>
      ) : (
        <>
          <span className="text-[var(--active)]">active {totals.active}</span>
          <span className="text-[var(--idle)]">idle {totals.idle}</span>
          <span className="text-[var(--stale)]">stale {totals.stale}</span>
          <span>token burn {burn} tok/h</span>
          <span>accounts {totals.accounts}</span>
        </>
      )}
    </footer>
  );
}

export default function App() {
  const telemetry = useTelemetryPoll();
  const clock = useClock();
  const [zoom] = useState(1);
  const [noteCount, setNoteCount] = useState(0);
  const totals = useMemo(
    () => fleetTotals(telemetry.census, telemetry.usage),
    [telemetry.census, telemetry.usage],
  );
  const hasData = totals.active + totals.idle + totals.stale > 0;

  return (
    <div className="min-h-dvh bg-[var(--bg)] text-[var(--ink)]">
      <header className="pointer-events-none fixed left-3 top-3 z-40 font-mono">
        <h1 className="text-sm font-bold tracking-tight">STOA · board</h1>
        <time className="text-xs text-[var(--ink-dim)]">{clock}</time>
      </header>

      <Fabric
        loading={telemetry.loading}
        error={telemetry.error}
        hasData={hasData}
        noteCount={noteCount}
      />
      <Toolbar
        zoom={zoom}
        onAddNote={() => setNoteCount((count) => count + 1)}
        onFit={() => window.dispatchEvent(new CustomEvent("stoa:fit"))}
      />
      <StatusBar totals={totals} error={telemetry.error} />
    </div>
  );
}
