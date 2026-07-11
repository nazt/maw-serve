/**
 * Superset topology for Stoa's read-only fleet dashboard.
 *
 * Required-now fields are normalized from `maw census --json` (#380) and are the
 * v1 source of truth. Display-census SpaceReport fields are optional/nullable so
 * they can be populated later without changing consumer code or the topology
 * contract.
 */
export type StoaFleetTopology = {
  /** Required-now: primary v1 oracle rows from `maw census --json`. */
  oracles: StoaCensusOracle[];

  /**
   * Optional-future: display-census SpaceReport `ts` when that feed is joined.
   * Nullable means the board has only the primary maw census source available.
   */
  displayCensusTs?: number | null;

  /** Optional-future: oracle labels by space/display from display-census. */
  fleet?: StoaDisplayCensusFleetRow[] | null;

  /** Optional-future: per-window global pixel frames from display-census. */
  windows?: StoaDisplayCensusWindow[] | null;

  /** Optional-future: per-space visibility/focus from display-census. */
  spaces?: StoaDisplayCensusSpace[] | null;

  /** Optional-future: display frames from display-census. */
  displays?: StoaDisplayCensusDisplay[] | null;
};

/**
 * Required-now `maw census --json` oracle row.
 *
 * TODO-confirm-with-maw-rs (#380): the live schema was not reachable while this
 * type was authored, so these fields model the required best-effort contract:
 * oracle handle, session/pane identifiers, host/machine, and status.
 */
export type StoaCensusOracle = {
  /** Oracle handle, e.g. the maw oracle name shown on the board tile. */
  oracle: string;

  /** Required tmux/session identifier from maw census. */
  sessionId: string;

  /** Required tmux pane identifier from maw census. */
  paneId: string;

  /** Required host or machine identity; normalized as `machine` for consumers. */
  machine: string;

  /** Required lifecycle/readiness status from maw census. */
  status: StoaOracleStatus;
};

/** Known Stoa statuses plus forward-compatible strings from maw-rs. */
export type StoaOracleStatus =
  | "starting"
  | "idle"
  | "busy"
  | "ready"
  | "sleeping"
  | "offline"
  | "error"
  | "unknown"
  | (string & Record<never, never>);

/** Global pixel rectangle, preserving display-census/window-arranger coordinates. */
export type StoaGlobalPixelFrame = {
  x: number;
  y: number;
  w: number;
  h: number;
};

/** Optional-future display-census fleet row: title is the oracle label. */
export type StoaDisplayCensusFleetRow = {
  title: string;
  space: number;
  display: number;
  focus: boolean;

  /** Optional pass-throughs present in display-census SpaceReport FleetRow. */
  app?: string | null;
  id?: number | null;
  dup?: number | null;
  displayName?: string | null;
  isShell?: boolean | null;
};

/** Optional-future display-census window row with global pixel geometry. */
export type StoaDisplayCensusWindow = {
  id: number;
  app: string;
  space?: number | null;
  display?: number | null;
  focus?: boolean | null;

  /**
   * TODO(redaction): display-census window titles can expose work content and
   * must be redacted before this value reaches any board UI renderer.
   */
  title: string;

  /** Global screen pixel frame. Nullable for legacy or not-yet-populated rows. */
  frame: StoaGlobalPixelFrame | null;

  /** Optional pin-enforcement state from display-census/window-arranger. */
  pinned?: boolean | null;
};

/** Optional-future display-census space row. */
export type StoaDisplayCensusSpace = {
  index: number;
  display: number;
  isVisible: boolean;
  hasFocus: boolean;
  pinned?: boolean | null;
};

/** Optional-future display-census display row used to resolve pixel frames. */
export type StoaDisplayCensusDisplay = {
  index: number;
  name?: string | null;
  frame?: StoaGlobalPixelFrame | null;
};
