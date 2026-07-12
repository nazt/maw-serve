import { execFileSync } from "node:child_process";
import { basename, resolve } from "node:path";

export interface StoaBuildIdentity {
  branch: string;
  commit: string;
  builder: string;
  buildTime: string;
}

export interface ResolveBuildIdentityOptions {
  cwd?: string;
  dev?: boolean;
  env?: Record<string, string | undefined>;
  now?: Date;
}

function gitOutput(cwd: string, args: string[]): string | null {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

function git(cwd: string, args: string[]): string | null {
  return gitOutput(cwd, args) || null;
}

export function resolveBuildIdentity({
  cwd = resolve(process.cwd()),
  dev = false,
  env = process.env,
  now = new Date(),
}: ResolveBuildIdentityOptions = {}): StoaBuildIdentity {
  const resolvedCwd = resolve(cwd);
  const builder = env.STOA_BUILDER?.trim() || basename(resolvedCwd);
  if (dev) {
    return { branch: "dev", commit: "dev", builder, buildTime: "dev" };
  }

  const commit = git(resolvedCwd, ["rev-parse", "--short", "HEAD"]) ?? "unknown";
  const status = gitOutput(resolvedCwd, ["status", "--porcelain=v1", "--untracked-files=normal"]);

  return {
    branch: git(resolvedCwd, ["rev-parse", "--abbrev-ref", "HEAD"]) ?? "unknown",
    commit: commit !== "unknown" && status ? `${commit}+dirty` : commit,
    builder,
    buildTime: now.toISOString(),
  };
}
