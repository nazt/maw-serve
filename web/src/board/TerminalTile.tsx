import { FitAddon } from "@xterm/addon-fit";
import { Terminal, type ITheme } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { useEffect, useRef, useState } from "react";

import { apiFetch, apiUrlWithParams, API_ENDPOINTS } from "../clients/api";

export interface TerminalTileItem {
  id: string;
  kind: "terminal";
  x: number;
  y: number;
  w: number;
  h: number;
  zIndex?: number;
  data: {
    oracle: string;
    session: string;
    window: string;
  };
}

export interface TerminalTileProps {
  item: TerminalTileItem;
  onClose: (id: string) => void;
  pollIntervalMs?: number;
}

type ConnectionStatus = "connecting" | "live" | "reconnecting" | "polling" | "error";

const STREAM_LINES = 120;
const MAX_STREAM_FAILURES = 3;

function captureText(payload: unknown): string {
  if (typeof payload === "string") return payload;
  if (Array.isArray(payload)) return payload.map(captureText).join("\n");
  if (!payload || typeof payload !== "object") return String(payload ?? "");

  const record = payload as Record<string, unknown>;
  for (const key of ["text", "capture", "output", "content", "lines", "data"]) {
    if (key in record) return captureText(record[key]);
  }

  return JSON.stringify(payload, null, 2);
}

async function readCapture(response: Response): Promise<string> {
  if (!response.ok) throw new Error(`Capture returned HTTP ${response.status}`);

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (contentType.includes("json")) return captureText(await response.json());
  if (contentType.includes("text/html")) throw new Error("Capture endpoint is unavailable");
  return response.text();
}

function statusLabel(status: ConnectionStatus): string {
  if (status === "live") return "live";
  if (status === "reconnecting") return "reconnecting…";
  if (status === "polling") return "polling (fallback)";
  if (status === "error") return "error";
  return "connecting…";
}

function fleetTerminalTheme(): ITheme {
  const probe = document.createElement("span");
  probe.hidden = true;
  document.body.append(probe);
  const color = (value: string, fallback: string) => {
    probe.style.color = value;
    const resolved = getComputedStyle(probe).color;
    return resolved || fallback;
  };

  const theme: ITheme = {
    background: "#00000000",
    foreground: color("var(--ink-dim)", "#b5c5c9"),
    cursor: color("var(--active)", "#75d99a"),
    cursorAccent: color("var(--bg)", "#122126"),
    selectionBackground: color("oklch(var(--idle-channels) / 0.24)", "#39705d99"),
    black: color("var(--bg)", "#122126"),
    red: color("var(--error)", "#e26b68"),
    green: color("var(--active)", "#75d99a"),
    yellow: color("var(--pinned)", "#dab96d"),
    blue: color("var(--idle)", "#78b7cc"),
    magenta: color("oklch(0.72 0.13 315)", "#bd92ca"),
    cyan: color("oklch(0.79 0.11 195)", "#75ced0"),
    white: color("var(--ink-dim)", "#d8e3e7"),
    brightBlack: color("var(--stale)", "#60737a"),
    brightRed: color("oklch(0.78 0.17 25)", "#ff8b86"),
    brightGreen: color("oklch(0.91 0.15 155)", "#9af0b6"),
    brightYellow: color("oklch(0.9 0.12 75)", "#f0d28a"),
    brightBlue: color("oklch(0.86 0.1 210)", "#9ed7e8"),
    brightMagenta: color("oklch(0.82 0.12 315)", "#d7afe2"),
    brightCyan: color("oklch(0.88 0.1 195)", "#9ce8e8"),
    brightWhite: color("var(--ink)", "#f1f7f8"),
  };
  probe.remove();
  return theme;
}

function lineCount(text: string): number {
  return text.split("\n").length - 1;
}

function statusDot(status: ConnectionStatus): string {
  if (status === "live") return "bg-[var(--active)]";
  if (status === "reconnecting") return "bg-[var(--pinned)]";
  if (status === "error") return "bg-[var(--error)]";
  return "bg-[var(--stale)]";
}

