import { afterEach, expect, test } from "bun:test";

import {
  BoardLinkRateLimiter,
  handleRequest,
  sendBoardHey,
} from "../server-demo";

const quietLogger = { info() {}, error() {} };
const localServer = { requestIP: () => ({ address: "127.0.0.1" }) };

function census(...names: string[]): unknown {
  return {
    schema: "maw.census.v1",
    displays: [{
      name: "test",
      spaces: [{
        name: "live",
        oracles: names.map((oracle) => ({ oracle })),
      }],
    }],
  };
}

function linkRequest(
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
): Request {
  return new Request("http://127.0.0.1:48901/api/agora/link", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  delete process.env.MAW_SERVE_CORS_ORIGINS;
});

test("unknown census oracles are rejected before any maw hey", async () => {
  const commands: string[][] = [];
  const response = await handleRequest(
    linkRequest({ from: "alpha", to: "missing-oracle", action: "connect" }),
    localServer,
    {
      census: async () => census("alpha", "beta"),
      limiter: new BoardLinkRateLimiter(),
      logger: quietLogger,
      sendHey: (target, message) => sendBoardHey(target, message, async (argv) => {
        commands.push(argv);
        return { exitCode: 0, stderr: "" };
      }),
    },
  );

  expect(response.status).toBe(400);
  expect(commands).toEqual([]);
});

test("unsafe census names and arbitrary message fields cannot reach maw hey", async () => {
  let sends = 0;
  const dependencies = {
    census: async () => census("alpha", "bad;target", "beta"),
    limiter: new BoardLinkRateLimiter(),
    logger: quietLogger,
    sendHey: async () => { sends += 1; },
  };
  const unsafeName = await handleRequest(
    linkRequest({ from: "alpha", to: "bad;target", action: "connect" }),
    localServer,
    dependencies,
  );
  const arbitraryText = await handleRequest(
    linkRequest({ from: "alpha", to: "beta", action: "connect", message: "user supplied" }),
    localServer,
    dependencies,
  );

  expect(unsafeName.status).toBe(400);
  expect(arbitraryText.status).toBe(400);
  expect(sends).toBe(0);
});

test("connect spawns exactly two argv-only board-tagged maw heys", async () => {
  const commands: string[][] = [];
  const logs: string[] = [];
  const response = await handleRequest(
    linkRequest({ from: "alpha", to: "beta", action: "connect" }),
    localServer,
    {
      census: async () => census("alpha", "beta"),
      limiter: new BoardLinkRateLimiter(),
      logger: { info: (message) => logs.push(String(message)), error() {} },
      sendHey: (target, message) => sendBoardHey(target, message, async (argv) => {
        commands.push(argv);
        return { exitCode: 0, stderr: "" };
      }),
    },
  );

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ ok: true, sent: ["beta", "alpha"] });
  expect(commands).toEqual([
    [
      "maw",
      "hey",
      "beta",
      "🔗 [board] alpha เชื่อมต่อมาหาคุณบนบอร์ด — มาทำงานด้วยกันนะ 🐾",
    ],
    ["maw", "hey", "alpha", "🔗 [board] คุณเชื่อมกับ beta แล้ว 🐾"],
  ]);
  expect(logs).toHaveLength(2);
  expect(logs.every((line) => line.startsWith("[board-link] connect alpha ↔ beta; notified "))).toBe(true);
});

test("an already-live unordered pair does not resend connect notifications", async () => {
  const limiter = new BoardLinkRateLimiter();
  const commands: string[][] = [];
  const dependencies = {
    census: async () => census("alpha", "beta"),
    limiter,
    logger: quietLogger,
    now: () => 10_000,
    sendHey: (target: string, message: string) => sendBoardHey(target, message, async (argv) => {
      commands.push(argv);
      return { exitCode: 0, stderr: "" };
    }),
  };

  const first = await handleRequest(
    linkRequest({ from: "alpha", to: "beta", action: "connect" }),
    localServer,
    dependencies,
  );
  const duplicate = await handleRequest(
    linkRequest({ from: "beta", to: "alpha", action: "connect" }),
    localServer,
    dependencies,
  );

  expect(first.status).toBe(200);
  expect(await first.json()).toEqual({ ok: true, sent: ["beta", "alpha"] });
  expect(duplicate.status).toBe(200);
  expect(await duplicate.json()).toEqual({ ok: true, sent: [] });
  expect(commands).toHaveLength(2);
});

test("abandoned live-pair state expires and permits a later notification", async () => {
  const limiter = new BoardLinkRateLimiter(60_000, 0, 10, 1_000);
  let now = 0;
  let sends = 0;
  const dependencies = {
    census: async () => census("alpha", "beta"),
    limiter,
    logger: quietLogger,
    now: () => now,
    sendHey: async () => { sends += 1; },
  };

  const connect = () => handleRequest(
    linkRequest({ from: "alpha", to: "beta", action: "connect" }),
    localServer,
    dependencies,
  );
  expect((await connect()).status).toBe(200);
  now = 999;
  expect(await (await connect()).json()).toEqual({ ok: true, sent: [] });
  now = 2_000;
  expect((await connect()).status).toBe(200);

  expect(sends).toBe(4);
});

