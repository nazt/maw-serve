import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

import { apiFetch, apiUrlWithParams, API_ENDPOINTS } from "../clients/api";
import {
  loadPaletteFrecency,
  rankPaletteItems,
  recordPaletteFocus,
  type FrecencyMap,
  type OraclePaletteItem,
  type PaletteItem,
  type PaletteKind,
  type SpacePaletteItem,
} from "./paletteIndex";

interface CommandPaletteProps {
  items: readonly PaletteItem[];
  onCommitOracle: (item: OraclePaletteItem) => void | Promise<void>;
  onCommitSpace: (item: SpacePaletteItem) => void | Promise<void>;
  emptyBoard?: boolean;
}

type PreviewState =
  | { status: "idle"; text: string }
  | { status: "loading"; text: string }
  | { status: "ready"; text: string }
  | { status: "error"; text: string };

const PREVIEW_DEBOUNCE_MS = 150;
const PREVIEW_POLL_MS = 2_000;
const MAX_RESULTS_PER_SECTION = 40;

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

function optionId(item: PaletteItem): string {
  return `stoa-palette-option-${item.id.replace(/[^a-z0-9_-]/gi, "-")}`;
}

function keyHint(item: PaletteItem): string {
  return item.kind === "oracle" ? "Enter · pin" : "Enter · review";
}

function SpaceMiniMap({ item }: { item: SpacePaletteItem }) {
  const frame = item.display.frame;
  return (
    <div className="palette-minimap" aria-label={`${item.name} static window map`}>
      {item.windows.map((window) => (
        <span
          key={window.id}
          className="palette-minimap__window"
          data-oracle={window.oracle ? "true" : undefined}
          style={{
            left: `${((window.frame.x - frame.x) / Math.max(1, frame.w)) * 100}%`,
            top: `${((window.frame.y - frame.y) / Math.max(1, frame.h)) * 100}%`,
            width: `${(window.frame.w / Math.max(1, frame.w)) * 100}%`,
            height: `${(window.frame.h / Math.max(1, frame.h)) * 100}%`,
          }}
        />
      ))}
    </div>
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
        <strong>{item.name}</strong>
        <span>{item.path}</span>
      </span>
      <span className="palette-option__kind">{item.kind}</span>
      <span className="palette-option__hint">{keyHint(item)}</span>
    </div>
  );
}

export default function CommandPalette({
  items,
  onCommitOracle,
  onCommitSpace,
  emptyBoard = false,
}: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [preferredKind, setPreferredKind] = useState<PaletteKind | null>(null);
  const [markedIds, setMarkedIds] = useState<Set<string>>(() => new Set());
  const [confirmingSpaceId, setConfirmingSpaceId] = useState<string | null>(null);
  const [frecency, setFrecency] = useState<FrecencyMap>(loadPaletteFrecency);
  const [preview, setPreview] = useState<PreviewState>({ status: "idle", text: "" });
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
  const navigable = useMemo<PaletteItem[]>(() => (
    preferredKind === "space" ? [...spaces, ...oracles] : [...oracles, ...spaces]
  ), [oracles, preferredKind, spaces]);
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
    setMarkedIds(new Set());
    setPreview({ status: "idle", text: "" });
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
    setAnnouncement(`${navigable.length} result${navigable.length === 1 ? "" : "s"} · ${oracles.length} oracles · ${spaces.length} spaces`);
  }, [activeId, navigable, open, oracles.length, preferredKind, spaces.length]);

  useEffect(() => {
    if (!open || active?.kind !== "oracle") {
      setPreview({ status: "idle", text: "" });
      return;
    }
    let stopped = false;
    let interval: number | null = null;
    let controller: AbortController | null = null;
    const poll = async () => {
      controller?.abort();
      controller = new AbortController();
      setPreview((current) => current.status === "ready" ? current : { status: "loading", text: "" });
      try {
        const text = await readPreview(active, controller.signal);
        if (stopped) return;
        setPreview({ status: "ready", text: text || "(empty pane)" });
        setAnnouncement("Preview ready · using 2s capture fallback");
      } catch (cause) {
        if (stopped || controller.signal.aborted) return;
        setPreview({
          status: "error",
          text: cause instanceof Error ? cause.message : "Preview unavailable",
        });
        setAnnouncement("Preview unavailable · pin remains available");
      }
    };
    const debounce = window.setTimeout(() => {
      void poll();
      interval = window.setInterval(() => void poll(), PREVIEW_POLL_MS);
    }, PREVIEW_DEBOUNCE_MS);
    return () => {
      stopped = true;
      window.clearTimeout(debounce);
      if (interval !== null) window.clearInterval(interval);
      controller?.abort();
    };
  }, [active, open]);

  const commit = useCallback(async (item: PaletteItem) => {
    if (item.kind === "space" && confirmingSpaceId !== item.id) {
      setConfirmingSpaceId(item.id);
      setAnnouncement(`${item.liveCount} live and ${item.pollCount} poll. Confirm pull.`);
      return;
    }
    setFrecency(recordPaletteFocus(item.id));
    if (item.kind === "oracle") await onCommitOracle(item);
    else await onCommitSpace(item);
    close();
  }, [close, confirmingSpaceId, onCommitOracle, onCommitSpace]);

  const move = useCallback((delta: number, kind?: PaletteKind) => {
    const source = kind ? navigable.filter((item) => item.kind === kind) : navigable;
    if (source.length === 0) return;
    const index = source.findIndex((item) => item.id === active?.id);
    const next = source[(index + delta + source.length) % source.length];
    setConfirmingSpaceId(null);
    setActiveId(next.id);
    document.getElementById(optionId(next))?.scrollIntoView({ block: "nearest" });
  }, [active?.id, navigable]);

  const peelEscape = useCallback(() => {
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
  }, [close, confirmingSpaceId, markedIds.size, query]);

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
            aria-label="Search oracles and spaces"
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
                aria-label="Search oracles and spaces"
                autoComplete="off"
                spellCheck="false"
                value={query}
                placeholder="Search an oracle or pull a space…"
                onChange={(event) => {
                  setQuery(event.target.value);
                  setConfirmingSpaceId(null);
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
                      <span data-preview-status={preview.status}>poll · 2s</span>
                    </header>
                    <pre data-state={preview.status}>{preview.status === "loading" ? "Acquiring redacted pane snapshot…" : preview.text}</pre>
                    <p>Peek uses capture polling · no stream lease</p>
                  </>
                ) : active?.kind === "space" ? (
                  <>
                    <header>
                      <div><strong>{active.name}</strong><span>{active.path}</span></div>
                      <span>static map</span>
                    </header>
                    <SpaceMiniMap item={active} />
                    <p>{active.oracleNames.length} oracle panes · zero preview streams</p>
                    {confirmingSpaceId === active.id ? (
                      <div className="palette-confirm" role="alert">
                        <strong>{active.liveCount} live / {active.pollCount} poll — pull?</strong>
                        <span>
                          <button type="button" onClick={() => void commit(active)}>Pull space</button>
                          <button type="button" onClick={() => setConfirmingSpaceId(null)}>Cancel</button>
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
              <span><kbd>↵</kbd> pin / pull</span>
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
