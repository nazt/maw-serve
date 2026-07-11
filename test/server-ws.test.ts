import { afterEach, expect, test } from "bun:test";
import { createServerOptions } from "../server";

const servers: Bun.Server<{ hub: unknown }>[] = [];
afterEach(() => {
  while (servers.length) servers.pop()?.stop(true);
});

function startTestServer(feed: unknown, feedPollMs = 25, keepaliveMs = 25): Bun.Server<{ hub: unknown }> {
  const server = Bun.serve({
    port: 0,
    ...createServerOptions({
      daemonUrl: "http://daemon.test",
      feedPollMs,
      keepaliveMs,
      fetchImpl: async () => Response.json(feed),
    }),
  });
  servers.push(server);
  return server;
}

function waitForMessage(ws: WebSocket, predicate: (frame: any) => boolean): Promise<any> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("timed out waiting for websocket frame")), 1_000);
    ws.addEventListener("message", (event) => {
      const frame = JSON.parse(event.data.toString());
      if (!predicate(frame)) return;
      clearTimeout(timeout);
      resolve(frame);
    });
  });
}

function openWs(url: string): Promise<WebSocket> {
  const ws = new WebSocket(url);
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("timed out opening websocket")), 1_000);
    ws.addEventListener("open", () => {
      clearTimeout(timeout);
      resolve(ws);
    });
    ws.addEventListener("error", reject);
  });
}

test("GET /api/agora/ws pushes sanitized daemon feed frames", async () => {
  const server = startTestServer({ events: [{ kind: "pane", pane_title: "raw title", token: "secret" }] });
  const ws = await openWs(`ws://127.0.0.1:${server.port}/api/agora/ws`);
  const frame = await waitForMessage(ws, (msg) => msg.type === "feed");
  ws.close();

  expect(frame.feed.events[0].pane_title).toBe("[redacted]");
  expect(frame.feed.events[0].token).toBe("[redacted]");
});

test("GET /api/agora/ws replies pong to client ping", async () => {
  const server = startTestServer({ events: [] });
  const ws = await openWs(`ws://127.0.0.1:${server.port}/api/agora/ws`);
  const pong = waitForMessage(ws, (msg) => msg.type === "pong");
  ws.send("ping");
  expect(await pong).toMatchObject({ type: "pong" });
  ws.close();
});
