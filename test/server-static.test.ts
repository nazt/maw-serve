import { expect, test } from "bun:test";
import { handleRequest } from "../server";

async function bodyAndType(pathname: string) {
  const res = await handleRequest(new Request(`http://localhost${pathname}`));
  if (!res) throw new Error("expected HTTP response");
  return { res, body: await res.text(), type: res.headers.get("content-type") ?? "" };
}

test("GET /api/agora/ returns placeholder SPA shell", async () => {
  const { res, body, type } = await bodyAndType("/api/agora/");
  expect(res.status).toBe(200);
  expect(type).toContain("text/html");
  expect(body).toContain("Stoa board — placeholder");
});

test("GET /api/agora/some/deep/route falls back to SPA shell", async () => {
  const { res, body, type } = await bodyAndType("/api/agora/some/deep/route");
  expect(res.status).toBe(200);
  expect(type).toContain("text/html");
  expect(body).toContain("Stoa board — placeholder");
});

test("GET /api/agora/app.js returns real JS asset", async () => {
  const { res, body, type } = await bodyAndType("/api/agora/app.js");
  expect(res.status).toBe(200);
  expect(type).toContain("application/javascript");
  expect(body).toContain("Stoa board placeholder loaded");
});
