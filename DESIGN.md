---
name: Stoa
description: A dark, read-only operational fabric for trustworthy local observation.
colors:
  background: "oklch(0.15 0.02 220)"
  surface: "oklch(0.19 0.02 220)"
  surface-raised: "oklch(0.23 0.02 220)"
  operational-panel: "color-mix(in oklch, oklch(0.19 0.02 220) 88%, oklch(0.15 0.02 220))"
  hairline: "oklch(0.3 0.02 220)"
  terminal-surface: "oklch(0.115 0.018 220)"
  ink: "oklch(0.96 0 0)"
  ink-dim: "oklch(0.76 0 0)"
  ink-faint: "oklch(0.68 0 0)"
  ink-inverse: "oklch(0.15 0 0)"
  active-phosphor: "oklch(0.85 0.19 155)"
  idle-cyan: "oklch(0.8 0.1 210)"
  stale-slate: "oklch(0.55 0.03 230)"
  pinned-amber: "oklch(0.82 0.16 75)"
  error-red: "oklch(0.68 0.2 25)"
  phosphor-background: "oklch(0.115 0.03 165)"
  phosphor-surface: "oklch(0.165 0.035 165)"
  phosphor-surface-raised: "oklch(0.215 0.045 160)"
  phosphor-hairline: "oklch(0.5 0.13 155)"
  phosphor-active: "oklch(0.88 0.23 150)"
  phosphor-idle: "oklch(0.8 0.13 195)"
  phosphor-stale: "oklch(0.58 0.055 165)"
  phosphor-pinned: "oklch(0.84 0.17 75)"
  phosphor-error: "oklch(0.7 0.21 25)"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "clamp(2.8rem, 7vw, 5.8rem)"
    fontWeight: 680
    lineHeight: 1.1
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "clamp(1.5rem, 3vw, 2.4rem)"
    fontWeight: 620
    lineHeight: 1.5
    letterSpacing: "-0.04em"
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.82rem"
    fontWeight: 680
    lineHeight: 1.5
    letterSpacing: "normal"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace"
    fontSize: "0.625rem"
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: "0.08em"
rounded:
  tight: "4px"
  compact: "6px"
  control: "10px"
  container: "12px"
  panel: "14px"
  pill: "999px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
  xl: "1.5rem"
  2xl: "2rem"
components:
  button-control:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.compact}"
    padding: "0 0.75rem"
    height: "2.75rem"
  button-control-hover:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.compact}"
    padding: "0 0.75rem"
    height: "2.75rem"
  button-primary:
    backgroundColor: "{colors.active-phosphor}"
    textColor: "{colors.ink-inverse}"
    rounded: "{rounded.control}"
    padding: "0.9rem 1.15rem"
  input-operational:
    backgroundColor: "{colors.background}"
    textColor: "{colors.ink}"
    rounded: "{rounded.compact}"
    padding: "0 0.75rem"
    height: "2.25rem"
  navigation-tab:
    backgroundColor: "transparent"
    textColor: "{colors.ink-dim}"
    rounded: "{rounded.tight}"
    padding: "0 0.5rem"
    height: "2.75rem"
  identity-chip:
    backgroundColor: "transparent"
    textColor: "{colors.ink-faint}"
    rounded: "{rounded.pill}"
    padding: "0.3rem 0.5rem"
  panel-stage:
    backgroundColor: "{colors.operational-panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    width: "100%"
  character-nameplate:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.container}"
    padding: "0.75rem 0.9rem"
    height: "5.4rem"
  status-bar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-dim}"
    padding: "0 0.75rem"
    height: "2rem"
---

# Design System: Stoa

## Overview

**Creative North Star: "The Private Character Stage"**

Stoa is a dark operational world, not a generic dashboard skin. Its blue-black fabric, exact hairlines, achromatic ink, and sparse phosphor signals create an observatory that stays calm under pressure and quietly alive when local truth is healthy. Information is dense, but hierarchy is earned through scale, spacing, and state rather than decorative chrome.

