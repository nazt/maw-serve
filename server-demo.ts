const PORT = Number(process.env.MAW_SERVE_PORT ?? 4756);
const PUBLIC_DIR = `${import.meta.dir}/public`;
const USAGE_URL = "https://argus.buildwithoracle.com/api/board-tile?window_h=6";
const USAGE_CACHE_MS = 8_000;

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

export async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  if (url.pathname === "/health") {
    return Response.json({ ok: true, plugin: "maw-serve", prefix: "/api/agora" });
  }

  if (url.pathname === "/api/agora/census") return censusResponse();
  if (url.pathname === "/api/agora/usage") return usageResponse();
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
