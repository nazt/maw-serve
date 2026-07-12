import { unlinkSync } from "node:fs";

import { resolveBuildIdentity, type StoaBuildIdentity } from "./build-identity";
import { redactSecrets } from "./src/redact";

const PORT = Number(process.env.MAW_SERVE_PORT ?? 48_901);
const PUBLIC_DIR = `${import.meta.dir}/public`;
const BUILD_IDENTITY_PATH = `${PUBLIC_DIR}/stoa-build.json`;
const USAGE_URL = "https://argus.buildwithoracle.com/api/board-tile?window_h=6";
const MIRROR_SPACES_URL = process.env.STOA_MIRROR_SPACES_URL ?? "http://127.0.0.1:8899/api/spaces";
const MIRROR_ORACLES_URL = process.env.STOA_MIRROR_ORACLES_URL ?? "http://127.0.0.1:8899/api/oracles";
const USAGE_CACHE_MS = 8_000;
const CAPTURE_CACHE_MS = 2_000;
const DEFAULT_CAPTURE_LINES = 80;
const MAX_CAPTURE_LINES = 500;
const STREAM_POLL_MS = 300;
const STREAM_HEARTBEAT_MS = 15_000;
const MAX_STREAM_CLIENTS = 24;
const STREAM_REPLAY_EVENTS = 256;
const STREAM_REPLAY_BYTES = 512 * 1024;
const STREAM_CLEAR = "\u001b[2J\u001b[H";
const CORS_ALLOWLIST_ENV = "MAW_SERVE_CORS_ORIGINS";
const READ_CORS_METHODS = "GET, OPTIONS";
const READ_CORS_HEADERS = "Accept, Cache-Control, Last-Event-ID";
const LINK_PATH = "/api/agora/link";
const LINK_CORS_METHODS = "POST, OPTIONS";
const LINK_CORS_HEADERS = "Content-Type";
const LINK_BODY_MAX_BYTES = 4_096;
const LINK_RATE_WINDOW_MS = 60_000;
const LINK_RATE_DEBOUNCE_MS = 1_500;
const LINK_RATE_MAX_PER_WINDOW = 10;

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

let usageCache: { data: unknown; expiresAt: number } | undefined;
let usageRequest: Promise<unknown> | undefined;
const captureCache = new Map<string, { text: string; expiresAt: number }>();
const captureRequests = new Map<string, Promise<string>>();

const CAPTURE_HEADERS = {
  "cache-control": "private, max-age=2",
  "x-agora-content-warning": "explicit-user-requested-pane-snapshot",
};
const STREAM_HEADERS = {
  "content-type": "text/event-stream; charset=utf-8",
  "cache-control": "no-cache",
  connection: "keep-alive",
  "x-accel-buffering": "no",
  "x-agora-content-warning": "explicit-user-requested-pane-snapshot",
};
const textEncoder = new TextEncoder();

