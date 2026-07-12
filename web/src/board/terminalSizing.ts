export interface TerminalSourceDimensions {
  cols: number;
  rows: number;
}

export const MIN_TERMINAL_FONT_SIZE = 8;
export const MAX_TERMINAL_FONT_SIZE = 28;
export const TERMINAL_CHAR_WIDTH_RATIO = 0.6;

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
  charWidthRatio = TERMINAL_CHAR_WIDTH_RATIO,
): number {
  if (
    !Number.isFinite(contentWidth) ||
    contentWidth <= 0 ||
    !validDimension(cols) ||
    !Number.isFinite(charWidthRatio) ||
    charWidthRatio <= 0
  ) {
    return MIN_TERMINAL_FONT_SIZE;
  }
  const scaled = Math.floor(contentWidth / cols / charWidthRatio);
  return Math.min(MAX_TERMINAL_FONT_SIZE, Math.max(MIN_TERMINAL_FONT_SIZE, scaled));
}