Trust is visible before capability. Read boundaries, local provenance, reversible selection, and explicit evidence gates appear as part of the interface rather than legalistic afterthoughts. When people are the subject, this world becomes a character stage: full-name plates occupy space and depth, while tables remain secondary ledgers for rooms or evidence.

**Key Characteristics:**
- Dark blue-black operational fabric with low-opacity field and grid atmosphere.
- Achromatic reading text with phosphor reserved for signal, state, and focus.
- One-pixel boundaries and tonal layering before structural shadow.
- Direct sans titles paired with compact monospaced operational metadata.
- Reversible spatial selection with deeper evidence behind an explicit action.

## Colors

The default plain preset is a cool blue-black neutral world; the phosphor preset raises green chroma and atmospheric visibility without recoloring the achromatic reading layer.

### Primary
- **Active Phosphor** (`active-phosphor`, `phosphor-active`): Marks live, selected, confirmed, and locally available state; use it as a signal, outline, or restrained glow rather than a field of body color.

### Secondary
- **Idle Cyan** (`idle-cyan`, `phosphor-idle`): Carries keyboard focus, neutral interactivity, linked topology, and available-but-not-live state.
- **Pinned Amber** (`pinned-amber`, `phosphor-pinned`): Identifies pinned, candidate, warning, and warm-attention state without borrowing critical urgency.

### Tertiary
- **Error Red** (`error-red`, `phosphor-error`): Reserved for revoked, failed, or critical conditions and always paired with text, iconography, or a semantic label.
- **Stale Slate** (`stale-slate`, `phosphor-stale`): Recedes stale or unresolved state through restrained chroma and opacity.

### Neutral
- **Operational Background** (`background`, `phosphor-background`): The full-viewport fabric and deepest canvas layer.
- **Surface and Raised Surface** (`surface`, `surface-raised`, `phosphor-surface`, `phosphor-surface-raised`): Layer controls, tiles, inspectors, and modal interiors by tone before adding shadow.
- **Operational Panel** (`operational-panel`): The slightly fused surface used by a contained stage or inspector.
- **Hairline** (`hairline`, `phosphor-hairline`): The one-pixel divider, boundary, and quiet outline vocabulary.
- **Ink, Dim Ink, and Faint Ink** (`ink`, `ink-dim`, `ink-faint`): Separate primary reading, supporting explanation, and metadata without introducing hue.
- **Inverse Ink** (`ink-inverse`): Sits on filled signal controls and status markers.
- **Terminal Surface** (`terminal-surface`): Keeps captured output visually deeper than ordinary panels.

### Named Rules

**The Signal, Not Ink Rule.** Text stays achromatic; phosphor is signal and atmosphere, never the default reading color.

**The Urgency Budget Rule.** Green means live, cyan means available, amber means pinned or warning, and red means failure or critical attention; never spend those roles decoratively.

## Typography

**Display Font:** Inter (with the system sans-serif stack)
**Body Font:** Inter (with the system sans-serif stack)
**Label/Mono Font:** JetBrains Mono (with the system monospace stack)

**Character:** The sans family carries names, questions, and direct action with compact authority. The mono family carries metrics, timestamps, capability state, build identity, keyboard hints, and other machine-adjacent evidence.

### Hierarchy
- **Display** (680, fluid `clamp(2.8rem, 7vw, 5.8rem)`, 1.1; 1.12 on compact screens): First-viewport trust statements and the principal question of a character stage; keep lines short, balanced, and safe for Thai glyph clearance.
- **Headline** (620, fluid `clamp(1.5rem, 3vw, 2.4rem)`, 1.5): Centered empty-state or command-surface introductions.
- **Title** (680, `0.82rem`, 1.5): Dense tile, result, room, and nameplate titles.
- **Body** (400, `1rem`, 1.5): Explanations and ordinary reading; trust-copy lines remain bounded around 62 characters where the implementation does so.
- **Label** (700, `0.625rem`, `0.08em` tracking): Uppercase section labels, compact state language, and operational counts in mono.

