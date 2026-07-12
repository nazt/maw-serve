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

function git(cwd: string, args: string[]): string | null {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim() || null;
  } catch {
    return null;
  }
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

  return {
    branch: git(resolvedCwd, ["rev-parse", "--abbrev-ref", "HEAD"]) ?? "unknown",
    commit: git(resolvedCwd, ["rev-parse", "--short", "HEAD"]) ?? "unknown",
    builder,
    buildTime: now.toISOString(),
  };
}
