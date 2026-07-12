import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

import { apiFetch, apiUrlWithParams, API_ENDPOINTS } from "../clients/api";
import { requestLease, STREAM_PRIORITY, type StreamLeaseMode } from "./streamLease";
import {
  loadPaletteFrecency,
  rankPaletteItems,
  recordPaletteFocus,
  type FrecencyMap,
  type OraclePaletteItem,
  type PaletteItem,
  type PaletteKind,
  type PeerPaletteItem,
  type PeerTrust,
  type SpacePaletteItem,
} from "./paletteIndex";

interface CommandPaletteProps {
  items: readonly PaletteItem[];
  onCommitOracle: (item: OraclePaletteItem) => void | Promise<void>;
  onCommitSpace: (item: SpacePaletteItem) => void | Promise<void>;
  onCommitPeer?: (item: PeerPaletteItem) => void | Promise<void>;
  emptyBoard?: boolean;
}

type PreviewStatus = "idle" | "loading" | "ready" | "error";
type PreviewTransport = "snapshot" | "live";

interface PreviewState {
  status: PreviewStatus;
  transport: PreviewTransport;
  text: string;
  updatedAt: number | null;
}

const PREVIEW_DEBOUNCE_MS = 150;
const PREVIEW_DWELL_MS = 300;
const PREVIEW_POLL_MS = 2_000;
const MAX_RESULTS_PER_SECTION = 40;
const MAX_STREAM_PREVIEW_CHARS = 28_000;
const MAX_SPACE_THUMBNAIL_WINDOWS = 8;

const TRUST_LABEL: Record<PeerTrust, string> = {
  fleet: "◆ fleet",
  paired: "⬡ paired",
  new: "○ new",
  "key-changed": "⚠ key changed",
};

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

async function readPreview(item: OraclePaletteItem, signal: AbortSignal): Promise<string> {
  const url = apiUrlWithParams(API_ENDPOINTS.capture, new URLSearchParams({
    session: item.session,
    window: item.window,
    lines: "80",
  }));
  const response = await apiFetch(url, {
    cache: "no-store",
    signal,
    headers: { Accept: "application/json, text/plain;q=0.9" },
  });
  if (!response.ok) throw new Error(`Capture returned ${response.status}`);
  const type = response.headers.get("content-type")?.toLowerCase() ?? "";
  return type.includes("json")
    ? captureText(await response.json())
    : response.text();
}

