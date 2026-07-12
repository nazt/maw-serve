# Product

## Register

product

## Users

Fleet operators supervising many local oracle agents from a dense, always-on board. They need to spot unhealthy work, inspect live pane output, and arrange operational context without leaving the canvas or exposing a writable terminal.

## Product Purpose

Stoa is a read-only, spatial fleet observability board over existing `maw` primitives. It succeeds when an operator can understand fleet state, identify what needs attention, and inspect live activity quickly while the board remains a projection rather than a new source of truth.

## Brand Personality

Calm, operational, trustworthy. The interface should feel precise under pressure and quietly alive when the fleet is healthy.

## Anti-references

- Static dashboard grids that hide topology or make live work feel stale.
- Decorative SaaS surfaces that compete with operational state.
- Writable remote-terminal experiences or raw transport shortcuts that expand the fleet trust boundary.
- Status systems that rely on color or animation alone.

## Design Principles

1. Trust boundaries are product features: read-only and redacted by construction.
2. Show the fleet's current truth with graceful degradation when live feeds fail.
3. Reserve visual urgency for states that require human attention.
4. Keep spatial manipulation direct, predictable, and persistent.
5. Prefer existing `maw` primitives over parallel infrastructure.

## Accessibility & Inclusion

Maintain WCAG AA contrast for operational text, visible keyboard focus, semantic status labels beyond color, keyboard-accessible controls, and reduced-motion behavior for every animated state. Dense terminal content must remain scrollable and legible without triggering canvas gestures.
