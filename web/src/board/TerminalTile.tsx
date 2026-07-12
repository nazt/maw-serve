import { FitAddon } from "@xterm/addon-fit";
import { Terminal, type ITheme } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { useEffect, useRef, useState } from "react";

import { apiFetch, apiUrlWithParams, API_ENDPOINTS } from "../clients/api";
import type { Theme } from "../theme";
import {
  requestLease,
  STREAM_PRIORITY,
  type StreamLeaseLane,
  type StreamLeaseMode,
} from "./streamLease";
import {
  DEFAULT_TERMINAL_ZOOM,
  MAX_TERMINAL_ZOOM,
  MIN_TERMINAL_ZOOM,
  TERMINAL_LINE_HEIGHT_RATIO,
  TERMINAL_TILE_MAX_VIEWPORT_HEIGHT_RATIO,
  TERMINAL_TILE_MAX_VIEWPORT_WIDTH_RATIO,
  parseTerminalMeta,
  parseTerminalZoom,
  stepTerminalZoom,
  terminalDisplayGrid,
  terminalTileSize,
  type TerminalCellMetrics,
  type TerminalSourceDimensions,
} from "./terminalSizing";
import {
  terminalHealth,
  type TerminalConnectionState,
  type TerminalConnectionStatus,
} from "./terminalHealth";

export interface TerminalTileItem {
  id: string;
  kind: "terminal";
  x: number;
  y: number;
  w: number;
  h: number;
  zIndex?: number;
  groupId?: string;
  streamEligible?: boolean;
  streamPriority?: number;
  data: {
    oracle: string;
    session: string;
    window: string;
    model?: string;
  };
}

export interface TerminalTileProps {
  item: TerminalTileItem;
  onClose?: (id: string) => void;
  theme: Theme;
  pollIntervalMs?: number;
  onTransportModeChange?: (id: string, mode: StreamLeaseMode) => void;
  onConnectionStateChange?: (id: string, state: TerminalConnectionState | null) => void;
  onSourceSize?: (id: string, size: { w: number; h: number }) => void;
  streamEligible?: boolean;
  streamLane?: StreamLeaseLane;
  streamPriority?: number;
}

const STREAM_LINES = 120;
const MAX_STREAM_FAILURES = 3;
export const STREAM_FIRST_FRAME_TIMEOUT_MS = 5_000;
const RESIZE_SETTLE_MS = 150;
const TERMINAL_ZOOM_STORAGE_PREFIX = "stoa.terminal-zoom.v1:";

function terminalZoomStorageKey(itemId: string): string {
  return `${TERMINAL_ZOOM_STORAGE_PREFIX}${encodeURIComponent(itemId)}`;
}

function loadTerminalZoom(itemId: string): number {
  try {
    return parseTerminalZoom(window.localStorage.getItem(terminalZoomStorageKey(itemId)));
  } catch {
    return DEFAULT_TERMINAL_ZOOM;
  }
}

function saveTerminalZoom(itemId: string, zoomFactor: number): void {
  try {
    window.localStorage.setItem(terminalZoomStorageKey(itemId), String(zoomFactor));
  } catch {
    // A blocked storage write should not affect the live terminal.
  }
}

export const CAPTURE_CACHE_MS = 2_000;

const captureCache = new Map<string, { at: number; promise: Promise<string> }>();

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

