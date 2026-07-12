import { expect, test } from "bun:test";

import { resolveBuildIdentity } from "../build-identity";
import { handleRequest } from "../server-demo";

const repoRoot = `${import.meta.dir}/..`;

test("production build identity reads git and the worktree builder", () => {
  const identity = resolveBuildIdentity({
    cwd: repoRoot,
    env: {},
    now: new Date("2026-07-12T00:00:00.000Z"),
  });

  expect(identity.branch).not.toBe("unknown");
  expect(identity.commit).toMatch(/^[0-9a-f]{7,}$/);
  expect(identity.builder).toBe("stoa-server");
  expect(identity.buildTime).toBe("2026-07-12T00:00:00.000Z");
});

test("development identity is explicit and honors a builder override", () => {
  expect(resolveBuildIdentity({
    cwd: repoRoot,
    dev: true,
    env: { STOA_BUILDER: "m5" },
  })).toEqual({
    branch: "dev",
    commit: "dev",
    builder: "m5",
    buildTime: "dev",
  });
});

test("version endpoint reports identity and the served public path", async () => {
  const response = await handleRequest(new Request("http://localhost/api/agora/version"));
  const payload = await response.json() as Record<string, unknown>;

  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(typeof payload.branch).toBe("string");
  expect(typeof payload.commit).toBe("string");
  expect(typeof payload.builder).toBe("string");
  expect(typeof payload.buildTime).toBe("string");
  expect(payload.servedFrom).toBe(`${process.cwd()}/public`);
});
