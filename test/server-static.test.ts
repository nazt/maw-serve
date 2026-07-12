import { expect, test } from "bun:test";
import { handleRequest } from "../server";
import { handleRequest as handleDemoRequest } from "../server-demo";

async function bodyAndType(pathname: string) {
  const res = await handleRequest(new Request(`http://localhost${pathname}`));
  return { res, body: await res.text(), type: res.headers.get("content-type") ?? "" };
}

test("GET /api/agora/ returns the built SPA shell", async () => {
  const { res, body, type } = await bodyAndType("/api/agora/");
  expect(res.status).toBe(200);
  expect(type).toContain("text/html");
  expect(body).toContain("<title>STOA · board</title>");
  expect(body).toContain('<div id="root"></div>');
});

test("GET /api/agora/some/deep/route falls back to SPA shell", async () => {
  const { res, body, type } = await bodyAndType("/api/agora/some/deep/route");
  expect(res.status).toBe(200);
  expect(type).toContain("text/html");
  expect(body).toContain('<div id="root"></div>');
});

test("unknown API requests never receive the SPA fallback", async () => {
  for (const handler of [handleRequest, handleDemoRequest]) {
    for (const accept of ["text/event-stream", "application/json"]) {
      const res = await handler(new Request("http://localhost/api/agora/not-a-route", {
        headers: { Accept: accept },
      }));
      expect(res.status).toBe(404);
      expect(res.headers.get("content-type")).toContain("application/json");
      expect(await res.json()).toEqual({ error: "api route not found" });
    }
  }
});

test("GET serves the hashed JS referenced by the SPA shell", async () => {
  const { body: index } = await bodyAndType("/api/agora/");
  const assetPath = index.match(/src="(\/api\/agora\/assets\/[^"]+\.js)"/)?.[1];
  expect(assetPath).toBeTruthy();

  const { res, body, type } = await bodyAndType(assetPath!);
  expect(res.status).toBe(200);
  expect(type).toContain("application/javascript");
  expect(body.length).toBeGreaterThan(1_000);
});