function cachedCapture(url: string): Promise<string> {
  const now = Date.now();
  const existing = captureCache.get(url);
  if (existing && now - existing.at < CAPTURE_CACHE_MS) return existing.promise;

  const promise = apiFetch(url, {
    cache: "no-store",
    headers: { Accept: "application/json, text/plain;q=0.9" },
  }).then(readCapture).catch((reason) => {
    captureCache.delete(url);
    throw reason;
  });
  captureCache.set(url, { at: now, promise });
  return promise;
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
    foreground: color("var(--ink-dim)", "#b8b8b8"),
    cursor: color("var(--active)", "#75d99a"),
    cursorAccent: color("var(--terminal-surface)", "#122126"),
    selectionBackground: color("oklch(var(--idle-channels) / 0.24)", "#39705d99"),
    black: color("var(--terminal-ansi-black)", "#122126"),
    red: color("var(--error)", "#e26b68"),
    green: color("var(--active)", "#75d99a"),
    yellow: color("var(--pinned)", "#dab96d"),
    blue: color("var(--idle)", "#78b7cc"),
    magenta: color("oklch(0.72 0.13 315)", "#bd92ca"),
    cyan: color("oklch(0.79 0.11 195)", "#75ced0"),
    white: color("var(--terminal-ansi-white)", "#b8b8b8"),
    brightBlack: color("var(--stale)", "#60737a"),
    brightRed: color("oklch(0.78 0.17 25)", "#ff8b86"),
    brightGreen: color("oklch(0.91 0.15 155)", "#9af0b6"),
    brightYellow: color("oklch(0.9 0.12 75)", "#f0d28a"),
    brightBlue: color("oklch(0.86 0.1 210)", "#9ed7e8"),
    brightMagenta: color("oklch(0.82 0.12 315)", "#d7afe2"),
    brightCyan: color("oklch(0.88 0.1 195)", "#9ce8e8"),
    brightWhite: color("var(--terminal-ansi-bright-white)", "#f4f4f4"),
  };
  probe.remove();
  return theme;
}

function renderedCellMetrics(terminal: Terminal): TerminalCellMetrics | null {
  const screen = terminal.element?.querySelector<HTMLElement>(".xterm-screen");
  const screenWidth = Number.parseFloat(screen?.style.width ?? "");
  const screenHeight = Number.parseFloat(screen?.style.height ?? "");
  const fontSize = terminal.options.fontSize ?? 0;
  if (
    !screen ||
    !Number.isFinite(screenWidth) ||
    screenWidth <= 0 ||
    !Number.isFinite(screenHeight) ||
    screenHeight <= 0 ||
    !Number.isFinite(fontSize) ||
    fontSize <= 0 ||
    terminal.cols <= 0 ||
    terminal.rows <= 0
  ) {
    return null;
  }
  return {
    width: screenWidth / terminal.cols,
    height: screenHeight / terminal.rows,
    fontSize,
  };
}

function lineCount(text: string): number {
  return text.split("\n").length - 1;
}

function statusDot(status: TerminalConnectionStatus): string {
  if (status === "live") return "bg-[var(--active)]";
  if (status === "reconnecting") return "bg-[var(--pinned)]";
  if (status === "error") return "bg-[var(--error)]";
  return "bg-[var(--stale)]";
}

