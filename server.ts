const PORT = Number(process.env.MAW_SERVE_PORT ?? 4756);
const PUBLIC_DIR = `${import.meta.dir}/public`;

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

export async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  if (url.pathname === "/health") {
    return Response.json({ ok: true, plugin: "maw-serve", prefix: "/api/agora" });
  }

  if (url.pathname === "/api/agora" || url.pathname === "/api/agora/") return serveIndex();
  if (url.pathname.startsWith("/api/agora/") && /\.[^/]+$/.test(url.pathname)) {
    return servePublicAsset(url.pathname);
  }
  if (url.pathname.startsWith("/api/agora/")) return serveIndex();

  return new Response("not found", { status: 404 });
}

if (import.meta.main) {
  Bun.serve({ port: PORT, fetch: handleRequest });
  console.log(`maw-serve board listening on :${PORT} (routes under /api/agora)`);
}
