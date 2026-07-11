export interface ArgusHostUsage {
  machine: string;
  oracles: number;
  tokens: number;
  messages: number;
  burn_per_hr: number;
  resets_at: string;
}

export interface ArgusAccountUsage {
  account: string;
  rate_5h_pct: number;
  rate_5h_resets_at: string;
  rate_7d_pct: number;
  rate_7d_resets_at?: string;
}

export interface ArgusOracleUsage {
  oracle: string;
  model: string;
  account: string;
  machine: string;
  rate_5h_pct: number;
  rate_7d_pct: number;
}

export interface ArgusBoardTile {
  updated_at: string;
  window_h: number;
  hosts: ArgusHostUsage[];
  accounts: ArgusAccountUsage[];
  oracles: ArgusOracleUsage[];
}

export interface ArgusIngestFrame {
  type: "ingest";
  at: number;
  rows: unknown[];
}

export type ArgusWsFrame = ArgusIngestFrame | { type: string; [key: string]: unknown };

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

type WebSocketLike = {
  addEventListener(type: "message", cb: (event: { data: unknown }) => void): void;
  addEventListener(type: "error", cb: (event: unknown) => void): void;
  close(): void;
};

type WebSocketCtor = new (url: string) => WebSocketLike;

export interface ArgusWsHandlers {
  onIngest?: (frame: ArgusIngestFrame) => void;
  onUnknown?: (frame: ArgusWsFrame) => void;
  onError?: (error: unknown) => void;
}

export function parseArgusBoardTile(value: unknown): ArgusBoardTile {
  const tile = value as ArgusBoardTile;
  if (!tile || typeof tile !== "object") throw new Error("argus tile must be an object");
  if (typeof tile.updated_at !== "string") throw new Error("argus tile updated_at must be string");
  if (typeof tile.window_h !== "number") throw new Error("argus tile window_h must be number");
  for (const key of ["hosts", "accounts", "oracles"] as const) {
    if (!Array.isArray(tile[key])) throw new Error(`argus tile ${key} must be an array`);
  }
  return tile;
}

export async function fetchArgusBoardTile(
  baseUrl: string | URL,
  windowH: number,
  fetchImpl: FetchLike = fetch,
): Promise<ArgusBoardTile> {
  const url = new URL("/api/board-tile", baseUrl);
  url.searchParams.set("window_h", String(windowH));
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`argus board-tile failed: ${res.status}`);
  return parseArgusBoardTile(await res.json());
}

export function parseArgusWsFrame(raw: unknown): ArgusWsFrame {
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!parsed || typeof parsed !== "object") throw new Error("argus ws frame must be an object");
  const frame = parsed as ArgusWsFrame;
  if (typeof frame.type !== "string") throw new Error("argus ws frame type must be string");
  if (frame.type === "ingest") {
    const ingest = frame as ArgusIngestFrame;
    if (typeof ingest.at !== "number") throw new Error("argus ingest at must be number");
    if (!Array.isArray(ingest.rows)) throw new Error("argus ingest rows must be an array");
  }
  return frame;
}

export function listenArgusWs(
  baseUrl: string | URL,
  handlers: ArgusWsHandlers,
  WebSocketImpl: WebSocketCtor = WebSocket as unknown as WebSocketCtor,
): WebSocketLike {
  const url = new URL("/api/ws", baseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  const ws = new WebSocketImpl(url.toString());
  ws.addEventListener("message", (event) => {
    const frame = parseArgusWsFrame(event.data);
    if (frame.type === "ingest") handlers.onIngest?.(frame as ArgusIngestFrame);
    else handlers.onUnknown?.(frame);
  });
  ws.addEventListener("error", (event) => handlers.onError?.(event));
  return ws;
}
