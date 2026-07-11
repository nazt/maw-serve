import { useCallback, useEffect, useRef, useState } from "react";

export interface TerminalTileItem {
  id: string;
  kind: "terminal";
  x: number;
  y: number;
  w: number;
  h: number;
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
  if (!response.ok) {
    throw new Error(`Capture returned HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (contentType.includes("json")) return captureText(await response.json());
  if (contentType.includes("text/html")) {
    throw new Error("Capture endpoint is unavailable");
  }
  return response.text();
}

export function TerminalTile({
  item,
  onClose,
  pollIntervalMs = 2_000,
}: TerminalTileProps) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const outputRef = useRef<HTMLPreElement>(null);

  const refresh = useCallback(async (signal: AbortSignal) => {
    const params = new URLSearchParams({
      session: item.data.session,
      window: item.data.window,
    });
    const response = await fetch(`/api/agora/capture?${params}`, {
      signal,
      cache: "no-store",
      headers: { Accept: "application/json, text/plain;q=0.9" },
    });
    const nextText = await readCapture(response);
    if (signal.aborted) return;

    setText(nextText);
    setError(null);
    setLoading(false);
    setUpdatedAt(new Date());
  }, [item.data.session, item.data.window]);

  useEffect(() => {
    let controller: AbortController | null = null;

    const poll = () => {
      controller?.abort();
      const requestController = new AbortController();
      controller = requestController;
      void refresh(requestController.signal).catch((reason: unknown) => {
        if (requestController.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : String(reason));
        setLoading(false);
      });
    };

    poll();
    const interval = window.setInterval(poll, Math.max(1_000, pollIntervalMs));
    return () => {
      window.clearInterval(interval);
      controller?.abort();
    };
  }, [pollIntervalMs, refresh]);

  useEffect(() => {
    const output = outputRef.current;
    if (output) output.scrollTop = output.scrollHeight;
  }, [text]);

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-md bg-[oklch(0.115_0.018_220)] shadow-[0_0_0_1px_var(--line)]">
      <header className="flex h-9 shrink-0 items-center gap-2 border-b border-[var(--line)] bg-[oklch(0.17_0.02_220)] px-2.5 font-mono">
        <span
          className={`h-1.5 w-1.5 rounded-full ${error ? "bg-[var(--error)]" : "bg-[var(--active)]"}`}
          aria-hidden="true"
        />
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
          onClick={() => onClose(item.id)}
        >
          ×
        </button>
      </header>

      <pre
        ref={outputRef}
        className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-[11px] leading-[1.45] text-[oklch(0.86_0.08_155)] selection:bg-[oklch(0.42_0.09_155)] selection:text-white"
        aria-label={`${item.data.oracle} terminal capture`}
        onPointerDown={(event) => event.stopPropagation()}
        onWheel={(event) => event.stopPropagation()}
      >
        {loading ? "Connecting to pane…" : error ? `capture error: ${error}` : text || "(empty pane)"}
      </pre>

      <footer className="shrink-0 border-t border-[var(--line)] px-2.5 py-1 font-mono text-[9px] tabular-nums text-[var(--ink-dim)]">
        {error
          ? "retrying every 2s"
          : updatedAt
            ? `updated ${updatedAt.toLocaleTimeString()}`
            : "waiting for capture"}
      </footer>
    </section>
  );
}

export default TerminalTile;
