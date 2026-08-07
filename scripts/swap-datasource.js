#!/usr/bin/env node
// Dev stays on SQLite (zero local setup); CI and production use Postgres.
// Rather than maintaining two full schema files (and two generated
// Prisma Client outputs to keep in sync), this rewrites just the
// `datasource` provider line in prisma/schema.prisma in place. Used by
// CI before its Postgres-backed test run, and by the Vercel build
// command before `prisma generate`/`db push` — never by local `npm run dev`.
const fs = require("node:fs");
const path = require("node:path");

const target = process.argv[2];
if (target !== "sqlite" && target !== "postgresql") {
  console.error("Usage: node scripts/swap-datasource.js <sqlite|postgresql>");
  process.exit(1);
}

const schemaPath = path.join(__dirname, "..", "prisma", "schema.prisma");
const original = fs.readFileSync(schemaPath, "utf-8");
const updated = original.replace(/provider\s*=\s*"(sqlite|postgresql)"(?=\s*\n\s*url\s*=\s*env\("DATABASE_URL"\))/, `provider = "${target}"`);

if (updated === original && !original.includes(`provider = "${target}"`)) {
  console.error("Could not find the datasource provider line to swap — check prisma/schema.prisma's format.");
  process.exit(1);
}

fs.writeFileSync(schemaPath, updated);
console.log(`prisma/schema.prisma datasource provider set to "${target}".`);
