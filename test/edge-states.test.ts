import { expect, test } from "bun:test";
import { resolveBoardTelemetryState } from "../web/src/fleet/boardState";
import { terminalHealth } from "../web/src/board/terminalHealth";
import { resolveFleetRefresh } from "../web/src/fleet/useFleet";

test("board telemetry states distinguish loading, failure, and a confirmed empty fleet", () => {
  expect(resolveBoardTelemetryState({
    loading: true,
    hasCensus: false,
    hasTiles: false,
    error: null,
  })).toBe("loading");
  expect(resolveBoardTelemetryState({
    loading: false,
    hasCensus: false,
    hasTiles: false,
    error: new Error("offline"),
  })).toBe("error");
  expect(resolveBoardTelemetryState({
    loading: false,
    hasCensus: true,
    hasTiles: false,
    error: null,
  })).toBe("empty");
  expect(resolveBoardTelemetryState({
    loading: false,
    hasCensus: true,
    hasTiles: true,
    error: new Error("stale snapshot"),
  })).toBe("ready");
});

test("terminal health marks transport failures as degraded and retryable", () => {
  expect(terminalHealth("live", null)).toEqual({
    degraded: false,
    label: "live",
    retryable: false,
  });
  expect(terminalHealth("polling", null)).toEqual({
    degraded: false,
    label: "polling (fallback)",
    retryable: false,
  });
  expect(terminalHealth("polling", "Live stream unavailable; using snapshots")).toEqual({
    degraded: true,
    label: "degraded · polling",
    retryable: true,
  });
  expect(terminalHealth("error", "Terminal snapshots unavailable")).toEqual({
    degraded: true,
    label: "degraded · unavailable",
    retryable: true,
  });
});

test("usage failure preserves census and degrades rates independently", () => {
  const census = { displays: [{ name: "main", spaces: [] }] };
  const outcome = resolveFleetRefresh(
    { status: "fulfilled", value: census },
    { status: "rejected", reason: new Error("usage unavailable") },
    null,
  );

  expect(outcome.census).toBe(census);
  expect(outcome.censusError).toBeNull();
  expect(outcome.usage).toBeNull();
  expect(outcome.usageError?.message).toBe("usage unavailable");
});
