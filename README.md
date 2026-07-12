# maw-serve — Stoa, the Native Oracle Board

`maw-serve` hosts **Stoa**, an interactive observability board for the oracle fleet on the
machine where it runs. Stoa turns `maw census --json` into draggable fleet tiles on an
infinite canvas, adds activity-first tidy/fit, notes, images, read-only terminal snapshots,
and optional Argus usage heat. It is a local projection of the fleet—not a source of truth—and
serves the app and its read-only data endpoints under `/api/agora/*`.

> **Screenshot placeholder:** add a current Stoa board capture here.

## Prerequisites

Install these on the target machine before building Stoa:

### 1. Bun

Stoa uses Bun to install, build, and serve the app.

```bash
curl -fsSL https://bun.sh/install | bash
bun --version
```

If your current shell cannot find Bun after installation, open a new shell or add
`$HOME/.bun/bin` to `PATH` as instructed by the installer.

### 2. `maw` CLI (maw-rs)

The server shells out to `maw census --json` for the fleet and `maw peek` for explicit,
read-only terminal captures. Install the current maw-rs release, which places a `maw` binary
in `$HOME/.local/bin` by default:

```bash
curl -fsSL https://github.com/Soul-Brews-Studio/maw-rs/releases/latest/download/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"
maw --version
```

See the [maw-rs releases](https://github.com/Soul-Brews-Studio/maw-rs/releases) for supported
platform binaries and checksums. If maw-rs is installed another way, the only Stoa requirement
is that a working executable named `maw` is on `PATH`.

### 3. tmux with fleet sessions

Install `tmux`, start the sessions you want to observe, and confirm that maw can see them:

```bash
tmux list-sessions
maw census --json
```

Stoa shows **this machine's** fleet. An empty or stopped tmux environment produces an empty
board even when the web server itself is healthy.

### 4. Optional Argus network access

The target should be able to reach `https://argus.buildwithoracle.com` to display per-oracle
usage heat. Stoa gracefully degrades when Argus is unreachable: fleet tiles still load, but
usage heat and account totals may be unavailable.

## Quickstart

```bash
git clone https://github.com/nazt/maw-serve
cd maw-serve/web
bun install
bun run build
cd ..
MAW_SERVE_PORT=4756 bun server-demo.ts
```

Open **http://127.0.0.1:4756/api/agora/**.

The repository also includes an idempotent bootstrap that checks prerequisites, installs web
dependencies, and builds the board without installing system software:

```bash
./scripts/install.sh
```

## Run forever (optional)

With [PM2](https://pm2.keymetrics.io/) already installed:

```bash
cd maw-serve
MAW_SERVE_PORT=4756 pm2 start "bun server-demo.ts" --name stoa
pm2 save
```

On macOS, a user `launchd` agent can run the same command at login. Set its working directory
to the cloned repository, include the Bun and maw directories in `PATH`, and use
`MAW_SERVE_PORT=4756`. Keep the process bound to a trusted interface or put authentication in
front of it before exposing it beyond localhost.

## Deploy the interface to Cloudflare Workers (optional)

The Cloudflare deployment contains **static UI assets only**. Census, usage, version, capture,
and terminal stream requests go directly from the viewer's browser to that viewer's own
`maw-serve`; fleet data does not pass through Cloudflare.

1. Build the UI configured for `stoa.buildwithoracle.com` in
   [`wrangler.stoa.json`](./wrangler.stoa.json).
2. Start the local data server with that exact HTTPS origin allowlisted (comma-separate more
   than one origin when needed):

   ```bash
   MAW_SERVE_PORT=48900 \
   MAW_SERVE_CORS_ORIGINS=https://stoa.buildwithoracle.com \
   bun server-demo.ts
   ```

3. Deploy the already-built `public/` directory:

   ```bash
   cd web && bun install && bun run build && cd ..
   npx wrangler deploy --config wrangler.stoa.json
   ```

4. Open the hosted board and point it at the local server:

   ```text
   https://stoa.buildwithoracle.com/api/agora/?host=http://localhost:48900
   ```

Host selection is resolved once per page load in this order: the `?host=` parameter, the
previously saved host, then same-origin. Use an empty `?host=` to clear the saved value and
return to same-origin mode. Chrome may ask for local-network access; the client declares
loopback separately from LAN targets, and the allowlisted server answers the corresponding
Private Network Access preflight. There is deliberately no wildcard CORS mode.

## Trust model

- **No secrets in feeds.** Usage exposes names and rates, not tokens or account credentials.
- **No filesystem serving by default.** The board serves its built assets and named API routes,
  not arbitrary home-directory paths.
- **Explicit terminal capture.** Pane text is requested by a user action and remains read-only.
- **State is a projection.** Census, Argus, and tmux remain authoritative; local board state is
  presentation and workspace state.

## Routes

- `GET /api/agora/` — board SPA and SPA fallback
- `GET /api/agora/census` — local topology from `maw census --json`
- `GET /api/agora/usage` — Argus board-tile usage data, with no secrets
- `GET /api/agora/capture?session=&window=&lines=` — explicit read-only pane snapshot
- `GET /api/agora/stream?session=&window=&lines=` — read-only terminal SSE
- `GET /api/agora/version` — branch, commit, and builder identity

For frontend features, architecture, and development notes, see
[web/README.md](./web/README.md). For upstream inspiration and license details, see
[ATTRIBUTION.md](./ATTRIBUTION.md).

## Roadmap

Install Stoa as a maw plugin (`maw agora`) once `engine.serve` v2 mounts external plugins—then
no manual clone will be needed.
