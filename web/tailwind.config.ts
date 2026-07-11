import type { Config } from "tailwindcss";

const oklch = (channels: string) => `oklch(var(${channels}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  safelist: [
    "bg-bg",
    "bg-surface",
    "bg-surface-2",
    "text-ink",
    "text-ink-dim",
    "border-line",
    "border-active",
    "border-idle",
    "border-stale",
    "border-pinned",
    "border-error",
    "text-status-active",
    "text-status-idle",
    "text-status-stale",
    "text-status-pinned",
    "text-status-error",
    "bg-heat-cool",
    "bg-heat-warm",
    "bg-heat-hot",
    "bg-heat-track",
    "font-sans",
    "font-mono",
    "shadow-glow-active",
    "shadow-glow-idle",
    "shadow-glow-stale",
    "shadow-glow-pinned",
    "shadow-glow-error",
    "ease-expo",
    "animate-breathe",
    "animate-enter",
    "animate-starfield",
    "fabric",
    "tile",
    "oracle-tile",
    "active",
    "is-dragging",
    "is-resizing",
    "tile-glow",
    "tile-glow-active",
    "tile-glow-idle",
    "tile-glow-stale",
    "tile-glow-pinned",
    "tile-glow-error",
    "tile-enter",
    "heat-ring",
    "heat-ring-warm",
    "heat-ring-hot",
    "heat-ring-pinned",
  ],
  theme: {
    extend: {
      colors: {
        bg: oklch("--bg-channels"),
        surface: oklch("--surface-channels"),
        "surface-2": oklch("--surface-2-channels"),
        ink: oklch("--ink-channels"),
        "ink-dim": oklch("--ink-dim-channels"),
        line: oklch("--line-channels"),

        active: oklch("--active-channels"),
        idle: oklch("--idle-channels"),
        stale: oklch("--stale-channels"),
        pinned: oklch("--pinned-channels"),
        error: oklch("--error-channels"),

        status: {
          active: oklch("--active-channels"),
          idle: oklch("--idle-channels"),
          stale: oklch("--stale-channels"),
          pinned: oklch("--pinned-channels"),
          error: oklch("--error-channels"),
        },

        heat: {
          cool: oklch("--heat-cool-channels"),
          warm: oklch("--heat-warm-channels"),
          hot: oklch("--heat-hot-channels"),
          track: oklch("--heat-track-channels"),
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      boxShadow: {
        "glow-active": "0 0 12px 1px var(--active-glow)",
        "glow-idle": "0 0 9px 0 var(--idle-glow)",
        "glow-stale": "0 0 7px 0 var(--stale-glow)",
        "glow-pinned": "0 0 11px 0 var(--pinned-glow)",
        "glow-error": "0 0 11px 0 var(--error-glow)",
      },
      transitionTimingFunction: {
        expo: "var(--ease-out-expo)",
      },
      keyframes: {
        breathe: {
          "0%, 100%": {
            boxShadow: "0 0 5px 0 oklch(var(--active-channels) / 0.18)",
          },
          "50%": {
            boxShadow: "0 0 12px 1px oklch(var(--active-channels) / 0.38)",
          },
        },
        enter: {
          from: {
            opacity: "0",
            transform: "scale(0.975)",
          },
          to: {
            opacity: "1",
            transform: "scale(1)",
          },
        },
        starfield: {
          from: {
            transform: "translate3d(0, 0, 0)",
          },
          to: {
            transform: "translate3d(64px, 48px, 0)",
          },
        },
      },
      animation: {
        breathe: "breathe 3s var(--ease-out-expo) infinite",
        enter: "enter 460ms var(--ease-out-expo) backwards",
        starfield: "starfield 56s linear infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
