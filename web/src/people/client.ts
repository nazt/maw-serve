import { activePeopleHost, peopleApiFetch } from "../clients/api";
import type {
  PeopleAccessGrant,
  PeopleApiEnvelope,
  PeopleDashboard,
  PeoplePersonContext,
  PeopleUnlockResult,
  PeopleUnlockTicket,
} from "./types";

export interface PersonContextRequest {
  key: string;
  days: 30 | 60 | 90;
  analyze: boolean;
  max_excerpts?: number;
  max_chars?: number;
}

export interface PeopleReadSnapshot {
  dashboard: PeopleDashboard;
}

export class PeopleClientError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "PeopleClientError";
    this.statusCode = statusCode;
  }
}

function envelope<T>(value: unknown): PeopleApiEnvelope<T> {
  if (!value || typeof value !== "object" || Array.isArray(value) || !("ok" in value)) {
    throw new PeopleClientError(502, "People returned an invalid response");
  }
  return value as PeopleApiEnvelope<T>;
}

async function request<T>(path: string, token: string | null, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await peopleApiFetch(path, { ...init, headers, cache: "no-store" });
  let payload: PeopleApiEnvelope<T>;
  try {
    payload = envelope<T>(await response.json());
  } catch (cause) {
    if (cause instanceof PeopleClientError) throw cause;
    throw new PeopleClientError(response.status || 502, "People returned unreadable JSON");
  }
  if (!response.ok || !payload.ok) {
    const message = payload.ok ? `People request failed with HTTP ${response.status}` : payload.reason || payload.error;
    throw new PeopleClientError(response.status, message);
  }
  return payload.data;
}

function jsonRequest(body: unknown): RequestInit {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export function peopleHostConfigured(): boolean {
  return !!activePeopleHost;
}

export function takePeopleBootstrapCode(): string | null {
  if (typeof window === "undefined" || !window.location.hash) return null;
  const params = new URLSearchParams(window.location.hash.slice(1));
  const code = params.get("people-unlock");
  if (!code) return null;
  params.delete("people-unlock");
  const nextHash = params.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${nextHash ? `#${nextHash}` : ""}`);
  return code;
}

export function requestPeopleUnlock(): Promise<PeopleUnlockTicket> {
  return request<PeopleUnlockTicket>("/api/remote/unlock/request", null, jsonRequest({}));
}

export function pollPeopleUnlock(ticket: PeopleUnlockTicket): Promise<PeopleUnlockResult> {
  return request<PeopleUnlockResult>(
    `/api/remote/unlock/${encodeURIComponent(ticket.request_id)}/poll`,
    null,
    jsonRequest({ poll_token: ticket.poll_token }),
  );
}

export function exchangePeopleBootstrap(code: string): Promise<PeopleAccessGrant> {
  return request<PeopleAccessGrant>(
    "/api/remote/bootstrap/exchange",
    null,
    jsonRequest({ bootstrap_code: code }),
  );
}

export function revokePeopleAccess(token: string): Promise<void> {
  return request<unknown>("/api/remote/revoke", token, jsonRequest({})).then(() => undefined);
}

export async function loadPeopleSnapshot(token: string, days: 30 | 60 | 90): Promise<PeopleReadSnapshot> {
  const query = `days=${days}&channel=all&limit=240`;
  const dashboard = await request<PeopleDashboard>(`/api/v1/dashboard?${query}`, token);
  return { dashboard };
}

export function loadPersonContext(
  token: string,
  input: PersonContextRequest,
): Promise<PeoplePersonContext> {
  return request<PeoplePersonContext>(
    "/api/v1/person-context",
    token,
    jsonRequest({
      key: input.key,
      days: input.days,
      analyze: input.analyze,
      max_excerpts: input.max_excerpts ?? 8,
      max_chars: input.max_chars ?? 4_000,
    }),
  );
}
