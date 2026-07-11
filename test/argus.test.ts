import { expect, test } from "bun:test";
import fixture from "./fixtures/argus-board-tile.json";
import { fetchArgusBoardTile, parseArgusBoardTile, parseArgusWsFrame } from "../src/clients/argus";

test("argus board-tile fixture parses", () => {
  const tile = parseArgusBoardTile(fixture);
  expect(tile.window_h).toBe(5);
  expect(tile.hosts[0].machine).toBe("atlas");
  expect(tile.accounts[0].rate_5h_pct).toBe(42.5);
  expect(tile.oracles[0].model).toBe("model-a");
});

test("argus fetch wrapper calls board-tile with window_h", async () => {
  const seen: string[] = [];
  const mockFetch = async (input: string | URL): Promise<Response> => {
    seen.push(input.toString());
    return Response.json(fixture);
  };
  const tile = await fetchArgusBoardTile("http://argus.local", 5, mockFetch);
  expect(tile.hosts).toHaveLength(1);
  expect(seen[0]).toBe("http://argus.local/api/board-tile?window_h=5");
});

test("argus ws parser branches ingest and tolerates future frame types", () => {
  const ingest = parseArgusWsFrame(JSON.stringify({ type: "ingest", at: 1783760400000, rows: [{ id: 1 }] }));
  expect(ingest.type).toBe("ingest");
  if (ingest.type === "ingest") expect(ingest.rows).toHaveLength(1);

  const heartbeat = parseArgusWsFrame(JSON.stringify({ type: "heartbeat", at: 1783760401000 }));
  expect(heartbeat.type).toBe("heartbeat");
});
