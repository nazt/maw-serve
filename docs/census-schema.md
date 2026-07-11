# Census topology schema

`src/types/census.ts` defines one consumer-facing topology type:
`StoaFleetTopology`. Its required source is the final `maw census --json` #382
schema; future display-census fields remain optional and nullable.

## Required-now mapping from final `maw census --json` (#382)

The confirmed #382 census shape is grouped by display and space. Stoa keeps that
shape directly as required `StoaFleetTopology.spaces`:

| #382 / maw census concept | Stoa field | Required today |
| --- | --- | --- |
| display index | `spaces[].display` | yes |
| space index | `spaces[].space` | yes |
| oracle rows on that space | `spaces[].oracles` | yes |
| oracle handle | `spaces[].oracles[].oracle` | yes |
| session id/name | `spaces[].oracles[].session` | optional |
| pane id | `spaces[].oracles[].pane` | optional |
| model tier | `spaces[].oracles[].model_tier` | yes |
| lifecycle/readiness status | `spaces[].oracles[].status` | yes |
| idle age in seconds | `spaces[].oracles[].idle_sec` | optional |
| safe oracle annotation | `spaces[].oracles[].annotation` | yes |
| pin state for this location | `spaces[].oracles[].pinned` | yes |

The old flat `oracles` array is intentionally gone. Consumers should walk
`spaces[]` first, then each space's `oracles[]`.

## Pins from window-arranger

`StoaFleetTopology.pins?: StoaCensusPin[] | null` records pins from
window-arranger's `pins.json`: `{ display, space, oracle, note? }`. The field is
optional/nullable because `pins.json` may not exist or may be unavailable on a
host; when the source is available and has no pins, producers should send `[]`.

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
- `displayCensusSpaces?: StoaDisplayCensusSpace[] | null` — display-census
  `spaces[]` visibility/focus/pin components, named distinctly because top-level
  `spaces` is now the required #382 census grouping.
- `displays?: StoaDisplayCensusDisplay[] | null` — display index plus nullable
  name/frame metadata for pixel-frame resolution.

Window frames are stored in global pixel coordinates so a later topology tile can
render display → spaces → window frames without throwing away window-arranger
layout data.

`windows[].title` is a branded `RedactedTitle`, not a plain `string`. A raw
display-census title cannot satisfy the type, so a renderer cannot receive
unredacted window titles unless a future redaction filter explicitly mints the
opaque value.

## Display-census join design

The census source is grouped by `(display, space)`, and display-census enrichment
also carries `(display, space)` or display indexes on `fleet`, `windows`,
`displayCensusSpaces`, and `displays`. The topology/reflection tile can therefore
join the required census rows to optional pixel data by `(display, space)`:
census supplies oracle truth, display-census supplies visibility/focus and global
pixel frames, and consumers keep using this same superset type as enrichment is
added.
