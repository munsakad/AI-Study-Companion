import { execSync } from "node:child_process";
import path from "node:path";
import dotenv from "dotenv";

// Runs once before the whole suite. Resets the test database to exactly
// match the current schema — cheap and safe since it's a disposable
// SQLite file locally (or a throwaway Postgres service container in CI),
// never the dev database.
export default function globalSetup() {
  const env = { ...process.env };
  dotenv.config({ path: path.resolve(__dirname, ".env.test"), processEnv: env });

  execSync("npx prisma db push --force-reset --skip-generate --accept-data-loss", {
    stdio: "inherit",
    env,
  });
}
