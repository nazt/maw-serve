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
export const CANVAS_SOURCE_TEXT_PX = 12;
export const MIN_READABLE_CANVAS_TEXT_PX = 9;
export const MIN_READABLE_FIT_ZOOM =
  MIN_READABLE_CANVAS_TEXT_PX / CANVAS_SOURCE_TEXT_PX;
export const DEFAULT_TILE_ANCHOR = [160, 100] as const;

export type CanvasSafeArea = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export const DEFAULT_CANVAS_SAFE_AREA: Readonly<CanvasSafeArea> = {
  top: 64,
  right: 16,
  bottom: 104,
  left: 16,
};

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
  fitMinZoom?: number;
  fitSafeArea?: Partial<CanvasSafeArea>;
};

export type FocusOptions = {
  zoom?: number;
};

export type CanvasController = CanvasView & {
  anchor: CanvasCenter;
  fabricRef: RefObject<HTMLDivElement | null>;
  screenToWorld: (point: PointInput | number, y?: number) => CanvasPoint;
  worldToScreen: (point: PointInput | number, y?: number) => CanvasPoint;
  zoomBy: (factor: number) => void;
  zoomTo: (zoom: number) => void;
  fit: (rects?: Iterable<WorldRect>) => void;
  focusOn: (rect: WorldRect, options?: FocusOptions) => void;
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

const FOCUS_DURATION_MS = 350;

const easeOutExpo = (progress: number) =>
  progress >= 1 ? 1 : 1 - 2 ** (-10 * progress);

const finite = (value: unknown, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

export interface CalculateFitViewOptions {
  viewport: CanvasPoint;
  anchor: CanvasCenter;
  padding: number;
  safeArea: Readonly<CanvasSafeArea>;
  minZoom?: number;
  maxZoom?: number;
}

/**
 * Frames world geometry inside the unobscured canvas. If the whole board would
 * make source labels illegible, the zoom floor wins and overflow remains
 * available by panning instead of being compressed beneath the chrome.
 */
export function calculateFitView(
  rects: Iterable<WorldRect>,
  options: CalculateFitViewOptions,
): CanvasView | null {
  const bounds = {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
  };

  for (const rect of rects) {
    if (![rect.x, rect.y, rect.w, rect.h].every(Number.isFinite)) continue;
    bounds.minX = Math.min(bounds.minX, rect.x);
    bounds.minY = Math.min(bounds.minY, rect.y);
    bounds.maxX = Math.max(bounds.maxX, rect.x + Math.max(0, rect.w));
    bounds.maxY = Math.max(bounds.maxY, rect.y + Math.max(0, rect.h));
  }
  if (!Number.isFinite(bounds.minX)) return null;

  const viewport = {
    x: Math.max(1, finite(options.viewport.x, 1)),
    y: Math.max(1, finite(options.viewport.y, 1)),
  };
  const padding = Math.max(0, finite(options.padding));
  const safeArea = {
    top: Math.max(0, finite(options.safeArea.top)),
    right: Math.max(0, finite(options.safeArea.right)),
    bottom: Math.max(0, finite(options.safeArea.bottom)),
    left: Math.max(0, finite(options.safeArea.left)),
  };
  const safeLeft = Math.min(viewport.x - 1, safeArea.left + padding);
  const safeTop = Math.min(viewport.y - 1, safeArea.top + padding);
  const safeRight = Math.max(safeLeft + 1, viewport.x - safeArea.right - padding);
  const safeBottom = Math.max(safeTop + 1, viewport.y - safeArea.bottom - padding);
  const safeMidpoint = {
    x: (safeLeft + safeRight) / 2,
    y: (safeTop + safeBottom) / 2,
  };
  const contentWidth = Math.max(1, bounds.maxX - bounds.minX);
  const contentHeight = Math.max(1, bounds.maxY - bounds.minY);
  const minZoom = clamp(
    finite(options.minZoom, MIN_READABLE_FIT_ZOOM),
    MIN_CANVAS_ZOOM,
    MAX_CANVAS_ZOOM,
  );
  const maxZoom = clamp(
    finite(options.maxZoom, MAX_CANVAS_ZOOM),
    minZoom,
    MAX_CANVAS_ZOOM,
  );
  const zoom = clamp(
    Math.min(
      (safeRight - safeLeft) / contentWidth,
      (safeBottom - safeTop) / contentHeight,
    ),
    minZoom,
    maxZoom,
  );
  const midpointX = (bounds.minX + bounds.maxX) / 2;
  const midpointY = (bounds.minY + bounds.maxY) / 2;

  return {
    center: [
      midpointX + viewport.x / 2 - options.anchor[0] - safeMidpoint.x / zoom,
      midpointY + viewport.y / 2 - options.anchor[1] - safeMidpoint.y / zoom,
    ],
    zoom,
  };
}

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
  const fitMinZoom = clamp(
    finite(options.fitMinZoom, MIN_READABLE_FIT_ZOOM),
    MIN_CANVAS_ZOOM,
    MAX_CANVAS_ZOOM,
  );
  const fitSafeArea = useMemo<CanvasSafeArea>(() => ({
    top: Math.max(0, finite(options.fitSafeArea?.top, DEFAULT_CANVAS_SAFE_AREA.top)),
    right: Math.max(0, finite(options.fitSafeArea?.right, DEFAULT_CANVAS_SAFE_AREA.right)),
    bottom: Math.max(0, finite(options.fitSafeArea?.bottom, DEFAULT_CANVAS_SAFE_AREA.bottom)),
    left: Math.max(0, finite(options.fitSafeArea?.left, DEFAULT_CANVAS_SAFE_AREA.left)),
  }), [
    options.fitSafeArea?.bottom,
    options.fitSafeArea?.left,
    options.fitSafeArea?.right,
    options.fitSafeArea?.top,
  ]);
  const initialView: MutableView = {
    center: initialCenter,
    zoom: clamp(finite(options.zoom, 1), MIN_CANVAS_ZOOM, MAX_CANVAS_ZOOM),
  };

  const fabricRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<MutableView>(initialView);
  const panRef = useRef<PanState | null>(null);
  const animationRef = useRef<number | null>(null);
  const [view, setView] = useState<MutableView>(initialView);

  const commitView = useCallback((update: (current: MutableView) => MutableView) => {
    const next = update(viewRef.current);
    viewRef.current = next;
    setView(next);
  }, []);

  const cancelFocusAnimation = useCallback(() => {
    if (animationRef.current === null) return;

    const frameWindow =
      fabricRef.current?.ownerDocument.defaultView ??
      (typeof window === "undefined" ? null : window);
    frameWindow?.cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
  }, []);

  useEffect(() => () => cancelFocusAnimation(), [cancelFocusAnimation]);

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

  const viewportCenter = useCallback((): CanvasPoint => {
    const fabric = fabricRef.current;
    const bounds = fabric?.getBoundingClientRect();
    if (bounds) {
      return {
        x: bounds.left + bounds.width / 2,
        y: bounds.top + bounds.height / 2,
      };
    }

    const viewport = viewportSize(fabric);
    return { x: viewport.x / 2, y: viewport.y / 2 };
  }, []);

  const zoomAround = useCallback(
    (resolveZoom: (currentZoom: number) => number, pointer = viewportCenter()) => {
      cancelFocusAnimation();
      commitView((current) => {
        const nextZoom = clamp(
          finite(resolveZoom(current.zoom), current.zoom),
          MIN_CANVAS_ZOOM,
          MAX_CANVAS_ZOOM,
        );
        if (nextZoom === current.zoom) return current;

        return {
          center: [
            current.center[0] + pointer.x * (1 / current.zoom - 1 / nextZoom),
            current.center[1] + pointer.y * (1 / current.zoom - 1 / nextZoom),
          ],
          zoom: nextZoom,
        };
      });
    },
    [cancelFocusAnimation, commitView, viewportCenter],
  );

  const zoomBy = useCallback(
    (factor: number) => {
      const safeFactor = finite(factor, 1);
      if (safeFactor <= 0) return;
      zoomAround((currentZoom) => currentZoom * safeFactor);
    },
    [zoomAround],
  );

  const zoomTo = useCallback(
    (nextZoom: number) => zoomAround(() => nextZoom),
    [zoomAround],
  );

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      event.preventDefault();

      if (event.ctrlKey || event.metaKey) {
        const pointer = readPoint(event, undefined, true);
        zoomAround(
          (currentZoom) => (1 - (event.deltaY * 0.618) / 320) * currentZoom,
          pointer,
        );
        return;
      }

      cancelFocusAnimation();
      blurFocusedInput(fabricRef.current);
      commitView((current) => ({
        center: [
          current.center[0] + event.deltaX / current.zoom,
          current.center[1] + event.deltaY / current.zoom,
        ],
        zoom: current.zoom,
      }));
    },
    [cancelFocusAnimation, commitView, zoomAround],
  );

  useEffect(() => {
    const fabric = fabricRef.current;
    if (!fabric) return;

    fabric.addEventListener("wheel", handleWheel, { passive: false });
    return () => fabric.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget || event.button !== 0) return;

      cancelFocusAnimation();
      blurFocusedInput(fabricRef.current);
      panRef.current = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
    },
    [cancelFocusAnimation],
  );

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
      cancelFocusAnimation();

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
      const viewport = viewportSize(fabricRef.current);
      const next = calculateFitView(source, {
        viewport,
        anchor,
        padding: fitPadding,
        safeArea: fitSafeArea,
        minZoom: fitMinZoom,
      });
      if (next) commitView(() => ({ center: [...next.center], zoom: next.zoom }));
    },
    [anchor, cancelFocusAnimation, commitView, fitMinZoom, fitPadding, fitSafeArea],
  );

  const focusOn = useCallback(
    (rect: WorldRect, focusOptions: FocusOptions = {}) => {
      if (![rect.x, rect.y, rect.w, rect.h].every(Number.isFinite) || rect.w < 0 || rect.h < 0) {
        return;
      }

      cancelFocusAnimation();

      const fabric = fabricRef.current;
      const frameWindow = fabric?.ownerDocument.defaultView;
      const viewport = viewportSize(fabric);
      const width = Math.max(1, rect.w);
      const height = Math.max(1, rect.h);
      const frameZoom = clamp(
        Math.min(
          Math.max(1, viewport.x - fitPadding * 2) / width,
          Math.max(1, viewport.y - fitPadding * 2) / height,
        ),
        MIN_CANVAS_ZOOM,
        MAX_CANVAS_ZOOM,
      );
      const targetZoom = clamp(
        finite(focusOptions.zoom, frameZoom),
        MIN_CANVAS_ZOOM,
        MAX_CANVAS_ZOOM,
      );
      const midpointX = rect.x + rect.w / 2;
      const midpointY = rect.y + rect.h / 2;
      const target: MutableView = {
        center: [
          midpointX + viewport.x / 2 - anchor[0] - viewport.x / (2 * targetZoom),
          midpointY + viewport.y / 2 - anchor[1] - viewport.y / (2 * targetZoom),
        ],
        zoom: targetZoom,
      };

      const reducedMotion = frameWindow?.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      if (reducedMotion || !frameWindow?.requestAnimationFrame) {
        commitView(() => target);
        return;
      }

      const start: MutableView = {
        center: [...viewRef.current.center],
        zoom: viewRef.current.zoom,
      };
      const startedAt = frameWindow.performance.now();

      const animate = (timestamp: number) => {
        const progress = clamp((timestamp - startedAt) / FOCUS_DURATION_MS, 0, 1);
        const eased = easeOutExpo(progress);

        commitView(() => ({
          center: [
            start.center[0] + (target.center[0] - start.center[0]) * eased,
            start.center[1] + (target.center[1] - start.center[1]) * eased,
          ],
          zoom: start.zoom + (target.zoom - start.zoom) * eased,
        }));

        if (progress < 1) {
          animationRef.current = frameWindow.requestAnimationFrame(animate);
        } else {
          animationRef.current = null;
        }
      };

      animationRef.current = frameWindow.requestAnimationFrame(animate);
    },
    [anchor, cancelFocusAnimation, commitView, fitPadding],
  );

  return useMemo(
    () => ({
      center: view.center,
      zoom: view.zoom,
      anchor,
      fabricRef,
      screenToWorld,
      worldToScreen,
      zoomBy,
      zoomTo,
      fit,
      focusOn,
      onPointerDown,
      onPointerMove,
      onPointerUp: endPan,
      onPointerCancel: endPan,
    }),
    [
      anchor,
      endPan,
      fit,
      focusOn,
      onPointerDown,
      onPointerMove,
      screenToWorld,
      view,
      worldToScreen,
      zoomBy,
      zoomTo,
    ],
  );
}
