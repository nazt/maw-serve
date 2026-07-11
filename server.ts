const PORT = Number(process.env.MAW_SERVE_PORT ?? 4756);

Bun.serve({
  port: PORT,
  fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/health") {
      return Response.json({ ok: true, plugin: "maw-serve", prefix: "/api/agora" });
    }
    return new Response("not found", { status: 404 });
  },
});

console.log(`maw-serve board listening on :${PORT} (routes under /api/agora)`);
