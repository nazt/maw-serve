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
    "text-ink-faint",
    "text-ink-inverse",
    "border-line",
    "border-active",
    "border-idle",
    "border-stale",
    "border-pinned",
    "border-error",
    "border-attention-warn",
    "border-attention-critical",
    "text-status-active",
    "text-status-idle",
    "text-status-stale",
    "text-status-pinned",
    "text-status-error",
    "text-attention-warn",
    "text-attention-critical",
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
    "shadow-attention-warn",
    "shadow-attention-critical",
    "ease-expo",
    "animate-breathe",
    "animate-enter",
    "animate-starfield",
    "animate-hint-in",
    "animate-hint-out",
    "animate-attention-warn",
    "animate-attention-pulse",
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
    "status-legend",
    "status-legend__item",
    "status-legend__dot",
    "board-hint",
    "board-hint__dismiss",
    "oracle-meta",
    "terminal-connector",
  ],
  theme: {
    extend: {
      colors: {
        bg: oklch("--bg-channels"),
        surface: oklch("--surface-channels"),
        "surface-2": oklch("--surface-2-channels"),
        ink: oklch("--ink-channels"),
        "ink-dim": oklch("--ink-dim-channels"),
        "ink-faint": oklch("--ink-faint-channels"),
        "ink-inverse": oklch("--ink-inverse-channels"),
        line: oklch("--line-channels"),

        active: oklch("--active-channels"),
        idle: oklch("--idle-channels"),
        stale: oklch("--stale-channels"),
        pinned: oklch("--pinned-channels"),
        error: oklch("--error-channels"),

        attention: {
          warn: oklch("--attention-warn-channels"),
          critical: oklch("--attention-critical-channels"),
        },

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
        "attention-warn": "0 0 0 2px var(--attention-warn), 0 0 10px 1px var(--attention-warn-glow)",
        "attention-critical":
          "0 0 0 2px var(--attention-critical), 0 0 14px 3px var(--attention-critical-glow)",
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
        "hint-in": {
          from: {
            opacity: "0",
            transform: "translateY(-5px) scale(0.985)",
          },
          to: {
            opacity: "1",
            transform: "translateY(0) scale(1)",
          },
        },
        "hint-out": {
          from: {
            opacity: "1",
            transform: "translateY(0) scale(1)",
          },
          to: {
            opacity: "0",
            transform: "translateY(-4px) scale(0.99)",
          },
        },
        "attention-pulse": {
          "0%, 100%": {
            boxShadow:
              "0 0 0 1px oklch(var(--attention-channels) / 0.62), 0 0 6px 0 var(--attention-glow)",
          },
          "50%": {
            boxShadow:
              "0 0 0 3px oklch(var(--attention-channels) / var(--attention-ring-alpha)), 0 0 var(--attention-blur) var(--attention-spread) var(--attention-glow)",
          },
        },
      },
      animation: {
        breathe: "breathe 3s var(--ease-out-expo) infinite",
        enter: "enter 460ms var(--ease-out-expo) backwards",
        starfield: "starfield 56s linear infinite",
        "hint-in": "hint-in 420ms var(--ease-out-expo) backwards",
        "hint-out": "hint-out 240ms var(--ease-out-expo) forwards",
        "attention-warn":
          "attention-pulse 1.8s var(--ease-out-expo) infinite",
        "attention-pulse":
          "attention-pulse 1.4s var(--ease-out-expo) infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
