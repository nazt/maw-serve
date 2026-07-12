import {
  normalizeOracleHandle,
  type CensusOracle,
  type CensusPayload,
} from "../fleet/useFleet";

export function finiteIdleSeconds(value: unknown): number {
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds >= 0
    ? seconds
    : Number.POSITIVE_INFINITY;
}

export function terminalPaneKey(
  target: Pick<CensusOracle, "session" | "pane">,
): string | null {
  return target.session && target.pane ? `${target.session}:${target.pane}` : null;
}

export function terminalTargets(
  census: CensusPayload | null,
  oracle: string,
): CensusOracle[] {
  const handle = normalizeOracleHandle(oracle);
  const matches: CensusOracle[] = [];

  for (const display of census?.displays ?? []) {
    for (const space of display.spaces ?? []) {
      for (const row of space.oracles ?? []) {
        if (
          normalizeOracleHandle(row.oracle) === handle &&
          row.session &&
          row.pane
        ) {
          matches.push(row);
        }
      }
    }
  }

  return matches.sort((left, right) => (
    Number(String(right.status).toLowerCase() === "active") -
      Number(String(left.status).toLowerCase() === "active") ||
    finiteIdleSeconds(left.idleSec) - finiteIdleSeconds(right.idleSec)
  ));
}

export function terminalTarget(
  census: CensusPayload | null,
  oracle: string,
): CensusOracle | null {
  return terminalTargets(census, oracle)[0] ?? null;
}

export interface TerminalBudgetCandidate {
  paneKey: string;
  focus: boolean;
  pulseLive: boolean;
  status: string | null | undefined;
  idleSec: number | null | undefined;
}

export interface TerminalBudget {
  streamPaneKeys: ReadonlySet<string>;
  degradedPaneKeys: string[];
}

export function allocateTerminalBudget(
  candidates: readonly TerminalBudgetCandidate[],
  limit = 8,
): TerminalBudget {
  const distinct = new Map<string, TerminalBudgetCandidate>();
  for (const candidate of candidates) {
    const existing = distinct.get(candidate.paneKey);
    if (!existing) {
      distinct.set(candidate.paneKey, candidate);
      continue;
    }
    const preferred = [candidate, existing].sort(compareTerminalPriority)[0];
    distinct.set(candidate.paneKey, preferred);
  }

  const ranked = [...distinct.values()].sort(compareTerminalPriority);
  const streamCount = Math.max(0, Math.floor(limit));
  return {
    streamPaneKeys: new Set(ranked.slice(0, streamCount).map((row) => row.paneKey)),
    degradedPaneKeys: ranked.slice(streamCount).map((row) => row.paneKey),
  };
}

function compareTerminalPriority(
  left: TerminalBudgetCandidate,
  right: TerminalBudgetCandidate,
): number {
  return Number(right.focus) - Number(left.focus) ||
    Number(right.pulseLive) - Number(left.pulseLive) ||
    Number(String(right.status).toLowerCase() === "active") -
      Number(String(left.status).toLowerCase() === "active") ||
    finiteIdleSeconds(left.idleSec) - finiteIdleSeconds(right.idleSec) ||
    left.paneKey.localeCompare(right.paneKey);
}
