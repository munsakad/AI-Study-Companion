import { describe, it, expect } from "vitest";
import { checkGenerationLimit, recordGeneration, GENERATION_DAILY_LIMIT } from "./rateLimit";
import { createTestUser } from "@/test/helpers";

describe("checkGenerationLimit / recordGeneration", () => {
  it("allows generations under the limit and reports remaining count", async () => {
    const user = await createTestUser();
    const before = await checkGenerationLimit(user.id);
    expect(before.allowed).toBe(true);
    expect(before.remaining).toBe(GENERATION_DAILY_LIMIT);

    await recordGeneration(user.id);
    const after = await checkGenerationLimit(user.id);
    expect(after.remaining).toBe(GENERATION_DAILY_LIMIT - 1);
  });

  it("blocks once the limit is reached, and resetAt is in the future", async () => {
    const user = await createTestUser();
    for (let i = 0; i < GENERATION_DAILY_LIMIT; i++) await recordGeneration(user.id);

    const result = await checkGenerationLimit(user.id);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.resetAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("scopes the limit per-user", async () => {
    const userA = await createTestUser();
    const userB = await createTestUser();
    for (let i = 0; i < GENERATION_DAILY_LIMIT; i++) await recordGeneration(userA.id);

    expect((await checkGenerationLimit(userA.id)).allowed).toBe(false);
    expect((await checkGenerationLimit(userB.id)).allowed).toBe(true);
  });

  it("only counts generations within the rolling 24h window", async () => {
    const user = await createTestUser();
    for (let i = 0; i < GENERATION_DAILY_LIMIT; i++) await recordGeneration(user.id);

    const in25h = new Date(Date.now() + 25 * 60 * 60 * 1000);
    const result = await checkGenerationLimit(user.id, in25h);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(GENERATION_DAILY_LIMIT);
  });
});
