const BASE_PATH = "/api/agora";
const DATA_PATHS = new Set([
  `${BASE_PATH}/census`,
  `${BASE_PATH}/usage`,
  `${BASE_PATH}/capture`,
  `${BASE_PATH}/stream`,
  `${BASE_PATH}/version`,
]);

function assetRequest(request, pathname) {
  const url = new URL(request.url);
  url.pathname = pathname;
  return new Request(url, request);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      url.pathname = `${BASE_PATH}/`;
      return Response.redirect(url, 302);
    }

    if (DATA_PATHS.has(url.pathname)) {
      return Response.json(
        { error: "local maw-serve host required", hint: "?host=http://localhost:48900" },
        { status: 404, headers: { "cache-control": "no-store" } },
      );
    }

    if (url.pathname === BASE_PATH || url.pathname === `${BASE_PATH}/`) {
      return env.ASSETS.fetch(assetRequest(request, "/"));
    }

    if (url.pathname.startsWith(`${BASE_PATH}/`)) {
      const assetPath = url.pathname.slice(BASE_PATH.length) || "/index.html";
      return env.ASSETS.fetch(assetRequest(request, assetPath));
    }

    return new Response("not found", { status: 404 });
  },
};
