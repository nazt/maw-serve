import { apiFetch } from "../clients/api";
import type { NodeEdge } from "./edges";

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
  enqueue(edge: NodeEdge, action: NodeLinkAction): void;
  flush(): void;
}

export function createNodeLinkActionQueue(
  send: SendNodeLink = postNodeLink,
  delayMs = 160,
  onError: (error: Error) => void = () => {},
): NodeLinkActionQueue {
  const pending = new Map<string, PendingLinkAction>();

  const dispatch = (item: Omit<PendingLinkAction, "timer">) => {
    void send(item.edge, item.action).catch((cause) => {
      onError(cause instanceof Error ? cause : new Error("Link request failed"));
    });
  };

  const enqueue = (edge: NodeEdge, action: NodeLinkAction) => {
    const existing = pending.get(edge.id);
    if (existing) {
      clearTimeout(existing.timer);
      pending.delete(edge.id);
      // A connect immediately undone (or a disconnect immediately restored)
      // never changed server state, so the opposing pair can collapse to no-op.
      if (existing.action !== action) return;
    }

    const item = { edge, action };
    const timer = setTimeout(() => {
      pending.delete(edge.id);
      dispatch(item);
    }, Math.max(0, delayMs));
    pending.set(edge.id, { ...item, timer });
  };

  const flush = () => {
    for (const item of pending.values()) {
      clearTimeout(item.timer);
      dispatch(item);
    }
    pending.clear();
  };

  return { enqueue, flush };
}
