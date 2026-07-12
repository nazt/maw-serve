const PORT = Number(process.env.MAW_SERVE_PORT ?? 4756);
const PUBLIC_DIR = `${import.meta.dir}/public`;
const USAGE_URL = "https://argus.buildwithoracle.com/api/board-tile?window_h=6";
const USAGE_CACHE_MS = 8_000;
const CAPTURE_CACHE_MS = 2_000;
const DEFAULT_CAPTURE_LINES = 80;
const MAX_CAPTURE_LINES = 500;

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

let usageCache: { data: unknown; expiresAt: number } | undefined;
let usageRequest: Promise<unknown> | undefined;
const captureCache = new Map<string, { text: string; expiresAt: number }>();
const captureRequests = new Map<string, Promise<string>>();

const CAPTURE_HEADERS = {
  "cache-control": "private, max-age=2",
  "x-agora-content-warning": "explicit-user-requested-pane-snapshot",
};

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

async function censusResponse(): Promise<Response> {
  const process = Bun.spawn(["maw", "census", "--json"], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited,
  ]);

  if (exitCode !== 0) {
    console.error(`maw census failed (${exitCode}): ${stderr.trim()}`);
    return Response.json({ error: "census unavailable" }, { status: 502 });
  }

  try {
    return Response.json(JSON.parse(stdout), { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("maw census returned invalid JSON", error);
    return Response.json({ error: "census returned invalid JSON" }, { status: 502 });
  }
}

async function fetchUsage(): Promise<unknown> {
  const response = await fetch(USAGE_URL);
  if (!response.ok) throw new Error(`Argus returned HTTP ${response.status}`);
  return response.json();
}

async function usageResponse(): Promise<Response> {
  const now = Date.now();
  if (usageCache && usageCache.expiresAt > now) {
    return Response.json(usageCache.data, { headers: { "cache-control": "public, max-age=8" } });
  }

  usageRequest ??= fetchUsage();
  try {
    const data = await usageRequest;
    usageCache = { data, expiresAt: Date.now() + USAGE_CACHE_MS };
    return Response.json(data, { headers: { "cache-control": "public, max-age=8" } });
  } catch (error) {
    console.error("Argus usage fetch failed", error);
    return Response.json({ error: "usage unavailable" }, { status: 502 });
  } finally {
    usageRequest = undefined;
  }
}

function captureTarget(session: string | null, window: string | null): string | null {
  if (!session || !window) return null;
  if (!/^[\w.-]+$/.test(session)) return null;
  if (!/^(?:%\d+|[\w.-]+)$/.test(window)) return null;

  // Census exposes tmux pane IDs (for example %2457). Those IDs are globally
  // addressable, while ordinary window names/indexes need the session prefix.
  return window.startsWith("%") ? window : `${session}:${window}`;
}

function captureLines(rawLines: string | null): number | null {
  if (rawLines === null || rawLines === "") return DEFAULT_CAPTURE_LINES;
  if (!/^\d+$/.test(rawLines)) return null;
  const lines = Number(rawLines);
  return lines >= 1 && lines <= MAX_CAPTURE_LINES ? lines : null;
}

function stripAnsi(text: string): string {
  // Terminal snapshots are rendered as plain monospace text in v1.
  return text.replace(/[\u001B\u009B][[\]()#;?]*(?:(?:(?:[a-zA-Z\d]*(?:;[-a-zA-Z\d\/#&.:=?%@~_]+)*)?\u0007)|(?:(?:\d{1,4}(?:[;:]\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g, "");
}

async function runCapture(target: string, lines: number): Promise<string> {
  const process = Bun.spawn(["maw", "peek", target, "--lines", String(lines)], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited,
  ]);

  if (exitCode !== 0) {
    throw new Error(stderr.trim() || `maw peek exited with code ${exitCode}`);
  }
  return stripAnsi(stdout);
}

async function captureResponse(url: URL): Promise<Response> {
  const session = url.searchParams.get("session")?.trim() || null;
  const window = url.searchParams.get("window")?.trim() || null;
  const target = captureTarget(session, window);
  const lines = captureLines(url.searchParams.get("lines"));
  if (!target || lines === null) {
    return Response.json(
      { error: "session, window, and lines (1-500) are required and must be valid" },
      { status: 400, headers: CAPTURE_HEADERS },
    );
  }

  const key = `${target}\0${lines}`;
  const cached = captureCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return Response.json({ text: cached.text }, { headers: CAPTURE_HEADERS });
  }

  let request = captureRequests.get(key);
  if (!request) {
    request = runCapture(target, lines);
    captureRequests.set(key, request);
  }

  try {
    const text = await request;
    captureCache.set(key, { text, expiresAt: Date.now() + CAPTURE_CACHE_MS });
    return Response.json({ text }, { headers: CAPTURE_HEADERS });
  } catch (error) {
    console.error(`maw peek failed for ${target}`, error);
    return Response.json({ error: "pane snapshot unavailable" }, { status: 502, headers: CAPTURE_HEADERS });
  } finally {
    if (captureRequests.get(key) === request) captureRequests.delete(key);
  }
}

export async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  if (url.pathname === "/health") {
    return Response.json({ ok: true, plugin: "maw-serve", prefix: "/api/agora" });
  }

  if (url.pathname === "/api/agora/census") return censusResponse();
  if (url.pathname === "/api/agora/usage") return usageResponse();
  if (url.pathname === "/api/agora/capture") return captureResponse(url);
  if (url.pathname === "/api/agora" || url.pathname === "/api/agora/") return serveIndex();
  if (url.pathname.startsWith("/api/agora/") && /\.[^/]+$/.test(url.pathname)) {
    return servePublicAsset(url.pathname);
  }
  if (url.pathname.startsWith("/api/agora/")) return serveIndex();

  return new Response("not found", { status: 404 });
}

if (import.meta.main) {
  Bun.serve({ port: PORT, fetch: handleRequest });
  console.log(`maw-serve demo board listening on :${PORT} (routes under /api/agora)`);
}
