export interface TerminalSourceDimensions {
  cols: number;
  rows: number;
}

export const MIN_TERMINAL_FONT_SIZE = 6;
export const MAX_TERMINAL_FONT_SIZE = 40;
export const TERMINAL_CHAR_WIDTH_RATIO = 0.6;
export const TERMINAL_LINE_HEIGHT_RATIO = 1.25;
export const MIN_TERMINAL_ZOOM = 0.5;
export const MAX_TERMINAL_ZOOM = 3;
export const DEFAULT_TERMINAL_ZOOM = 1;
export const TERMINAL_ZOOM_STEP = 0.1;

export interface TerminalDisplayGrid {
  cols: number;
  rows: number;
  fontSize: number;
}

function validDimension(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 1_000;
}

export function parseTerminalMeta(data: string): TerminalSourceDimensions | null {
  try {
    const value: unknown = JSON.parse(data);
    if (!value || typeof value !== "object") return null;
    const candidate = value as Partial<TerminalSourceDimensions>;
    if (!validDimension(candidate.cols) || !validDimension(candidate.rows)) return null;
    return { cols: candidate.cols, rows: candidate.rows };
  } catch {
    return null;
  }
}

export function terminalFontSize(
  contentWidth: number,
  cols: number,
  zoomFactor = DEFAULT_TERMINAL_ZOOM,
  charWidthRatio = TERMINAL_CHAR_WIDTH_RATIO,
): number {
  if (
    !Number.isFinite(contentWidth) ||
    contentWidth <= 0 ||
    !validDimension(cols) ||
    !Number.isFinite(zoomFactor) ||
    zoomFactor <= 0 ||
    !Number.isFinite(charWidthRatio) ||
    charWidthRatio <= 0
  ) {
    return MIN_TERMINAL_FONT_SIZE;
  }
  const fitFont = contentWidth / (cols * charWidthRatio);
  const scaled = fitFont * zoomFactor;
  const clamped = Math.min(
    MAX_TERMINAL_FONT_SIZE,
    Math.max(MIN_TERMINAL_FONT_SIZE, scaled),
  );
  return Math.round(clamped * 100) / 100;
}

export function terminalRows(
  contentHeight: number,
  fontSize: number,
  lineHeightRatio = TERMINAL_LINE_HEIGHT_RATIO,
): number {
  if (
    !Number.isFinite(contentHeight) ||
    contentHeight <= 0 ||
    !Number.isFinite(fontSize) ||
    fontSize <= 0 ||
    !Number.isFinite(lineHeightRatio) ||
    lineHeightRatio <= 0
  ) {
    return 1;
  }
  return Math.max(1, Math.floor(contentHeight / (fontSize * lineHeightRatio)));
}

export function terminalDisplayGrid(
  contentWidth: number,
  contentHeight: number,
  sourceCols: number,
  zoomFactor = DEFAULT_TERMINAL_ZOOM,
): TerminalDisplayGrid {
  const cols = validDimension(sourceCols) ? sourceCols : 1;
  const fontSize = terminalFontSize(contentWidth, cols, zoomFactor);
  return {
    cols,
    rows: terminalRows(contentHeight, fontSize),
    fontSize,
  };
}

export function clampTerminalZoom(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_TERMINAL_ZOOM;
  const clamped = Math.min(MAX_TERMINAL_ZOOM, Math.max(MIN_TERMINAL_ZOOM, value));
  return Math.round(clamped * 100) / 100;
}

export function parseTerminalZoom(value: string | null): number {
  if (value === null || value.trim() === "") return DEFAULT_TERMINAL_ZOOM;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? clampTerminalZoom(parsed) : DEFAULT_TERMINAL_ZOOM;
}

export function stepTerminalZoom(current: number, direction: -1 | 1): number {
  return clampTerminalZoom(current + direction * TERMINAL_ZOOM_STEP);
}
