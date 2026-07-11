import { loadCensusTopology } from "./src/census/topology";

const PORT = Number(process.env.MAW_SERVE_PORT ?? 4756);

export async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);

  if (req.method === "GET" && url.pathname === "/api/agora/census") {
    return Response.json(await loadCensusTopology());
  }

  if (req.method === "GET" && url.pathname === "/health") {
    return Response.json({ ok: true, plugin: "maw-serve", prefix: "/api/agora" });
  }

  return new Response("not found", { status: 404 });
}

if (import.meta.main) {
  Bun.serve({ port: PORT, fetch: handleRequest });
  console.log(`maw-serve board listening on :${PORT} (routes under /api/agora)`);
}
