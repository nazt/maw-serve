import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

import type { CanvasController, CanvasPoint } from "../canvas/useCanvas";
import { transformPoint } from "../tiles/useDrag";
import type { NodeEdge } from "./edges";
import "./NodeEdgeOverlay.css";

export interface EdgeNode {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  data: { oracle: string };
}

export interface EdgeDraft {
  from: string;
  point: CanvasPoint;
}

export interface EdgeCurve {
  path: string;
  midpoint: CanvasPoint;
}

function curvePoint(
  start: CanvasPoint,
  control: CanvasPoint,
  end: CanvasPoint,
  t: number,
): CanvasPoint {
  const inverse = 1 - t;
  return {
    x: inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x,
    y: inverse * inverse * start.y + 2 * inverse * t * control.y + t * t * end.y,
  };
}

function edgeDirection(id: string): number {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = ((hash << 5) - hash + id.charCodeAt(index)) | 0;
  }
  return hash % 2 === 0 ? 1 : -1;
}

export function edgeCurve(
  start: CanvasPoint,
  end: CanvasPoint,
  id: string,
): EdgeCurve {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const bend = Math.min(72, Math.max(16, distance * 0.12)) * edgeDirection(id);
  const control = {
    x: (start.x + end.x) / 2 - (dy / distance) * bend,
    y: (start.y + end.y) / 2 + (dx / distance) * bend,
  };
  return {
    path: `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`,
    midpoint: curvePoint(start, control, end, 0.5),
  };
}

function usePrefersReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(() => (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ));

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reducedMotion;
}

function nodeCenter(node: EdgeNode, canvas: CanvasController): CanvasPoint {
  return transformPoint(canvas.worldToScreen, {
    x: node.x + node.w / 2,
    y: node.y + node.h / 2,
  });
}

export interface EdgeHandleEvents {
  begin(nodeId: string, event: ReactPointerEvent<HTMLButtonElement>): void;
  move(event: ReactPointerEvent<HTMLButtonElement>): void;
  end(event: ReactPointerEvent<HTMLButtonElement>): void;
  cancel(event: ReactPointerEvent<HTMLButtonElement>): void;
}

export function useNodeEdgeDrag(
  onConnect: (from: string, to: string) => void,
): { draft: EdgeDraft | null; events: EdgeHandleEvents } {
  const [draft, setDraft] = useState<EdgeDraft | null>(null);
  const draftRef = useRef<(EdgeDraft & { pointerId: number }) | null>(null);
  const frameRef = useRef<number | null>(null);
  const latestPointRef = useRef<CanvasPoint | null>(null);
  const onConnectRef = useRef(onConnect);
  onConnectRef.current = onConnect;

  const cancelFrame = useCallback(() => {
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    latestPointRef.current = null;
  }, []);

  const clear = useCallback(() => {
    cancelFrame();
    draftRef.current = null;
    setDraft(null);
  }, [cancelFrame]);

  useEffect(() => clear, [clear]);

  const begin = useCallback((
    nodeId: string,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const next = {
      from: nodeId,
      pointerId: event.pointerId,
      point: { x: event.clientX, y: event.clientY },
    };
    draftRef.current = next;
    setDraft(next);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, []);

  const move = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const current = draftRef.current;
    if (!current || current.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    latestPointRef.current = { x: event.clientX, y: event.clientY };
    if (frameRef.current !== null) return;

    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      const point = latestPointRef.current;
      latestPointRef.current = null;
      const active = draftRef.current;
      if (!point || !active) return;
      active.point = point;
      setDraft({ from: active.from, point });
    });
  }, []);

  const end = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const current = draftRef.current;
    if (!current || current.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget.ownerDocument
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>("[data-node-connect-target]");
    const to = target?.dataset.nodeConnectTarget;
    const from = current.from;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    clear();
    if (to && to !== from) onConnectRef.current(from, to);
  }, [clear]);

  const cancel = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (draftRef.current?.pointerId !== event.pointerId) return;
    event.stopPropagation();
    clear();
  }, [clear]);

  return { draft, events: { begin, move, end, cancel } };
}

interface NodeConnectHandleProps {
  nodeId: string;
  nodeName: string;
  connected: boolean;
  zoom: number;
  events: EdgeHandleEvents;
}

