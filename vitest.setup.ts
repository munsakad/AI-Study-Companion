import path from "node:path";
import dotenv from "dotenv";

// Runs before every test file. Must load .env.test into real process.env
// (not just a local object) — `src/lib/prisma.ts` reads process.env.DATABASE_URL
// when it constructs the PrismaClient singleton on first import.
dotenv.config({ path: path.resolve(__dirname, ".env.test") });
