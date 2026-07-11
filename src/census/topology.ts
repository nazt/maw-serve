import type { StoaCensusOracle, StoaFleetTopology } from "../types/census";

export type CensusWireV1 = {
  schema: string;
  displays: CensusWireDisplay[];
};

type CensusWireDisplay = {
  name: string;
  spaces: CensusWireSpace[];
};

type CensusWireSpace = {
  name: string;
  oracles: CensusWireOracle[];
};

type CensusWireOracle = {
  oracle: string;
  session?: string;
  pane?: string;
  modelTier: string;
  status: StoaCensusOracle["status"];
  idleSec?: number;
  annotation: string;
  pinned: boolean;
};

export type CensusLoadMode = "auto" | "real" | "fixture";
export const CENSUS_LOADING_MODE = "auto-with-fixture-fallback" as const;

const fixtureWireUrl = new URL("./census-wire-v1.fixture.json", import.meta.url);

export function censusWireToTopology(wire: CensusWireV1): StoaFleetTopology {
  if (wire.schema !== "maw.census.v1") {
    throw new Error(`unsupported maw census schema: ${wire.schema}`);
  }

  return {
    spaces: wire.displays.flatMap((display, displayIndex) =>
      display.spaces.map((space, spaceIndex) => ({
        // Names are the stable census identities used for labels and joins;
        // indexes are retained only as optional ordering hints.
        display: display.name,
        space: space.name,
        displayIndex,
        spaceIndex,
        oracles: space.oracles.map(wireOracleToTopologyOracle),
      })),
    ),
    pins: null,
    displayCensusTs: null,
    fleet: null,
    windows: null,
    displayCensusSpaces: null,
    displays: null,
  };
}

export async function loadCensusTopology(mode: CensusLoadMode = censusLoadMode()): Promise<StoaFleetTopology> {
  if (mode === "fixture") return censusWireToTopology(await loadFixtureWire());
  if (mode === "real") return censusWireToTopology(await loadRealWire());

  try {
    return censusWireToTopology(await loadRealWire());
  } catch (error) {
    console.warn(`maw census --json unavailable; using fixture: ${errorMessage(error)}`);
    return censusWireToTopology(await loadFixtureWire());
  }
}

function wireOracleToTopologyOracle(oracle: CensusWireOracle): StoaCensusOracle {
  return {
    oracle: oracle.oracle,
    session: oracle.session,
    pane: oracle.pane,
    model_tier: oracle.modelTier,
    status: oracle.status,
    idle_sec: oracle.idleSec,
    annotation: oracle.annotation,
    pinned: oracle.pinned,
  };
}

function censusLoadMode(): CensusLoadMode {
  const configured = process.env.MAW_SERVE_CENSUS_MODE;
  if (configured === "fixture" || configured === "real") return configured;
  return "auto";
}

async function loadFixtureWire(): Promise<CensusWireV1> {
  return JSON.parse(await Bun.file(fixtureWireUrl).text()) as CensusWireV1;
}

async function loadRealWire(): Promise<CensusWireV1> {
  const proc = Bun.spawn(["maw", "census", "--json"], { stdout: "pipe", stderr: "pipe" });
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    throw new Error(`maw census --json exited ${exitCode}: ${stderr.trim() || "no stderr"}`);
  }

  try {
    return JSON.parse(stdout) as CensusWireV1;
  } catch (error) {
    throw new Error(`maw census --json returned invalid JSON: ${errorMessage(error)}`);
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