export function NodeConnectHandle({
  nodeId,
  nodeName,
  connected,
  zoom,
  events,
}: NodeConnectHandleProps) {
  const safeZoom = Math.max(0.01, Number.isFinite(zoom) ? zoom : 1);
  const style = {
    // The resting CSS transform is scale(.82), so 54px preserves a 44px hit target.
    "--node-handle-hit-w": `${54 / safeZoom}px`,
    "--node-handle-hit-h": `${54 / safeZoom}px`,
    "--node-handle-offset": `${-14 / safeZoom}px`,
    "--node-handle-dot": `${9 / safeZoom}px`,
  } as CSSProperties;

  return (
    <button
      type="button"
      className="node-connect-handle"
      data-connected={connected || undefined}
      data-node-connect-handle={nodeId}
      aria-label={`Connect ${nodeName} to another oracle`}
      title="Drag to another oracle to link"
      style={style}
      onPointerDown={(event) => events.begin(nodeId, event)}
      onPointerMove={events.move}
      onPointerUp={events.end}
      onPointerCancel={events.cancel}
      onLostPointerCapture={events.cancel}
      onClick={(event) => event.stopPropagation()}
    >
      <span aria-hidden="true" />
    </button>
  );
}

interface NodeEdgeOverlayProps {
  edges: readonly NodeEdge[];
  nodes: readonly EdgeNode[];
  canvas: CanvasController;
  draft: EdgeDraft | null;
  linkedEdgeId: string | null;
  onDelete: (id: string) => void;
}

