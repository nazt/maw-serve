import { apiFetch } from "../clients/api";
import { nodeEdgePairId, type NodeEdge } from "./edges";

export type NodeLinkAction = "connect" | "disconnect";

export interface NodeLinkPayload {
  from: string;
  to: string;
  action: NodeLinkAction;
}

export type SendNodeLink = (
  edge: NodeEdge,
  action: NodeLinkAction,
) => Promise<void>;

export function nodeLinkPayload(
  edge: Pick<NodeEdge, "from" | "to">,
  action: NodeLinkAction,
): NodeLinkPayload {
  return { from: edge.from, to: edge.to, action };
}

export async function postNodeLink(
  edge: NodeEdge,
  action: NodeLinkAction,
): Promise<void> {
  const response = await apiFetch("/api/agora/link", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(nodeLinkPayload(edge, action)),
    keepalive: true,
  });
  if (!response.ok) {
    throw new Error(`Link ${action} failed (${response.status})`);
  }
}

interface PendingLinkAction {
  edge: NodeEdge;
  action: NodeLinkAction;
  timer: ReturnType<typeof setTimeout>;
}

export interface NodeLinkActionQueue {
  remember(edge: NodeEdge, action: NodeLinkAction): void;
  enqueue(edge: NodeEdge, action: NodeLinkAction): void;
  flush(): void;
}

export function createNodeLinkActionQueue(
  send: SendNodeLink = postNodeLink,
  delayMs = 160,
  onError: (error: Error) => void = () => {},
): NodeLinkActionQueue {
  const pending = new Map<string, PendingLinkAction>();
  const lastDispatched = new Map<string, NodeLinkAction>();

  const dispatch = (item: Omit<PendingLinkAction, "timer">) => {
    // Record before awaiting the request. React re-renders, reconnect effects, and
    // repeated pointer completion must not issue the same pair action in flight.
    lastDispatched.set(
      nodeEdgePairId(item.edge.from, item.edge.to),
      item.action,
    );
    void send(item.edge, item.action).catch((cause) => {
      onError(cause instanceof Error ? cause : new Error("Link request failed"));
    });
  };

  const remember = (edge: NodeEdge, action: NodeLinkAction) => {
    // Rehydrated edges describe existing board state. Seed the guard without
    // dispatching so reload and transport reconnects can only redraw them.
    lastDispatched.set(nodeEdgePairId(edge.from, edge.to), action);
  };

  const enqueue = (edge: NodeEdge, action: NodeLinkAction) => {
    const pairId = nodeEdgePairId(edge.from, edge.to);
    const existing = pending.get(pairId);
    if (existing) {
      clearTimeout(existing.timer);
      pending.delete(pairId);
      // A connect immediately undone (or a disconnect immediately restored)
      // never changed server state, so the opposing pair can collapse to no-op.
      if (existing.action !== action) return;
    }

    if (lastDispatched.get(pairId) === action) return;

    const item = { edge, action };
    const timer = setTimeout(() => {
      pending.delete(pairId);
      dispatch(item);
    }, Math.max(0, delayMs));
    pending.set(pairId, { ...item, timer });
  };

  const flush = () => {
    for (const item of pending.values()) {
      clearTimeout(item.timer);
      dispatch(item);
    }
    pending.clear();
  };

  return { remember, enqueue, flush };
}
