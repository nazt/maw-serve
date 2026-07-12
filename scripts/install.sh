#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
WEB_DIR="$ROOT_DIR/web"

say() {
  printf '%s\n' "$*"
}

warn() {
  printf 'warning: %s\n' "$*" >&2
}

have() {
  command -v "$1" >/dev/null 2>&1
}

missing_bun=0

if have bun; then
  say "found bun: $(command -v bun)"
else
  missing_bun=1
  warn "bun is required to build Stoa"
  warn "install hint: curl -fsSL https://bun.sh/install | bash"
fi

if have maw; then
  say "found maw: $(command -v maw)"
else
  warn "maw is not on PATH; the board will not be able to load local fleet data"
  warn "install hint: curl -fsSL https://github.com/Soul-Brews-Studio/maw-rs/releases/latest/download/install.sh | sh"
fi

if have tmux; then
  say "found tmux: $(command -v tmux)"
  if ! tmux list-sessions >/dev/null 2>&1; then
    warn "tmux is installed but no running sessions were found; Stoa may show an empty fleet"
  fi
else
  warn "tmux is not on PATH; install it with your operating system package manager"
fi

if [ "$missing_bun" -ne 0 ]; then
  warn "bootstrap stopped because Bun is required; no software was installed"
  exit 1
fi

say "installing web dependencies..."
cd "$WEB_DIR"
bun install

say "building Stoa..."
bun run build

say ""
say "Stoa is built. Run:"
say "  cd $ROOT_DIR"
say "  MAW_SERVE_PORT=4756 bun server-demo.ts"
say ""
say "Then open: http://127.0.0.1:4756/api/agora/"