function plainTerminalText(value: string): string {
  return value
    .replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, "")
    .replace(/\x1b(?:[@-_]|\[[0-?]*[ -/]*[@-~])/g, "")
    .replace(/\r(?!\n)/g, "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "");
}

function appendPreviewFrame(current: string, frame: string): string {
  const next = `${current}${plainTerminalText(frame)}`;
  return next.length > MAX_STREAM_PREVIEW_CHARS
    ? next.slice(-MAX_STREAM_PREVIEW_CHARS)
    : next;
}

function updatedAgo(updatedAt: number | null, now: number): string {
  if (!updatedAt) return "waiting";
  const seconds = Math.max(0, Math.floor((now - updatedAt) / 1_000));
  return `updated ${seconds}s ago`;
}

function layoutStyle(item: SpacePaletteItem, index: number) {
  const geometry = item.layout[index]?.geometry;
  if (!geometry) return undefined;
  const frame = item.display.frame;
  return {
    left: `${(geometry.x / Math.max(1, frame.w)) * 100}%`,
    top: `${(geometry.y / Math.max(1, frame.h)) * 100}%`,
    width: `${(geometry.w / Math.max(1, frame.w)) * 100}%`,
    height: `${(geometry.h / Math.max(1, frame.h)) * 100}%`,
  };
}

function optionId(item: PaletteItem): string {
  return `stoa-palette-option-${item.id.replace(/[^a-z0-9_-]/gi, "-")}`;
}

function keyHint(item: PaletteItem): string {
  if (item.kind === "oracle") return "Enter · pin";
  if (item.kind === "space") return "Enter · review";
  return "Enter · connect";
}

function SpaceMiniMap({ item }: { item: SpacePaletteItem }) {
  const visible = item.layout.slice(0, MAX_SPACE_THUMBNAIL_WINDOWS);
  const hidden = Math.max(0, item.layout.length - visible.length);
  return (
    <div className="palette-minimap" aria-label={`${item.name} live topology map`}>
      {visible.map(({ window }, index) => (
        <span
          key={window.id}
          className="palette-minimap__window"
          data-oracle={window.oracle ? "true" : undefined}
          style={layoutStyle(item, index)}
        />
      ))}
      {hidden > 0 ? (
        <span
          aria-label={`${hidden} additional windows`}
          style={{
            position: "absolute",
            right: "0.55rem",
            bottom: "0.55rem",
            borderRadius: "999px",
            background: "var(--surface-2)",
            padding: "0.18rem 0.42rem",
            color: "var(--ink-dim)",
            fontFamily: "var(--font-mono)",
            fontSize: "0.6rem",
          }}
        >
          +{hidden}
        </span>
      ) : null}
    </div>
  );
}

function SpaceRowMiniMap({ item }: { item: SpacePaletteItem }) {
  const visible = item.layout.slice(0, MAX_SPACE_THUMBNAIL_WINDOWS);
  const hidden = Math.max(0, item.layout.length - visible.length);
  return (
    <span
      aria-hidden="true"
      title={`${item.layout.length} windows in current topology`}
      style={{
        position: "relative",
        display: "block",
        width: "2.8rem",
        height: "1.45rem",
        flex: "0 0 auto",
        overflow: "hidden",
        border: "1px solid var(--line)",
        borderRadius: "0.24rem",
        background: "var(--bg)",
      }}
    >
      {visible.map(({ window }, index) => (
        <span
          key={window.id}
          className="palette-minimap__window"
          data-oracle={window.oracle ? "true" : undefined}
          style={{ ...layoutStyle(item, index), minWidth: 2, minHeight: 2 }}
        />
      ))}
      {hidden > 0 ? (
        <span style={{
          position: "absolute",
          right: 1,
          bottom: 0,
          color: "var(--ink)",
          fontFamily: "var(--font-mono)",
          fontSize: "0.42rem",
          lineHeight: 1,
        }}>
          +{hidden}
        </span>
      ) : null}
    </span>
  );
}

function PeerTrustChip({ trust }: { trust: PeerTrust }) {
  const urgent = trust === "key-changed";
  return (
    <span
      className="palette-option__kind"
      data-peer-trust={trust}
      style={urgent ? { color: "var(--error)" } : undefined}
    >
      {TRUST_LABEL[trust]}
    </span>
  );
}

function ResultRow({
  item,
  active,
  onHighlight,
  onCommit,
}: {
  item: PaletteItem;
  active: boolean;
  onHighlight: () => void;
  onCommit: () => void;
}) {
  return (
    <div
      id={optionId(item)}
      className="palette-option"
      data-active={active || undefined}
      data-kind={item.kind}
      role="option"
      aria-selected={active}
      onPointerMove={onHighlight}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onCommit}
    >
      <span className="palette-option__signal" aria-hidden="true" />
      <span className="palette-option__copy">
        <strong>{item.kind === "peer" ? item.handle : item.name}</strong>
        <span>{item.kind === "peer" ? item.fingerprint : item.path}</span>
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: "0.4rem", alignSelf: "start" }}>
        {item.kind === "space" ? <SpaceRowMiniMap item={item} /> : null}
        {item.kind === "peer"
          ? <PeerTrustChip trust={item.trust} />
          : <span className="palette-option__kind">{item.kind}</span>}
      </span>
      <span className="palette-option__hint">{keyHint(item)}</span>
    </div>
  );
}

