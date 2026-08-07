import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { createTestUser, sessionFor } from "@/test/helpers";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
import { getServerSession } from "next-auth";
import { GET, DELETE } from "./route";

async function makeDeck(userId: string) {
  return prisma.deck.create({
    data: {
      userId,
      title: "Deck",
      topic: "Topic",
      sourceText: "...",
      flashcards: { create: [{ front: "f", back: "b", position: 0 }] },
    },
  });
}

describe("/api/decks/[id]", () => {
  beforeEach(() => vi.mocked(getServerSession).mockReset());

  it("GET returns 404 for a missing deck", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await GET(new Request("http://localhost"), { params: { id: "nope" } });
    expect(res.status).toBe(404);
  });

  it("GET returns 403 for a deck owned by someone else", async () => {
    const owner = await createTestUser();
    const other = await createTestUser();
    const deck = await makeDeck(owner.id);

    vi.mocked(getServerSession).mockResolvedValue(sessionFor(other));
    const res = await GET(new Request("http://localhost"), { params: { id: deck.id } });
    expect(res.status).toBe(403);
  });

  it("GET returns the deck with flashcards for its owner", async () => {
    const user = await createTestUser();
    const deck = await makeDeck(user.id);

    vi.mocked(getServerSession).mockResolvedValue(sessionFor(user));
    const res = await GET(new Request("http://localhost"), { params: { id: deck.id } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.flashcards).toHaveLength(1);
  });

  it("DELETE cascades to flashcards", async () => {
    const user = await createTestUser();
    const deck = await makeDeck(user.id);

    vi.mocked(getServerSession).mockResolvedValue(sessionFor(user));
    const res = await DELETE(new Request("http://localhost"), { params: { id: deck.id } });
    expect(res.status).toBe(200);

    expect(await prisma.deck.findUnique({ where: { id: deck.id } })).toBeNull();
    expect(await prisma.flashcard.findMany({ where: { deckId: deck.id } })).toHaveLength(0);
  });

  it("DELETE is blocked for a non-owner", async () => {
    const owner = await createTestUser();
    const other = await createTestUser();
    const deck = await makeDeck(owner.id);

    vi.mocked(getServerSession).mockResolvedValue(sessionFor(other));
    const res = await DELETE(new Request("http://localhost"), { params: { id: deck.id } });
    expect(res.status).toBe(403);
    expect(await prisma.deck.findUnique({ where: { id: deck.id } })).not.toBeNull();
  });
});