### Named Rules

**The Evidence Type Rule.** Use mono for state and provenance, not for every word; human names and explanatory prose stay in sans.

## Layout

Stoa fills the viewport and treats the canvas or stage as the primary world. Shell chrome stays shallow and anchored: the header lives above the world, the StatusBar is fixed at the bottom (`2rem`), and controls float only when they preserve the spatial reading path. Content-led surfaces may use a centered maximum width (`112rem`) with fluid outer padding (`clamp(1.5rem, 3vw, 3.5rem)`).

Use a compact rhythm built from quarter-rem steps, then create hierarchy with deliberate jumps to `1.5rem`, `2rem`, and fluid gaps. Dense metadata may sit close to its title; separate trust statements, world controls, the stage, and the evidence inspector with clear bands and full-width hairlines.

Responsive changes are structural, not merely smaller. Multi-column controls stack, stage density drops, and secondary inspectors become a single elevated overlay when a split view would make names or evidence illegible. Horizontally scroll only the world that genuinely needs spatial width; do not force the page shell itself to overflow.

## Elevation & Depth

Stoa uses a hybrid of tonal layering, one-pixel boundaries, low-opacity atmosphere, and restrained structural shadow. Ordinary controls are flat at rest. Floating menus use a low structural shadow (`0 4px 8px var(--elevation-shadow)`); contained character stages and inspectors use a deeper shadow (`0 24px 60px var(--elevation-shadow)`); the command palette alone earns modal depth (`0 28px 80px oklch(0 0 0 / 0.48)`) with a faint idle glow. Status glows communicate state around the full perimeter and never replace a semantic label.

### Shadow Vocabulary
- **Active Glow** (`0 0 12px 1px var(--active-glow)`): Live or selected operational state.
- **Idle Glow** (`0 0 9px 0 var(--idle-glow)`): Available controls, focus adjacency, and neutral topology.
- **Pinned Glow** (`0 0 11px 0 var(--pinned-glow)`): Pinned or warning state.
- **Error Glow** (`0 0 11px 0 var(--error-glow)`): Critical or revoked state.
- **Structural Low** (`0 4px 8px var(--elevation-shadow)`): Menus, details popovers, and small floating panels.
- **Structural Stage** (`0 24px 60px var(--elevation-shadow)`): A major contained world beside an inspector.

### Named Rules

**The Light Moves Rule.** At hover, brighten the boundary and glow; do not shift transform-positioned board tiles away from their spatial truth.

## Shapes

The form language is compact and engineered: tight shell corners (`4px`–`6px`), sturdy controls (`10px`), plates and containers (`12px`), and major stage panels (`14px`). Pills (`999px`) are reserved for small semantic chips, dots, and launcher capsules. Thin circular and elliptical geometry may describe topology or a stage horizon, but it must remain low-contrast and non-interactive.

Borders are one pixel and normally wrap the full component. Dashed borders indicate candidate or drop states; they are never a decorative substitute for status language.

### Named Rules

**The Full-Perimeter Rule.** Operational state owns the complete boundary; never reduce it to a fashionable side stripe.

## Components

### Buttons
- **Shape:** Compact controls use gently rounded corners (`6px`) and a minimum touch height (`2.75rem`); primary trust actions use a sturdier radius (`10px`).
- **Primary:** Fill with Active Phosphor, use inverse ink, strong weight (`750`), and measured padding (`0.9rem 1.15rem`).
- **Hover / Focus:** Primary actions may rise (`-2px`) and brighten; standard controls change from Surface to Raised Surface. All retain a visible Idle Cyan focus outline (`2px`, `3px` offset).
- **Secondary / Ghost:** Use a transparent or Surface fill with a Hairline border. Disabled controls keep their geometry, lower opacity, and use a not-allowed or waiting cursor when the state is meaningful.

