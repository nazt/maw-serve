import { expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

import { resolveBuildIdentity } from "../build-identity";
import { handleRequest } from "../server-demo";

const repoRoot = `${import.meta.dir}/..`;
const worktreeName = basename(resolve(repoRoot));

function git(cwd: string, args: string[]): void {
  execFileSync("git", args, { cwd, stdio: "ignore" });
}

function withGitRepo(run: (cwd: string) => void): void {
  const cwd = mkdtempSync(join(tmpdir(), "stoa-build-identity-"));
  try {
    git(cwd, ["init", "-q"]);
    git(cwd, ["config", "user.email", "stoa-test@example.invalid"]);
    git(cwd, ["config", "user.name", "Stoa Test"]);
    writeFileSync(join(cwd, "tracked.txt"), "clean\n");
    git(cwd, ["add", "tracked.txt"]);
    git(cwd, ["commit", "-qm", "fixture"]);
    run(cwd);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

test("production build identity reads git and the worktree builder", () => {
  const identity = resolveBuildIdentity({
    cwd: repoRoot,
    env: {},
    now: new Date("2026-07-12T00:00:00.000Z"),
  });

  expect(identity.branch).not.toBe("unknown");
  expect(identity.commit).toMatch(/^[0-9a-f]{7,}(?:\+dirty)?$/);
  expect(identity.builder).toBe(worktreeName);
  expect(identity.buildTime).toBe("2026-07-12T00:00:00.000Z");
});

test("clean git trees use the plain short commit", () => {
  withGitRepo((cwd) => {
    const identity = resolveBuildIdentity({ cwd, env: {} });
    expect(identity.commit).toMatch(/^[0-9a-f]{7,}$/);
    expect(identity.commit.endsWith("+dirty")).toBe(false);
  });
});

test("uncommitted git trees append the dirty marker", () => {
  withGitRepo((cwd) => {
    writeFileSync(join(cwd, "tracked.txt"), "modified\n");
    expect(resolveBuildIdentity({ cwd, env: {} }).commit).toMatch(/^[0-9a-f]{7,}\+dirty$/);

    git(cwd, ["checkout", "--", "tracked.txt"]);
    writeFileSync(join(cwd, "untracked.txt"), "untracked\n");
    expect(resolveBuildIdentity({ cwd, env: {} }).commit).toMatch(/^[0-9a-f]{7,}\+dirty$/);
  });
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
