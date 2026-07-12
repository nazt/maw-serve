import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type PointerEventHandler,
} from "react";

export const MIN_TILE_WIDTH = 160;
export const MIN_TILE_HEIGHT = 72;
export const SNAP_SCREEN_PX = 8;
export const TOUCH_HOLD_MS = 180;
export const TOUCH_CANCEL_PX = 10;

export type Point = { x: number; y: number };
export type PointLike = Point | readonly [number, number];

export interface CanvasTransform {
  zoom: number;
  screenToWorld: unknown;
  worldToScreen: unknown;
}

export interface TileItem<Data = unknown> {
  id: string;
  kind: string;
  x: number;
  y: number;
  w: number;
  h: number;
  zIndex?: number;
  data: Data;
}

export type TileGeometry = Pick<TileItem, "x" | "y" | "w" | "h">;

export interface SnapGuide {
  axis: "x" | "y";
  value: number;
}

export type TileChangeKind = "drag" | "resize";

export interface UseDragOptions<Item extends TileItem> {
  item: Item;
  siblings: readonly Item[];
  canvas: CanvasTransform;
  minWidth?: number;
  minHeight?: number;
  aspectRatio?: number | null;
  onChange?: (item: Item, kind: TileChangeKind) => void;
  onCommit?: (item: Item, kind: TileChangeKind) => void;
}

export interface UseDragResult {
  geometry: TileGeometry;
  guides: SnapGuide[];
  dragging: boolean;
  resizing: boolean;
  dragHandlers: PointerHandlers;
  resizeHandlers: PointerHandlers;
}

type PointerHandlers = {
  onPointerDown: PointerEventHandler<HTMLElement>;
  onPointerMove: PointerEventHandler<HTMLElement>;
  onPointerUp: PointerEventHandler<HTMLElement>;
  onPointerCancel: PointerEventHandler<HTMLElement>;
};

type PointerSnapshot = {
  pageX: number;
  pageY: number;
  clientX: number;
  clientY: number;
  shiftKey: boolean;
};

type PendingDrag = {
  mode: "pending-drag";
  pointerId: number;
  owner: HTMLElement;
  origin: PointerSnapshot;
  timer: number;
};

type DragInteraction = {
  mode: "drag";
  pointerId: number;
  owner: HTMLElement;
  origin: PointerSnapshot;
  offsetX: number;
  offsetY: number;
  moved: boolean;
};

type ResizeInteraction = {
  mode: "resize";
  pointerId: number;
  owner: HTMLElement;
  origin: PointerSnapshot;
  startWorld: Point;
  startWidth: number;
  startHeight: number;
  aspectRatio: number | null;
  moved: boolean;
};

type Interaction = PendingDrag | DragInteraction | ResizeInteraction;

type SnapDelta = { delta: number; guide: number } | null;

function finite(value: unknown, fallback = 0): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function sameGeometry(left: TileGeometry, right: TileGeometry): boolean {
  return left.x === right.x && left.y === right.y && left.w === right.w && left.h === right.h;
}

function geometryFromItem(
  item: TileItem,
  minWidth: number,
  minHeight: number,
): TileGeometry {
  return {
    x: Math.round(finite(item.x)),
    y: Math.round(finite(item.y)),
    w: Math.max(minWidth, finite(item.w, minWidth)),
    h: Math.max(minHeight, finite(item.h, minHeight)),
  };
}

function isPoint(value: unknown): value is PointLike {
  if (Array.isArray(value)) {
    return Number.isFinite(Number(value[0])) && Number.isFinite(Number(value[1]));
  }
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Point>;
  return Number.isFinite(Number(candidate.x)) && Number.isFinite(Number(candidate.y));
}

function normalizePoint(value: PointLike): Point {
  if (!Array.isArray(value) && "x" in value) {
    return { x: finite(value.x), y: finite(value.y) };
  }
  const tuple = value as readonly [number, number];
  return { x: finite(tuple[0]), y: finite(tuple[1]) };
}

export function transformPoint(transform: unknown, value: Point): Point {
  if (typeof transform !== "function") {
    throw new TypeError("Canvas coordinate transform is unavailable");
  }

  let result: unknown;
  try {
    result = transform(value.x, value.y);
  } catch {
    result = undefined;
  }

  if (!isPoint(result)) result = transform(value);
  if (!isPoint(result)) throw new TypeError("Canvas coordinate transform returned an invalid point");
  return normalizePoint(result);
}

