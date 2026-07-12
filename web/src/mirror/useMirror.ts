import { useEffect, useRef, useState } from "react";

import { activeHost, apiFetch } from "../clients/api";
import { normalizeOracleHandle } from "../fleet/useFleet";
import { parsePulseRows, pulseKey, sanitizeSpaceReport } from "./model";
import type {
  MirrorConnection,
  MirrorReport,
  OraclePulse,
  OraclePulseMap,
} from "./types";

const MIRROR_RETRY_MS = 2_000;
const ARGUS_RETRY_MS = 2_000;
const ARGUS_PING_MS = 45_000;
const CLOUD_MIRROR_WS = "wss://display.buildwithoracle.com/ws";
const DEFAULT_ARGUS_WS = "wss://argus.buildwithoracle.com/api/ws";

function queryValue(name: string): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get(name)?.trim() ?? "";
}

function asWebSocketUrl(value: string): string {
  const url = new URL(value.includes("://") ? value : `ws://${value}`);
  if (url.protocol === "http:") url.protocol = "ws:";
  if (url.protocol === "https:") url.protocol = "wss:";
  if (url.pathname === "/") url.pathname = "/ws";
  return url.toString();
}

export function resolveMirrorWebSocket(): string {
  const override = queryValue("mirror");
  if (override) return asWebSocketUrl(override);

  const base = new URL(
    activeHost || (typeof window === "undefined" ? "http://127.0.0.1" : window.location.origin),
  );
  base.protocol = base.protocol === "https:" ? "wss:" : "ws:";
  base.port = "8899";
  base.pathname = "/ws";
  base.search = "";
  base.hash = "";
  return base.toString();
}

export function decodeSpacesFrame(value: unknown): MirrorReport | null {
  if (!value || typeof value !== "object") return null;
  const frame = value as { type?: unknown; data?: unknown };
  const eventFrame = frame as { event?: unknown };
  if (frame.type !== "spaces" && eventFrame.event !== "spaces") return null;
  return sanitizeSpaceReport(frame.data);
}

export interface MirrorFeed {
  report: MirrorReport | null;
  connection: MirrorConnection;
  error: Error | null;
}

export function useMirrorReport(): MirrorFeed {
  const [report, setReport] = useState<MirrorReport | null>(null);
  const [connection, setConnection] = useState<MirrorConnection>("connecting");
  const [error, setError] = useState<Error | null>(null);
  const reportRef = useRef<MirrorReport | null>(null);

  useEffect(() => {
    let stopped = false;
    let primary: WebSocket | null = null;
    let cloud: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let restTimer: number | null = null;
    let restBusy = false;
    let allowCloud = false;
    let currentConnection: MirrorConnection = "connecting";

    const publish = (next: MirrorReport, source: MirrorConnection) => {
      if (stopped) return;
      reportRef.current = next;
      currentConnection = source;
      setReport(next);
      setConnection(source);
      setError(null);
      if (source === "ws" || source === "rest") allowCloud = false;
    };

    const connectCloud = () => {
      if (stopped || cloud || resolveMirrorWebSocket() === CLOUD_MIRROR_WS) return;
      try {
        cloud = new WebSocket(CLOUD_MIRROR_WS);
        cloud.addEventListener("message", (event) => {
          if (!allowCloud || stopped) return;
          try {
            const next = decodeSpacesFrame(JSON.parse(String(event.data)));
            if (next) publish(next, "cloud");
          } catch {
            // A malformed frame is ignored; the socket remains usable.
          }
        });
        cloud.addEventListener("close", () => {
          cloud = null;
        });
        cloud.addEventListener("error", () => cloud?.close());
      } catch {
        cloud = null;
      }
    };

    const pollRest = async () => {
      if (stopped || restBusy) return;
      restBusy = true;
      try {
        const response = await apiFetch("/api/spaces", { cache: "no-store" });
        if (!response.ok) throw new Error(`mirror REST ${response.status}`);
        publish(sanitizeSpaceReport(await response.json()), "rest");
        cloud?.close();
        cloud = null;
      } catch (cause) {
        const nextError = cause instanceof Error ? cause : new Error("mirror REST unavailable");
        setError(nextError);
        allowCloud = true;
        setConnection("offline");
        connectCloud();
      } finally {
        restBusy = false;
      }
    };

    const startRest = () => {
      if (restTimer !== null) return;
      void pollRest();
      restTimer = window.setInterval(() => void pollRest(), MIRROR_RETRY_MS);
    };

    const connectPrimary = () => {
      if (stopped) return;
      try {
        primary = new WebSocket(resolveMirrorWebSocket());
        primary.addEventListener("message", (event) => {
          try {
            const next = decodeSpacesFrame(JSON.parse(String(event.data)));
            if (!next) return;
            if (restTimer !== null) window.clearInterval(restTimer);
            restTimer = null;
            cloud?.close();
            cloud = null;
            publish(next, "ws");
          } catch {
            // Ignore non-space/malformed frames without poisoning the feed.
          }
        });
        const retry = () => {
          if (stopped) return;
          primary = null;
          if (currentConnection !== "rest" && currentConnection !== "cloud") {
            currentConnection = "connecting";
            setConnection("connecting");
          }
          startRest();
          if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
          reconnectTimer = window.setTimeout(connectPrimary, MIRROR_RETRY_MS);
        };
        primary.addEventListener("close", retry, { once: true });
        primary.addEventListener("error", () => primary?.close(), { once: true });
      } catch {
        startRest();
        reconnectTimer = window.setTimeout(connectPrimary, MIRROR_RETRY_MS);
      }
    };

    // Prime from the snapshot endpoint immediately; the first WS spaces event
    // then becomes authoritative and stops polling until the socket drops.
    startRest();
    connectPrimary();
    return () => {
      stopped = true;
      primary?.close();
      cloud?.close();
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
      if (restTimer !== null) window.clearInterval(restTimer);
    };
  }, []);

  return { report, connection, error };
}

