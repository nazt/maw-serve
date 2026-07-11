import { expect, test } from "bun:test";
import { handleRequest } from "../server";
import { censusWireToTopology } from "../src/census/topology";
import type { CensusWireV1 } from "../src/census/topology";
import type { StoaFleetTopology } from "../src/types/census";

const fixtureUrl = new URL("../src/census/census-wire-v1.fixture.json", import.meta.url);

async function loadWireFixture(): Promise<CensusWireV1> {
  return JSON.parse(await Bun.file(fixtureUrl).text()) as CensusWireV1;
}

test("censusWireToTopology adapts maw.census.v1 wire shape", async () => {
  const body = censusWireToTopology(await loadWireFixture());

  expect(body.spaces).toHaveLength(2);
  expect(body.spaces[0].display).toBe("DELL U2719DC");
  expect(body.spaces[0].space).toBe("1:1:0:0:1:1");
  expect(body.spaces[0].displayIndex).toBe(0);
  expect(body.spaces[0].spaceIndex).toBe(0);
  expect(body.spaces[1].display).toBe("DELL U2719DC");
  expect(body.spaces[1].space).toBe("1:1:0:0:1:2");
  expect(body.spaces[1].displayIndex).toBe(0);
  expect(body.spaces[1].spaceIndex).toBe(1);

  const oracle = body.spaces[0].oracles[0];
  expect(oracle.oracle).toBe("m5");
  expect(oracle.session).toBe("maw-serve");
  expect(oracle.pane).toBe("%42");
  expect(oracle.model_tier).toBe("frontier");
  expect(oracle.idle_sec).toBe(0);
  expect(oracle.status).toBe("busy");
  expect(oracle.annotation).toBe("building Stoa census route");
  expect(oracle.pinned).toBe(false);
  expect("machine" in oracle).toBe(false);
  expectDisplayCensusFieldsNull(body);
});

test("censusWireToTopology rejects unsupported schema versions", () => {
  expect(() => censusWireToTopology({ schema: "maw.census.v0", displays: [] })).toThrow(
    "unsupported maw census schema",
  );
});

test("GET /api/agora/census returns fixture-backed StoaFleetTopology", async () => {
  const previousMode = process.env.MAW_SERVE_CENSUS_MODE;
  process.env.MAW_SERVE_CENSUS_MODE = "fixture";

  try {
    const res = await handleRequest(new Request("http://localhost/api/agora/census"));
    expect(res.status).toBe(200);

    const body = (await res.json()) as StoaFleetTopology;
    expect(body.spaces.length).toBeGreaterThan(0);
    expect(body.spaces[0].display).toBe("DELL U2719DC");
    expect(body.spaces[0].space).toBe("1:1:0:0:1:1");
    expect(body.spaces[0].oracles[0].model_tier).toBe("frontier");
    expectDisplayCensusFieldsNull(body);
  } finally {
    if (previousMode === undefined) delete process.env.MAW_SERVE_CENSUS_MODE;
    else process.env.MAW_SERVE_CENSUS_MODE = previousMode;
  }
});

function expectDisplayCensusFieldsNull(body: StoaFleetTopology) {
  expect(body.pins).toBeNull();
  expect(body.displayCensusTs).toBeNull();
  expect(body.fleet).toBeNull();
  expect(body.windows).toBeNull();
  expect(body.displayCensusSpaces).toBeNull();
  expect(body.displays).toBeNull();
}