export function TerminalTile({
  item,
  onClose,
  pollIntervalMs = 2_000,
}: TerminalTileProps) {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [newLineCount, setNewLineCount] = useState(0);
  const hostRef = useRef<HTMLDivElement>(null);
  const resumeFollowRef = useRef<() => void>(() => {});

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let eventSource: EventSource | null = null;
    let reconnectFailures = 0;
    let receivedStreamFrame = false;
    let pollingStarted = false;
    let pollTimer: number | null = null;
    let pollController: AbortController | null = null;
    let writeFrame: number | null = null;
    let following = true;
    let pausedSnapshot: string | null = null;
    let pendingWrites: Array<{ data: string; reset: boolean }> = [];

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const terminal = new Terminal({
      convertEol: true,
      cursorBlink: !reducedMotion.matches,
      fontFamily: 'ui-monospace, "JetBrains Mono", monospace',
      fontSize: 11,
      lineHeight: 1.25,
      minimumContrastRatio: 4.5,
      screenReaderMode: true,
      scrollback: 4_000,
      theme: fleetTerminalTheme(),
    });
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(host);

    const flushWrites = () => {
      writeFrame = null;
      if (disposed || pendingWrites.length === 0) return;

      let data = "";
      let reset = false;
      for (const pending of pendingWrites) {
        if (pending.reset) {
          data = "";
          reset = true;
        }
        data += pending.data;
      }
      pendingWrites = [];

      const incomingLines = lineCount(data);
      if (reset && !following) {
        pausedSnapshot = data;
        setNewLineCount((current) => current + Math.max(1, incomingLines));
        return;
      }
      if (!following && pausedSnapshot !== null) {
        pausedSnapshot += data;
        if (incomingLines > 0) setNewLineCount((current) => current + incomingLines);
        return;
      }

      const shouldFollow = following;
      if (reset) terminal.reset();
      terminal.write(data, () => {
        if (disposed) return;
        if (shouldFollow) {
          terminal.scrollToBottom();
          setNewLineCount(0);
        } else if (incomingLines > 0) {
          setNewLineCount((current) => current + incomingLines);
        }
      });
    };

    const queueWrite = (data: string, reset = false) => {
      pendingWrites.push({ data, reset });
      writeFrame ??= window.requestAnimationFrame(flushWrites);
    };

    const resumeFollowing = () => {
      following = true;
      setNewLineCount(0);
      if (pausedSnapshot !== null) {
        const snapshot = pausedSnapshot;
        pausedSnapshot = null;
        queueWrite(snapshot, true);
      } else {
        terminal.scrollToBottom();
      }
    };
    resumeFollowRef.current = resumeFollowing;

    const scrollDisposable = terminal.onScroll((position) => {
      const atBottom = position >= terminal.buffer.active.baseY;
      if (atBottom) {
        if (!following || pausedSnapshot !== null) resumeFollowing();
      } else {
        following = false;
      }
    });

    const fit = () => {
      if (disposed || host.clientWidth === 0 || host.clientHeight === 0) return;
      const shouldFollow = following;
      try {
        fitAddon.fit();
        if (shouldFollow) {
          window.requestAnimationFrame(() => {
            if (!disposed) terminal.scrollToBottom();
          });
        }
      } catch {
        // A resize can race the tile being removed from the canvas.
      }
    };
    const fitFrame = window.requestAnimationFrame(fit);
    const resizeObserver = new ResizeObserver(fit);
    resizeObserver.observe(host);

    const onMotionPreference = () => {
      terminal.options.cursorBlink = !reducedMotion.matches;
    };
    reducedMotion.addEventListener("change", onMotionPreference);

    const updateStatus = (next: ConnectionStatus, detail: string | null = null) => {
      if (disposed) return;
      setStatus(next);
      setError(detail);
    };

    const captureParams = () => new URLSearchParams({
      session: item.data.session,
      window: item.data.window,
      lines: String(STREAM_LINES),
    });

    const poll = () => {
      pollController?.abort();
      const controller = new AbortController();
      pollController = controller;

      void apiFetch(apiUrlWithParams(API_ENDPOINTS.capture, captureParams()), {
        signal: controller.signal,
        cache: "no-store",
        headers: { Accept: "application/json, text/plain;q=0.9" },
      }).then(readCapture).then((text) => {
        if (disposed || controller.signal.aborted) return;
        queueWrite(text || "(empty pane)", true);
        updateStatus("polling");
      }).catch((reason: unknown) => {
        if (disposed || controller.signal.aborted) return;
        updateStatus("error", reason instanceof Error ? reason.message : String(reason));
      });
    };

    const startPolling = () => {
      if (pollingStarted || disposed) return;
      pollingStarted = true;
      eventSource?.close();
      eventSource = null;
      updateStatus("polling");
      poll();
      pollTimer = window.setInterval(poll, Math.max(1_000, pollIntervalMs));
    };

    const startStream = () => {
      if (!("EventSource" in window)) {
        startPolling();
        return;
      }

      eventSource = new EventSource(apiUrlWithParams(API_ENDPOINTS.stream, captureParams()));
      eventSource.onopen = () => {
        if (receivedStreamFrame) updateStatus("live");
      };
      const receiveFrame = (event: MessageEvent<string>, reset: boolean) => {
        if (disposed) return;
        queueWrite(event.data, reset);
        receivedStreamFrame = true;
        reconnectFailures = 0;
        updateStatus("live");
      };
      eventSource.addEventListener("snapshot", (event) => {
        receiveFrame(event as MessageEvent<string>, true);
      });
      eventSource.onmessage = (event) => receiveFrame(event, false);
      eventSource.onerror = () => {
        if (disposed || pollingStarted) return;
        reconnectFailures += 1;
        updateStatus("reconnecting");
        if (reconnectFailures >= MAX_STREAM_FAILURES) startPolling();
      };
    };

    startStream();

    return () => {
      disposed = true;
      eventSource?.close();
      if (pollTimer !== null) window.clearInterval(pollTimer);
      pollController?.abort();
      window.cancelAnimationFrame(fitFrame);
      if (writeFrame !== null) window.cancelAnimationFrame(writeFrame);
      resizeObserver.disconnect();
      scrollDisposable.dispose();
      reducedMotion.removeEventListener("change", onMotionPreference);
      resumeFollowRef.current = () => {};
      terminal.dispose();
    };
  }, [item.data.session, item.data.window, pollIntervalMs]);

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-md bg-[oklch(0.115_0.018_220)] shadow-[0_0_0_1px_var(--line)]">
      <header className="flex h-9 shrink-0 items-center gap-2 border-b border-[var(--line)] bg-[oklch(0.17_0.02_220)] px-2.5 font-mono">
        <span className={`h-1.5 w-1.5 rounded-full ${statusDot(status)}`} aria-hidden="true" />
        <strong className="min-w-0 flex-1 truncate text-xs text-[var(--ink)]">
          {item.data.oracle}
        </strong>
        <span className="max-w-[45%] truncate text-[10px] text-[var(--ink-dim)]">
          {item.data.session}:{item.data.window}
        </span>
        <button
          type="button"
          className="grid h-6 w-6 shrink-0 place-items-center rounded text-base leading-none text-[var(--ink-dim)] transition-colors duration-150 hover:bg-[var(--surface-2)] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--idle)]"
          aria-label={`Close ${item.data.oracle} terminal`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => onClose(item.id)}
        >
          ×
        </button>
      </header>

      <div
        className="relative min-h-0 flex-1 overflow-hidden p-2"
        role="region"
        aria-label={`${item.data.oracle} live terminal`}
        onPointerDown={(event) => event.stopPropagation()}
        onWheel={(event) => event.stopPropagation()}
      >
        <div ref={hostRef} className="terminal-tile__viewport h-full" />
        {newLineCount > 0 ? (
          <button
            type="button"
            className="absolute bottom-2 right-3 rounded-full bg-[var(--idle)] px-2 py-1 font-mono text-[9px] font-bold text-[var(--bg)] shadow-[0_0_0_1px_var(--bg)] transition-colors duration-150 hover:bg-[var(--active)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ink)]"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={resumeFollowRef.current}
          >
            ↓ {newLineCount} new {newLineCount === 1 ? "line" : "lines"}
          </button>
        ) : null}
      </div>

      <footer
        className="shrink-0 border-t border-[var(--line)] px-2.5 py-1 font-mono text-[9px] tabular-nums text-[var(--ink-dim)]"
        aria-live="polite"
        title={error ?? undefined}
      >
        {status === "live" ? (
          <><span className="terminal-live-indicator" aria-hidden="true">●</span> {statusLabel(status)}</>
        ) : statusLabel(status)}
      </footer>
    </section>
  );
}

export default TerminalTile;
