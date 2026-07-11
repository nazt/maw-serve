import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";

export const MIN_CANVAS_ZOOM = 0.35;
export const MAX_CANVAS_ZOOM = 2;
export const DEFAULT_TILE_ANCHOR = [160, 100] as const;

export type CanvasCenter = readonly [number, number];
export type CanvasPoint = { x: number; y: number };

export type PointInput =
  | CanvasCenter
  | CanvasPoint
  | { pageX: number; pageY: number }
  | { clientX: number; clientY: number };

export type WorldRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type CanvasView = {
  center: CanvasCenter;
  zoom: number;
};

export type UseCanvasOptions = {
  center?: CanvasCenter;
  zoom?: number;
  anchor?: CanvasCenter;
  fitPadding?: number;
};

export type CanvasController = CanvasView & {
  anchor: CanvasCenter;
  fabricRef: RefObject<HTMLDivElement | null>;
  screenToWorld: (point: PointInput | number, y?: number) => CanvasPoint;
  worldToScreen: (point: PointInput | number, y?: number) => CanvasPoint;
  fit: (rects?: Iterable<WorldRect>) => void;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => void;
};

type MutableView = {
  center: [number, number];
  zoom: number;
};

type PanState = {
  pointerId: number;
  x: number;
  y: number;
};

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const finite = (value: unknown, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

function readPoint(input: PointInput | number, y?: number, screen = false): CanvasPoint {
  if (typeof input === "number") return { x: finite(input), y: finite(y) };
  if (Array.isArray(input)) return { x: finite(input[0]), y: finite(input[1]) };

  if (screen && "pageX" in input) {
    return { x: finite(input.pageX), y: finite(input.pageY) };
  }

  if (screen && "clientX" in input) {
    return { x: finite(input.clientX), y: finite(input.clientY) };
  }

  if ("x" in input) return { x: finite(input.x), y: finite(input.y) };
  if ("pageX" in input) return { x: finite(input.pageX), y: finite(input.pageY) };
  if ("clientX" in input) return { x: finite(input.clientX), y: finite(input.clientY) };
  return { x: finite(input[0]), y: finite(input[1]) };
}

function viewportSize(element: HTMLDivElement | null): CanvasPoint {
  const view = element?.ownerDocument.defaultView ?? (typeof window === "undefined" ? null : window);
  return {
    x: finite(view?.innerWidth, element?.clientWidth ?? 0),
    y: finite(view?.innerHeight, element?.clientHeight ?? 0),
  };
}

function blurFocusedInput(element: HTMLDivElement | null) {
  const activeElement = element?.ownerDocument.activeElement;
  if (activeElement !== element && "blur" in (activeElement ?? {})) {
    (activeElement as HTMLElement).blur();
  }
}

export function useCanvas(options: UseCanvasOptions = {}): CanvasController {
  const initialCenter: [number, number] = [
    finite(options.center?.[0]),
    finite(options.center?.[1]),
  ];
  const anchor = useMemo<CanvasCenter>(
    () => [
      finite(options.anchor?.[0], DEFAULT_TILE_ANCHOR[0]),
      finite(options.anchor?.[1], DEFAULT_TILE_ANCHOR[1]),
    ],
    [options.anchor?.[0], options.anchor?.[1]],
  );
  const fitPadding = Math.max(0, finite(options.fitPadding, 64));
  const initialView: MutableView = {
    center: initialCenter,
    zoom: clamp(finite(options.zoom, 1), MIN_CANVAS_ZOOM, MAX_CANVAS_ZOOM),
  };

  const fabricRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<MutableView>(initialView);
  const panRef = useRef<PanState | null>(null);
  const [view, setView] = useState<MutableView>(initialView);

  const commitView = useCallback((update: (current: MutableView) => MutableView) => {
    const next = update(viewRef.current);
    viewRef.current = next;
    setView(next);
  }, []);

  const baseOffset = useCallback((): CanvasPoint => {
    const viewport = viewportSize(fabricRef.current);
    return {
      x: viewport.x / 2 - anchor[0],
      y: viewport.y / 2 - anchor[1],
    };
  }, [anchor]);

  const screenToWorld = useCallback(
    (input: PointInput | number, y?: number): CanvasPoint => {
      const screen = readPoint(input, y, true);
      const base = baseOffset();
      const current = viewRef.current;

      return {
        x: current.center[0] + screen.x / current.zoom - base.x,
        y: current.center[1] + screen.y / current.zoom - base.y,
      };
    },
    [baseOffset],
  );

  const worldToScreen = useCallback(
    (input: PointInput | number, y?: number): CanvasPoint => {
      const world = readPoint(input, y);
      const base = baseOffset();
      const current = viewRef.current;

      return {
        x: (base.x + world.x - current.center[0]) * current.zoom,
        y: (base.y + world.y - current.center[1]) * current.zoom,
      };
    },
    [baseOffset],
  );

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      event.preventDefault();

      if (event.ctrlKey || event.metaKey) {
        commitView((current) => {
          const nextZoom = clamp(
            (1 - (event.deltaY * 0.618) / 320) * current.zoom,
            MIN_CANVAS_ZOOM,
            MAX_CANVAS_ZOOM,
          );

          if (nextZoom === current.zoom) return current;

          const pointer = readPoint(event, undefined, true);
          return {
            center: [
              current.center[0] + pointer.x * (1 / current.zoom - 1 / nextZoom),
              current.center[1] + pointer.y * (1 / current.zoom - 1 / nextZoom),
            ],
            zoom: nextZoom,
          };
        });
        return;
      }

      blurFocusedInput(fabricRef.current);
      commitView((current) => ({
        center: [
          current.center[0] + event.deltaX / current.zoom,
          current.center[1] + event.deltaY / current.zoom,
        ],
        zoom: current.zoom,
      }));
    },
    [commitView],
  );

  useEffect(() => {
    const fabric = fabricRef.current;
    if (!fabric) return;

    fabric.addEventListener("wheel", handleWheel, { passive: false });
    return () => fabric.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || event.button !== 0) return;

    blurFocusedInput(fabricRef.current);
    panRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }, []);

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const pan = panRef.current;
      if (!pan || pan.pointerId !== event.pointerId) return;

      const deltaX = event.clientX - pan.x;
      const deltaY = event.clientY - pan.y;
      pan.x = event.clientX;
      pan.y = event.clientY;

      commitView((current) => ({
        center: [
          current.center[0] - deltaX / current.zoom,
          current.center[1] - deltaY / current.zoom,
        ],
        zoom: current.zoom,
      }));
      event.preventDefault();
    },
    [commitView],
  );

  const endPan = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (panRef.current?.pointerId !== event.pointerId) return;

    panRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const fit = useCallback(
    (rects?: Iterable<WorldRect>) => {
      const bounds = {
        minX: Infinity,
        minY: Infinity,
        maxX: -Infinity,
        maxY: -Infinity,
      };

      const source = rects
        ? Array.from(rects)
        : Array.from(fabricRef.current?.querySelectorAll<HTMLElement>("[data-world-x][data-world-y]") ?? [])
            .map((element): WorldRect | null => {
              const x = Number(element.dataset.worldX);
              const y = Number(element.dataset.worldY);
              if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

              return {
                x,
                y,
                w: finite(element.dataset.worldW, element.offsetWidth),
                h: finite(element.dataset.worldH, element.offsetHeight),
              };
            })
            .filter((rect): rect is WorldRect => rect !== null);

      for (const rect of source) {
        if (![rect.x, rect.y, rect.w, rect.h].every(Number.isFinite)) continue;
        bounds.minX = Math.min(bounds.minX, rect.x);
        bounds.minY = Math.min(bounds.minY, rect.y);
        bounds.maxX = Math.max(bounds.maxX, rect.x + Math.max(0, rect.w));
        bounds.maxY = Math.max(bounds.maxY, rect.y + Math.max(0, rect.h));
      }

      if (!Number.isFinite(bounds.minX)) return;

      const viewport = viewportSize(fabricRef.current);
      const contentWidth = Math.max(1, bounds.maxX - bounds.minX);
      const contentHeight = Math.max(1, bounds.maxY - bounds.minY);
      const nextZoom = clamp(
        Math.min(
          Math.max(1, viewport.x - fitPadding * 2) / contentWidth,
          Math.max(1, viewport.y - fitPadding * 2) / contentHeight,
        ),
        MIN_CANVAS_ZOOM,
        MAX_CANVAS_ZOOM,
      );
      const midpointX = (bounds.minX + bounds.maxX) / 2;
      const midpointY = (bounds.minY + bounds.maxY) / 2;

      commitView(() => ({
        center: [
          midpointX + viewport.x / 2 - anchor[0] - viewport.x / (2 * nextZoom),
          midpointY + viewport.y / 2 - anchor[1] - viewport.y / (2 * nextZoom),
        ],
        zoom: nextZoom,
      }));
    },
    [anchor, commitView, fitPadding],
  );

  return useMemo(
    () => ({
      center: view.center,
      zoom: view.zoom,
      anchor,
      fabricRef,
      screenToWorld,
      worldToScreen,
      fit,
      onPointerDown,
      onPointerMove,
      onPointerUp: endPan,
      onPointerCancel: endPan,
    }),
    [anchor, endPan, fit, onPointerDown, onPointerMove, screenToWorld, view, worldToScreen],
  );
}
