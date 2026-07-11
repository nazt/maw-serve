# Census topology schema

`src/types/census.ts` defines one consumer-facing topology type:
`StoaFleetTopology`. Its required source is `maw census --json` (#380); its
future display-census fields are optional and nullable.

## Required-now mapping from `maw census --json` (#380)

Issue #380's live JSON schema was not reachable from this worktree, so the v1
required row is intentionally best-effort and marked `MAW-RS-RECONCILE` in the
type file. The field names below must be reconciled with maw-rs when the live
census schema ships; names may change. The board normalizes the required
`maw census --json` fields into `StoaCensusOracle` like this:

| #380 / maw census concept | `StoaCensusOracle` field | Required today |
| --- | --- | --- |
| oracle handle | `oracle` | yes |
| session id/name | `sessionId` | yes |
| pane id | `paneId` | yes |
| host or machine identity | `machine` | yes |
| lifecycle/readiness status | `status` | yes |

If #380 lands a different spelling or a composite session/pane value, that
translation should happen at ingest. Consumers should keep reading the normalized
fields above.

## Optional display-census pixel fields

Display-census `SpaceReport` data is not required for the v1 maw census source.
These fields on `StoaFleetTopology` are therefore optional and nullable:

- `displayCensusTs?: number | null`
- `fleet?: StoaDisplayCensusFleetRow[] | null` — oracle labels by
  `title`, `space`, `display`, and `focus`, with optional pass-through metadata
  when display-census provides it.
- `windows?: StoaDisplayCensusWindow[] | null` — window `id`, `app`, structurally
  redacted `title`, optional space/display/focus indexes, optional global-pixel
  `frame`, and optional `pinned` state.
- `spaces?: StoaDisplayCensusSpace[] | null` — space index, display index,
  visibility, focus, and optional pin state.
- `displays?: StoaDisplayCensusDisplay[] | null` — display index plus nullable
  name/frame metadata for pixel-frame resolution.

Window frames are stored in global pixel coordinates so a later topology tile can
render display → spaces → window frames without throwing away window-arranger
layout data.

`windows[].title` is a branded `RedactedTitle`, not a plain `string`. A raw
display-census title cannot satisfy the type, so a renderer cannot receive
unredacted window titles unless a future redaction filter explicitly mints the
opaque value.

## Why display-census can slot in later without rewrites

Consumers only need to depend on `StoaFleetTopology` now: the required oracle
rows are stable for the maw census source, while display-census data already has
reserved optional fields in the same topology object. When display-census is
joined later, producers can begin filling `fleet`, `windows`, `spaces`, and
`displays`; consumers that do not need px geometry keep working from `oracles`,
and consumers that do need it can feature-detect non-null optional arrays instead
of migrating to a second schema.