export async function mirrorResponse(upstreamUrl: string): Promise<Response> {
  try {
    const upstream = await fetch(upstreamUrl, {
      headers: { Accept: "application/json" },
    });
    if (!upstream.ok) throw new Error(`display-census returned ${upstream.status}`);
    return new Response(upstream.body, {
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch (cause) {
    return Response.json({
      error: "display census unavailable",
      detail: cause instanceof Error ? cause.message : String(cause),
    }, { status: 502, headers: { "cache-control": "no-store" } });
  }
}

function configuredCorsOrigins(): Set<string> {
  const origins = new Set<string>();
  for (const value of String(process.env[CORS_ALLOWLIST_ENV] ?? "").split(",")) {
    const candidate = value.trim().replace(/\/+$/, "");
    if (!candidate || candidate === "*") continue;
    try {
      const url = new URL(candidate);
      if (/^https?:$/.test(url.protocol) && url.origin === candidate) origins.add(candidate);
    } catch {
      // Invalid allowlist entries are ignored rather than weakening to a wildcard.
    }
  }
  return origins;
}

export function allowedCorsOrigin(req: Request): string | null {
  const origin = req.headers.get("origin")?.trim().replace(/\/+$/, "") ?? "";
  return origin && configuredCorsOrigins().has(origin) ? origin : null;
}

function appendVary(headers: Headers, value: string): void {
  const current = headers.get("vary")?.split(",").map((entry) => entry.trim()).filter(Boolean) ?? [];
  if (!current.some((entry) => entry.toLowerCase() === value.toLowerCase())) current.push(value);
  headers.set("vary", current.join(", "));
}

function withCors(req: Request, response: Response): Response {
  const origin = allowedCorsOrigin(req);
  if (!origin) return response;

  const headers = new Headers(response.headers);
  headers.set("access-control-allow-origin", origin);
  appendVary(headers, "Origin");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function preflightResponse(req: Request): Response {
  const origin = allowedCorsOrigin(req);
  if (!origin) {
    return new Response(null, { status: 403, headers: { vary: "Origin" } });
  }

  const requestedMethod = req.headers.get("access-control-request-method")?.toUpperCase() ?? "GET";
  const isLinkRequest = new URL(req.url).pathname === LINK_PATH;
  const allowedMethod = isLinkRequest ? "POST" : "GET";
  const allowedMethods = isLinkRequest ? LINK_CORS_METHODS : READ_CORS_METHODS;
  if (requestedMethod !== allowedMethod) {
    return withCors(req, new Response(null, { status: 405, headers: { allow: allowedMethods } }));
  }

  const headers = new Headers({
    "access-control-allow-methods": allowedMethods,
    "access-control-allow-headers": isLinkRequest ? LINK_CORS_HEADERS : READ_CORS_HEADERS,
    "access-control-allow-private-network": "true",
    "access-control-max-age": "600",
  });
  appendVary(headers, "Access-Control-Request-Method");
  appendVary(headers, "Access-Control-Request-Headers");
  appendVary(headers, "Access-Control-Request-Private-Network");
  return withCors(req, new Response(null, { status: 204, headers }));
}

interface StreamSubscriber {
  controller: ReadableStreamDefaultController<Uint8Array>;
  closed: boolean;
  ready: boolean;
  detachAbort: () => void;
}

export interface PaneDimensions {
  cols: number;
  rows: number;
}

interface SharedTail {
  key: string;
  target: string;
  lines: number;
  lastFrame: string | null;
  lastSnapshotAt: number;
  lastSnapshotLines: number;
  snapshotRequest: { lines: number; promise: Promise<string> } | null;
  subscribers: Set<StreamSubscriber>;
  stopped: boolean;
  sourceStarted: boolean;
  stopSource: (() => void) | null;
  heartbeat: ReturnType<typeof setInterval> | null;
  lineBuffer: string;
  nextEventId: number;
  replay: Array<{ id: number; chunk: Uint8Array }>;
  replayBytes: number;
  redactingPrivateKey: boolean;
}

const sharedTails = new Map<string, SharedTail>();
let activeStreamClients = 0;
let fifoSequence = 0;

function contentTypeFor(pathname: string): string {
  const match = pathname.match(/\.[^./]+$/);
  return match ? CONTENT_TYPES[match[0].toLowerCase()] ?? "application/octet-stream" : "application/octet-stream";
}

function publicFilePath(assetPath: string): string | null {
  const decoded = decodeURIComponent(assetPath);
  if (decoded.includes("\0")) return null;
  const parts = decoded.split("/").filter(Boolean);
  if (parts.some((part) => part === ".." || part.includes("\\"))) return null;
  return `${PUBLIC_DIR}/${parts.join("/")}`;
}

function fileResponse(pathname: string, filePath: string): Response {
  return new Response(Bun.file(filePath), { headers: { "content-type": contentTypeFor(pathname) } });
}

async function servePublicAsset(pathname: string): Promise<Response> {
  const assetPath = pathname.slice("/api/agora/".length);
  const filePath = publicFilePath(assetPath);
  if (!filePath) return new Response("not found", { status: 404 });
  const file = Bun.file(filePath);
  if (!(await file.exists())) return new Response("not found", { status: 404 });
  return fileResponse(pathname, filePath);
}

function serveIndex(): Response {
  return fileResponse("/api/agora/index.html", `${PUBLIC_DIR}/index.html`);
}

function isBuildIdentity(value: unknown): value is StoaBuildIdentity {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StoaBuildIdentity>;
  return [candidate.branch, candidate.commit, candidate.builder, candidate.buildTime]
    .every((field) => typeof field === "string" && field.length > 0);
}

async function versionResponse(): Promise<Response> {
  let identity: StoaBuildIdentity | null = null;
  const file = Bun.file(BUILD_IDENTITY_PATH);
  if (await file.exists()) {
    try {
      const candidate: unknown = await file.json();
      if (isBuildIdentity(candidate)) identity = candidate;
    } catch {
      // A source checkout may not have been built yet; use runtime git metadata.
    }
  }

  identity ??= resolveBuildIdentity({ cwd: import.meta.dir });
  return Response.json(
    { ...identity, servedFrom: PUBLIC_DIR },
    { headers: { "cache-control": "no-store" } },
  );
}

async function readCensus(): Promise<unknown> {
  const process = Bun.spawn(["maw", "census", "--json"], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited,
  ]);

  if (exitCode !== 0) {
    throw new Error(stderr.trim() || `maw census exited with code ${exitCode}`);
  }

  try {
    return JSON.parse(stdout);
  } catch {
    throw new Error("maw census returned invalid JSON");
  }
}

async function censusResponse(): Promise<Response> {
  try {
    return Response.json(await readCensus(), { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("maw census failed", error);
    return Response.json({ error: "census unavailable" }, { status: 502 });
  }
}

type BoardLinkAction = "connect" | "disconnect";

interface BoardLinkPayload {
  from: string;
  to: string;
  action: BoardLinkAction;
}

interface BoardLinkRateResult {
  ok: boolean;
  retryAfterMs: number;
}

export class BoardLinkRateLimiter {
  private readonly attempts = new Map<string, number[]>();
  private readonly pairStates = new Map<string, "connecting" | "connected">();

  constructor(
    private readonly windowMs = LINK_RATE_WINDOW_MS,
    private readonly debounceMs = LINK_RATE_DEBOUNCE_MS,
    private readonly maxPerWindow = LINK_RATE_MAX_PER_WINDOW,
  ) {}

  private pairKey(from: string, to: string): string {
    return [from, to].sort().join("\0");
  }

  beginConnect(from: string, to: string): boolean {
    const key = this.pairKey(from, to);
    if (this.pairStates.has(key)) return false;
    this.pairStates.set(key, "connecting");
    return true;
  }

  finishConnect(from: string, to: string, connected: boolean): void {
    const key = this.pairKey(from, to);
    if (this.pairStates.get(key) !== "connecting") return;
    if (connected) this.pairStates.set(key, "connected");
    else this.pairStates.delete(key);
  }

  disconnect(from: string, to: string): void {
    this.pairStates.delete(this.pairKey(from, to));
  }

  take(from: string, to: string, now = Date.now()): BoardLinkRateResult {
    const key = this.pairKey(from, to);
    const cutoff = now - this.windowMs;
    const recent = (this.attempts.get(key) ?? []).filter((at) => at > cutoff && at <= now);
    const last = recent.at(-1);

    if (last !== undefined && now - last < this.debounceMs) {
      this.attempts.set(key, recent);
      return { ok: false, retryAfterMs: this.debounceMs - (now - last) };
    }
    if (recent.length >= this.maxPerWindow) {
      this.attempts.set(key, recent);
      return { ok: false, retryAfterMs: Math.max(1, recent[0] + this.windowMs - now) };
    }

    recent.push(now);
    this.attempts.set(key, recent);
    return { ok: true, retryAfterMs: 0 };
  }
}

type BoardHeyCommandRunner = (
  argv: string[],
) => Promise<{ exitCode: number; stderr: string }>;

async function runBoardHeyCommand(argv: string[]): Promise<{ exitCode: number; stderr: string }> {
  const child = Bun.spawn(argv, { stdout: "ignore", stderr: "pipe" });
  const [stderr, exitCode] = await Promise.all([
    new Response(child.stderr).text(),
    child.exited,
  ]);
  return { exitCode, stderr };
}

export async function sendBoardHey(
  target: string,
  message: string,
  runCommand: BoardHeyCommandRunner = runBoardHeyCommand,
): Promise<void> {
  const { exitCode, stderr } = await runCommand(["maw", "hey", target, message]);
  if (exitCode !== 0) {
    throw new Error(stderr.trim() || `maw hey exited with code ${exitCode}`);
  }
}

interface BoardLinkDependencies {
  census?: () => Promise<unknown>;
  limiter?: BoardLinkRateLimiter;
  now?: () => number;
  sendHey?: (target: string, message: string) => Promise<void>;
  logger?: Pick<Console, "info" | "error">;
}

const boardLinkRateLimiter = new BoardLinkRateLimiter();

function validBoardOracleName(value: string): boolean {
  return value.length >= 1 && value.length <= 128 && /^[\w.-]+$/.test(value);
}

function parseBoardLinkPayload(value: unknown): BoardLinkPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  if (keys.join(",") !== "action,from,to") return null;
  if (typeof record.from !== "string" || typeof record.to !== "string") return null;
  if (record.action !== "connect" && record.action !== "disconnect") return null;
  if (!validBoardOracleName(record.from) || !validBoardOracleName(record.to)) return null;
  if (record.from === record.to) return null;
  return { from: record.from, to: record.to, action: record.action };
}

function censusOracleNames(value: unknown): Set<string> {
  const names = new Set<string>();
  if (!value || typeof value !== "object") return names;
  const displays = (value as { displays?: unknown }).displays;
  if (!Array.isArray(displays)) return names;

  for (const display of displays) {
    if (!display || typeof display !== "object") continue;
    const spaces = (display as { spaces?: unknown }).spaces;
    if (!Array.isArray(spaces)) continue;
    for (const space of spaces) {
      if (!space || typeof space !== "object") continue;
      const oracles = (space as { oracles?: unknown }).oracles;
      if (!Array.isArray(oracles)) continue;
      for (const oracle of oracles) {
        if (!oracle || typeof oracle !== "object") continue;
        const name = (oracle as { oracle?: unknown }).oracle;
        if (typeof name === "string" && validBoardOracleName(name)) names.add(name);
      }
    }
  }
  return names;
}

function boardLinkMessages(payload: BoardLinkPayload): Array<{ target: string; message: string }> {
  if (payload.action === "connect") {
    return [
      {
        target: payload.to,
        message: `🔗 [board] ${payload.from} เชื่อมต่อมาหาคุณบนบอร์ด — มาทำงานด้วยกันนะ 🐾`,
      },
      {
        target: payload.from,
        message: `🔗 [board] คุณเชื่อมกับ ${payload.to} แล้ว 🐾`,
      },
    ];
  }
  const message = `🔌 [board] ${payload.from} ↔ ${payload.to} ถอดการเชื่อมต่อแล้ว`;
  return [
    { target: payload.to, message },
    { target: payload.from, message },
  ];
}

export async function linkResponse(
  req: Request,
  dependencies: BoardLinkDependencies = {},
): Promise<Response> {
  const contentType = req.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "application/json") {
    return Response.json({ error: "content-type must be application/json" }, { status: 415 });
  }

  const declaredLength = Number(req.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > LINK_BODY_MAX_BYTES) {
    return Response.json({ error: "request body too large" }, { status: 413 });
  }
  const body = await req.text();
  if (textEncoder.encode(body).byteLength > LINK_BODY_MAX_BYTES) {
    return Response.json({ error: "request body too large" }, { status: 413 });
  }

  let payload: BoardLinkPayload | null = null;
  try {
    payload = parseBoardLinkPayload(JSON.parse(body));
  } catch {
    // Invalid JSON and invalid shapes share the same non-reflective response.
  }
  if (!payload) {
    return Response.json({ error: "body must contain only from, to, and a valid action" }, { status: 400 });
  }

  let names: Set<string>;
  try {
    names = censusOracleNames(await (dependencies.census ?? readCensus)());
  } catch (error) {
    (dependencies.logger ?? console).error("[board-link] census lookup failed", error);
    return Response.json({ error: "census unavailable" }, { status: 502 });
  }
  if (!names.has(payload.from) || !names.has(payload.to)) {
    return Response.json({ error: "from and to must be current census oracle names" }, { status: 400 });
  }

  const limiter = dependencies.limiter ?? boardLinkRateLimiter;
  if (payload.action === "connect" && !limiter.beginConnect(payload.from, payload.to)) {
    (dependencies.logger ?? console).info(
      `[board-link] connect ${payload.from} ↔ ${payload.to}; already connected`,
    );
    return Response.json({ ok: true, sent: [] });
  }
  if (payload.action === "disconnect") limiter.disconnect(payload.from, payload.to);

  const rate = limiter.take(payload.from, payload.to, (dependencies.now ?? Date.now)());
  if (!rate.ok) {
    if (payload.action === "connect") limiter.finishConnect(payload.from, payload.to, false);
    return Response.json(
      { error: "link notification rate limit exceeded" },
      { status: 429, headers: { "retry-after": String(Math.max(1, Math.ceil(rate.retryAfterMs / 1_000))) } },
    );
  }

  const sendHey = dependencies.sendHey ?? sendBoardHey;
  const logger = dependencies.logger ?? console;
  const notifications = boardLinkMessages(payload);
  const results = await Promise.allSettled(notifications.map(async ({ target, message }) => {
    await sendHey(target, message);
    logger.info(`[board-link] ${payload.action} ${payload.from} ↔ ${payload.to}; notified ${target}`);
    return target;
  }));
  const sent = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
  const failures = results.filter((result) => result.status === "rejected");
  if (failures.length > 0) {
    if (payload.action === "connect") limiter.finishConnect(payload.from, payload.to, false);
    for (const failure of failures) logger.error("[board-link] maw hey failed", failure.reason);
    return Response.json({ ok: false, sent }, { status: 502 });
  }
  if (payload.action === "connect") limiter.finishConnect(payload.from, payload.to, true);
  return Response.json({ ok: true, sent });
}

async function fetchUsage(): Promise<unknown> {
  const response = await fetch(USAGE_URL);
  if (!response.ok) throw new Error(`Argus returned HTTP ${response.status}`);
  return response.json();
}

async function usageResponse(): Promise<Response> {
  const now = Date.now();
  if (usageCache && usageCache.expiresAt > now) {
    return Response.json(usageCache.data, { headers: { "cache-control": "public, max-age=8" } });
  }

  usageRequest ??= fetchUsage();
  try {
    const data = await usageRequest;
    usageCache = { data, expiresAt: Date.now() + USAGE_CACHE_MS };
    return Response.json(data, { headers: { "cache-control": "public, max-age=8" } });
  } catch (error) {
    console.error("Argus usage fetch failed", error);
    return Response.json({ error: "usage unavailable" }, { status: 502 });
  } finally {
    usageRequest = undefined;
  }
}

export function captureTarget(session: string | null, window: string | null): string | null {
  if (!session || !window) return null;
  if (!/^[\w.-]+$/.test(session)) return null;
  if (!/^(?:%\d+|[\w.-]+)$/.test(window)) return null;

  // Census exposes tmux pane IDs (for example %2457). Those IDs are globally
  // addressable, while ordinary window names/indexes need the session prefix.
  return window.startsWith("%") ? window : `${session}:${window}`;
}

export function captureLines(rawLines: string | null): number | null {
  if (rawLines === null || rawLines === "") return DEFAULT_CAPTURE_LINES;
  if (!/^\d+$/.test(rawLines)) return null;
  const lines = Number(rawLines);
  return lines >= 1 && lines <= MAX_CAPTURE_LINES ? lines : null;
}

function stripAnsi(text: string): string {
  // Presentation-only: callers must still pass served content through redactSecrets.
  return text.replace(/[\u001B\u009B][[\]()#;?]*(?:(?:(?:[a-zA-Z\d]*(?:;[-a-zA-Z\d\/#&.:=?%@~_]+)*)?\u0007)|(?:(?:\d{1,4}(?:[;:]\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g, "");
}

export function parsePaneDimensions(output: string): PaneDimensions | null {
  const match = stripAnsi(output).match(/\b(\d{1,4})x(\d{1,4})\b/);
  if (!match) return null;

  const cols = Number(match[1]);
  const rows = Number(match[2]);
  if (cols < 1 || cols > 1_000 || rows < 1 || rows > 1_000) return null;
  return { cols, rows };
}

async function runMawPanes(
  args: string[],
  env?: Record<string, string | undefined>,
): Promise<PaneDimensions | null> {
  const process = Bun.spawn(["maw", "panes", ...args], {
    env,
    stdout: "pipe",
    stderr: "ignore",
  });
  const [stdout, exitCode] = await Promise.all([
    new Response(process.stdout).text(),
    process.exited,
  ]);
  return exitCode === 0 ? parsePaneDimensions(stdout) : null;
}

async function paneDimensions(target: string): Promise<PaneDimensions | null> {
  // Census-backed terminal tiles use globally addressable %pane IDs. Passing
  // that ID through TMUX_PANE keeps this query on maw's read-only `panes`
  // surface while allowing older maw builds that lack `maw panes <target>`.
  if (target.startsWith("%")) {
    const dimensions = await runMawPanes([], { ...process.env, TMUX_PANE: target });
    if (dimensions) return dimensions;
  }

  return runMawPanes([target]);
}

async function runRawCapture(target: string, lines: number): Promise<string> {
  const process = Bun.spawn(["maw", "peek", target, "--lines", String(lines)], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited,
  ]);

  if (exitCode !== 0) {
    throw new Error(stderr.trim() || `maw peek exited with code ${exitCode}`);
  }
  return stdout;
}

export function sanitizeCaptureOutput(text: string): string {
  return redactSecrets(stripAnsi(text));
}

async function runCapture(target: string, lines: number): Promise<string> {
  return sanitizeCaptureOutput(await runRawCapture(target, lines));
}

async function captureResponse(url: URL): Promise<Response> {
  const session = url.searchParams.get("session")?.trim() || null;
  const window = url.searchParams.get("window")?.trim() || null;
  const target = captureTarget(session, window);
  const lines = captureLines(url.searchParams.get("lines"));
  if (!target || lines === null) {
    return Response.json(
      { error: "session, window, and lines (1-500) are required and must be valid" },
      { status: 400, headers: CAPTURE_HEADERS },
    );
  }

  const key = `${target}\0${lines}`;
  const cached = captureCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return Response.json({ text: cached.text }, { headers: CAPTURE_HEADERS });
  }

  let request = captureRequests.get(key);
  if (!request) {
    request = runCapture(target, lines);
    captureRequests.set(key, request);
  }

  try {
    const text = await request;
    captureCache.set(key, { text, expiresAt: Date.now() + CAPTURE_CACHE_MS });
    return Response.json({ text }, { headers: CAPTURE_HEADERS });
  } catch (error) {
    console.error(`maw peek failed for ${target}`, error);
    return Response.json({ error: "pane snapshot unavailable" }, { status: 502, headers: CAPTURE_HEADERS });
  } finally {
    if (captureRequests.get(key) === request) captureRequests.delete(key);
  }
}

export function encodeSseData(data: string, id?: number, event?: string): Uint8Array {
  const fields = data.split("\n").map((line) => `data: ${line}`).join("\n");
  const idField = id === undefined ? "" : `id: ${id}\n`;
  const eventField = event ? `event: ${event}\n` : "";
  return textEncoder.encode(`${idField}${eventField}${fields}\n\n`);
}

export function streamFrameDelta(previous: string | null, next: string): string | null {
  if (previous === null) return next;
  if (next === previous) return null;
  return next.startsWith(previous) ? next.slice(previous.length) : `${STREAM_CLEAR}${next}`;
}

function removeSubscriber(tail: SharedTail, subscriber: StreamSubscriber): void {
  if (subscriber.closed) return;
  subscriber.closed = true;
  subscriber.detachAbort();
  tail.subscribers.delete(subscriber);
  activeStreamClients = Math.max(0, activeStreamClients - 1);

  if (tail.subscribers.size === 0) {
    stopSharedTail(tail);
  }
}

function sendToSubscriber(tail: SharedTail, subscriber: StreamSubscriber, chunk: Uint8Array): void {
  if (subscriber.closed) return;
  try {
    subscriber.controller.enqueue(chunk);
  } catch {
    removeSubscriber(tail, subscriber);
  }
}

function broadcast(tail: SharedTail, chunk: Uint8Array): void {
  for (const subscriber of [...tail.subscribers]) {
    if (!subscriber.ready) continue;
    sendToSubscriber(tail, subscriber, chunk);
  }
}

function publish(tail: SharedTail, data: string): void {
  const id = tail.nextEventId++;
  const chunk = encodeSseData(data, id);
  tail.replay.push({ id, chunk });
  tail.replayBytes += chunk.byteLength;
  while (
    tail.replay.length > STREAM_REPLAY_EVENTS ||
    (tail.replayBytes > STREAM_REPLAY_BYTES && tail.replay.length > 1)
  ) {
    const removed = tail.replay.shift();
    if (removed) tail.replayBytes -= removed.chunk.byteLength;
  }
  broadcast(tail, chunk);
}

function replayAfter(tail: SharedTail, lastEventId: number): Uint8Array[] | null {
  // A newly-created tail has no history even though its numeric cursor is zero.
  // Only a still-running shared source can honor a resume request.
  if (!tail.sourceStarted) return null;
  const currentId = tail.nextEventId - 1;
  if (!Number.isSafeInteger(lastEventId) || lastEventId < 0 || lastEventId > currentId) return null;
  if (lastEventId === currentId) return [];
  const oldestId = tail.replay[0]?.id;
  if (oldestId === undefined || lastEventId < oldestId - 1) return null;
  return tail.replay.filter((entry) => entry.id > lastEventId).map((entry) => entry.chunk);
}

function stopSharedTail(tail: SharedTail): void {
  if (tail.stopped) return;
  tail.stopped = true;
  if (sharedTails.get(tail.key) === tail) sharedTails.delete(tail.key);
  if (tail.heartbeat !== null) clearInterval(tail.heartbeat);
  tail.heartbeat = null;
  tail.stopSource?.();
  tail.stopSource = null;
}

function failTail(tail: SharedTail): void {
  stopSharedTail(tail);

  for (const subscriber of [...tail.subscribers]) {
    try {
      subscriber.controller.error(new Error("pane stream unavailable"));
    } catch {
      // The browser may already have released the stream controller.
    }
    removeSubscriber(tail, subscriber);
  }
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function runFallbackTail(tail: SharedTail): Promise<void> {
  let consecutiveFailures = 0;
  let needsClear = true;

  while (!tail.stopped && tail.subscribers.size > 0) {
    const startedAt = Date.now();
    try {
      const nextFrame = redactSecrets(await runRawCapture(tail.target, tail.lines));
      if (tail.stopped) return;

      const delta = needsClear
        ? `${STREAM_CLEAR}${nextFrame}`
        : streamFrameDelta(tail.lastFrame, nextFrame);
      needsClear = false;
      tail.lastFrame = nextFrame;
      consecutiveFailures = 0;
      if (delta !== null) publish(tail, delta);
    } catch (error) {
      consecutiveFailures += 1;
      console.error(`maw peek stream failed for ${tail.target}`, error);
      if (consecutiveFailures >= 3) {
        failTail(tail);
        return;
      }
    }

    const elapsed = Date.now() - startedAt;
    await sleep(Math.max(0, STREAM_POLL_MS - elapsed));
  }
}

function broadcastCompletedLines(tail: SharedTail, text: string): void {
  tail.lineBuffer += text;
  let newline = tail.lineBuffer.indexOf("\n");

  while (newline >= 0) {
    const completedLine = tail.lineBuffer.slice(0, newline + 1);
    tail.lineBuffer = tail.lineBuffer.slice(newline + 1);
    const beginsPrivateKey = /-----BEGIN [^-\n]*PRIVATE KEY-----/i.test(completedLine);
    const endsPrivateKey = /-----END [^-\n]*PRIVATE KEY-----/i.test(completedLine);
    if (tail.redactingPrivateKey) {
      if (endsPrivateKey) tail.redactingPrivateKey = false;
    } else if (beginsPrivateKey) {
      tail.redactingPrivateKey = !endsPrivateKey;
      publish(tail, "[REDACTED_PRIVATE_KEY]\n");
    } else {
      publish(tail, redactSecrets(completedLine));
    }
    newline = tail.lineBuffer.indexOf("\n");
  }

  if (tail.lineBuffer.length > 262_144) {
    tail.lineBuffer = "";
    tail.redactingPrivateKey = false;
    publish(tail, "[REDACTED_OVERSIZED_LINE]\n");
  }
}

async function runPipeTail(tail: SharedTail): Promise<void> {
  const fifoPath = `/tmp/stoa-agora-stream-${process.pid}-${fifoSequence++}.fifo`;
  let cleanupPipe = () => {};

  try {
    const mkfifo = Bun.spawnSync(["mkfifo", fifoPath], { stdout: "pipe", stderr: "pipe" });
    if (mkfifo.exitCode !== 0) {
      throw new Error(mkfifo.stderr.toString().trim() || "mkfifo failed");
    }

    // `maw tmux pipe` configures the pane pipe and exits. A FIFO keeps the
    // incremental byte stream attached to a Bun-owned reader process.
    const readerProcess = Bun.spawn(["cat", fifoPath], { stdout: "pipe", stderr: "pipe" });
    let cleaned = false;
    cleanupPipe = () => {
      if (cleaned) return;
      cleaned = true;
      // Omitting the command is maw's native close-pipe operation.
      Bun.spawnSync(["maw", "tmux", "pipe", tail.target], { stdout: "ignore", stderr: "ignore" });
      readerProcess.kill();
      try {
        unlinkSync(fifoPath);
      } catch {
        // The FIFO may already have been removed during process teardown.
      }
    };
    tail.stopSource = cleanupPipe;

    const configured = Bun.spawnSync([
      "maw",
      "tmux",
      "pipe",
      tail.target,
      `cat > ${fifoPath}`,
      "--output",
      "--only-if-closed",
    ], { stdout: "pipe", stderr: "pipe" });
    if (configured.exitCode !== 0) {
      throw new Error(configured.stderr.toString().trim() || "maw tmux pipe failed");
    }

    const stderrRequest = new Response(readerProcess.stderr).text();
    const reader = readerProcess.stdout.getReader();
    const decoder = new TextDecoder();

    try {
      while (!tail.stopped) {
        const { done, value } = await reader.read();
        if (done) break;
        broadcastCompletedLines(tail, decoder.decode(value, { stream: true }));
      }
      const remainder = decoder.decode();
      if (remainder) tail.lineBuffer += remainder;
    } finally {
      reader.releaseLock();
    }

    const [exitCode, stderr] = await Promise.all([readerProcess.exited, stderrRequest]);
    cleanupPipe();
    tail.stopSource = null;
    if (tail.stopped) return;
    throw new Error(stderr.trim() || `maw tmux pipe FIFO reader exited with code ${exitCode}`);
  } catch (error) {
    cleanupPipe();
    if (tail.stopped) return;
    console.error(`maw tmux pipe unavailable for ${tail.target}; using peek fallback`, error);
    tail.stopSource = null;
    tail.lineBuffer = "";
    await runFallbackTail(tail);
  }
}

function ensureTailSource(tail: SharedTail): void {
  if (tail.sourceStarted || tail.stopped) return;
  tail.sourceStarted = true;
  tail.heartbeat = setInterval(() => {
    if (!tail.stopped) broadcast(tail, textEncoder.encode(":\n\n"));
  }, STREAM_HEARTBEAT_MS);
  void runPipeTail(tail);
}

async function initialSnapshot(tail: SharedTail, lines: number): Promise<string> {
  const now = Date.now();
  if (
    tail.lastFrame !== null &&
    tail.lastSnapshotLines >= lines &&
    now - tail.lastSnapshotAt <= STREAM_POLL_MS
  ) {
    return tail.lastFrame;
  }
  if (tail.snapshotRequest) {
    const pending = tail.snapshotRequest;
    const frame = await pending.promise;
    if (pending.lines >= lines) return frame;
    if (tail.snapshotRequest === pending) tail.snapshotRequest = null;
    return initialSnapshot(tail, lines);
  }

  const request = runRawCapture(tail.target, lines).then((frame) => {
    const redacted = redactSecrets(frame);
    const lastPrivateKeyBegin = [...frame.matchAll(/-----BEGIN [^-\n]*PRIVATE KEY-----/gi)].at(-1)?.index ?? -1;
    const lastPrivateKeyEnd = [...frame.matchAll(/-----END [^-\n]*PRIVATE KEY-----/gi)].at(-1)?.index ?? -1;
    tail.redactingPrivateKey = lastPrivateKeyBegin > lastPrivateKeyEnd;
    tail.lines = Math.max(tail.lines, lines);
    tail.lastFrame = redacted;
    tail.lastSnapshotAt = Date.now();
    tail.lastSnapshotLines = lines;
    return redacted;
  });
  const pending = { lines, promise: request };
  tail.snapshotRequest = pending;
  try {
    return await request;
  } finally {
    if (tail.snapshotRequest === pending) tail.snapshotRequest = null;
  }
}

function getSharedTail(target: string, lines: number): SharedTail {
  const key = target;
  const existing = sharedTails.get(key);
  if (existing && !existing.stopped) {
    existing.lines = Math.max(existing.lines, lines);
    return existing;
  }

  const tail: SharedTail = {
    key,
    target,
    lines,
    lastFrame: null,
    lastSnapshotAt: 0,
    lastSnapshotLines: 0,
    snapshotRequest: null,
    subscribers: new Set(),
    stopped: false,
    sourceStarted: false,
    stopSource: null,
    heartbeat: null,
    lineBuffer: "",
    nextEventId: 1,
    replay: [],
    replayBytes: 0,
    redactingPrivateKey: false,
  };
  sharedTails.set(key, tail);
  return tail;
}

function streamResponse(req: Request, url: URL): Response {
  const session = url.searchParams.get("session")?.trim() || null;
  const window = url.searchParams.get("window")?.trim() || null;
  const target = captureTarget(session, window);
  const lines = captureLines(url.searchParams.get("lines"));
  if (!target || lines === null) {
    return Response.json(
      { error: "session, window, and lines (1-500) are required and must be valid" },
      { status: 400, headers: CAPTURE_HEADERS },
    );
  }
  if (activeStreamClients >= MAX_STREAM_CLIENTS) {
    return Response.json(
      { error: "too many active pane streams" },
      { status: 503, headers: CAPTURE_HEADERS },
    );
  }

  const tail = getSharedTail(target, lines);
  const lastEventIdHeader = req.headers.get("last-event-id")?.trim();
  const lastEventId = lastEventIdHeader && /^\d+$/.test(lastEventIdHeader)
    ? Number(lastEventIdHeader)
    : null;
  let unsubscribe = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const onAbort = () => unsubscribe();
      const subscriber: StreamSubscriber = {
        controller,
        closed: false,
        ready: false,
        detachAbort: () => req.signal.removeEventListener("abort", onAbort),
      };
      unsubscribe = () => removeSubscriber(tail, subscriber);
      tail.subscribers.add(subscriber);
      activeStreamClients += 1;
      req.signal.addEventListener("abort", onAbort, { once: true });

      const replay = lastEventId === null ? null : replayAfter(tail, lastEventId);
      if (replay !== null) {
        subscriber.ready = true;
        for (const chunk of replay) sendToSubscriber(tail, subscriber, chunk);
        ensureTailSource(tail);
        if (req.signal.aborted) unsubscribe();
        return;
      }

      void Promise.all([
        initialSnapshot(tail, lines),
        paneDimensions(tail.target),
      ]).then(([frame, dimensions]) => {
        if (subscriber.closed || tail.stopped) return;
        subscriber.ready = true;
        if (dimensions) {
          sendToSubscriber(tail, subscriber, encodeSseData(
            JSON.stringify({ version: 1, ...dimensions }),
            undefined,
            "meta",
          ));
        }
        const snapshotId = tail.nextEventId - 1;
        sendToSubscriber(tail, subscriber, encodeSseData(frame, snapshotId, "snapshot"));
        // `maw tmux pipe` only observes bytes produced after attachment. Starting
        // it after the backfill leaves a tiny acceptable seam at this boundary.
        ensureTailSource(tail);
      }).catch((error) => {
        if (subscriber.closed) return;
        console.error(`initial pane snapshot failed for ${tail.target}`, error);
        try {
          subscriber.controller.error(new Error("pane snapshot unavailable"));
        } catch {
          // The browser may already have released the controller.
        }
        removeSubscriber(tail, subscriber);
      });
      if (req.signal.aborted) unsubscribe();
    },
    cancel() {
      unsubscribe();
    },
  });

  return new Response(stream, { headers: STREAM_HEADERS });
}

interface RequestIpProvider {
  requestIP(req: Request): { address: string } | null;
}

function isLoopbackAddress(address: string): boolean {
  const normalized = address.toLowerCase().replace(/^\[|\]$/g, "");
  if (normalized === "::1" || normalized === "0:0:0:0:0:0:0:1") return true;
  const ipv4 = normalized.startsWith("::ffff:") ? normalized.slice(7) : normalized;
  return /^127(?:\.\d{1,3}){3}$/.test(ipv4);
}

function isLocalWriteRequest(req: Request, server?: RequestIpProvider): boolean {
  if (server) {
    const peer = server.requestIP(req);
    return peer ? isLoopbackAddress(peer.address) : false;
  }
  return isLoopbackAddress(new URL(req.url).hostname) || new URL(req.url).hostname === "localhost";
}

function isTrustedWriteOrigin(req: Request): boolean {
  const rawOrigin = req.headers.get("origin");
  if (!rawOrigin) return true;
  try {
    if (new URL(rawOrigin).origin === new URL(req.url).origin) return true;
  } catch {
    return false;
  }
  return allowedCorsOrigin(req) !== null;
}

export async function handleRequest(
  req: Request,
  server?: RequestIpProvider,
  linkDependencies?: BoardLinkDependencies,
): Promise<Response> {
  const url = new URL(req.url);
  if (req.method === "OPTIONS") return preflightResponse(req);
  const respond = (response: Response) => withCors(req, response);

  if (url.pathname === LINK_PATH) {
    if (req.method !== "POST") {
      return respond(new Response("method not allowed", {
        status: 405,
        headers: { allow: LINK_CORS_METHODS },
      }));
    }
    if (!isLocalWriteRequest(req, server) || !isTrustedWriteOrigin(req)) {
      return respond(Response.json({ error: "link writes are local and origin-restricted" }, { status: 403 }));
    }
    return respond(await linkResponse(req, linkDependencies));
  }

  if (req.method !== "GET") {
    return respond(new Response("method not allowed", {
      status: 405,
      headers: { allow: READ_CORS_METHODS },
    }));
  }

  if (url.pathname === "/health") {
    return respond(Response.json({ ok: true, plugin: "maw-serve", prefix: "/api/agora" }));
  }

  if (url.pathname === "/api/agora/census") return respond(await censusResponse());
  if (url.pathname === "/api/spaces") return respond(await mirrorResponse(MIRROR_SPACES_URL));
  if (url.pathname === "/api/oracles") return respond(await mirrorResponse(MIRROR_ORACLES_URL));
  if (url.pathname === "/api/agora/usage") return respond(await usageResponse());
  if (url.pathname === "/api/agora/version") return respond(await versionResponse());
  if (url.pathname === "/api/agora/capture") return respond(await captureResponse(url));
  if (url.pathname === "/api/agora/stream") return respond(streamResponse(req, url));
  if (url.pathname === "/api/agora" || url.pathname === "/api/agora/") return respond(serveIndex());
  if (url.pathname.startsWith("/api/agora/") && /\.[^/]+$/.test(url.pathname)) {
    return respond(await servePublicAsset(url.pathname));
  }
  if (url.pathname.startsWith("/api/agora/")) return respond(serveIndex());

  return respond(new Response("not found", { status: 404 }));
}

if (import.meta.main) {
  Bun.serve({ port: PORT, fetch: (req, server) => handleRequest(req, server) });
  console.log(`maw-serve demo board listening on :${PORT} (routes under /api/agora)`);
}
