# Stoa development ports

`AGENTS.md` is the canonical registry every coder harness reads. This file is its human-facing copy. Each feature demo owns one strict port; integration is reserved for builds from `main` and has one owner chosen by Agora.

| Surface | Port |
| --- | ---: |
| server | `48901` |
| css | `48902` |
| shell | `48903` |
| topo | `48904` |
| usage | `48905` |
| **INTEGRATION** | **`48900`** |

## Rules

- Integration builds come from `main` only. Agora names the single integration owner.
- Feature demos run on their assigned port, never on `48900`.
- Vite development and preview servers must use their assigned port with `strictPort: true`; they must fail instead of silently selecting another port.
- Reports include the exact feature-demo URL so reviewers know which build they opened.