### Chips
- **Style:** Small semantic capsules use a full pill radius, a one-pixel Hairline border, mono labels, and transparent or Raised Surface fill.
- **State:** Confirmed, candidate, trust, and status variants color both border and label; the text is mandatory because hue alone is never sufficient.

### Cards / Containers
- **Corner Style:** Ordinary content containers use `12px`; major stages and inspectors use `14px`.
- **Background:** Layer Background, Surface, Raised Surface, and Operational Panel tones; captured terminal output stays on Terminal Surface.
- **Shadow Strategy:** Default to tonal separation and a hairline. Use Structural Low only when floating and Structural Stage only for a major contained world.
- **Border:** One-pixel Hairline around the full perimeter.
- **Internal Padding:** Compact controls use `0.5rem`–`0.75rem`; reading panels typically begin at `1rem`; large page bands may reach `1.5rem`–`2rem`.

### Inputs / Fields
- **Style:** Operational fields are dark, bordered, and quiet, with compact corners (`6px`) in the board shell and sturdy corners (`10px`) in a large stage control row.
- **Focus:** Shift the boundary to Idle Cyan and preserve a visible focus indicator; do not rely on placeholder disappearance.
- **Error / Disabled:** Use Error Red with an adjacent message for failure. Disabled and busy fields retain labels and reduce opacity rather than vanishing.

### Navigation
- **Style:** Page tabs are monospaced, compact, and at least `2.75rem` high. The active tab uses brighter ink plus a one-pixel Idle Cyan underline with a restrained glow; hover changes ink, not position.
- **Mobile treatment:** Keep tabs horizontally scrollable with edge fades, collapse nonessential labels, and preserve `2.75rem` hit targets.
- **StatusBar:** Every page ends with the fixed operational strip, including readable build identity and a theme state that scripts can correlate with `GET /api/agora/version`.

### Character Stage

The reusable people-world signature begins with a locked local trust contract, then opens into full-name plates plus explicit time-window controls. A stage may show the top 24 loaded observations by recent activity, but search still reports the loaded match count; never imply that activity is a relationship score. Plates use depth and a full boundary to express recency, while candidate identity remains dashed and labeled.

Selection opens a bounded inspector without destroying the stage. Browser Back, Escape, and a visible close control all reverse that selection. At wide sizes the inspector occupies a constrained companion column (`24rem`–`30rem`); below the established overlay breakpoint (`58rem`) it becomes a fixed panel so the name stage remains legible. Conversation excerpts stay behind a separate, explicit evidence action even after local read access has been granted.

**The Person Is Not a Row Rule.** Lead a people view with full-name plates on a spatial character stage; reserve tables for room ledgers and secondary evidence.

**The Reversible Selection Rule.** Opening a person must preserve the world and provide visible Close, Escape, and browser Back paths.

**The Explicit Evidence Rule.** Unlocking local read access never implies consent to display conversation excerpts; evidence requires its own bounded action.

## Do's and Don'ts

### Do:
- **Do** build new Stoa surfaces from the existing Background, Surface, Raised Surface, Hairline, and achromatic Ink roles before introducing any new color.
- **Do** pair every status color or animation with readable state text, a symbol, or both.
- **Do** preserve the local read boundary, reversible selection, and explicit evidence gate when reusing the character-stage pattern.
- **Do** keep focus visible and honor reduced-motion by removing animation and transition without removing state.
- **Do** expose the same build identity visually in the StatusBar and programmatically through `GET /api/agora/version`.

### Don't:
- **Don't** turn Stoa into a generic admin table, card grid, or decorative SaaS dashboard.
- **Don't** use phosphor as body copy, a large decorative fill, or an unearned urgency effect.
- **Don't** replace full-perimeter state with side stripes, color-only dots, or continuous motion.
- **Don't** make a person selection destructive, modal without an exit, or equivalent to reading private evidence.
- **Don't** promote isolated radii, shadows, or spacing values into new tokens without repeated implementation evidence.
