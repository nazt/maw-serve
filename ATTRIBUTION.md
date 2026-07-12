# Attribution

**maw-serve** (Stoa, the Native Oracle Board) is inspired by
[**ekzhang/sshx**](https://github.com/ekzhang/sshx) by Eric Zhang, licensed under the
[MIT License](https://github.com/ekzhang/sshx/blob/main/LICENSE).

We previously ran a fork of sshx (`meyd-605/maw-board`) as a collaborative terminal/board tool.
Studying it in production surfaced three trust-boundary gaps we did not want to inherit:
board content stored in plaintext, a default filesystem-serving mode, and a spoofed
User-Agent used to survive WAF/CDN checks.

`maw-serve` is a **clean-room reimplementation** built on our own fleet's primitives
(`maw serve`, argus, census, window-arranger) — no source code from `sshx` was copied into
this project. Credit to Eric Zhang and the sshx contributors for the original idea of a
collaborative, shareable terminal/board experience.

The Stoa physical-display mirror is a clean-room implementation informed by
[**laris-co/display-census**](https://github.com/laris-co/display-census)'s public
WebSocket and SpaceReport contracts; no display-census UI source was copied.
