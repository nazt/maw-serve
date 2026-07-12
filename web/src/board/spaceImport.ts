import type { Rect } from "../clients/layout-core";
import {
  normalizeOracleHandle,
  type CensusPayload,
} from "../fleet/useFleet";
import { computeSpaceLayout, type SpaceLayoutPosition } from "../mirror/spaceLayout";
import {
  allocateTerminalBudget,
  terminalPaneKey,
  terminalTarget,
} from "../mirror/terminalTarget";
import type { MirrorDisplay, MirrorSpace, MirrorWindow } from "../mirror/types";
import type {
  BoardItemGeometry,
  SpaceImportBoardItem,
  SpaceImportMember,
  SpaceReference,
} from "./boardItems";
import {
  STREAM_PRIORITY,
  WORKING_STREAM_BUDGET,
} from "./streamLease";
import type { TerminalTileItem } from "./TerminalTile";
import {
  TERMINAL_TILE_MAX_VIEWPORT_HEIGHT_RATIO,
  TERMINAL_TILE_MAX_VIEWPORT_WIDTH_RATIO,
} from "./terminalSizing";

export const SPACE_IMPORT_EVENT = "stoa:import-space";
export const SPACE_IMPORT_STREAM_CAP = 8;
export const SPACE_GROUP_HEADER_HEIGHT = 40;

let importSequence = 0;

export interface SpaceImportRequestDetail {
  spaceRef: SpaceReference;
}

export interface SpaceImportPlanOptions {
  spaceRef: SpaceReference;
  display: MirrorDisplay;
  space: MirrorSpace;
  windows: readonly MirrorWindow[];
  census: CensusPayload | null;
  modelByOracle?: ReadonlyMap<string, string>;
  existingTerminals?: readonly TerminalTileItem[];
  groupGeometry?: BoardItemGeometry;
  groupId?: string;
  viewportSize?: { w: number; h: number };
}

export interface SpaceImportPlan {
  group: SpaceImportBoardItem;
  terminals: TerminalTileItem[];
  adoptedTerminalIds: string[];
  createdTerminalIds: string[];
  livePaneCount: number;
  polledPaneCount: number;
}

function finiteRect(rect: Rect): Rect {
  return {
    x: Number.isFinite(rect.x) ? rect.x : 0,
    y: Number.isFinite(rect.y) ? rect.y : 0,
    w: Math.max(1, Number.isFinite(rect.w) ? rect.w : 1),
    h: Math.max(1, Number.isFinite(rect.h) ? rect.h : 1),
  };
}

/** Uniformly maps positions into a box without packing or changing topology. */
export function fitIntoBoundingBox(
  positions: readonly SpaceLayoutPosition[],
  boundingBox: Rect,
  sourceBounds: Rect,
): SpaceLayoutPosition[] {
  const target = finiteRect(boundingBox);
  const source = finiteRect(sourceBounds);
  const scale = Math.min(target.w / source.w, target.h / source.h);
  const fittedW = source.w * scale;
  const fittedH = source.h * scale;
  const offsetX = target.x + (target.w - fittedW) / 2 - source.x * scale;
  const offsetY = target.y + (target.h - fittedH) / 2 - source.y * scale;

  return positions.map((position) => ({
    ...position,
    geometry: {
      x: offsetX + position.geometry.x * scale,
      y: offsetY + position.geometry.y * scale,
      w: Math.max(1, position.geometry.w * scale),
      h: Math.max(1, position.geometry.h * scale),
    },
  }));
}

function defaultGroupGeometry(
  display: MirrorDisplay,
  viewportSize?: { w: number; h: number },
): BoardItemGeometry {
  const viewportWidth = Number(viewportSize?.w);
  const viewportHeight = Number(viewportSize?.h);
  const w = Number.isFinite(viewportWidth) && viewportWidth > 0
    ? Math.max(320, Math.round(viewportWidth * TERMINAL_TILE_MAX_VIEWPORT_WIDTH_RATIO))
    : 760;
  const contentHeight = w * display.frame.h / display.frame.w;
  const maxHeight = Number.isFinite(viewportHeight) && viewportHeight > 0
    ? Math.max(240, Math.round(viewportHeight * TERMINAL_TILE_MAX_VIEWPORT_HEIGHT_RATIO))
    : 560;
  return {
    x: 0,
    y: 0,
    w,
    h: Math.round(Math.min(maxHeight, Math.max(320, contentHeight + SPACE_GROUP_HEADER_HEIGHT))),
  };
}

function paneIdentity(item: TerminalTileItem): string {
  return `${item.data.session}:${item.data.window}`;
}

function terminalPriority(window: MirrorWindow, status: string | null | undefined): number {
  if (window.focus) return STREAM_PRIORITY.focused;
  if (String(status).toLowerCase() === "active") return STREAM_PRIORITY.active;
  return STREAM_PRIORITY.normal;
}

