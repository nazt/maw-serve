/**
 * Superset topology for Stoa's read-only fleet dashboard.
 *
 * Required-now fields are normalized from the final `maw census --json` #382
 * schema. Display-census SpaceReport enrichment is optional/nullable so it can
 * be populated later without changing consumer code or the topology contract.
 */
export type StoaFleetTopology = {
  /** Required-now: primary v1 census grouped by display+space. */
  spaces: StoaCensusSpace[];

  /**
   * Optional-now: pin records sourced from window-arranger's pins.json.
   * Nullable/omitted means the pins source was unavailable; [] means available
   * and intentionally empty.
   */
  pins?: StoaCensusPin[] | null;

  /**
   * Optional-future: display-census SpaceReport `ts` when that feed is joined.
   * Nullable means the board has only the primary maw census source available.
   */
  displayCensusTs?: number | null;

  /** Optional-future: oracle labels by space/display from display-census. */
  fleet?: StoaDisplayCensusFleetRow[] | null;

  /** Optional-future: per-window global pixel frames from display-census. */
  windows?: StoaDisplayCensusWindow[] | null;

  /** Optional-future: SpaceReport spaces[] visibility/focus enrichment. */
  displayCensusSpaces?: StoaDisplayCensusSpace[] | null;

  /** Optional-future: display frames from display-census. */
  displays?: StoaDisplayCensusDisplay[] | null;
};

/** Required-now census space group from final `maw census --json` #382. */
export type StoaCensusSpace = {
  display: number;
  space: number;
  oracles: StoaCensusOracle[];
};

declare const redactedTitleBrand: unique symbol;

/**
 * Opaque title string that has already passed the required redaction filter.
 *
 * Raw display-census window titles are not assignable to this brand, so render
 * paths cannot accept unredacted titles by accident. The future redaction filter
 * is the only layer that should mint this type.
 */
export type RedactedTitle = string & {
  readonly [redactedTitleBrand]: "RedactedTitle";
};

/** Required-now oracle row from final `maw census --json` #382. */
export type StoaCensusOracle = {
  /** Oracle handle, e.g. the maw oracle name shown on the board tile. */
  oracle: string;

  /** Optional tmux/session identifier from maw census. */
  session?: string;

  /** Optional tmux pane identifier from maw census. */
  pane?: string;

  /** Final #382 model tier label for grouping or badge display. */
  model_tier: string;

  /** Required lifecycle/readiness status from maw census. */
  status: StoaOracleStatus;

  /** Optional idle age, in seconds, when maw census can report it. */
  idle_sec?: number;

  /** Required safe census annotation for the oracle. */
  annotation: string;

  /** True when the oracle is pinned to this display+space. */
  pinned: boolean;
};

/** Pin row sourced from window-arranger's pins.json. */
export type StoaCensusPin = {
  display: number;
  space: number;
  oracle: string;
  note?: string;
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

  /** Redacted-only window title; raw display-census strings cannot assign here. */
  title: RedactedTitle;

  /** Global screen pixel frame. Nullable for legacy or not-yet-populated rows. */
  frame: StoaGlobalPixelFrame | null;

  /** Optional pin-enforcement state from display-census/window-arranger. */
  pinned?: boolean | null;
};

/** Optional-future display-census SpaceReport spaces[] row. */
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
