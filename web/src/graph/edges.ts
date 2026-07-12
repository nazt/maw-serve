export const NODE_EDGES_STORAGE_KEY = "stoa.board.edges.v1";

export interface NodeEdge {
  id: string;
  from: string;
  to: string;
}

export interface EdgeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function normalizedNodeId(value: unknown): string {
  if (typeof value !== "string") return "";
  const name = value.trim();
  return name.length <= 128 && /^[\w.-]+$/.test(name) ? name : "";
}

export function nodeEdgePairId(from: string, to: string): string {
  const pair = [normalizedNodeId(from), normalizedNodeId(to)].sort();
  return `edge:${encodeURIComponent(pair[0])}:${encodeURIComponent(pair[1])}`;
}

export function makeNodeEdge(
  fromValue: string,
  toValue: string,
  current: readonly NodeEdge[] = [],
): NodeEdge | null {
  const from = normalizedNodeId(fromValue);
  const to = normalizedNodeId(toValue);
  if (!from || !to || from === to) return null;

  const id = nodeEdgePairId(from, to);
  if (current.some((edge) => edge.id === id)) return null;
  return { id, from, to };
}

export function normalizeNodeEdges(value: unknown): NodeEdge[] {
  if (!Array.isArray(value)) return [];

  const edges: NodeEdge[] = [];
  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object") continue;
    const record = candidate as Partial<NodeEdge>;
    const edge = makeNodeEdge(
      normalizedNodeId(record.from),
      normalizedNodeId(record.to),
      edges,
    );
    if (edge) edges.push(edge);
  }
  return edges;
}

export function nodeEdgesStorageKey(pageId: string): string {
  return `${NODE_EDGES_STORAGE_KEY}.page.${encodeURIComponent(pageId)}`;
}

function browserStorage(): EdgeStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadNodeEdges(
  pageId: string,
  storage: EdgeStorage | null = browserStorage(),
): NodeEdge[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(nodeEdgesStorageKey(pageId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { version?: unknown; edges?: unknown };
    return parsed.version === 1 ? normalizeNodeEdges(parsed.edges) : [];
  } catch {
    return [];
  }
}

export function saveNodeEdges(
  pageId: string,
  edges: readonly NodeEdge[],
  storage: EdgeStorage | null = browserStorage(),
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(
      nodeEdgesStorageKey(pageId),
      JSON.stringify({ version: 1, edges: normalizeNodeEdges(edges) }),
    );
    return true;
  } catch {
    return false;
  }
}

export function clearNodeEdges(
  pageId: string,
  storage: EdgeStorage | null = browserStorage(),
): void {
  try {
    storage?.removeItem(nodeEdgesStorageKey(pageId));
  } catch {
    // Deleting a board page still succeeds when storage is unavailable.
  }
}
