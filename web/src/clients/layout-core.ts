// Vendored from Soul-Brews-Studio/window-arranger-oracle/lib/layout-core.ts.
// Source located with: ghq list | rg window-arranger; git -C <repo> ls-files | rg layout-core.
// Kept as a zero-dependency client shim for maw-serve consumer smoke tests.

export interface Rect { x: number; y: number; w: number; h: number; }

export type LayoutMode = "spiral" | "flip" | "flipup" | "grid" | "columns" | "rows";
export const LAYOUT_MODES: LayoutMode[] = ["spiral", "flip", "flipup", "grid", "columns", "rows"];

export const MODE_LABEL: Record<LayoutMode, string> = {
  spiral: "Spiral — Fibonacci, largest first (left)",
  flip: "Flip — largest right, curls down",
  flipup: "Flip ↑ — largest right, curls up",
  grid: "Grid — near-square equal cells",
  columns: "Columns — one row, side by side",
  rows: "Rows — one column, stacked",
};

export function spiralRects(outer: Rect, count: number, gap: number): Rect[] {
  if (count <= 0) return [];
  if (count === 1) return [{ ...outer }];
  const isWide = outer.w >= outer.h;
  let first: Rect, rest: Rect;
  if (isWide) {
    const halfW = (outer.w - gap) / 2;
    first = { x: outer.x, y: outer.y, w: halfW, h: outer.h };
    rest = { x: outer.x + halfW + gap, y: outer.y, w: halfW, h: outer.h };
  } else {
    const halfH = (outer.h - gap) / 2;
    first = { x: outer.x, y: outer.y, w: outer.w, h: halfH };
    rest = { x: outer.x, y: outer.y + halfH + gap, w: outer.w, h: halfH };
  }
  return [first, ...spiralRects(rest, count - 1, gap)];
}

export function mirrorXRects(rects: Rect[], outer: Rect): Rect[] {
  return rects.map((r) => ({ ...r, x: outer.x + outer.w - (r.x - outer.x) - r.w }));
}

export function mirrorYRects(rects: Rect[], outer: Rect): Rect[] {
  return rects.map((r) => ({ ...r, y: outer.y + outer.h - (r.y - outer.y) - r.h }));
}

export function gridRects(outer: Rect, count: number, gap: number): Rect[] {
  if (count <= 0) return [];
  let best = { cols: 1, rows: count, score: Infinity };
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    const empty = cols * rows - count;
    const cellW = (outer.w - (cols - 1) * gap) / cols;
    const cellH = (outer.h - (rows - 1) * gap) / rows;
    const aspectDev = Math.abs(Math.log(cellW / cellH));
    const score = empty * 2 + aspectDev;
    if (score < best.score) best = { cols, rows, score };
  }
  const { cols } = best;
  const rows = Math.ceil(count / cols);
  const cellW = (outer.w - (cols - 1) * gap) / cols;
  const cellH = (outer.h - (rows - 1) * gap) / rows;
  return Array.from({ length: count }, (_, i) => {
    const r = Math.floor(i / cols), c = i % cols;
    return { x: outer.x + c * (cellW + gap), y: outer.y + r * (cellH + gap), w: cellW, h: cellH };
  });
}

export function columnsRects(outer: Rect, count: number, gap: number): Rect[] {
  if (count <= 0) return [];
  const w = (outer.w - (count - 1) * gap) / count;
  return Array.from({ length: count }, (_, i) => ({ x: outer.x + i * (w + gap), y: outer.y, w, h: outer.h }));
}

export function rowsRects(outer: Rect, count: number, gap: number): Rect[] {
  if (count <= 0) return [];
  const h = (outer.h - (count - 1) * gap) / count;
  return Array.from({ length: count }, (_, i) => ({ x: outer.x, y: outer.y + i * (h + gap), w: outer.w, h }));
}

export function packRects(outer: Rect, count: number, gap: number, mode: LayoutMode): Rect[] {
  switch (mode) {
    case "grid": return gridRects(outer, count, gap);
    case "columns": return columnsRects(outer, count, gap);
    case "rows": return rowsRects(outer, count, gap);
    case "flip": return mirrorXRects(spiralRects(outer, count, gap), outer);
    case "flipup": return mirrorYRects(mirrorXRects(spiralRects(outer, count, gap), outer), outer);
    case "spiral":
    default: return spiralRects(outer, count, gap);
  }
}

export function packItems(outer: Rect, count: number, gap: number, mode: LayoutMode): { rect: Rect; index: number }[] {
  return packRects(outer, count, gap, mode).map((rect, index) => ({ rect, index }));
}

const PALETTE = ["#16537e", "#1d6796", "#2b7fb8", "#e94560", "#53354a", "#3a2f14", "#173a2b", "#7d5ba6"];
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

export function renderRectsSVG(
  frame: Rect,
  items: { rect: Rect; label?: string }[],
  opts: { title?: string; canvasW?: number } = {},
): string {
  const MARGIN = 8, LABEL_H = opts.title ? 26 : 0, CANVAS_W = opts.canvasW ?? 1000;
  const scale = (CANVAS_W - MARGIN * 2) / frame.w;
  const drawH = frame.h * scale;
  const CANVAS_H = Math.round(drawH + MARGIN * 2 + LABEL_H);
  const offsetX = MARGIN, offsetY = MARGIN + LABEL_H;
  const body = items.map((it, i) => {
    const x = offsetX + (it.rect.x - frame.x) * scale;
    const y = offsetY + (it.rect.y - frame.y) * scale;
    const w = it.rect.w * scale, h = it.rect.h * scale;
    const label = it.label
      ? `<text x="${x + 6}" y="${y + 16}" fill="white" font-family="monospace" font-size="11">${esc(it.label)}</text>` : "";
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${PALETTE[i % PALETTE.length]}" stroke="#fff" stroke-width="1.5" opacity="0.85"/>${label}`;
  }).join("");
  const titleEl = opts.title
    ? `<text x="${MARGIN}" y="18" fill="#8fd3ff" font-family="monospace" font-size="14">${esc(opts.title)}</text>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_W}" height="${CANVAS_H}" viewBox="0 0 ${CANVAS_W} ${CANVAS_H}">
    <rect width="${CANVAS_W}" height="${CANVAS_H}" fill="#0a0e14"/>${titleEl}
    <rect x="${offsetX}" y="${offsetY}" width="${frame.w * scale}" height="${drawH}" fill="none" stroke="#444" stroke-dasharray="4,4"/>
    ${body}
  </svg>`;
}
