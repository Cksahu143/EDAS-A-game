// Standalone static build used only for GitHub Pages.
// Bypasses TanStack Start's SSR/server pipeline entirely — this just
// mounts the client-only <EdasGame /> canvas component into a plain
// static HTML shell so it can be hosted with no backend.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  base: "/EDAS-A-game/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: "dist-pages",
    rollupOptions: {
      input: path.resolve(__dirname, "gh-pages.html"),
    },
  },
});
