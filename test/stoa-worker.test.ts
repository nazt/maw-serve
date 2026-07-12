import { expect, test } from "bun:test";

import worker from "../worker/stoa-static.js";

function assets() {
  const paths: string[] = [];
  return {
    paths,
    binding: {
      fetch(request: Request) {
        const url = new URL(request.url);
        paths.push(url.pathname);
        if (url.pathname === "/index.html") {
          return Promise.resolve(Response.redirect(new URL("/", url), 307));
        }
        return Promise.resolve(new Response("asset", { status: 200 }));
      },
    },
  };
}

test("Cloudflare root redirects into the Vite base path", async () => {
  const mock = assets();
  const response = await worker.fetch(
    new Request("https://stoa.example.com/?host=http://localhost:48900"),
    { ASSETS: mock.binding },
  );

  expect(response.status).toBe(302);
  expect(response.headers.get("location"))
    .toBe("https://stoa.example.com/api/agora/?host=http://localhost:48900");
});

test("Cloudflare rewrites the Vite base path to public assets", async () => {
  const mock = assets();
  const board = await worker.fetch(new Request("https://stoa.example.com/api/agora/"), {
    ASSETS: mock.binding,
  });
  await worker.fetch(new Request("https://stoa.example.com/api/agora/assets/app.js"), {
    ASSETS: mock.binding,
  });

  expect(board.status).toBe(200);
  expect(mock.paths).toEqual(["/", "/assets/app.js"]);
});

test("Cloudflare never impersonates a local data endpoint", async () => {
  const mock = assets();
  const response = await worker.fetch(
    new Request("https://stoa.example.com/api/agora/census"),
    { ASSETS: mock.binding },
  );

  expect(response.status).toBe(404);
  expect(await response.json()).toMatchObject({ error: "local maw-serve host required" });
  expect(mock.paths).toEqual([]);
});
