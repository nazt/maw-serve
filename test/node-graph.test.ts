import { expect, test } from "bun:test";

import {
  loadNodeEdges,
  makeNodeEdge,
  nodeEdgePairId,
  nodeEdgesStorageKey,
  saveNodeEdges,
  type EdgeStorage,
  type NodeEdge,
} from "../web/src/graph/edges";
import { edgeCurve } from "../web/src/graph/NodeEdgeOverlay";
import {
  createNodeLinkActionQueue,
  nodeLinkPayload,
  type NodeLinkAction,
} from "../web/src/graph/link";

class MemoryStorage implements EdgeStorage {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

test("node edges are undirected, deduplicated, and preserve the user drag direction", () => {
  const first = makeNodeEdge("alpha", "beta");
  expect(first).toEqual({
    id: nodeEdgePairId("alpha", "beta"),
    from: "alpha",
    to: "beta",
  });
  expect(makeNodeEdge("beta", "alpha", first ? [first] : [])).toBeNull();
  expect(makeNodeEdge("alpha", "alpha")).toBeNull();
  expect(makeNodeEdge("alpha", "unsafe;oracle")).toBeNull();
});

test("node edges persist independently per page without dispatching actions", () => {
  const storage = new MemoryStorage();
  const edge = makeNodeEdge("alpha", "beta");
  if (!edge) throw new Error("fixture edge was invalid");

  expect(saveNodeEdges("fleet", [edge], storage)).toBeTrue();
  expect(loadNodeEdges("fleet", storage)).toEqual([edge]);
  expect(loadNodeEdges("board-2", storage)).toEqual([]);
  expect(storage.values.has(nodeEdgesStorageKey("fleet"))).toBeTrue();
});

test("rehydration filters malformed, self, and duplicate edges", () => {
  const storage = new MemoryStorage();
  storage.setItem(nodeEdgesStorageKey("fleet"), JSON.stringify({
    version: 1,
    edges: [
      { id: "ignored", from: "alpha", to: "beta" },
      { id: "reversed", from: "beta", to: "alpha" },
      { id: "self", from: "alpha", to: "alpha" },
      { id: "missing", from: "alpha" },
    ],
  }));

  expect(loadNodeEdges("fleet", storage)).toEqual([
    { id: nodeEdgePairId("alpha", "beta"), from: "alpha", to: "beta" },
  ]);
});

test("link payload matches the server endpoint contract", () => {
  const edge = { id: "edge", from: "Mycelium-Oracle", to: "esp32" };
  expect(nodeLinkPayload(edge, "connect")).toEqual({
    from: "Mycelium-Oracle",
    to: "esp32",
    action: "connect",
  });
  expect(nodeLinkPayload(edge, "disconnect")).toEqual({
    from: "Mycelium-Oracle",
    to: "esp32",
    action: "disconnect",
  });
});

test("link action queue debounces duplicates and collapses an immediate undo", async () => {
  const calls: Array<{ edge: NodeEdge; action: NodeLinkAction }> = [];
  const send = async (edge: NodeEdge, action: NodeLinkAction) => {
    calls.push({ edge, action });
  };
  const edge = makeNodeEdge("alpha", "beta");
  if (!edge) throw new Error("fixture edge was invalid");

  const duplicateQueue = createNodeLinkActionQueue(send, 5);
  duplicateQueue.enqueue(edge, "connect");
  duplicateQueue.enqueue(edge, "connect");
  await Bun.sleep(12);
  expect(calls).toEqual([{ edge, action: "connect" }]);

  calls.length = 0;
  const undoQueue = createNodeLinkActionQueue(send, 5);
  undoQueue.enqueue(edge, "connect");
  undoQueue.enqueue(edge, "disconnect");
  await Bun.sleep(12);
  expect(calls).toEqual([]);
});

test("edge curves retain endpoints and expose stable label and delete anchors", () => {
  const curve = edgeCurve({ x: 10, y: 20 }, { x: 210, y: 120 }, "alpha-beta");
  expect(curve.path.startsWith("M 10 20 Q ")).toBeTrue();
  expect(curve.path.endsWith(" 210 120")).toBeTrue();
  expect(curve.midpoint.x).toBeGreaterThan(10);
  expect(curve.midpoint.x).toBeLessThan(210);
  expect(Number.isFinite(curve.midpoint.y)).toBeTrue();
});
