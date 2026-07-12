import { fileURLToPath } from "node:url";

import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

import { resolveBuildIdentity, type StoaBuildIdentity } from "../build-identity";

const STOA_DEV_PORT = 48_901;
const repoRoot = fileURLToPath(new URL("../", import.meta.url));

function buildIdentityAsset(identity: StoaBuildIdentity): Plugin {
  return {
    name: "stoa-build-identity",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "stoa-build.json",
        source: `${JSON.stringify(identity, null, 2)}\n`,
      });
    },
  };
}

export default defineConfig(({ command }) => {
  const identity = resolveBuildIdentity({
    cwd: repoRoot,
    dev: command === "serve",
  });

  return {
    base: "/api/agora/",
    define: {
      __STOA_BUILD__: JSON.stringify(identity),
    },
    plugins: [react(), buildIdentityAsset(identity)],
    server: {
      port: STOA_DEV_PORT,
      strictPort: true,
    },
    preview: {
      port: STOA_DEV_PORT,
      strictPort: true,
    },
    build: {
      outDir: "../public",
      emptyOutDir: true,
    },
  };
});