export default function CommandPalette({
  items,
  onCommitOracle,
  onCommitSpace,
  onCommitPeer,
  emptyBoard = false,
}: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [preferredKind, setPreferredKind] = useState<PaletteKind | null>(null);
  const [markedIds, setMarkedIds] = useState<Set<string>>(() => new Set());
  const [confirmingSpaceId, setConfirmingSpaceId] = useState<string | null>(null);
  const [confirmingPeerId, setConfirmingPeerId] = useState<string | null>(null);
  const [frecency, setFrecency] = useState<FrecencyMap>(loadPaletteFrecency);
  const [preview, setPreview] = useState<PreviewState>({
    status: "idle",
    transport: "snapshot",
    text: "",
    updatedAt: null,
  });
  const [previewNow, setPreviewNow] = useState(Date.now);
  const [announcement, setAnnouncement] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const ranked = useMemo(
    () => rankPaletteItems(items, query, frecency),
    [frecency, items, query],
  );
  const oracles = useMemo(
    () => ranked.filter((item): item is OraclePaletteItem => item.kind === "oracle").slice(0, MAX_RESULTS_PER_SECTION),
    [ranked],
  );
  const spaces = useMemo(
    () => ranked.filter((item): item is SpacePaletteItem => item.kind === "space").slice(0, MAX_RESULTS_PER_SECTION),
    [ranked],
  );
  const peers = useMemo(
    () => ranked.filter((item): item is PeerPaletteItem => item.kind === "peer").slice(0, MAX_RESULTS_PER_SECTION),
    [ranked],
  );
  const navigable = useMemo<PaletteItem[]>(() => (
    preferredKind === "space"
      ? [...spaces, ...oracles, ...peers]
      : preferredKind === "peer"
        ? [...peers, ...oracles, ...spaces]
        : [...oracles, ...spaces, ...peers]
  ), [oracles, peers, preferredKind, spaces]);
  const active = navigable.find((item) => item.id === activeId) ?? navigable[0] ?? null;

  const show = useCallback((kind: PaletteKind | null = null) => {
    const activeElement = document.activeElement;
    openerRef.current = activeElement instanceof HTMLElement && activeElement !== document.body
      ? activeElement
      : launcherRef.current;
    setActiveId(null);
    setPreferredKind(kind);
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setConfirmingSpaceId(null);
    setConfirmingPeerId(null);
    setMarkedIds(new Set());
    setPreview({ status: "idle", transport: "snapshot", text: "", updatedAt: null });
    window.setTimeout(() => (openerRef.current ?? launcherRef.current)?.focus(), 0);
  }, []);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (preferredKind) {
      const preferred = navigable.find((item) => item.kind === preferredKind);
      setActiveId(preferred?.id ?? navigable[0]?.id ?? null);
      setPreferredKind(null);
      return;
    }
    if (!activeId || !navigable.some((item) => item.id === activeId)) {
      setActiveId(navigable[0]?.id ?? null);
    }
    setAnnouncement(`${navigable.length} result${navigable.length === 1 ? "" : "s"} · ${oracles.length} oracles · ${spaces.length} spaces · ${peers.length} peers`);
  }, [activeId, navigable, open, oracles.length, peers.length, preferredKind, spaces.length]);

  useEffect(() => {
    if (!open) return;
    setPreviewNow(Date.now());
    const clock = window.setInterval(() => setPreviewNow(Date.now()), 1_000);
    return () => window.clearInterval(clock);
  }, [open]);

  useEffect(() => {
    if (!open || active?.kind !== "oracle") {
      setPreview({ status: "idle", transport: "snapshot", text: "", updatedAt: null });
      return;
    }
    setPreview({ status: "loading", transport: "snapshot", text: "", updatedAt: null });
    let stopped = false;
    let pollInterval: number | null = null;
    let controller: AbortController | null = null;
    let eventSource: EventSource | null = null;
    let releaseLease: (() => void) | null = null;

    const stopPolling = () => {
      if (pollInterval !== null) window.clearInterval(pollInterval);
      pollInterval = null;
      controller?.abort();
      controller = null;
    };

    const poll = async () => {
      controller?.abort();
      const request = new AbortController();
      controller = request;
      setPreview((current) => current.status === "ready" ? current : {
        status: "loading",
        transport: "snapshot",
        text: "",
        updatedAt: current.updatedAt,
      });
      try {
        const text = await readPreview(active, request.signal);
        if (stopped) return;
        setPreview({
          status: "ready",
          transport: "snapshot",
          text: plainTerminalText(text) || "(empty pane)",
          updatedAt: Date.now(),
        });
        setAnnouncement("Snapshot ready · dwelling upgrades one reserved preview stream");
      } catch (cause) {
        if (stopped || request.signal.aborted) return;
        setPreview({
          status: "error",
          transport: "snapshot",
          text: cause instanceof Error ? cause.message : "Preview unavailable",
          updatedAt: null,
        });
        setAnnouncement("Preview unavailable · pin remains available");
      }
    };

    const startPolling = () => {
      if (stopped || pollInterval !== null) return;
      void poll();
      pollInterval = window.setInterval(() => void poll(), PREVIEW_POLL_MS);
    };

    const stopStream = () => {
      eventSource?.close();
      eventSource = null;
    };

    const startStream = () => {
      if (stopped || eventSource) return;
      if (!("EventSource" in window)) {
        releaseLease?.();
        releaseLease = null;
        startPolling();
        return;
      }
      stopPolling();
      eventSource = new EventSource(apiUrlWithParams(API_ENDPOINTS.stream, new URLSearchParams({
        session: active.session,
        window: active.window,
        lines: "80",
      })));
      const receiveFrame = (event: MessageEvent<string>, reset: boolean) => {
        if (stopped) return;
        setPreview((current) => ({
          status: "ready",
          transport: "live",
          text: reset
            ? plainTerminalText(event.data) || "(empty pane)"
            : appendPreviewFrame(current.text, event.data),
          updatedAt: Date.now(),
        }));
        setAnnouncement("Live preview ready · reserved preview stream active");
      };
      eventSource.addEventListener("snapshot", (event) => {
        receiveFrame(event as MessageEvent<string>, true);
      });
      eventSource.onmessage = (event) => receiveFrame(event, false);
      eventSource.onerror = () => {
        if (stopped) return;
        stopStream();
        releaseLease?.();
        releaseLease = null;
        setAnnouncement("Live preview fell back to the 2s snapshot");
        startPolling();
      };
    };

    const debounce = window.setTimeout(() => {
      startPolling();
    }, PREVIEW_DEBOUNCE_MS);
    const dwell = window.setTimeout(() => {
      const lease = requestLease(`${active.session}:${active.window}`, {
        priority: STREAM_PRIORITY.focused,
        lane: "preview",
      });
      const syncMode = (mode: StreamLeaseMode) => {
        if (mode === "stream") startStream();
        else {
          stopStream();
          startPolling();
        }
      };
      const unsubscribe = lease.subscribe(syncMode);
      releaseLease = () => {
        unsubscribe();
        lease.release();
      };
      syncMode(lease.mode);
    }, PREVIEW_DWELL_MS);

    return () => {
      stopped = true;
      window.clearTimeout(debounce);
      window.clearTimeout(dwell);
      stopPolling();
      stopStream();
      releaseLease?.();
    };
  }, [active?.id, active?.kind, active?.kind === "oracle" ? active.session : null, active?.kind === "oracle" ? active.window : null, open]);

  const commit = useCallback(async (item: PaletteItem) => {
    if (item.kind === "space" && confirmingSpaceId !== item.id) {
      setConfirmingPeerId(null);
      setConfirmingSpaceId(item.id);
      setAnnouncement(`${item.liveCount} live and ${item.pollCount} poll. Confirm pull.`);
      return;
    }
    if (item.kind === "peer" && confirmingPeerId !== item.id) {
      setConfirmingSpaceId(null);
      setConfirmingPeerId(item.id);
      setAnnouncement(`Confirm connection request to ${item.handle}. No peer content is previewed before consent.`);
      return;
    }
    setFrecency(recordPaletteFocus(item.id));
    if (item.kind === "oracle") await onCommitOracle(item);
    else if (item.kind === "space") await onCommitSpace(item);
    else if (onCommitPeer) await onCommitPeer(item);
    else window.dispatchEvent(new CustomEvent("p2p-request", {
      detail: {
        handle: item.handle,
        fingerprint: item.fingerprint,
        trust: item.trust,
      },
    }));
    close();
  }, [close, confirmingPeerId, confirmingSpaceId, onCommitOracle, onCommitPeer, onCommitSpace]);

  const move = useCallback((delta: number, kind?: PaletteKind) => {
    const source = kind ? navigable.filter((item) => item.kind === kind) : navigable;
    if (source.length === 0) return;
    const index = source.findIndex((item) => item.id === active?.id);
    const next = source[(index + delta + source.length) % source.length];
    setConfirmingSpaceId(null);
    setConfirmingPeerId(null);
    setActiveId(next.id);
    document.getElementById(optionId(next))?.scrollIntoView({ block: "nearest" });
  }, [active?.id, navigable]);

  const peelEscape = useCallback(() => {
    if (confirmingPeerId) {
      setConfirmingPeerId(null);
      return;
    }
    if (confirmingSpaceId) {
      setConfirmingSpaceId(null);
      return;
    }
    if (markedIds.size > 0) {
      setMarkedIds(new Set());
      return;
    }
    if (query) {
      setQuery("");
      return;
    }
    close();
  }, [close, confirmingPeerId, confirmingSpaceId, markedIds.size, query]);

  const onInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      peelEscape();
      return;
    }
    if (event.key === "ArrowDown" || (event.ctrlKey && event.key.toLowerCase() === "n")) {
      event.preventDefault();
      move(1);
      return;
    }
    if (event.key === "ArrowUp" || (event.ctrlKey && event.key.toLowerCase() === "p")) {
      event.preventDefault();
      move(-1);
      return;
    }
    if (event.key === "Enter" && active) {
      event.preventDefault();
      void commit(active);
    }
  };

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      const command = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();
      const controlPaletteNavigation = open && event.ctrlKey && !event.metaKey && key === "p";
      if (
        command &&
        !event.altKey &&
        ["k", "p"].includes(key) &&
        !controlPaletteNavigation
      ) {
        event.preventDefault();
        if (open) close();
        else show();
        return;
      }
      if (event.key !== "F1" && event.key !== "F2") return;
      event.preventDefault();
      const kind: PaletteKind = event.key === "F1" ? "oracle" : "space";
      if (!open) {
        show(kind);
        return;
      }
      const target = active?.kind === kind
        ? active
        : navigable.find((item) => item.kind === kind);
      if (target) {
        setActiveId(target.id);
        void commit(target);
      }
    };
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, [active, close, commit, navigable, open, show]);

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        className="palette-launcher"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-keyshortcuts="Meta+K Control+K Meta+P Control+P"
        onClick={() => show()}
      >
        <span aria-hidden="true">⌘K</span>
        <span>Search oracles…</span>
      </button>

      {emptyBoard && !open ? (
        <section className="palette-hero" aria-labelledby="palette-hero-title">
          <p>fleet command surface</p>
          <h2 id="palette-hero-title">Bring an oracle here.</h2>
          <button type="button" onClick={() => show("oracle")}>
            Search with <kbd>⌘K</kbd>
          </button>
        </section>
      ) : null}

      {open ? (
        <div className="palette-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) close();
        }}>
          <section
            className="command-palette"
            role="dialog"
            aria-modal="true"
            aria-label="Search fleet targets"
          >
            <div className="command-palette__search">
              <span aria-hidden="true">⌘K</span>
              <input
                ref={inputRef}
                role="combobox"
                aria-autocomplete="list"
                aria-expanded="true"
                aria-controls="stoa-palette-listbox"
                aria-activedescendant={active ? optionId(active) : undefined}
                aria-label="Search fleet targets"
                autoComplete="off"
                spellCheck="false"
                value={query}
                placeholder="Search an oracle, space, or peer…"
                onChange={(event) => {
                  setQuery(event.target.value);
                  setConfirmingSpaceId(null);
                  setConfirmingPeerId(null);
                }}
                onKeyDown={onInputKeyDown}
              />
              {query ? (
                <button type="button" aria-label="Clear search" onClick={() => setQuery("")}>×</button>
              ) : <kbd>esc</kbd>}
            </div>

            <div className="command-palette__body">
              <div id="stoa-palette-listbox" className="palette-list" role="listbox">
                {navigable.length === 0 ? (
                  <p className="palette-empty">No matching fleet targets</p>
                ) : null}
                {oracles.length > 0 ? (
                  <section role="group" aria-labelledby="palette-oracles-label">
                    <h3 id="palette-oracles-label">Oracles <span>{oracles.length}</span></h3>
                    {oracles.map((item) => (
                      <ResultRow
                        key={item.id}
                        item={item}
                        active={active?.id === item.id}
                        onHighlight={() => {
                          setConfirmingSpaceId(null);
                          setConfirmingPeerId(null);
                          setActiveId(item.id);
                        }}
                        onCommit={() => void commit(item)}
                      />
                    ))}
                  </section>
                ) : null}
                {spaces.length > 0 ? (
                  <section role="group" aria-labelledby="palette-spaces-label">
                    <h3 id="palette-spaces-label">Spaces <span>pullable · {spaces.length}</span></h3>
                    {spaces.map((item) => (
                      <ResultRow
                        key={item.id}
                        item={item}
                        active={active?.id === item.id}
                        onHighlight={() => {
                          setConfirmingSpaceId(null);
                          setConfirmingPeerId(null);
                          setActiveId(item.id);
                        }}
                        onCommit={() => void commit(item)}
                      />
                    ))}
                  </section>
                ) : null}
                {peers.length > 0 ? (
                  <section role="group" aria-labelledby="palette-peers-label">
                    <h3 id="palette-peers-label">Peers <span>identity only · {peers.length}</span></h3>
                    {peers.map((item) => (
                      <ResultRow
                        key={item.id}
                        item={item}
                        active={active?.id === item.id}
                        onHighlight={() => {
                          setConfirmingSpaceId(null);
                          setConfirmingPeerId(null);
                          setActiveId(item.id);
                        }}
                        onCommit={() => void commit(item)}
                      />
                    ))}
                  </section>
                ) : null}
              </div>

              <aside className="palette-preview" aria-label="Selected target preview">
                {active?.kind === "oracle" ? (
                  <>
                    <header>
                      <div><strong>{active.name}</strong><span>{active.path}</span></div>
                      <span data-preview-status={preview.transport === "live" ? "ready" : preview.status}>
                        {preview.transport === "live" ? "● LIVE" : "◌ snapshot"}
                      </span>
                    </header>
                    <pre data-state={preview.status}>
                      {preview.status === "loading" ? "Acquiring redacted pane snapshot…" : preview.text}
                      {preview.transport === "live" ? (
                        <span
                          aria-hidden="true"
                          style={{ animation: "terminal-live-pulse 1.2s ease-in-out infinite" }}
                        >
                          ▌
                        </span>
                      ) : null}
                    </pre>
                    <p>
                      {updatedAgo(preview.updatedAt, previewNow)} · {preview.transport === "live"
                        ? "reserved preview stream"
                        : "redacted 2s capture"}
                    </p>
                  </>
                ) : active?.kind === "space" ? (
                  <>
                    <header>
                      <div><strong>{active.name}</strong><span>{active.path}</span></div>
                      <span>live topology</span>
                    </header>
                    <SpaceMiniMap item={active} />
                    <p>{active.layout.length} windows · {active.oracleNames.length} oracle panes · zero preview streams</p>
                    {confirmingSpaceId === active.id ? (
                      <div className="palette-confirm" role="alert">
                        <strong>
                          {active.name.toLowerCase()} — {active.liveCount + active.pollCount} terminals · pull {active.liveCount} live + {active.pollCount} polled?
                        </strong>
                        <span>
                          <button type="button" onClick={() => void commit(active)}>Pull space</button>
                          <button type="button" onClick={() => setConfirmingSpaceId(null)}>Cancel</button>
                        </span>
                      </div>
                    ) : null}
                  </>
                ) : active?.kind === "peer" ? (
                  <>
                    <header>
                      <div><strong>{active.handle}</strong><span>{active.fingerprint}</span></div>
                      <PeerTrustChip trust={active.trust} />
                    </header>
                    <div
                      className="palette-minimap"
                      aria-label={`${active.handle} peer identity; preview disabled before consent`}
                      style={{ display: "grid", placeItems: "center", padding: "2rem" }}
                    >
                      <div style={{ maxWidth: "24rem", textAlign: "center" }}>
                        <strong style={{ display: "block", fontSize: "0.9rem" }}>
                          {active.trust === "new"
                            ? "🔒 not paired — connect to request access"
                            : active.trust === "key-changed"
                              ? "⚠ identity key changed — verify before reconnecting"
                              : "Identity verified · content remains private until consent"}
                        </strong>
                        <p style={{ marginTop: "0.65rem", color: "var(--ink-dim)", fontFamily: "var(--font-mono)", fontSize: "0.65rem" }}>
                          Peer PEEK is disabled. No frame or terminal content crosses this trust boundary.
                        </p>
                      </div>
                    </div>
                    {confirmingPeerId === active.id ? (
                      <div className="palette-confirm" role="alert">
                        <strong>Request a read-only connection to {active.handle}?</strong>
                        <span>
                          <button type="button" onClick={() => void commit(active)}>Request connection</button>
                          <button type="button" onClick={() => setConfirmingPeerId(null)}>Cancel</button>
                        </span>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className="palette-preview__empty">Choose a fleet target to preview</p>
                )}
              </aside>
            </div>
            <footer>
              <span><kbd>↑↓</kbd> navigate</span>
              <span><kbd>↵</kbd> pin / pull / connect</span>
              <span><kbd>F1</kbd> oracle</span>
              <span><kbd>F2</kbd> space</span>
              <span><kbd>esc</kbd> back</span>
            </footer>
          </section>
        </div>
      ) : null}

      <output className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </output>
    </>
  );
}
