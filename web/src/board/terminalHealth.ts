export type TerminalConnectionStatus =
  | "connecting"
  | "live"
  | "reconnecting"
  | "polling"
  | "error";

export interface TerminalHealth {
  degraded: boolean;
  label: string;
  retryable: boolean;
}

export interface TerminalConnectionState {
  status: TerminalConnectionStatus;
  degraded: boolean;
}

export interface TerminalConnectionSummary {
  live: number;
  polling: number;
  connecting: number;
  reconnecting: number;
  error: number;
  degraded: number;
}

export function terminalHealth(
  status: TerminalConnectionStatus,
  detail: string | null,
): TerminalHealth {
  if (status === "live") return { degraded: false, label: "live", retryable: false };
  if (status === "connecting") {
    return { degraded: false, label: "connecting…", retryable: false };
  }
  if (
    status === "polling" &&
    (!detail || detail === "Live stream unavailable; using snapshots")
  ) {
    return { degraded: false, label: "polling (fallback)", retryable: false };
  }
  if (status === "polling") {
    return { degraded: true, label: "degraded · polling", retryable: true };
  }
  if (status === "reconnecting") {
    return { degraded: true, label: "degraded · reconnecting", retryable: true };
  }
  return { degraded: true, label: "degraded · unavailable", retryable: true };
}

export function summarizeTerminalConnections(
  states: readonly (TerminalConnectionState | null | undefined)[],
): TerminalConnectionSummary {
  const summary: TerminalConnectionSummary = {
    live: 0,
    polling: 0,
    connecting: 0,
    reconnecting: 0,
    error: 0,
    degraded: 0,
  };
  for (const state of states) {
    if (!state) {
      summary.connecting += 1;
      continue;
    }
    summary[state.status] += 1;
    if (state.degraded) summary.degraded += 1;
  }
  return summary;
}
