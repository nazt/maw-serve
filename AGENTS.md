# Stoa contributor instructions

## Development port registry (canonical)

| Surface | Port |
| --- | ---: |
| server | `48901` |
| css | `48902` |
| shell | `48903` |
| topo | `48904` |
| usage | `48905` |
| **INTEGRATION** | **`48900`** |

- Integration builds come from `main` only and have one owner chosen by Agora.
- Feature demos run on their assigned port. Never use `48900` for a feature branch.
- Vite development and preview servers must set the assigned port with `strictPort: true`; never silently select another port.
- Every test report includes the exact feature-demo URL so reviewers can identify the build they opened.
- Every page must expose build identity in the StatusBar, and scripts must be able to read the same identity from `GET /api/agora/version`.
