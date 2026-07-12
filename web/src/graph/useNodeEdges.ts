import { useCallback, useEffect, useRef, useState } from "react";

import {
  loadNodeEdges,
  makeNodeEdge,
  saveNodeEdges,
  type NodeEdge,
} from "./edges";
import { createNodeLinkActionQueue } from "./link";

const LINKED_PULSE_MS = 900;

export interface NodeEdgesController {
  edges: NodeEdge[];
  linkedEdgeId: string | null;
  error: string | null;
  connect(from: string, to: string): void;
  disconnect(id: string): void;
}

export function useNodeEdges(pageId: string): NodeEdgesController {
  const [edges, setEdges] = useState<NodeEdge[]>(() => loadNodeEdges(pageId));
  const [linkedEdgeId, setLinkedEdgeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const edgesRef = useRef(edges);
  const pulseTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const queueRef = useRef<ReturnType<typeof createNodeLinkActionQueue> | null>(null);

  if (!queueRef.current) {
    queueRef.current = createNodeLinkActionQueue(undefined, undefined, (cause) => {
      if (mountedRef.current) setError(cause.message);
    });
  }

  useEffect(() => {
    saveNodeEdges(pageId, edges);
  }, [edges, pageId]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (pulseTimerRef.current !== null) window.clearTimeout(pulseTimerRef.current);
      queueRef.current?.flush();
    };
  }, []);

  const connect = useCallback((from: string, to: string) => {
    const edge = makeNodeEdge(from, to, edgesRef.current);
    if (!edge) return;

    const next = [...edgesRef.current, edge];
    edgesRef.current = next;
    setEdges(next);
    setError(null);
    setLinkedEdgeId(edge.id);
    if (pulseTimerRef.current !== null) window.clearTimeout(pulseTimerRef.current);
    pulseTimerRef.current = window.setTimeout(() => {
      setLinkedEdgeId(null);
      pulseTimerRef.current = null;
    }, LINKED_PULSE_MS);
    queueRef.current?.enqueue(edge, "connect");
  }, []);

  const disconnect = useCallback((id: string) => {
    const edge = edgesRef.current.find((candidate) => candidate.id === id);
    if (!edge) return;

    const next = edgesRef.current.filter((candidate) => candidate.id !== id);
    edgesRef.current = next;
    setEdges(next);
    setError(null);
    setLinkedEdgeId((current) => current === id ? null : current);
    queueRef.current?.enqueue(edge, "disconnect");
  }, []);

  return { edges, linkedEdgeId, error, connect, disconnect };
}
