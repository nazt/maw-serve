import type { CanvasPoint, WorldRect } from "../canvas/useCanvas";

export interface LandingItem extends WorldRect {
  id: string;
}

export interface LandingOptions<Item extends LandingItem> {
  items: readonly LandingItem[];
  viewportCenter: CanvasPoint;
  targetKey: (item: Item | LandingItem) => string | null;
  cascade?: number;
  gap?: number;
}

export type LandingResult<Item extends LandingItem> =
  | { action: "existing"; item: LandingItem }
  | { action: "landed"; item: Item };

const DEFAULT_CASCADE = 32;
const DEFAULT_GAP = 24;

function overlaps(left: WorldRect, right: WorldRect, gap: number): boolean {
  return left.x < right.x + right.w + gap &&
    left.x + left.w + gap > right.x &&
    left.y < right.y + right.h + gap &&
    left.y + left.h + gap > right.y;
}

function candidateOffsets(step: number): CanvasPoint[] {
  const offsets: CanvasPoint[] = [{ x: 0, y: 0 }];
  for (let ring = 1; ring <= 14; ring += 1) {
    for (let x = -ring; x <= ring; x += 1) {
      offsets.push({ x: x * step, y: -ring * step });
      offsets.push({ x: x * step, y: ring * step });
    }
    for (let y = -ring + 1; y < ring; y += 1) {
      offsets.push({ x: -ring * step, y: y * step });
      offsets.push({ x: ring * step, y: y * step });
    }
  }
  return offsets;
}

/**
 * Places a palette commit at viewport center while preserving the three landing
 * invariants: identity dedupe, an empty reserved rect, and repeat-cascade.
 * Canvas focus/glow are intentionally returned to the caller so React owns the
 * animation lifecycle without coupling this pure geometry engine to the DOM.
 */
export function landItem<Item extends LandingItem>(
  item: Item,
  options: LandingOptions<Item>,
): LandingResult<Item> {
  const identity = options.targetKey(item);
  const existing = identity
    ? options.items.find((candidate) => options.targetKey(candidate) === identity)
    : undefined;
  if (existing) return { action: "existing", item: existing };

  const cascade = Math.max(1, options.cascade ?? DEFAULT_CASCADE);
  const gap = Math.max(0, options.gap ?? DEFAULT_GAP);
  const centered = {
    x: options.viewportCenter.x - item.w / 2,
    y: options.viewportCenter.y - item.h / 2,
  };
  const reserved = candidateOffsets(cascade).find((offset) => {
    const candidate = { ...item, x: centered.x + offset.x, y: centered.y + offset.y };
    return options.items.every((other) => !overlaps(candidate, other, gap));
  }) ?? { x: cascade, y: cascade };

  return {
    action: "landed",
    item: {
      ...item,
      x: Math.round(centered.x + reserved.x),
      y: Math.round(centered.y + reserved.y),
    },
  };
}