export function TerminalTile({
  item,
  onClose,
  theme,
  pollIntervalMs = 2_000,
  onTransportModeChange,
  onConnectionStateChange,
  onSourceSize,
  streamEligible = true,
  streamLane = "working",
  streamPriority = STREAM_PRIORITY.normal,
}: TerminalTileProps) {
  const [status, setStatus] = useState<TerminalConnectionStatus>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [retryEpoch, setRetryEpoch] = useState(0);
  const [newLineCount, setNewLineCount] = useState(0);
  const [selectMode, setSelectMode] = useState(false);
  const [temporarySelect, setTemporarySelect] = useState(false);
  const [zoomFactor, setZoomFactor] = useState(() => loadTerminalZoom(item.id));
  const [transportMode, setTransportMode] = useState<StreamLeaseMode>("poll");
  const frameRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const onSourceSizeRef = useRef(onSourceSize);
  const onConnectionStateChangeRef = useRef(onConnectionStateChange);
  const autoSizedSourceRef = useRef("");
  const zoomFactorRef = useRef(zoomFactor);
  const resizeTerminalRef = useRef<() => void>(() => {});
  const resumeFollowRef = useRef<() => void>(() => {});
  const selecting = selectMode || temporarySelect;
  const zoomPercent = Math.round(zoomFactor * 100);
  const health = terminalHealth(status, error);
  onSourceSizeRef.current = onSourceSize;
  onConnectionStateChangeRef.current = onConnectionStateChange;

  useEffect(() => {
    onTransportModeChange?.(item.id, transportMode);
  }, [item.id, onTransportModeChange, transportMode]);

  useEffect(() => {
    onConnectionStateChangeRef.current?.(item.id, {
      status,
      degraded: health.degraded,
    });
  }, [health.degraded, item.id, status]);

  useEffect(() => () => {
    onConnectionStateChangeRef.current?.(item.id, null);
  }, [item.id]);

  useEffect(() => {
    if (!streamEligible) {
      setTransportMode("poll");
      return;
    }

    const lease = requestLease(`${item.data.session}:${item.data.window}`, {
      priority: streamPriority,
      lane: streamLane,
    });
    const syncMode = (mode = lease.mode) => setTransportMode(mode);
    const unsubscribe = lease.subscribe(syncMode);
    syncMode();

    const frame = frameRef.current;
    const markHot = () => lease.touch();
    frame?.addEventListener("pointerdown", markHot);
    frame?.addEventListener("focusin", markHot);

    let observer: IntersectionObserver | null = null;
    if (frame && typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(([entry]) => {
        lease.setVisible(Boolean(entry?.isIntersecting && entry.intersectionRatio > 0));
      });
      observer.observe(frame);
    }

    return () => {
      observer?.disconnect();
      frame?.removeEventListener("pointerdown", markHot);
      frame?.removeEventListener("focusin", markHot);
      unsubscribe();
      lease.release();
    };
  }, [
    item.data.session,
    item.data.window,
    streamEligible,
    streamLane,
    streamPriority,
  ]);

  useEffect(() => {
    const stopTemporarySelect = () => setTemporarySelect(false);
    const startTemporarySelect = (event: KeyboardEvent) => {
      if (event.key === "Alt") setTemporarySelect(true);
    };
    const stopOnAltRelease = (event: KeyboardEvent) => {
      if (event.key === "Alt") stopTemporarySelect();
    };
    window.addEventListener("keydown", startTemporarySelect);
    window.addEventListener("keyup", stopOnAltRelease);
    window.addEventListener("pointercancel", stopTemporarySelect);
    window.addEventListener("blur", stopTemporarySelect);
    return () => {
      window.removeEventListener("keydown", startTemporarySelect);
      window.removeEventListener("keyup", stopOnAltRelease);
      window.removeEventListener("pointercancel", stopTemporarySelect);
      window.removeEventListener("blur", stopTemporarySelect);
    };
  }, []);

  useEffect(() => {
    const exitOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || (!selectMode && !temporarySelect)) return;
      setSelectMode(false);
      setTemporarySelect(false);
      terminalRef.current?.clearSelection();
    };
    window.addEventListener("keydown", exitOnEscape);
    return () => window.removeEventListener("keydown", exitOnEscape);
  }, [selectMode, temporarySelect]);

  useEffect(() => {
    const frame = frameRef.current;
    const host = hostRef.current;
    if (!frame || !host) return;

    let disposed = false;
    let eventSource: EventSource | null = null;
    let reconnectFailures = 0;
    let receivedStreamFrame = false;
    let pollingStarted = false;
    let pollTimer: number | null = null;
    let writeFrame: number | null = null;
    let resizeFrame: number | null = null;
    let resizeSettleTimer: number | null = null;
    let firstFrameTimer: number | null = null;
    let following = true;
    let pausedSnapshot: string | null = null;
    let pendingWrites: Array<{ data: string; reset: boolean }> = [];
    let sourceDimensions: TerminalSourceDimensions | null = null;
    let settledFrameSize: { width: number; height: number } | null = null;
    let lastGrid: { cols: number; rows: number; fontSize: number; width: number } | null = null;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const terminal = new Terminal({
      convertEol: true,
      cursorBlink: !reducedMotion.matches,
      fontFamily: 'ui-monospace, "JetBrains Mono", monospace',
      fontSize: 11,
      lineHeight: TERMINAL_LINE_HEIGHT_RATIO,
      minimumContrastRatio: 4.5,
      screenReaderMode: true,
      scrollback: 4_000,
      theme: fleetTerminalTheme(),
    });
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(host);
    // Screen-reader rows are intentionally wider than the rendered grid in
    // xterm. Keep that invisible layer from creating a false horizontal range;
    // the scroll frame should grow only when terminal zoom expands the host.
    const accessibilityLayer = host.querySelector<HTMLElement>(".xterm-accessibility");
    if (accessibilityLayer) accessibilityLayer.style.overflow = "hidden";
    terminalRef.current = terminal;

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

    const setHostStyle = (property: "width" | "height" | "transform" | "transformOrigin", value: string) => {
      if (host.style[property] !== value) host.style[property] = value;
    };
    const setHostData = (key: string, value: string | null) => {
      if (value === null) {
        if (key in host.dataset) delete host.dataset[key];
        return;
      }
      if (host.dataset[key] !== value) host.dataset[key] = value;
    };
    const ownTile = frame.closest<HTMLElement>(".tile");
    const groupTile = item.groupId
      ? Array.from(document.querySelectorAll<HTMLElement>(".tile")).find(
          (candidate) => candidate.dataset.tileId === item.groupId,
        ) ?? null
      : null;
    const resizeTargets = [ownTile, groupTile].filter(
      (candidate): candidate is HTMLElement => Boolean(candidate),
    );
    const activeResizeGesture = () => resizeTargets.some(
      (candidate) => candidate.dataset.resizing === "true",
    );
    const cancelResizeSchedule = () => {
      if (resizeSettleTimer !== null) window.clearTimeout(resizeSettleTimer);
      resizeSettleTimer = null;
      if (resizeFrame !== null) window.cancelAnimationFrame(resizeFrame);
      resizeFrame = null;
    };
    const notifyReadableSourceSize = (cellMetrics: TerminalCellMetrics) => {
      if (!sourceDimensions) return;
      const key = `${sourceDimensions.cols}x${sourceDimensions.rows}`;
      if (key === autoSizedSourceRef.current) return;
      autoSizedSourceRef.current = key;
      const tileWidth = ownTile?.clientWidth ?? item.w;
      const tileHeight = ownTile?.clientHeight ?? item.h;
      const chromeWidth = Math.max(0, tileWidth - frame.clientWidth);
      const chromeHeight = Math.max(0, tileHeight - frame.clientHeight);
      const renderedWidth = ownTile?.getBoundingClientRect().width ?? tileWidth;
      const canvasScale = Math.max(0.01, renderedWidth / Math.max(1, tileWidth));
      const recommended = terminalTileSize(
        sourceDimensions,
        cellMetrics,
        chromeWidth,
        chromeHeight,
        window.innerWidth * TERMINAL_TILE_MAX_VIEWPORT_WIDTH_RATIO / canvasScale,
        window.innerHeight * TERMINAL_TILE_MAX_VIEWPORT_HEIGHT_RATIO / canvasScale,
      );
      onSourceSizeRef.current?.(item.id, { w: recommended.w, h: recommended.h });
    };
    const performRegrid = () => {
      resizeFrame = null;
      if (resizeSettleTimer !== null) window.clearTimeout(resizeSettleTimer);
      resizeSettleTimer = null;
      if (disposed || frame.clientWidth === 0 || frame.clientHeight === 0) return;

      setHostStyle("transform", "");
      setHostStyle("transformOrigin", "");
      setHostStyle("height", "");
      setHostData("resizePreview", null);
      const shouldFollow = following;
      let changed = false;
      try {
        if (sourceDimensions) {
          const cellMetrics = renderedCellMetrics(terminal);
          if (!cellMetrics) {
            fitAddon.fit();
            changed = true;
          } else {
            notifyReadableSourceSize(cellMetrics);
            const viewport = host.querySelector<HTMLElement>(".xterm-viewport");
            const scrollbarWidth = viewport
              ? Math.max(0, host.clientWidth - viewport.clientWidth)
              : 0;
            const fitWidth = Math.max(1, frame.clientWidth - scrollbarWidth);
            const grid = terminalDisplayGrid(
              fitWidth,
              frame.clientHeight,
              sourceDimensions.cols,
              cellMetrics,
              zoomFactorRef.current,
            );
            const renderedGridWidth = Math.ceil(
              grid.cols * cellMetrics.width * grid.fontSize / cellMetrics.fontSize + scrollbarWidth,
            );
            const hostWidth = Math.max(frame.clientWidth, renderedGridWidth);
            const widthStyle = `${hostWidth}px`;
            setHostStyle("width", widthStyle);
            setHostData("sourceCols", String(sourceDimensions.cols));
            setHostData("sourceRows", String(sourceDimensions.rows));
            setHostData("terminalFontSize", String(grid.fontSize));
            setHostData("terminalZoom", String(zoomFactorRef.current));
            setHostData("measuredCellWidth", String(cellMetrics.width));
            setHostData("measuredCellHeight", String(cellMetrics.height));
            setHostData("displayRows", String(grid.rows));

            const fontChanged = Math.abs((terminal.options.fontSize ?? 0) - grid.fontSize) > 0.05;
            const gridChanged = terminal.cols !== grid.cols || terminal.rows !== grid.rows;
            const widthChanged = lastGrid?.width !== hostWidth;
            if (fontChanged) terminal.options.fontSize = grid.fontSize;
            if (gridChanged) terminal.resize(grid.cols, grid.rows);
            changed = fontChanged || gridChanged || widthChanged;
            lastGrid = { ...grid, width: hostWidth };
          }
        } else {
          const proposed = fitAddon.proposeDimensions();
          if (proposed && (terminal.cols !== proposed.cols || terminal.rows !== proposed.rows)) {
            terminal.resize(proposed.cols, proposed.rows);
            changed = true;
          }
        }
        settledFrameSize = { width: frame.clientWidth, height: frame.clientHeight };
        if (changed) {
          const count = Number(host.dataset.regridCount ?? 0) + 1;
          setHostData("regridCount", String(count));
        }
        if (changed && shouldFollow) {
          window.requestAnimationFrame(() => {
            if (!disposed) terminal.scrollToBottom();
          });
        }
      } catch {
        // A resize can race the tile being removed from the canvas.
      }
    };
    const scheduleRegrid = (delay = RESIZE_SETTLE_MS) => {
      if (disposed) return;
      if (resizeSettleTimer !== null) window.clearTimeout(resizeSettleTimer);
      resizeSettleTimer = window.setTimeout(() => {
        resizeSettleTimer = null;
        if (activeResizeGesture()) return;
        if (resizeFrame !== null) window.cancelAnimationFrame(resizeFrame);
        resizeFrame = window.requestAnimationFrame(performRegrid);
      }, delay);
    };
    const previewResize = () => {
      if (!settledFrameSize || settledFrameSize.width <= 0 || settledFrameSize.height <= 0) {
        scheduleRegrid(0);
        return;
      }
      const width = frame.clientWidth;
      const height = frame.clientHeight;
      if (width === settledFrameSize.width && height === settledFrameSize.height) return;
      setHostStyle("height", `${settledFrameSize.height}px`);
      setHostStyle("transformOrigin", "top left");
      setHostStyle(
        "transform",
        `scale(${width / settledFrameSize.width}, ${height / settledFrameSize.height})`,
      );
      setHostData("resizePreview", "true");
    };
    resizeTerminalRef.current = () => scheduleRegrid(0);
    const fitFrame = window.requestAnimationFrame(performRegrid);
    const resizeObserver = new ResizeObserver(() => {
      previewResize();
      if (!activeResizeGesture()) scheduleRegrid();
    });
    resizeObserver.observe(frame);
    const resizeMutationObserver = new MutationObserver(() => {
      if (activeResizeGesture()) previewResize();
      else scheduleRegrid(0);
    });
    for (const target of resizeTargets) {
      resizeMutationObserver.observe(target, { attributes: true, attributeFilter: ["data-resizing"] });
    }

    const onMotionPreference = () => {
      terminal.options.cursorBlink = !reducedMotion.matches;
    };
    reducedMotion.addEventListener("change", onMotionPreference);

    const updateStatus = (next: TerminalConnectionStatus, detail: string | null = null) => {
      if (disposed) return;
      setStatus(next);
      setError(detail);
    };

    const captureParams = () => new URLSearchParams({
      session: item.data.session,
      window: item.data.window,
      lines: String(STREAM_LINES),
    });

    let pollingDetail: string | null = null;
    const poll = () => {
      const url = apiUrlWithParams(API_ENDPOINTS.capture, captureParams());
      void cachedCapture(url).then((text) => {
        if (disposed) return;
        queueWrite(text || "(empty pane)", true);
        updateStatus("polling", pollingDetail);
      }).catch(() => {
        if (disposed) return;
        updateStatus("error", "Terminal snapshots unavailable");
      });
    };

    const startPolling = (detail: string | null = null) => {
      if (pollingStarted || disposed) return;
      pollingStarted = true;
      pollingDetail = detail;
      if (firstFrameTimer !== null) window.clearTimeout(firstFrameTimer);
      firstFrameTimer = null;
      eventSource?.close();
      eventSource = null;
      updateStatus("polling", pollingDetail);
      poll();
      pollTimer = window.setInterval(poll, Math.max(1_000, pollIntervalMs));
    };

    const startStream = () => {
      if (!("EventSource" in window)) {
        startPolling();
        return;
      }

      eventSource = new EventSource(apiUrlWithParams(API_ENDPOINTS.stream, captureParams()));
      firstFrameTimer = window.setTimeout(() => {
        firstFrameTimer = null;
        if (disposed || pollingStarted || receivedStreamFrame) return;
        reconnectFailures += 1;
        startPolling("Live stream unavailable; using snapshots");
      }, STREAM_FIRST_FRAME_TIMEOUT_MS);
      eventSource.onopen = () => {
        if (receivedStreamFrame) updateStatus("live");
      };
      const markStreamFrame = () => {
        receivedStreamFrame = true;
        reconnectFailures = 0;
        if (firstFrameTimer !== null) window.clearTimeout(firstFrameTimer);
        firstFrameTimer = null;
      };
      const receiveFrame = (event: MessageEvent<string>, reset: boolean) => {
        if (disposed) return;
        queueWrite(event.data, reset);
        markStreamFrame();
        updateStatus("live");
      };
      eventSource.addEventListener("snapshot", (event) => {
        receiveFrame(event as MessageEvent<string>, true);
      });
      eventSource.addEventListener("meta", (event) => {
        const dimensions = parseTerminalMeta((event as MessageEvent<string>).data);
        if (!dimensions) return;
        markStreamFrame();
        sourceDimensions = dimensions;
        scheduleRegrid(0);
      });
      eventSource.onmessage = (event) => receiveFrame(event, false);
      eventSource.onerror = () => {
        if (disposed || pollingStarted) return;
        reconnectFailures += 1;
        if (eventSource?.readyState === EventSource.CLOSED) {
          startPolling("Live stream unavailable; using snapshots");
          return;
        }
        updateStatus("reconnecting", "Live stream interrupted; reconnecting");
        if (reconnectFailures >= MAX_STREAM_FAILURES) {
          startPolling("Live stream unavailable; using snapshots");
        }
      };
    };

    if (transportMode === "poll") startPolling();
    else startStream();

    return () => {
      disposed = true;
      eventSource?.close();
      if (pollTimer !== null) window.clearInterval(pollTimer);
      if (firstFrameTimer !== null) window.clearTimeout(firstFrameTimer);
      window.cancelAnimationFrame(fitFrame);
      if (writeFrame !== null) window.cancelAnimationFrame(writeFrame);
      cancelResizeSchedule();
      resizeObserver.disconnect();
      resizeMutationObserver.disconnect();
      scrollDisposable.dispose();
      reducedMotion.removeEventListener("change", onMotionPreference);
      resumeFollowRef.current = () => {};
      resizeTerminalRef.current = () => {};
      if (terminalRef.current === terminal) terminalRef.current = null;
      terminal.dispose();
    };
  }, [item.data.session, item.data.window, pollIntervalMs, retryEpoch, transportMode]);

  useEffect(() => {
    zoomFactorRef.current = zoomFactor;
    saveTerminalZoom(item.id, zoomFactor);
    resizeTerminalRef.current();
  }, [item.id, zoomFactor]);

  useEffect(() => {
    if (terminalRef.current) terminalRef.current.options.theme = fleetTerminalTheme();
  }, [theme]);

  return (
    <section
      className={`flex h-full flex-col overflow-hidden rounded-md bg-[var(--terminal-surface)] shadow-[0_0_0_1px_var(--line)] ${
        selectMode ? "ring-1 ring-inset ring-[var(--idle)]" : ""
      }`}
      data-terminal-select-mode={selectMode ? "select" : "view"}
      data-terminal-mode={transportMode}
      data-terminal-status={status}
      data-terminal-degraded={health.degraded || undefined}
    >
      <header className="flex h-9 shrink-0 items-center gap-2 border-b border-[var(--line)] bg-[var(--terminal-header)] px-2.5 font-mono">
        <span className={`h-1.5 w-1.5 rounded-full ${statusDot(status)}`} aria-hidden="true" />
        <strong className="min-w-0 flex-1 truncate text-xs text-[var(--ink)]">
          {item.data.oracle}
        </strong>
        {item.data.model ? (
          <span className="shrink-0 rounded-sm bg-[var(--surface-2)] px-1 py-0.5 text-[9px] text-[var(--ink-dim)]">
            {item.data.model}
          </span>
        ) : null}
        <span className="max-w-[45%] truncate text-[10px] text-[var(--ink-dim)]">
          {item.data.session}:{item.data.window}
        </span>
        {health.degraded ? (
          <span className="shrink-0 rounded border border-[var(--error)] px-1 py-0.5 text-[9px] font-bold text-[var(--error)]">
            degraded
          </span>
        ) : null}
        <span
          className="flex h-5 shrink-0 items-stretch overflow-hidden rounded border border-[var(--line)] bg-[var(--terminal-surface)]"
          role="group"
          aria-label={`${item.data.oracle} terminal zoom`}
        >
          <button
            type="button"
            className="grid w-5 place-items-center text-xs text-[var(--ink-dim)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)] focus-visible:z-10 focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--idle)] disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Zoom out terminal"
            title="Zoom out terminal"
            disabled={zoomFactor <= MIN_TERMINAL_ZOOM}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => setZoomFactor((current) => stepTerminalZoom(current, -1))}
          >
            −
          </button>
          <button
            type="button"
            className="min-w-10 border-x border-[var(--line)] px-1 text-[9px] font-semibold text-[var(--ink-dim)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)] focus-visible:z-10 focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--idle)]"
            aria-label={`Reset terminal zoom to fit width, currently ${zoomPercent}%`}
            title="Fit terminal width"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => setZoomFactor(DEFAULT_TERMINAL_ZOOM)}
          >
            {zoomPercent}%
          </button>
          <button
            type="button"
            className="grid w-5 place-items-center text-xs text-[var(--ink-dim)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)] focus-visible:z-10 focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--idle)] disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Zoom in terminal"
            title="Zoom in terminal"
            disabled={zoomFactor >= MAX_TERMINAL_ZOOM}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => setZoomFactor((current) => stepTerminalZoom(current, 1))}
          >
            +
          </button>
        </span>
        <button
          type="button"
          className={`grid h-6 w-6 shrink-0 place-items-center rounded border text-sm leading-none transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--idle)] ${
            selectMode
              ? "border-[var(--idle)] bg-[var(--surface-2)] text-[var(--ink)]"
              : "border-transparent text-[var(--ink-dim)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
          }`}
          aria-label="select text"
          aria-pressed={selectMode}
          title="select text"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => {
            setTemporarySelect(false);
            setSelectMode((current) => {
              if (current) terminalRef.current?.clearSelection();
              return !current;
            });
          }}
        >
          <span aria-hidden="true">⌶</span>
        </button>
        {onClose ? (
          <button
            type="button"
            className="grid h-6 w-6 shrink-0 place-items-center rounded text-base leading-none text-[var(--ink-dim)] transition-colors duration-150 hover:bg-[var(--surface-2)] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--idle)]"
            aria-label={`Close ${item.data.oracle} terminal`}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => onClose(item.id)}
          >
            ×
          </button>
        ) : null}
      </header>

      <div
        className="relative min-h-0 flex-1 overflow-hidden p-2"
        role="region"
        aria-label={`${item.data.oracle} live terminal`}
        onPointerDown={(event) => {
          if (selecting || event.altKey) event.stopPropagation();
        }}
        onWheel={(event) => {
          event.stopPropagation();
          const horizontalDelta = event.deltaX || (event.shiftKey ? event.deltaY : 0);
          if (horizontalDelta !== 0) {
            event.preventDefault();
            frameRef.current?.scrollBy({ left: horizontalDelta });
            return;
          }
          if (selecting) return;
          const direction = Math.sign(event.deltaY);
          if (direction === 0) return;
          const lines = Math.max(1, Math.round(Math.abs(event.deltaY) / 30));
          terminalRef.current?.scrollLines(direction * lines);
        }}
      >
        <div
          ref={frameRef}
          className="terminal-tile__scroll h-full overflow-x-auto overflow-y-hidden"
        >
          <div ref={hostRef} className="terminal-tile__viewport h-full min-w-full" />
        </div>
        {!selecting ? (
          <div
            className="absolute inset-2 z-10 cursor-grab touch-none"
            data-terminal-drag-surface="true"
            aria-hidden="true"
            onPointerDown={() => terminalRef.current?.clearSelection()}
          />
        ) : null}
        {newLineCount > 0 ? (
          <button
            type="button"
            className="absolute bottom-2 right-3 z-20 rounded-full bg-[var(--idle)] px-2 py-1 font-mono text-[9px] font-bold text-[var(--ink-inverse)] shadow-[0_0_0_1px_var(--bg)] transition-colors duration-150 hover:bg-[var(--active)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ink)]"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={resumeFollowRef.current}
          >
            ↓ {newLineCount} new {newLineCount === 1 ? "line" : "lines"}
          </button>
        ) : null}
      </div>

      <footer
        className="flex min-h-6 shrink-0 items-center gap-2 border-t border-[var(--line)] px-2.5 py-1 font-mono text-[9px] tabular-nums text-[var(--ink-dim)]"
        aria-live="polite"
        title={error ?? undefined}
      >
        <span className="min-w-0 flex-1 truncate">
          {status === "live" ? (
            <><span className="terminal-live-indicator" aria-hidden="true">●</span> {health.label}</>
          ) : health.label}
        </span>
        {health.retryable ? (
          <button
            type="button"
            className="shrink-0 rounded border border-[var(--line)] px-1.5 py-0.5 font-bold text-[var(--ink)] transition-colors duration-150 hover:border-[var(--idle)] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--idle)] motion-reduce:transition-none"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => {
              setStatus("connecting");
              setError(null);
              setRetryEpoch((current) => current + 1);
            }}
          >
            Retry
          </button>
        ) : null}
      </footer>
    </section>
  );
}

export default TerminalTile;
