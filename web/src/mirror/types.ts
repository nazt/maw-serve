import type { NormRect, Rect } from "../clients/layout-core";

export interface MirrorDisplay {
  index: number;
  name: string;
  frame: Rect;
}

export interface MirrorSpace {
  index: number;
  display: number;
  isVisible: boolean;
  hasFocus: boolean;
  pinned: boolean;
}

/**
 * Safe display model. Raw window titles are deliberately absent so render
 * paths cannot receive them after the client boundary.
 */
export interface MirrorWindow {
  id: number;
  app: string;
  space: number;
  display: number;
  focus: boolean;
  frame: Rect;
  pinned: boolean;
  whenIdleOnly: boolean;
  oracle: string | null;
}

export interface MirrorFleetRow {
  oracle: string;
  app: string;
  id: number | null;
  display: number;
  space: number;
  focus: boolean;
  displayName: string;
  isShell: boolean;
}

export interface MirrorProfile {
  stale: boolean;
  reason: string;
}

export interface MirrorReport {
  ts: number;
  displays: MirrorDisplay[];
  spaces: MirrorSpace[];
  windows: MirrorWindow[];
  fleet: MirrorFleetRow[];
  profile: MirrorProfile;
}

export interface MirrorWindowLayout {
  window: MirrorWindow;
  rect: NormRect;
}

export type MirrorConnection = "connecting" | "ws" | "rest" | "cloud" | "offline";

export type PulseFreshness = "live" | "cooling" | "fallback";

export interface OraclePulse {
  machine: string;
  oracle: string;
  at: number;
}

export type OraclePulseMap = ReadonlyMap<string, OraclePulse>;