function pointerSnapshot(event: ReactPointerEvent<HTMLElement>): PointerSnapshot {
  return {
    pageX: finite(event.pageX, event.clientX),
    pageY: finite(event.pageY, event.clientY),
    clientX: finite(event.clientX, event.pageX),
    clientY: finite(event.clientY, event.pageY),
    shiftKey: event.shiftKey,
  };
}

function pointerDistance(left: PointerSnapshot, right: PointerSnapshot): number {
  return Math.hypot(left.clientX - right.clientX, left.clientY - right.clientY);
}

function closestEdge(
  position: number,
  size: number,
  siblingEdges: readonly number[],
  threshold: number,
): SnapDelta {
  const movingEdges = [position, position + size];
  let best: SnapDelta = null;

  for (const movingEdge of movingEdges) {
    for (const siblingEdge of siblingEdges) {
      const delta = siblingEdge - movingEdge;
      if (
        Math.abs(delta) <= threshold &&
        (!best || Math.abs(delta) < Math.abs(best.delta))
      ) {
        best = { delta, guide: siblingEdge };
      }
    }
  }

  return best;
}

function siblingEdges<Item extends TileItem>(
  item: Item,
  siblings: readonly Item[],
  axis: "x" | "y",
): number[] {
  const sizeKey = axis === "x" ? "w" : "h";
  const edges: number[] = [];

  for (const sibling of siblings) {
    if (sibling === item || String(sibling.id) === String(item.id)) continue;
    const start = finite(sibling[axis]);
    edges.push(start, start + Math.max(1, finite(sibling[sizeKey], 1)));
  }

  return edges;
}

export function snapPosition<Item extends TileItem>(
  item: Item,
  proposed: Point,
  geometry: TileGeometry,
  siblings: readonly Item[],
  zoom: number,
): { point: Point; guides: SnapGuide[] } {
  const threshold = SNAP_SCREEN_PX / Math.max(0.01, finite(zoom, 1));
  const xSnap = closestEdge(
    proposed.x,
    geometry.w,
    siblingEdges(item, siblings, "x"),
    threshold,
  );
  const ySnap = closestEdge(
    proposed.y,
    geometry.h,
    siblingEdges(item, siblings, "y"),
    threshold,
  );
  const guides: SnapGuide[] = [];
  if (xSnap) guides.push({ axis: "x", value: xSnap.guide });
  if (ySnap) guides.push({ axis: "y", value: ySnap.guide });

  return {
    point: {
      x: Math.round(proposed.x + (xSnap?.delta ?? 0)),
      y: Math.round(proposed.y + (ySnap?.delta ?? 0)),
    },
    guides,
  };
}

function snapResizeEdge<Item extends TileItem>(
  item: Item,
  proposedSize: number,
  siblings: readonly Item[],
  zoom: number,
  minimum: number,
  axis: "x" | "y",
): { size: number; guides: SnapGuide[] } {
  const threshold = SNAP_SCREEN_PX / Math.max(0.01, finite(zoom, 1));
  const edge = finite(item[axis]) + proposedSize;
  let best: SnapDelta = null;

  for (const siblingEdge of siblingEdges(item, siblings, axis)) {
    const delta = siblingEdge - edge;
    const snappedSize = Math.round(proposedSize + delta);
    if (
      snappedSize >= minimum &&
      Math.abs(delta) <= threshold &&
      (!best || Math.abs(delta) < Math.abs(best.delta))
    ) {
      best = { delta, guide: siblingEdge };
    }
  }

  return {
    size: Math.max(minimum, Math.round(proposedSize + (best?.delta ?? 0))),
    guides: best ? [{ axis, value: best.guide }] : [],
  };
}

export function snapWidth<Item extends TileItem>(
  item: Item,
  proposedWidth: number,
  siblings: readonly Item[],
  zoom: number,
  minWidth = MIN_TILE_WIDTH,
): { width: number; guides: SnapGuide[] } {
  const snapped = snapResizeEdge(
    item,
    proposedWidth,
    siblings,
    zoom,
    minWidth,
    "x",
  );
  return { width: snapped.size, guides: snapped.guides };
}

