import { afterEach, expect, test } from "bun:test";

import { handleRequest } from "../server-demo";

const ALLOWED_ORIGIN = "https://stoa.example.com";

afterEach(() => {
  delete process.env.MAW_SERVE_CORS_ORIGINS;
});

test("allowlisted origins are echoed without credentials or wildcard", async () => {
  process.env.MAW_SERVE_CORS_ORIGINS = `${ALLOWED_ORIGIN}, https://other.example`;
  const response = await handleRequest(new Request("http://localhost/health", {
    headers: { Origin: ALLOWED_ORIGIN },
  }));

  expect(response.status).toBe(200);
  expect(response.headers.get("access-control-allow-origin")).toBe(ALLOWED_ORIGIN);
  expect(response.headers.get("access-control-allow-credentials")).toBeNull();
  expect(response.headers.get("vary")).toContain("Origin");
});

test("unlisted and same-origin requests receive no CORS grant", async () => {
  process.env.MAW_SERVE_CORS_ORIGINS = ALLOWED_ORIGIN;
  const unlisted = await handleRequest(new Request("http://localhost/health", {
    headers: { Origin: "https://attacker.example" },
  }));
  const sameOrigin = await handleRequest(new Request("http://localhost/health"));

  expect(unlisted.headers.get("access-control-allow-origin")).toBeNull();
  expect(sameOrigin.headers.get("access-control-allow-origin")).toBeNull();
});

test("allowlisted PNA preflight permits only read routes", async () => {
  process.env.MAW_SERVE_CORS_ORIGINS = ALLOWED_ORIGIN;
  const response = await handleRequest(new Request("http://localhost/api/agora/stream", {
    method: "OPTIONS",
    headers: {
      Origin: ALLOWED_ORIGIN,
      "Access-Control-Request-Method": "GET",
      "Access-Control-Request-Private-Network": "true",
    },
  }));

  expect(response.status).toBe(204);
  expect(response.headers.get("access-control-allow-origin")).toBe(ALLOWED_ORIGIN);
  expect(response.headers.get("access-control-allow-private-network")).toBe("true");
  expect(response.headers.get("access-control-allow-methods")).toBe("GET, OPTIONS");
  expect(response.headers.get("access-control-allow-credentials")).toBeNull();
});

test("SSE errors retain CORS headers and denied preflights fail closed", async () => {
  process.env.MAW_SERVE_CORS_ORIGINS = ALLOWED_ORIGIN;
  const stream = await handleRequest(new Request(
    "http://localhost/api/agora/stream?session=bad%3Bsession&window=1",
    { headers: { Origin: ALLOWED_ORIGIN } },
  ));
  const denied = await handleRequest(new Request("http://localhost/api/agora/census", {
    method: "OPTIONS",
    headers: {
      Origin: "https://attacker.example",
      "Access-Control-Request-Method": "GET",
      "Access-Control-Request-Private-Network": "true",
    },
  }));

  expect(stream.status).toBe(400);
  expect(stream.headers.get("access-control-allow-origin")).toBe(ALLOWED_ORIGIN);
  expect(denied.status).toBe(403);
  expect(denied.headers.get("access-control-allow-origin")).toBeNull();
  expect(denied.headers.get("access-control-allow-private-network")).toBeNull();
});
