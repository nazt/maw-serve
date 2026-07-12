export type RovingDirection = "left" | "right" | "up" | "down";

export interface RovingTile {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export function rovingTileTabIndex(tileId: string, currentId: string | null): 0 | -1 {
  return tileId === currentId ? 0 : -1;
}

export function rovingActionTabIndex(tileId: string, selectedId: string | null): 0 | -1 {
  return tileId === selectedId ? 0 : -1;
}

function center(tile: RovingTile): { x: number; y: number } {
  return {
    x: tile.x + tile.w / 2,
    y: tile.y + tile.h / 2,
  };
}

export function nextRovingTileId(
  tiles: readonly RovingTile[],
  currentId: string,
  direction: RovingDirection,
): string | null {
  const current = tiles.find((tile) => tile.id === currentId);
  if (!current) return null;
  const origin = center(current);

  const candidates = tiles.flatMap((tile) => {
    if (tile.id === currentId) return [];
    const point = center(tile);
    const dx = point.x - origin.x;
    const dy = point.y - origin.y;
    const primary = direction === "left"
      ? -dx
      : direction === "right"
        ? dx
        : direction === "up"
          ? -dy
          : dy;
    if (primary <= 0) return [];
    const perpendicular = direction === "left" || direction === "right"
      ? Math.abs(dy)
      : Math.abs(dx);
    return [{ id: tile.id, score: primary + perpendicular * 2 }];
  });

  candidates.sort((left, right) => (
    left.score - right.score || left.id.localeCompare(right.id)
  ));
  return candidates[0]?.id ?? null;
}
