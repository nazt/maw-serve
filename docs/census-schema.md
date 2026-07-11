# Census topology schema

`src/types/census.ts` defines one consumer-facing topology type:
`StoaFleetTopology`. Its required source is the final `maw census --json` #382
schema; future display-census fields remain optional and nullable.

## Required-now mapping from final `maw census --json` (#382)

The confirmed #382 census wire shape is display-nested and uses names as stable
identity. Stoa flattens it into required `StoaFleetTopology.spaces`, carrying the
wire names as primary keys and optional indexes only as ordering hints:

| #382 / maw census concept | Stoa field | Required today |
| --- | --- | --- |
| display name, e.g. `DELL U2719DC` | `spaces[].display` | yes |
| space name, e.g. `1:1:0:0:1:1` | `spaces[].space` | yes |
| display array position | `spaces[].displayIndex` | optional |
| space array position within display | `spaces[].spaceIndex` | optional |
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
`spaces[]` first, then each space's `oracles[]`. Consumers must treat
`display`/`space` names as identity and `displayIndex`/`spaceIndex` as reorderable
presentation hints.

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

The census source now provides stable `(display, space)` string identities from
the wire names. The reflection tile should use those names for monitor labels and
join keys; positional indexes can drift and are only hints for ordering. Future
display-census enrichment should resolve its source display/space components onto
these canonical names before rendering, while preserving pixel frames for the
window layout layer.
