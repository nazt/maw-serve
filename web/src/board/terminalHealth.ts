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

export function terminalHealth(
  status: TerminalConnectionStatus,
  detail: string | null,
): TerminalHealth {
  if (status === "live") return { degraded: false, label: "live", retryable: false };
  if (status === "connecting") {
    return { degraded: false, label: "connecting…", retryable: false };
  }
  if (status === "polling" && !detail) {
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
