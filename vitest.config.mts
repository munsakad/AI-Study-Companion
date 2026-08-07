import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Local `npm test` runs against SQLite (.env.test), matching local dev.
// CI (.github/workflows/ci.yml) runs the same suite against a real
// Postgres service container, which is the authoritative check for
// production-engine correctness — see README's "Testing" section.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globalSetup: ["./vitest.global-setup.ts"],
    setupFiles: ["./vitest.setup.ts"],
    testTimeout: 15000,
    hookTimeout: 15000,
  },
});
