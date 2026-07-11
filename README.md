# maw-serve — Stoa, the Native Oracle Board

## Trust model (§1 — non-negotiable, read this first)

- **No secrets in feeds.** Every feed is scrubbed before it reaches the board — tokens, real
  account identifiers, and captured screen/window content are redacted on ingest. This is an
  enforced filter, not a hope.
- **No filesystem serving by default.** The board never serves `/root`, home directories, or
  any filesystem path unless a session opts in explicitly and sandboxes to a non-secret root.
- **No UA-spoofing or evasion.** Transport is our own fleet infrastructure (`maw serve` +
  federation), openly identified.
- **Explicit auth via fleet identity.** Reuses `maw serve`'s ed25519 federation + TOFU trust
  store + consent flow — not a shared password.
- **State is a projection, not the source of truth.** The board's in-memory state is a cache
  over the fleet's real sources (census, argus, window-arranger); it rehydrates from those
  feeds on restart and never becomes canonical.
- **v1 is read-only.** The board observes the fleet. No uploads, no canvas-edit, no write
  terminals — those are v2.

## What this is

`maw-serve` is an external `maw` plugin that implements **Stoa**, a read-only fleet dashboard.
It composes existing fleet primitives (argus usage, `maw census`/display-census topology,
window-arranger layout) instead of rebuilding them — see
[native-oracle-board-scope.md](https://github.com/Soul-Brews-Studio/agora-oracle) for the full
design spec.

## Architecture

`maw`'s `engine.serve` (v1) is manifest-only route registration/discovery — the daemon on
`:3456` reserves this plugin's prefix and answers health/events stubs, but does not execute
handlers in-daemon, reverse-proxy, serve static files, or upgrade WebSockets on our behalf.

So this board runs as its **own bun server on a side port**, launched by the plugin manifest
(`plugin.json` → `engine.serve.command`). All board routes live under **`/api/agora/*`** —
that prefix is load-bearing: a future daemon reverse-proxy (`:3456/api/agora/* → this process`)
is a drop-in once it lands, because the URL shape never changes.

## Attribution

See [ATTRIBUTION.md](./ATTRIBUTION.md).