/** Builds one atomic, descriptor-only import plan. It never fetches terminal content. */
export function createSpaceImportPlan(options: SpaceImportPlanOptions): SpaceImportPlan {
  const groupId = options.groupId ?? `space-group-${Date.now().toString(36)}-${(++importSequence).toString(36)}`;
  const groupGeometry = finiteRect(
    options.groupGeometry ?? defaultGroupGeometry(options.display, options.viewportSize),
  );
  const rawPositions = computeSpaceLayout(options.display, options.space, options.windows);
  const positions = fitIntoBoundingBox(
    rawPositions,
    {
      x: 10,
      y: SPACE_GROUP_HEADER_HEIGHT + 8,
      w: groupGeometry.w - 20,
      h: groupGeometry.h - SPACE_GROUP_HEADER_HEIGHT - 18,
    },
    { x: 0, y: 0, w: options.display.frame.w, h: options.display.frame.h },
  );
  const resolved = positions.map((position) => {
    const target = position.window.oracle
      ? terminalTarget(options.census, position.window.oracle)
      : null;
    return {
      position,
      target,
      paneKey: target ? terminalPaneKey(target) : null,
    };
  });
  const distinctPaneCount = new Set(
    resolved.flatMap(({ paneKey }) => paneKey ? [paneKey] : []),
  ).size;
  const streamSlots = Math.min(
    SPACE_IMPORT_STREAM_CAP,
    distinctPaneCount,
    WORKING_STREAM_BUDGET,
  );
  const budget = allocateTerminalBudget(resolved.flatMap(({ position, target, paneKey }) => (
    target && paneKey ? [{
      paneKey,
      focus: position.window.focus,
      pulseLive: false,
      status: target.status,
      idleSec: target.idleSec,
    }] : []
  )), streamSlots);
  const existingByPane = new Map(
    (options.existingTerminals ?? []).map((item) => [paneIdentity(item), item]),
  );
  const claimedPanes = new Set<string>();
  const terminals: TerminalTileItem[] = [];
  const members: SpaceImportMember[] = [];
  const adoptedTerminalIds: string[] = [];
  const createdTerminalIds: string[] = [];

  for (const { position, target, paneKey } of resolved) {
    const { window, geometry } = position;
    const canRenderTerminal = Boolean(
      window.oracle && target?.session && target.pane && paneKey && !claimedPanes.has(paneKey),
    );
    if (!canRenderTerminal || !window.oracle || !target?.session || !target.pane || !paneKey) {
      members.push({
        id: `${groupId}:ghost:${window.id}`,
        windowId: window.id,
        kind: "ghost",
        oracle: window.oracle,
        app: window.app,
        geometry,
        target: target?.session && target.pane ? {
          session: target.session,
          window: target.pane,
          ...(options.modelByOracle?.get(normalizeOracleHandle(window.oracle))
            ? { model: options.modelByOracle.get(normalizeOracleHandle(window.oracle)) }
            : {}),
        } : null,
      });
      continue;
    }

    claimedPanes.add(paneKey);
    const existing = existingByPane.get(paneKey);
    const id = existing?.id ?? `${groupId}:terminal:${window.id}`;
    const model = options.modelByOracle?.get(normalizeOracleHandle(window.oracle));
    const terminal: TerminalTileItem = {
      ...(existing ?? {
        id,
        kind: "terminal" as const,
        data: {
          oracle: window.oracle,
          session: target.session,
          window: target.pane,
          ...(model ? { model } : {}),
        },
      }),
      id,
      x: groupGeometry.x + geometry.x,
      y: groupGeometry.y + geometry.y,
      w: geometry.w,
      h: geometry.h,
      groupId,
      streamEligible: budget.streamPaneKeys.has(paneKey),
      streamPriority: terminalPriority(window, target.status),
    };
    terminals.push(terminal);
    if (existing) adoptedTerminalIds.push(id);
    else createdTerminalIds.push(id);
    members.push({
      id,
      windowId: window.id,
      kind: "terminal",
      oracle: window.oracle,
      app: window.app,
      geometry,
      target: {
        session: target.session,
        window: target.pane,
        ...(model ? { model } : {}),
      },
      ...(existing ? {
        adoptedItemId: existing.id,
        adoptedGeometry: {
          x: existing.x,
          y: existing.y,
          w: existing.w,
          h: existing.h,
          zIndex: existing.zIndex,
        },
      } : {}),
    });
  }

  return {
    group: {
      id: groupId,
      kind: "space-import",
      data: {},
      ...groupGeometry,
      groupId,
      spaceRef: options.spaceRef,
      members,
      collapsed: false,
      expandedSize: { w: groupGeometry.w, h: groupGeometry.h },
    },
    terminals,
    adoptedTerminalIds,
    createdTerminalIds,
    livePaneCount: terminals.filter((item) => item.streamEligible).length,
    polledPaneCount: terminals.filter((item) => !item.streamEligible).length,
  };
}

/** Shared UI seam: the active board handles this event and performs landing. */
export function importSpace(spaceRef: SpaceReference): boolean {
  if (typeof window === "undefined") return false;
  const event = new CustomEvent<SpaceImportRequestDetail>(SPACE_IMPORT_EVENT, {
    detail: { spaceRef },
    cancelable: true,
  });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}
