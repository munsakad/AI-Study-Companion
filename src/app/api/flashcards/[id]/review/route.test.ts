import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { createTestUser, sessionFor, jsonRequest } from "@/test/helpers";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
import { getServerSession } from "next-auth";
import { POST } from "./route";

async function makeCard(userId: string) {
  const deck = await prisma.deck.create({
    data: { userId, title: "Deck", topic: "Topic", sourceText: "...", flashcards: { create: [{ front: "f", back: "b", position: 0 }] } },
    include: { flashcards: true },
  });
  return deck.flashcards[0];
}

describe("POST /api/flashcards/[id]/review", () => {
  beforeEach(() => vi.mocked(getServerSession).mockReset());

  it("updates SR fields and logs a ReviewLog row", async () => {
    const user = await createTestUser();
    const card = await makeCard(user.id);

    vi.mocked(getServerSession).mockResolvedValue(sessionFor(user));
    const res = await POST(jsonRequest("http://localhost", "POST", { grade: 2 }), { params: { id: card.id } });
    expect(res.status).toBe(200);

    const updated = await prisma.flashcard.findUnique({ where: { id: card.id } });
    expect(updated?.repetitions).toBe(1);
    expect(updated?.intervalDays).toBe(1);
    expect(updated?.lastReviewedAt).not.toBeNull();

    const logs = await prisma.reviewLog.findMany({ where: { flashcardId: card.id } });
    expect(logs).toHaveLength(1);
    expect(logs[0].grade).toBe(2);
  });

  it("403s when grading someone else's flashcard", async () => {
    const owner = await createTestUser();
    const other = await createTestUser();
    const card = await makeCard(owner.id);

    vi.mocked(getServerSession).mockResolvedValue(sessionFor(other));
    const res = await POST(jsonRequest("http://localhost", "POST", { grade: 2 }), { params: { id: card.id } });
    expect(res.status).toBe(403);
  });

  it("rejects an out-of-range grade", async () => {
    const user = await createTestUser();
    const card = await makeCard(user.id);

    vi.mocked(getServerSession).mockResolvedValue(sessionFor(user));
    const res = await POST(jsonRequest("http://localhost", "POST", { grade: 9 }), { params: { id: card.id } });
    expect(res.status).toBe(400);
  });
});