export interface PulseFeed {
  pulses: OraclePulseMap;
  connected: boolean;
}

export function useOraclePulse(): PulseFeed {
  const [pulses, setPulses] = useState<OraclePulseMap>(() => new Map());
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let stopped = false;
    let socket: WebSocket | null = null;
    let retryTimer: number | null = null;
    let pingTimer: number | null = null;

    const connect = () => {
      if (stopped) return;
      try {
        socket = new WebSocket(queryValue("argus") || DEFAULT_ARGUS_WS);
        socket.addEventListener("open", () => {
          setConnected(true);
          pingTimer = window.setInterval(() => {
            if (socket?.readyState === WebSocket.OPEN) socket.send("ping");
          }, ARGUS_PING_MS);
        });
        socket.addEventListener("message", (event) => {
          try {
            const frame = JSON.parse(String(event.data)) as { type?: unknown; at?: unknown; rows?: unknown };
            if (frame.type !== "ingest") return;
            const rows = parsePulseRows(frame.rows, Number(frame.at) || Date.now());
            if (rows.length === 0) return;
            setPulses((current) => {
              const next = new Map(current);
              for (const row of rows) next.set(pulseKey(row.machine, row.oracle), row);
              return next;
            });
          } catch {
            // Ignore malformed/status frames.
          }
        });
        const retry = () => {
          if (pingTimer !== null) window.clearInterval(pingTimer);
          pingTimer = null;
          socket = null;
          setConnected(false);
          if (!stopped) retryTimer = window.setTimeout(connect, ARGUS_RETRY_MS);
        };
        socket.addEventListener("close", retry, { once: true });
        socket.addEventListener("error", () => socket?.close(), { once: true });
      } catch {
        retryTimer = window.setTimeout(connect, ARGUS_RETRY_MS);
      }
    };

    connect();
    return () => {
      stopped = true;
      socket?.close();
      if (retryTimer !== null) window.clearTimeout(retryTimer);
      if (pingTimer !== null) window.clearInterval(pingTimer);
    };
  }, []);

  return { pulses, connected };
}

export function useMirrorOracleModels(): ReadonlyMap<string, string> {
  const [models, setModels] = useState<ReadonlyMap<string, string>>(() => new Map());

  useEffect(() => {
    let stopped = false;
    let busy = false;
    const poll = async () => {
      if (stopped || busy) return;
      busy = true;
      try {
        const response = await apiFetch("/api/oracles", { cache: "no-store" });
        if (!response.ok) return;
        const payload = await response.json() as { oracles?: unknown };
        if (!Array.isArray(payload.oracles)) return;
        const next = new Map<string, string>();
        for (const entry of payload.oracles) {
          if (!entry || typeof entry !== "object") continue;
          const row = entry as { oracle?: unknown; model?: unknown };
          const oracle = normalizeOracleHandle(row.oracle);
          const model = typeof row.model === "string" ? row.model.trim() : "";
          if (oracle && model && model.toLowerCase() !== "unknown") next.set(oracle, model);
        }
        if (!stopped) setModels(next);
      } finally {
        busy = false;
      }
    };
    void poll();
    const interval = window.setInterval(() => void poll(), 12_000);
    return () => {
      stopped = true;
      window.clearInterval(interval);
    };
  }, []);

  return models;
}

export function newestPulseForOracle(
  pulses: OraclePulseMap,
  oracle: string,
): OraclePulse | null {
  let newest: OraclePulse | null = null;
  const suffix = `|${normalizeOracleHandle(oracle)}`;
  for (const [key, pulse] of pulses) {
    if (key.endsWith(suffix) && (!newest || pulse.at > newest.at)) newest = pulse;
  }
  return newest;
}
