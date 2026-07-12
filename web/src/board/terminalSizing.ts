export interface TerminalSourceDimensions {
  cols: number;
  rows: number;
}

export interface TerminalCellMetrics {
  width: number;
  height: number;
  fontSize: number;
}

export const MIN_TERMINAL_FONT_SIZE = 8;
export const DEFAULT_TERMINAL_FONT_SIZE = 11;
export const MAX_TERMINAL_FONT_SIZE = 40;
export const TERMINAL_LINE_HEIGHT_RATIO = 1.3;
export const TERMINAL_TILE_MAX_VIEWPORT_WIDTH_RATIO = 0.7;
export const TERMINAL_TILE_MAX_VIEWPORT_HEIGHT_RATIO = 0.8;
export const MIN_TERMINAL_ZOOM = 0.5;
export const MAX_TERMINAL_ZOOM = 3;
export const DEFAULT_TERMINAL_ZOOM = 1;
export const TERMINAL_ZOOM_STEP = 0.1;

export interface TerminalDisplayGrid {
  cols: number;
  rows: number;
  fontSize: number;
}

export interface TerminalTileSize {
  w: number;
  h: number;
  clampedWidth: boolean;
  clampedHeight: boolean;
}

function validDimension(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 1_000;
}

function validCellMetrics(metrics: TerminalCellMetrics): boolean {
  return [metrics.width, metrics.height, metrics.fontSize].every(
    (value) => Number.isFinite(value) && value > 0,
  );
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
  cellMetrics: TerminalCellMetrics,
  zoomFactor = DEFAULT_TERMINAL_ZOOM,
): number {
  if (
    !Number.isFinite(contentWidth) ||
    contentWidth <= 0 ||
    !validDimension(cols) ||
    !Number.isFinite(zoomFactor) ||
    zoomFactor <= 0 ||
    !validCellMetrics(cellMetrics)
  ) {
    return MIN_TERMINAL_FONT_SIZE;
  }
  // Preserve xterm's rendered glyph aspect instead of assuming a monospace
  // width ratio. The measured cell already includes the active font stack and
  // device-pixel rounding.
  const fitFont = cellMetrics.fontSize * contentWidth / (cols * cellMetrics.width);
  // The tile follows the pane at a readable default size. A narrow user-sized
  // tile may reduce the type slightly, but never back to the former 6px cram.
  // Zoom remains an explicit magnification override and may introduce scroll.
  const readableBase = Math.max(
    MIN_TERMINAL_FONT_SIZE,
    Math.min(DEFAULT_TERMINAL_FONT_SIZE, fitFont),
  );
  const scaled = readableBase * zoomFactor;
  const clamped = Math.min(
    MAX_TERMINAL_FONT_SIZE,
    Math.max(MIN_TERMINAL_FONT_SIZE, scaled),
  );
  return Math.round(clamped * 100) / 100;
}

export function terminalTileSize(
  source: TerminalSourceDimensions,
  cellMetrics: TerminalCellMetrics,
  chromeWidth: number,
  chromeHeight: number,
  maxWidth: number,
  maxHeight: number,
): TerminalTileSize {
  if (!validDimension(source.cols) || !validDimension(source.rows) || !validCellMetrics(cellMetrics)) {
    return { w: 560, h: 340, clampedWidth: false, clampedHeight: false };
  }
  const safeChromeWidth = Math.max(0, Number.isFinite(chromeWidth) ? chromeWidth : 0);
  const safeChromeHeight = Math.max(0, Number.isFinite(chromeHeight) ? chromeHeight : 0);
  const cellScale = DEFAULT_TERMINAL_FONT_SIZE / cellMetrics.fontSize;
  const desiredWidth = Math.ceil(source.cols * cellMetrics.width * cellScale + safeChromeWidth);
  const desiredHeight = Math.ceil(source.rows * cellMetrics.height * cellScale + safeChromeHeight);
  const widthLimit = Math.max(1, Number.isFinite(maxWidth) ? maxWidth : desiredWidth);
  const heightLimit = Math.max(1, Number.isFinite(maxHeight) ? maxHeight : desiredHeight);
  return {
    w: Math.max(1, Math.round(Math.min(desiredWidth, widthLimit))),
    h: Math.max(1, Math.round(Math.min(desiredHeight, heightLimit))),
    clampedWidth: desiredWidth > widthLimit,
    clampedHeight: desiredHeight > heightLimit,
  };
}

export function terminalRows(
  contentHeight: number,
  fontSize: number,
  cellMetrics: TerminalCellMetrics,
): number {
  if (
    !Number.isFinite(contentHeight) ||
    contentHeight <= 0 ||
    !Number.isFinite(fontSize) ||
    fontSize <= 0 ||
    !validCellMetrics(cellMetrics)
  ) {
    return 1;
  }
  // The measured height includes xterm's configured lineHeight, so Thai
  // leading and the display-row calculation cannot drift apart.
  const scaledCellHeight = cellMetrics.height * fontSize / cellMetrics.fontSize;
  return Math.max(1, Math.floor(contentHeight / scaledCellHeight));
}

export function terminalDisplayGrid(
  contentWidth: number,
  contentHeight: number,
  sourceCols: number,
  cellMetrics: TerminalCellMetrics,
  zoomFactor = DEFAULT_TERMINAL_ZOOM,
): TerminalDisplayGrid {
  const cols = validDimension(sourceCols) ? sourceCols : 1;
  const fontSize = terminalFontSize(contentWidth, cols, cellMetrics, zoomFactor);
  return {
    cols,
    rows: terminalRows(contentHeight, fontSize, cellMetrics),
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
