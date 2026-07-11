import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/api/agora/",
  plugins: [react()],
  build: {
    outDir: "../public",
    emptyOutDir: false,
  },
});
