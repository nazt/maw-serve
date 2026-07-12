export type BoardTelemetryState = "ready" | "loading" | "error" | "empty";

export interface BoardTelemetryInput {
  loading: boolean;
  hasCensus: boolean;
  hasTiles: boolean;
  error: Error | null;
}

export function resolveBoardTelemetryState({
  loading,
  hasCensus,
  hasTiles,
  error,
}: BoardTelemetryInput): BoardTelemetryState {
  if (hasTiles) return "ready";
  if (loading) return "loading";
  if (error) return "error";
  return hasCensus ? "empty" : "error";
}
