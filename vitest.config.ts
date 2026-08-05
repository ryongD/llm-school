import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "#velite": path.resolve(import.meta.dirname, ".velite"),
    },
  },
});
