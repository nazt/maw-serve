# Stoa — the Oracle Board 🛰️

A **very cool, live fleet-observability board** for the oracle fleet: ~75 oracle tiles on an infinite canvas, live status, and a real maw-board-style interactive workspace. React + TypeScript + Vite + Tailwind, served under `/api/agora/*`.

Built overnight by a codex-5 coder team (gpt-5.6-sol), designed by **agora** (/impeccable "Fleet Observatory"), ported from `ekzhang/sshx`'s board mechanics (clean-room, attribution below), and refined with live feedback from the fleet itself (argus, window-arranger, display-census). Every feature was tested in-browser each round.

## What it does

A deep-space **observatory** where each oracle is a living tile:

| Feature | Notes |
|---|---|
| **Infinite canvas** | pan (wheel/drag), zoom-to-cursor (ctrl/⌘+wheel, 0.35–2×), `Fit` |
| **Live fleet tiles** | from `maw census --json`; active-first, status glow (green active · cyan idle · gray stale · amber pinned · red error), gentle **breathe** on active |
| **Usage heat rings** | argus per-oracle 5h rate → conic heat arc |
| **Board items** | **Add note** (sticky) · **Add image** (clipboard/URL) — draggable, resizable, persistent |
| **Terminal tiles** | **double-click an oracle** → live pane snapshot (`/api/agora/capture`, polled ~2s) on the canvas |
| **Click-to-focus** | single-click → smooth zoom-to-tile + selection + detail (session:pane/model/idle) |
| **Jump to active** (`J`) | cycle-focus the most-recently-active oracles |
| **⚠ Needs-attention** (`A`) | auto-surfaces oracles that need a human: **error** · **stuck** (active + no output >15m) · **account near cap** (5h/7d >80% → rotate token; 50–80% amber watch) — thresholds aligned with argus's gauge zones. Toolbar counter + jump-to-fix |
| **Spiral-tidy** | `Fit` re-packs tiles by activity (most-active center), no-flicker |
| **Persistence** | localStorage: tile drags, board-items, canvas zoom survive reload · `Reset layout` |
| **Discoverability** | first-run hint · status legend · hover reveal (session:pane) |
| Craft | dark OKLCH "Fleet Observatory", starfield background, ease-out-expo motion, `prefers-reduced-motion` fallbacks, aria-labels/live, responsive (toolbar wraps, auto-fit), contrast ≥4.5:1 |

## Run

```bash
# 1. build the SPA (outputs to ../public)
cd web && bun install && bun run build

# 2. serve it (SPA + data endpoints)
cd .. && bun server-demo.ts        # http://127.0.0.1:4756/api/agora/
```

Endpoints (`server-demo.ts`):
- `GET /api/agora/` — the board SPA (+ SPA fallback)
- `GET /api/agora/census` — fleet topology (`maw census --json`)
- `GET /api/agora/usage` — argus board-tile (per-oracle/account rate, no secrets)
- `GET /api/agora/capture?session=&window=&lines=` — pane text snapshot (`maw peek`, ANSI-stripped, explicit-click only)

## Architecture (`web/src/`)

```
canvas/   useCanvas (center/zoom, screen↔world, zoom-to-cursor, focusOn) + Fabric
tiles/    Tile (worldToScreen positioning, resize) + useDrag (offset math, rAF, soft-snap guides)
fleet/    useFleet (poll census+usage, build tiles, join heat, attention, persist-merge)
          OracleTileContent · StatusBar · Toolbar
board/    boardItems (note/image) · TerminalTile · persist (localStorage)
App.tsx   composes it all
```

Design principle (the whole reason it's native, not the sshx fork): **trust-model-as-axis** — no secrets in feeds (rate% only), explicit-click terminal capture, read-only v1.

## Attribution

Board mechanics (infinite-canvas coordinate model, tile drag/resize, soft-snap, board-item model, terminal-on-canvas) are **inspired by** [`ekzhang/sshx`](https://github.com/ekzhang/sshx) (MIT). This is a clean-room reimplementation in React — no sshx code copied. See `../ATTRIBUTION.md`.

Data contracts by the fleet: **argus** (usage + the needs-attention idea), **window-arranger** (layout-core / spiral-tidy), **display-census** / **maw-rs** (`maw census`).