export function snapHeight<Item extends TileItem>(
  item: Item,
  proposedHeight: number,
  siblings: readonly Item[],
  zoom: number,
  minHeight = MIN_TILE_HEIGHT,
): { height: number; guides: SnapGuide[] } {
  const snapped = snapResizeEdge(
    item,
    proposedHeight,
    siblings,
    zoom,
    minHeight,
    "y",
  );
  return { height: snapped.size, guides: snapped.guides };
}

function isInteractiveTarget(target: EventTarget | null, tile: HTMLElement): boolean {
  if (!(target instanceof Element) || target === tile) return false;
  return Boolean(target.closest(
    "input, textarea, select, button, a, [contenteditable='true'], .xterm",
  ));
}

function requestFrame(callback: FrameRequestCallback): number {
  if (typeof requestAnimationFrame === "function") return requestAnimationFrame(callback);
  return window.setTimeout(() => callback(performance.now()), 16);
}

function cancelFrame(frame: number): void {
  if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(frame);
  else window.clearTimeout(frame);
}

export function useDrag<Item extends TileItem>({
  item,
  siblings,
  canvas,
  minWidth = MIN_TILE_WIDTH,
  minHeight = MIN_TILE_HEIGHT,
  aspectRatio = null,
  onChange,
  onCommit,
}: UseDragOptions<Item>): UseDragResult {
  const initialGeometry = geometryFromItem(item, minWidth, minHeight);
  const [geometry, setGeometry] = useState<TileGeometry>(initialGeometry);
  const [guides, setGuides] = useState<SnapGuide[]>([]);
  const [activeMode, setActiveMode] = useState<TileChangeKind | null>(null);

  const geometryRef = useRef(initialGeometry);
  const itemRef = useRef(item);
  const siblingsRef = useRef(siblings);
  const canvasRef = useRef(canvas);
  const onChangeRef = useRef(onChange);
  const onCommitRef = useRef(onCommit);
  const interactionRef = useRef<Interaction | null>(null);
  const frameRef = useRef(0);
  const latestPointerRef = useRef<PointerSnapshot | null>(null);
  const itemIdRef = useRef(String(item.id));
  const userPositionedRef = useRef(false);
  const userResizedRef = useRef(false);

  itemRef.current = item;
  siblingsRef.current = siblings;
  canvasRef.current = canvas;
  onChangeRef.current = onChange;
  onCommitRef.current = onCommit;

  const cancelScheduledFrame = useCallback(() => {
    if (frameRef.current) cancelFrame(frameRef.current);
    frameRef.current = 0;
    latestPointerRef.current = null;
  }, []);

  const clearInteraction = useCallback(() => {
    const interaction = interactionRef.current;
    if (interaction?.mode === "pending-drag") window.clearTimeout(interaction.timer);
    cancelScheduledFrame();
    interactionRef.current = null;
    setActiveMode(null);
    setGuides([]);
  }, [cancelScheduledFrame]);

  const publishGeometry = useCallback((next: TileGeometry, kind: TileChangeKind) => {
    geometryRef.current = next;
    Object.assign(itemRef.current, next);
    setGeometry(next);
    onChangeRef.current?.(itemRef.current, kind);
  }, []);

  const applyPointer = useCallback((pointer: PointerSnapshot) => {
    const interaction = interactionRef.current;
    if (!interaction || interaction.mode === "pending-drag") return;
    if (!interaction.moved && pointerDistance(pointer, interaction.origin) < 0.5) return;

    const currentCanvas = canvasRef.current;
    const world = transformPoint(currentCanvas.screenToWorld, {
      x: pointer.pageX,
      y: pointer.pageY,
    });
    const current = geometryRef.current;

    if (interaction.mode === "drag") {
      const snapped = snapPosition(
        itemRef.current,
        {
          x: Math.round(world.x - interaction.offsetX),
          y: Math.round(world.y - interaction.offsetY),
        },
        current,
        siblingsRef.current,
        currentCanvas.zoom,
      );
      const next = { ...current, ...snapped.point };
      interaction.moved = true;
      userPositionedRef.current = true;
      setGuides(snapped.guides);
      publishGeometry(next, "drag");
      return;
    }

    const deltaX = world.x - interaction.startWorld.x;
    const deltaY = world.y - interaction.startWorld.y;
    interaction.moved = true;
    userResizedRef.current = true;

    if (interaction.aspectRatio && !pointer.shiftKey) {
      const widthScaleDelta = deltaX / Math.max(1, interaction.startWidth);
      const heightScaleDelta = deltaY / Math.max(1, interaction.startHeight);
      const widthDominant = Math.abs(widthScaleDelta) >= Math.abs(heightScaleDelta);
      const ratio = interaction.aspectRatio;
      let width: number;
      let height: number;
      let nextGuides: SnapGuide[];

      if (widthDominant) {
        const proposedWidth = Math.max(
          minWidth,
          interaction.startWidth + deltaX,
          minHeight * ratio,
        );
        const snapped = snapWidth(
          itemRef.current,
          proposedWidth,
          siblingsRef.current,
          currentCanvas.zoom,
          minWidth,
        );
        width = Math.max(snapped.width, minHeight * ratio);
        height = width / ratio;
        nextGuides = snapped.guides;
      } else {
        const proposedHeight = Math.max(
          minHeight,
          interaction.startHeight + deltaY,
          minWidth / ratio,
        );
        const snapped = snapHeight(
          itemRef.current,
          proposedHeight,
          siblingsRef.current,
          currentCanvas.zoom,
          minHeight,
        );
        height = Math.max(snapped.height, minWidth / ratio);
        width = height * ratio;
        nextGuides = snapped.guides;
      }

      setGuides(nextGuides);
      publishGeometry({
        ...current,
        w: Math.round(width),
        h: Math.round(height),
      }, "resize");
      return;
    }
    const snappedWidth = snapWidth(
      itemRef.current,
      interaction.startWidth + deltaX,
      siblingsRef.current,
      currentCanvas.zoom,
      minWidth,
    );
    const snappedHeight = snapHeight(
      itemRef.current,
      interaction.startHeight + deltaY,
      siblingsRef.current,
      currentCanvas.zoom,
      minHeight,
    );
    setGuides([...snappedWidth.guides, ...snappedHeight.guides]);
    publishGeometry({
      ...current,
      w: snappedWidth.width,
      h: snappedHeight.height,
    }, "resize");
  }, [minHeight, minWidth, publishGeometry]);

  const schedulePointer = useCallback((pointer: PointerSnapshot) => {
    latestPointerRef.current = pointer;
    if (frameRef.current) return;

    frameRef.current = requestFrame(() => {
      frameRef.current = 0;
      const latest = latestPointerRef.current;
      latestPointerRef.current = null;
      if (latest) applyPointer(latest);
    });
  }, [applyPointer]);

  const startDrag = useCallback((
    owner: HTMLElement,
    pointerId: number,
    pointer: PointerSnapshot,
  ) => {
    const world = transformPoint(canvasRef.current.screenToWorld, {
      x: pointer.pageX,
      y: pointer.pageY,
    });
    const current = geometryRef.current;
    interactionRef.current = {
      mode: "drag",
      owner,
      pointerId,
      origin: pointer,
      offsetX: world.x - current.x,
      offsetY: world.y - current.y,
      moved: false,
    };
    setActiveMode("drag");
  }, []);

  const onDragPointerDown = useCallback<PointerEventHandler<HTMLElement>>((event) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    if (isInteractiveTarget(event.target, event.currentTarget)) return;

    clearInteraction();
    const owner = event.currentTarget;
    const pointer = pointerSnapshot(event);
    owner.setPointerCapture?.(event.pointerId);

    if (event.pointerType === "touch") {
      const pending: PendingDrag = {
        mode: "pending-drag",
        owner,
        pointerId: event.pointerId,
        origin: pointer,
        timer: 0,
      };
      pending.timer = window.setTimeout(() => {
        if (interactionRef.current !== pending) return;
        startDrag(owner, pending.pointerId, pending.origin);
      }, TOUCH_HOLD_MS);
      interactionRef.current = pending;
      return;
    }

    startDrag(owner, event.pointerId, pointer);
  }, [clearInteraction, startDrag]);

  const onResizePointerDown = useCallback<PointerEventHandler<HTMLElement>>((event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    clearInteraction();

    const owner = event.currentTarget;
    const pointer = pointerSnapshot(event);
    owner.setPointerCapture?.(event.pointerId);
    interactionRef.current = {
      mode: "resize",
      owner,
      pointerId: event.pointerId,
      origin: pointer,
      startWorld: transformPoint(canvasRef.current.screenToWorld, {
        x: pointer.pageX,
        y: pointer.pageY,
      }),
      startWidth: geometryRef.current.w,
      startHeight: geometryRef.current.h,
      aspectRatio: Number.isFinite(Number(aspectRatio)) && Number(aspectRatio) > 0
        ? Number(aspectRatio)
        : null,
      moved: false,
    };
    setActiveMode("resize");
  }, [aspectRatio, clearInteraction]);

  const onPointerMove = useCallback<PointerEventHandler<HTMLElement>>((event) => {
    const interaction = interactionRef.current;
    if (!interaction || interaction.pointerId !== event.pointerId) return;

    const pointer = pointerSnapshot(event);
    if (interaction.mode === "pending-drag") {
      if (pointerDistance(pointer, interaction.origin) > TOUCH_CANCEL_PX) {
        interaction.owner.releasePointerCapture?.(interaction.pointerId);
        clearInteraction();
      }
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    schedulePointer(pointer);
  }, [clearInteraction, schedulePointer]);

  const finishPointer = useCallback((
    event: ReactPointerEvent<HTMLElement>,
    cancelled: boolean,
  ) => {
    const interaction = interactionRef.current;
    if (!interaction || interaction.pointerId !== event.pointerId) return;
    event.stopPropagation();

    if (interaction.mode === "pending-drag") {
      interaction.owner.releasePointerCapture?.(interaction.pointerId);
      clearInteraction();
      return;
    }

    if (!cancelled) {
      event.preventDefault();
      cancelScheduledFrame();
      applyPointer(pointerSnapshot(event));
    }

    interaction.owner.releasePointerCapture?.(interaction.pointerId);
    const moved = interaction.moved;
    const kind = interaction.mode;
    clearInteraction();
    if (!cancelled && moved) onCommitRef.current?.(itemRef.current, kind);
  }, [applyPointer, cancelScheduledFrame, clearInteraction]);

  const onPointerUp = useCallback<PointerEventHandler<HTMLElement>>((event) => {
    finishPointer(event, false);
  }, [finishPointer]);

  const onPointerCancel = useCallback<PointerEventHandler<HTMLElement>>((event) => {
    finishPointer(event, true);
  }, [finishPointer]);

  useEffect(() => {
    const nextFromProps = geometryFromItem(item, minWidth, minHeight);
    const nextId = String(item.id);

    if (itemIdRef.current !== nextId) {
      clearInteraction();
      itemIdRef.current = nextId;
      userPositionedRef.current = false;
      userResizedRef.current = false;
      geometryRef.current = nextFromProps;
      setGeometry(nextFromProps);
      return;
    }

    const current = geometryRef.current;
    const next = {
      x: userPositionedRef.current ? current.x : nextFromProps.x,
      y: userPositionedRef.current ? current.y : nextFromProps.y,
      w: userResizedRef.current ? current.w : nextFromProps.w,
      h: userResizedRef.current ? current.h : nextFromProps.h,
    };
    Object.assign(item, next);
    if (!sameGeometry(current, next)) {
      geometryRef.current = next;
      setGeometry(next);
    }
  }, [clearInteraction, item, item.h, item.id, item.w, item.x, item.y, minHeight, minWidth]);

  useEffect(() => () => {
    const interaction = interactionRef.current;
    if (interaction?.mode === "pending-drag") window.clearTimeout(interaction.timer);
    cancelScheduledFrame();
    interactionRef.current = null;
  }, [cancelScheduledFrame]);

  const sharedHandlers = {
    onPointerMove,
    onPointerUp,
    onPointerCancel,
  };

  return {
    geometry,
    guides,
    dragging: activeMode === "drag",
    resizing: activeMode === "resize",
    dragHandlers: { onPointerDown: onDragPointerDown, ...sharedHandlers },
    resizeHandlers: { onPointerDown: onResizePointerDown, ...sharedHandlers },
  };
}