export function NodeEdgeOverlay({
  edges,
  nodes,
  canvas,
  draft,
  linkedEdgeId,
  onDelete,
}: NodeEdgeOverlayProps) {
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [focusedEdgeId, setFocusedEdgeId] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const previousEdgesRef = useRef<readonly NodeEdge[] | null>(null);
  const edgeFocusRefs = useRef(new Map<string, HTMLButtonElement>());
  const reducedMotion = usePrefersReducedMotion();
  const nodeIndex = useMemo(
    () => new Map(nodes.map((node) => [node.data.oracle, node])),
    [nodes],
  );

  useEffect(() => {
    if (selectedEdgeId && !edges.some((edge) => edge.id === selectedEdgeId)) {
      setSelectedEdgeId(null);
    }
    if (focusedEdgeId && !edges.some((edge) => edge.id === focusedEdgeId)) {
      setFocusedEdgeId(null);
    }
    if (hoveredEdgeId && !edges.some((edge) => edge.id === hoveredEdgeId)) {
      setHoveredEdgeId(null);
    }
  }, [edges, focusedEdgeId, hoveredEdgeId, selectedEdgeId]);

  useEffect(() => {
    const previousEdges = previousEdgesRef.current;
    previousEdgesRef.current = edges;
    if (previousEdges === null) return;

    const previousIds = new Set(previousEdges.map((edge) => edge.id));
    const currentIds = new Set(edges.map((edge) => edge.id));
    const connected = edges.find((edge) => !previousIds.has(edge.id));
    const disconnected = previousEdges.find((edge) => !currentIds.has(edge.id));
    if (connected) {
      setAnnouncement(`Connected ${connected.from} and ${connected.to}.`);
    } else if (disconnected) {
      setAnnouncement(`Disconnected ${disconnected.from} and ${disconnected.to}.`);
    }
  }, [edges]);

  const draftNode = draft ? nodeIndex.get(draft.from) : null;
  const draftCurve = draft && draftNode
    ? edgeCurve(nodeCenter(draftNode, canvas), draft.point, `draft:${draft.from}`)
    : null;
  const visibleEdges = edges.flatMap((edge) => {
    const from = nodeIndex.get(edge.from);
    const to = nodeIndex.get(edge.to);
    if (!from || !to) return [];
    return [{
      edge,
      from,
      to,
      curve: edgeCurve(nodeCenter(from, canvas), nodeCenter(to, canvas), edge.id),
    }];
  });

  const selectEdge = useCallback((id: string) => {
    setSelectedEdgeId(id);
    setFocusedEdgeId(id);
  }, []);

  const focusEdge = useCallback((id: string) => {
    selectEdge(id);
    edgeFocusRefs.current.get(id)?.focus();
  }, [selectEdge]);

  const focusRelativeEdge = useCallback((id: string, offset: number) => {
    const currentIndex = visibleEdges.findIndex(({ edge }) => edge.id === id);
    if (currentIndex < 0 || visibleEdges.length === 0) return;
    const nextIndex = (currentIndex + offset + visibleEdges.length) % visibleEdges.length;
    focusEdge(visibleEdges[nextIndex].edge.id);
  }, [focusEdge, visibleEdges]);

  const handleEdgeKeyDown = useCallback((
    edge: NodeEdge,
    event: ReactKeyboardEvent<HTMLElement>,
  ) => {
    const direction = event.key === "ArrowRight" || event.key === "ArrowDown"
      ? 1
      : event.key === "ArrowLeft" || event.key === "ArrowUp"
        ? -1
        : 0;
    if (direction !== 0) {
      event.preventDefault();
      event.stopPropagation();
      focusRelativeEdge(edge.id, direction);
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      event.stopPropagation();
      const target = event.key === "Home" ? visibleEdges[0] : visibleEdges.at(-1);
      if (target) focusEdge(target.edge.id);
      return;
    }
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      event.stopPropagation();
      const currentIndex = visibleEdges.findIndex(({ edge: candidate }) => (
        candidate.id === edge.id
      ));
      const nextEdge = visibleEdges.length > 1
        ? visibleEdges[(currentIndex + 1) % visibleEdges.length]?.edge
        : null;
      setSelectedEdgeId(null);
      setFocusedEdgeId(null);
      onDelete(edge.id);
      if (nextEdge) window.requestAnimationFrame(() => focusEdge(nextEdge.id));
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      focusEdge(edge.id);
    }
  }, [focusEdge, focusRelativeEdge, onDelete, visibleEdges]);

  return (
    <>
      <svg
        className="node-edge-overlay"
        aria-label={`${edges.length} oracle ${edges.length === 1 ? "link" : "links"}`}
        data-edge-drawing={draft ? "true" : undefined}
      >
        {visibleEdges.map(({ edge, from, to, curve }) => {
          const selected = selectedEdgeId === edge.id;
          const focused = focusedEdgeId === edge.id;
          return (
            <g
              key={edge.id}
              className="node-edge"
              data-edge-id={edge.id}
              data-linked={!reducedMotion && linkedEdgeId === edge.id || undefined}
              data-selected={selected || undefined}
            >
              <path className="node-edge__line" d={curve.path} />
              {focused ? (
                <>
                  <path
                    d={curve.path}
                    fill="none"
                    stroke="var(--bg)"
                    strokeWidth={7}
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                    pointerEvents="none"
                    aria-hidden="true"
                    data-edge-focus-ring="backdrop"
                  />
                  <path
                    d={curve.path}
                    fill="none"
                    stroke="var(--active)"
                    strokeWidth={3}
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                    pointerEvents="none"
                    aria-hidden="true"
                    data-edge-focus-ring="indicator"
                  />
                </>
              ) : null}
              <path
                className="node-edge__hit"
                d={curve.path}
                style={{ strokeWidth: 44 }}
                aria-hidden="true"
                onPointerDown={(event) => event.stopPropagation()}
                onPointerEnter={() => setHoveredEdgeId(edge.id)}
                onPointerLeave={() => setHoveredEdgeId((current) => (
                  current === edge.id ? null : current
                ))}
                onClick={(event) => {
                  event.stopPropagation();
                  focusEdge(edge.id);
                }}
              />
            </g>
          );
        })}
        {draftCurve ? (
          <path className="node-edge__draft" d={draftCurve.path} aria-hidden="true" />
        ) : null}
      </svg>
      <div className="node-edge-controls">
        {visibleEdges.map(({ edge, from, to, curve }) => {
          const selected = selectedEdgeId === edge.id;
          const focused = focusedEdgeId === edge.id;
          const hovered = hoveredEdgeId === edge.id;
          const revealed = selected || focused || hovered;
          return (
            <div
              key={edge.id}
              className="node-edge__control"
              style={{ left: curve.midpoint.x, top: curve.midpoint.y }}
              onPointerEnter={() => setHoveredEdgeId(edge.id)}
              onPointerLeave={() => setHoveredEdgeId((current) => (
                current === edge.id ? null : current
              ))}
            >
              <button
                type="button"
                className="node-edge__label node-edge__label--contextual"
                ref={(element) => {
                  if (element) edgeFocusRefs.current.set(edge.id, element);
                  else edgeFocusRefs.current.delete(edge.id);
                }}
                data-edge-focus-id={edge.id}
                data-visible={revealed || undefined}
                aria-label={`Link from ${from.data.oracle} to ${to.data.oracle}. Press Delete to disconnect. Use arrow keys to move between links.`}
                aria-keyshortcuts="Delete Backspace ArrowLeft ArrowRight ArrowUp ArrowDown Home End"
                aria-pressed={selected}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  focusEdge(edge.id);
                }}
                onFocus={() => selectEdge(edge.id)}
                onBlur={() => setFocusedEdgeId((current) => (
                  current === edge.id ? null : current
                ))}
                onKeyDown={(event) => handleEdgeKeyDown(edge, event)}
              >
                {from.data.oracle}{" "}
                {reducedMotion ? (
                  <span aria-hidden="true" data-edge-direction="static">»</span>
                ) : (
                  <span aria-hidden="true">↔</span>
                )}{" "}
                {to.data.oracle}
              </button>
              {selected ? (
                <button
                  type="button"
                  className="node-edge__delete node-edge__delete--hit"
                  aria-label={`Disconnect ${from.data.oracle} and ${to.data.oracle}`}
                  title="Disconnect oracles"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    onDelete(edge.id);
                  }}
                >
                  <span className="node-edge__delete-glyph" aria-hidden="true">×</span>
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
      <p
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-node-edge-announcer
      >
        {announcement}
      </p>
    </>
  );
}

export default NodeEdgeOverlay;
