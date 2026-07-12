const HOST_STORAGE_KEY = "stoa-api-host";

export const API_ENDPOINTS = {
  census: "/api/agora/census",
  usage: "/api/agora/usage",
  capture: "/api/agora/capture",
  stream: "/api/agora/stream",
  version: "/api/agora/version",
} as const;

export type HostSource = "url" | "saved" | "same-origin";
export type PrivateNetworkAddressSpace = "loopback" | "local";

export interface HostResolutionInput {
  hasUrlHost: boolean;
  urlHost: string | null;
  savedHost: string | null;
}

function normalizeHost(value: string | null | undefined): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!/^https?:$/.test(url.protocol) || url.username || url.password) return "";
    return url.origin;
  } catch {
    return "";
  }
}

function browserResolutionInput(): HostResolutionInput {
  if (typeof window === "undefined") {
    return { hasUrlHost: false, urlHost: null, savedHost: null };
  }

  const params = new URLSearchParams(window.location.search);
  let savedHost: string | null = null;
  try {
    savedHost = window.localStorage.getItem(HOST_STORAGE_KEY);
  } catch {
    // Storage can be blocked in hardened/private browsing contexts.
  }
  return {
    hasUrlHost: params.has("host"),
    urlHost: params.get("host"),
    savedHost,
  };
}

export function resolveHost(input: HostResolutionInput = browserResolutionInput()): string {
  const selected = input.hasUrlHost ? input.urlHost : input.savedHost;
  return normalizeHost(selected);
}

const resolutionInput = browserResolutionInput();

export const activeHost = resolveHost(resolutionInput);
export const hostSource: HostSource = resolutionInput.hasUrlHost
  ? "url"
  : resolutionInput.savedHost
    ? "saved"
    : "same-origin";

if (typeof window !== "undefined") {
  try {
    if (activeHost) window.localStorage.setItem(HOST_STORAGE_KEY, activeHost);
    else if (resolutionInput.hasUrlHost) window.localStorage.removeItem(HOST_STORAGE_KEY);
  } catch {
    // The selected host still works for this page load when persistence is unavailable.
  }
}

export function apiUrl(path: string, host = activeHost): string {
  if (!host || /^https?:\/\//i.test(path)) return path;
  return new URL(path, `${host}/`).toString();
}

export function apiUrlWithParams(
  path: string,
  params: URLSearchParams | Record<string, string>,
): string {
  const query = params instanceof URLSearchParams ? params : new URLSearchParams(params);
  return `${apiUrl(path)}?${query}`;
}

export function privateNetworkAddressSpace(url: string): PrivateNetworkAddressSpace | null {
  let hostname: string;
  try {
    hostname = new URL(url, typeof window === "undefined" ? "http://localhost" : window.location.href)
      .hostname.toLowerCase().replace(/^\[|\]$/g, "");
  } catch {
    return null;
  }

  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "::1" ||
    /^127\./.test(hostname)
  ) {
    return "loopback";
  }
  if (
    hostname.endsWith(".local") ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  ) {
    return "local";
  }
  return null;
}

type PrivateNetworkRequestInit = RequestInit & {
  targetAddressSpace?: PrivateNetworkAddressSpace;
};

export function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const url = apiUrl(path);
  const finalInit: PrivateNetworkRequestInit = { ...init };
  const addressSpace = privateNetworkAddressSpace(url);
  if (activeHost && addressSpace) finalInit.targetAddressSpace = addressSpace;
  return fetch(url, finalInit);
}

export function connectHostUrl(host = "http://localhost:48900"): string {
  if (typeof window === "undefined") return `?host=${encodeURIComponent(host)}`;
  const url = new URL(window.location.href);
  url.searchParams.set("host", host);
  return url.toString();
}

export function shouldOfferHostConnection(): boolean {
  return typeof window !== "undefined" && window.location.protocol === "https:";
}