test("disconnect clears a live pair so a later connect notifies again", async () => {
  const limiter = new BoardLinkRateLimiter();
  let now = 10_000;
  const actions: string[] = [];
  const dependencies = {
    census: async () => census("alpha", "beta"),
    limiter,
    logger: quietLogger,
    now: () => now,
    sendHey: async (_target: string, message: string) => { actions.push(message); },
  };

  for (const action of ["connect", "disconnect", "connect"] as const) {
    const response = await handleRequest(
      linkRequest({ from: "alpha", to: "beta", action }),
      localServer,
      dependencies,
    );
    expect(response.status).toBe(200);
    now += 2_000;
  }

  expect(actions.filter((message) => message.startsWith("🔗 [board]"))).toHaveLength(4);
  expect(actions.filter((message) => message.startsWith("🔌 [board]"))).toHaveLength(2);
});

test("disconnect notifies both ends with the fixed unplug template", async () => {
  const commands: string[][] = [];
  const response = await handleRequest(
    linkRequest({ from: "alpha", to: "beta", action: "disconnect" }),
    localServer,
    {
      census: async () => census("alpha", "beta"),
      limiter: new BoardLinkRateLimiter(),
      logger: quietLogger,
      sendHey: (target, message) => sendBoardHey(target, message, async (argv) => {
        commands.push(argv);
        return { exitCode: 0, stderr: "" };
      }),
    },
  );

  expect(response.status).toBe(200);
  expect(commands).toEqual([
    ["maw", "hey", "beta", "🔌 [board] alpha ↔ beta ถอดการเชื่อมต่อแล้ว"],
    ["maw", "hey", "alpha", "🔌 [board] alpha ↔ beta ถอดการเชื่อมต่อแล้ว"],
  ]);
});

test("unordered oracle pairs are capped at ten notifications per minute", async () => {
  const limiter = new BoardLinkRateLimiter(60_000, 0, 10);
  let now = 0;
  let sends = 0;
  const dependencies = {
    census: async () => census("alpha", "beta"),
    limiter,
    logger: quietLogger,
    now: () => now,
    sendHey: async () => { sends += 1; },
  };

  for (let index = 0; index < 10; index += 1) {
    now = index * 1_000;
    const response = await handleRequest(
      linkRequest({
        from: "alpha",
        to: "beta",
        action: index % 2 === 0 ? "connect" : "disconnect",
      }),
      localServer,
      dependencies,
    );
    expect(response.status).toBe(200);
  }

  now = 10_000;
  const limited = await handleRequest(
    linkRequest({ from: "beta", to: "alpha", action: "connect" }),
    localServer,
    dependencies,
  );
  expect(limited.status).toBe(429);
  expect(limited.headers.get("retry-after")).toBe("50");
  expect(sends).toBe(20);
});

test("rapid duplicate pair writes are debounced", async () => {
  const limiter = new BoardLinkRateLimiter();
  let sends = 0;
  const dependencies = {
    census: async () => census("alpha", "beta"),
    limiter,
    logger: quietLogger,
    now: () => 10_000,
    sendHey: async () => { sends += 1; },
  };
  const first = await handleRequest(
    linkRequest({ from: "alpha", to: "beta", action: "connect" }),
    localServer,
    dependencies,
  );
  const duplicate = await handleRequest(
    linkRequest({ from: "beta", to: "alpha", action: "disconnect" }),
    localServer,
    dependencies,
  );

  expect(first.status).toBe(200);
  expect(duplicate.status).toBe(429);
  expect(sends).toBe(2);
});

test("write preflight uses the allowlist and remote or untrusted writes fail closed", async () => {
  const allowedOrigin = "https://stoa.example.com";
  process.env.MAW_SERVE_CORS_ORIGINS = allowedOrigin;
  const preflight = await handleRequest(new Request(
    "http://127.0.0.1:48901/api/agora/link",
    {
      method: "OPTIONS",
      headers: {
        origin: allowedOrigin,
        "access-control-request-method": "POST",
        "access-control-request-headers": "content-type",
        "access-control-request-private-network": "true",
      },
    },
  ));
  expect(preflight.status).toBe(204);
  expect(preflight.headers.get("access-control-allow-origin")).toBe(allowedOrigin);
  expect(preflight.headers.get("access-control-allow-methods")).toBe("POST, OPTIONS");

  let censusReads = 0;
  const dependencies = {
    census: async () => { censusReads += 1; return census("alpha", "beta"); },
    limiter: new BoardLinkRateLimiter(),
    logger: quietLogger,
    sendHey: async () => {},
  };
  const untrustedOrigin = await handleRequest(
    linkRequest(
      { from: "alpha", to: "beta", action: "connect" },
      { origin: "https://attacker.example" },
    ),
    localServer,
    dependencies,
  );
  const remotePeer = await handleRequest(
    linkRequest({ from: "alpha", to: "beta", action: "connect" }),
    { requestIP: () => ({ address: "192.0.2.10" }) },
    dependencies,
  );
  expect(untrustedOrigin.status).toBe(403);
  expect(remotePeer.status).toBe(403);
  expect(censusReads).toBe(0);
});
