import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";

import type { CanvasController, CanvasPoint } from "../canvas/useCanvas";
import { transformPoint } from "../tiles/useDrag";
import type { NodeEdge } from "./edges";

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
    "--node-handle-hit-w": `${18 / safeZoom}px`,
    "--node-handle-hit-h": `${24 / safeZoom}px`,
    "--node-handle-offset": `${-9 / safeZoom}px`,
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
  const nodeIndex = useMemo(
    () => new Map(nodes.map((node) => [node.data.oracle, node])),
    [nodes],
  );

  useEffect(() => {
    if (selectedEdgeId && !edges.some((edge) => edge.id === selectedEdgeId)) {
      setSelectedEdgeId(null);
    }
  }, [edges, selectedEdgeId]);

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

  return (
    <>
      <svg
        className="node-edge-overlay"
        aria-label={`${edges.length} oracle ${edges.length === 1 ? "link" : "links"}`}
        data-edge-drawing={draft ? "true" : undefined}
      >
        {visibleEdges.map(({ edge, from, to, curve }) => {
          const selected = selectedEdgeId === edge.id;
          return (
            <g
              key={edge.id}
              className="node-edge"
              data-edge-id={edge.id}
              data-linked={linkedEdgeId === edge.id || undefined}
              data-selected={selected || undefined}
            >
              <path className="node-edge__line" d={curve.path} />
              <path
                className="node-edge__hit"
                d={curve.path}
                role="button"
                tabIndex={0}
                aria-label={`Link from ${from.data.oracle} to ${to.data.oracle}. Select to remove.`}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedEdgeId((current) => current === edge.id ? null : edge.id);
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  setSelectedEdgeId((current) => current === edge.id ? null : edge.id);
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
        {visibleEdges.map(({ edge, from, to, curve }) => (
          <div
            key={edge.id}
            className="node-edge__control"
            style={{ left: curve.midpoint.x, top: curve.midpoint.y }}
          >
            <span className="node-edge__label">
              {from.data.oracle} ↔ {to.data.oracle}
            </span>
            {selectedEdgeId === edge.id ? (
              <button
                type="button"
                className="node-edge__delete"
                aria-label={`Disconnect ${from.data.oracle} and ${to.data.oracle}`}
                title="Disconnect oracles"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete(edge.id);
                }}
              >
                ×
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </>
  );
}

export default NodeEdgeOverlay;
