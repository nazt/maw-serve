import type { Rect } from "../clients/layout-core";
import { layoutWindows, windowGeometry } from "./model";
import type { MirrorDisplay, MirrorSpace, MirrorWindow } from "./types";

export interface SpaceLayoutPosition {
  id: string;
  window: MirrorWindow;
  geometry: Rect;
}

/**
 * Shared, title-free source of truth for expanded and imported spaces.
 * Geometry is display-local world space, preserving overlap and aspect ratio.
 */
export function computeSpaceLayout(
  display: MirrorDisplay,
  space: MirrorSpace,
  windows: readonly MirrorWindow[],
): SpaceLayoutPosition[] {
  return layoutWindows(display, space, windows).map(({ window, rect }) => ({
    id: `space-window:${window.id}`,
    window,
    geometry: windowGeometry(rect, display),
  }));
}

