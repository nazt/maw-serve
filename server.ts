const PORT = Number(process.env.MAW_SERVE_PORT ?? 4756);
const PUBLIC_DIR = `${import.meta.dir}/public`;
const DEFAULT_DAEMON_URL = process.env.MAW_DAEMON_URL ?? "http://127.0.0.1:3456";

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

type BoardData = { hub: FeedHub };
type BoardWs = Bun.ServerWebSocket<BoardData>;
type BoardServer = Bun.Server<BoardData>;
type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export interface ServerOptions {
  daemonUrl?: string;
  feedPath?: string;
  feedPollMs?: number;
  keepaliveMs?: number;
  fetchImpl?: FetchLike;
}

function contentTypeFor(pathname: string): string {
  const match = pathname.match(/\.[^./]+$/);
  return match ? CONTENT_TYPES[match[0].toLowerCase()] ?? "application/octet-stream" : "application/octet-stream";
}

function publicFilePath(assetPath: string): string | null {
  const decoded = decodeURIComponent(assetPath);
  if (decoded.includes("\0")) return null;
  const parts = decoded.split("/").filter(Boolean);
  if (parts.some((part) => part === ".." || part.includes("\\"))) return null;
  return `${PUBLIC_DIR}/${parts.join("/")}`;
}

function fileResponse(pathname: string, filePath: string): Response {
  return new Response(Bun.file(filePath), { headers: { "content-type": contentTypeFor(pathname) } });
}

async function servePublicAsset(pathname: string): Promise<Response> {
  const assetPath = pathname.slice("/api/agora/".length);
  const filePath = publicFilePath(assetPath);
  if (!filePath) return new Response("not found", { status: 404 });
  const file = Bun.file(filePath);
  if (!(await file.exists())) return new Response("not found", { status: 404 });
  return fileResponse(pathname, filePath);
}

function serveIndex(): Response {
  return fileResponse("/api/agora/index.html", `${PUBLIC_DIR}/index.html`);
}

function sanitizeString(value: string): string {
  return value.replace(/\b(token|api[_-]?key|secret|password)\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]");
}

function sanitizeFeedValue(value: unknown): unknown {
  if (typeof value === "string") return sanitizeString(value);
  if (Array.isArray(value)) return value.map(sanitizeFeedValue);
  if (!value || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (/(token|secret|password|authorization|cookie|pane_?title|title)/i.test(key)) {
      out[key] = "[redacted]";
    } else {
      out[key] = sanitizeFeedValue(child);
    }
  }
  return out;
}

function sanitizeFeedPayload(rawFeed: unknown): unknown {
  // TODO(D1-redaction): replace this conservative stopgap with the full §1 ingest
  // redaction filter before production use. This is the exact daemon-feed ingest
  // point; raw pane titles/tokens/secrets must never be forwarded from here.
  return sanitizeFeedValue(rawFeed);
}

function jsonFrame(type: string, payload: Record<string, unknown> = {}): string {
  return JSON.stringify({ type, ...payload });
}

export class FeedHub {
  private clients = new Set<BoardWs>();
  private feedTimer: Timer | null = null;
  private keepaliveTimer: Timer | null = null;
  private polling = false;
  private readonly feedUrl: URL;
  private readonly feedPollMs: number;
  private readonly keepaliveMs: number;
  private readonly fetchImpl: FetchLike;

  constructor(options: ServerOptions = {}) {
    this.feedUrl = new URL(options.feedPath ?? "/api/feed", options.daemonUrl ?? DEFAULT_DAEMON_URL);
    this.feedPollMs = options.feedPollMs ?? 2_000;
    this.keepaliveMs = options.keepaliveMs ?? 20_000;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  add(ws: BoardWs): void {
    this.clients.add(ws);
    this.start();
    void this.pollOnce();
  }

  remove(ws: BoardWs): void {
    this.clients.delete(ws);
    if (this.clients.size === 0) this.stop();
  }

  replyToClientPing(ws: BoardWs): void {
    ws.send(jsonFrame("pong", { at: Date.now() }));
  }

  private start(): void {
    if (!this.feedTimer) this.feedTimer = setInterval(() => void this.pollOnce(), this.feedPollMs);
    if (!this.keepaliveTimer) this.keepaliveTimer = setInterval(() => this.keepalive(), this.keepaliveMs);
  }

  private stop(): void {
    if (this.feedTimer) clearInterval(this.feedTimer);
    if (this.keepaliveTimer) clearInterval(this.keepaliveTimer);
    this.feedTimer = null;
    this.keepaliveTimer = null;
  }

  private keepalive(): void {
    const frame = jsonFrame("ping", { at: Date.now() });
    for (const ws of this.clients) {
      ws.send(frame);
      ws.ping?.("keepalive");
    }
  }

  private async pollOnce(): Promise<void> {
    if (this.polling || this.clients.size === 0) return;
    this.polling = true;
    try {
      const res = await this.fetchImpl(this.feedUrl);
      if (!res.ok) throw new Error(`daemon feed failed: ${res.status}`);
      const feed = sanitizeFeedPayload(await res.json());
      this.broadcast(jsonFrame("feed", { at: Date.now(), feed }));
    } catch (error) {
      this.broadcast(jsonFrame("feed_error", { at: Date.now(), message: error instanceof Error ? error.message : String(error) }));
    } finally {
      this.polling = false;
    }
  }

  private broadcast(frame: string): void {
    for (const ws of this.clients) ws.send(frame);
  }
}

export function createServerOptions(options: ServerOptions = {}) {
  const hub = new FeedHub(options);
  return {
    fetch(req: Request, server: BoardServer) {
      return handleRequest(req, server, hub);
    },
    websocket: {
      open(ws: BoardWs) { ws.data.hub.add(ws); },
      message(ws: BoardWs, message: string | Buffer) {
        if (message.toString() === "ping") ws.data.hub.replyToClientPing(ws);
      },
      close(ws: BoardWs) { ws.data.hub.remove(ws); },
    },
  };
}

export async function handleRequest(req: Request, server?: BoardServer, hub?: FeedHub): Promise<Response | undefined> {
  const url = new URL(req.url);
  if (url.pathname === "/health") {
    return Response.json({ ok: true, plugin: "maw-serve", prefix: "/api/agora" });
  }

  if (url.pathname === "/api/agora/ws") {
    if (!server || !hub) return new Response("websocket server unavailable", { status: 500 });
    return server.upgrade(req, { data: { hub } }) ? undefined : new Response("upgrade failed", { status: 400 });
  }

  if (url.pathname === "/api/agora" || url.pathname === "/api/agora/") return serveIndex();
  if (url.pathname.startsWith("/api/agora/") && /\.[^/]+$/.test(url.pathname)) {
    return servePublicAsset(url.pathname);
  }
  if (url.pathname.startsWith("/api/agora/")) return serveIndex();

  return new Response("not found", { status: 404 });
}

if (import.meta.main) {
  Bun.serve({ port: PORT, ...createServerOptions() });
  console.log(`maw-serve board listening on :${PORT} (routes under /api/agora)`);
}
