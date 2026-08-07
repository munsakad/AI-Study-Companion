import { prisma } from "@/lib/prisma";
import type { Session } from "next-auth";

let counter = 0;

/** Creates a real user row (route ownership checks hit the DB, not a mock). */
export async function createTestUser(overrides: Partial<{ name: string; email: string }> = {}) {
  counter += 1;
  return prisma.user.create({
    data: {
      name: overrides.name ?? `Test User ${counter}`,
      email: overrides.email ?? `test-${counter}-${Date.now()}@example.com`,
      passwordHash: "not-a-real-hash",
    },
  });
}

export function sessionFor(user: { id: string; name: string; email: string }): Session {
  return { user: { id: user.id, name: user.name, email: user.email }, expires: "2099-01-01T00:00:00.000Z" };
}

export function jsonRequest(url: string, method: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}
