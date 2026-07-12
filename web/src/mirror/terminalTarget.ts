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
