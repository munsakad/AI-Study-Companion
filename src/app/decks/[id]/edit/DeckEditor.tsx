"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Flashcard = { id: string; front: string; back: string };
type Question = { id: string; prompt: string; choices: string[]; correctIndex: number; explanation: string; locked: boolean };
type Deck = { id: string; title: string; topic: string; tags: string[] };

async function api(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`);
  return json;
}

export default function DeckEditor({ deck, flashcards, quiz }: { deck: Deck; flashcards: Flashcard[]; quiz: { id: string; questions: Question[] } | null }) {
  const router = useRouter();
  const [title, setTitle] = useState(deck.title);
  const [topic, setTopic] = useState(deck.topic);
  const [tagInput, setTagInput] = useState(deck.tags.join(", "));
  const [cards, setCards] = useState(flashcards);
  const [questions, setQuestions] = useState(quiz?.questions ?? []);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function flash(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(null), 2500);
  }

  async function saveDeckInfo() {
    setSaving(true);
    setError(null);
    try {
      const tagNames = tagInput.split(",").map((t) => t.trim()).filter(Boolean);
      await api(`/api/decks/${deck.id}`, "PATCH", { title, topic, tagNames });
      flash("Deck details saved.");
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function addCard() {
    try {
      const created = await api(`/api/decks/${deck.id}/flashcards`, "POST", { front: "New question", back: "New answer" });
      setCards((c) => [...c, created]);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function updateCard(id: string, patch: Partial<Flashcard>) {
    try {
      await api(`/api/flashcards/${id}`, "PATCH", patch);
      setCards((c) => c.map((card) => (card.id === id ? { ...card, ...patch } : card)));
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function deleteCard(id: string) {
    try {
      await api(`/api/flashcards/${id}`, "DELETE");
      setCards((c) => c.filter((card) => card.id !== id));
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function addQuestion() {
    try {
      const created = await api(`/api/decks/${deck.id}/questions`, "POST", {
        prompt: "New question",
        choices: ["Option A", "Option B"],
        correctIndex: 0,
        explanation: "Why the correct answer is correct.",
      });
      setQuestions((qs) => [...qs, { ...created, locked: false }]);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function updateQuestion(id: string, patch: Partial<Question>) {
    try {
      const { locked, ...body } = patch;
      const updated = await api(`/api/questions/${id}`, "PATCH", body);
      setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...updated } : q)));
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function deleteQuestion(id: string) {
    try {
      await api(`/api/questions/${id}`, "DELETE");
      setQuestions((qs) => qs.filter((q) => q.id !== id));
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function deleteDeck() {
    if (!confirm(`Delete "${deck.title}" and everything in it? This can't be undone.`)) return;
    try {
      await api(`/api/decks/${deck.id}`, "DELETE");
      router.push("/dashboard");
    } catch (e: any) {
      setError(e.message);
    }
  }

  function exportDeck() {
    const lines = [
      `# ${title}`,
      `Topic: ${topic}`,
      "",
      "This is your own study material, exported for personal use — it includes quiz answers, so don't hand it to someone else who's about to take this quiz themselves.",
      "",
      "## Flashcards",
      "",
      ...cards.flatMap((c) => [`**Q:** ${c.front}`, `**A:** ${c.back}`, ""]),
      "## Quiz",
      "",
      ...questions.flatMap((q, i) => [
        `${i + 1}. ${q.prompt}`,
        ...q.choices.map((choice, ci) => `   ${ci === q.correctIndex ? "✓" : "-"} ${choice}`),
        `   _${q.explanation}_`,
        "",
      ]),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy">Edit deck</h1>
        <Link href={`/decks/${deck.id}/study`} className="btn-outline !py-1.5 !px-3 text-xs">Back to deck</Link>
      </div>

      {error && <p className="rounded-lg bg-danger/10 px-4 py-2 text-sm text-danger">{error}</p>}
      {notice && <p className="rounded-lg bg-ok/10 px-4 py-2 text-sm text-ok">{notice}</p>}

      <section className="card space-y-3">
        <div>
          <label className="label">Title</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="label">Topic</label>
          <input className="input" value={topic} onChange={(e) => setTopic(e.target.value)} />
        </div>
        <div>
          <label className="label">Tags (comma-separated)</label>
          <input className="input" value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="e.g. biology, midterm" />
        </div>
        <div className="flex gap-2">
          <button onClick={saveDeckInfo} disabled={saving} className="btn-secondary !py-1.5 !px-3 text-xs">
            {saving ? "Saving…" : "Save details"}
          </button>
          <button onClick={exportDeck} className="btn-outline !py-1.5 !px-3 text-xs">Export as Markdown</button>
          <button onClick={deleteDeck} className="btn-danger !py-1.5 !px-3 text-xs ml-auto">Delete deck</button>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-navy">Flashcards ({cards.length})</h2>
          <button onClick={addCard} className="btn-outline !py-1.5 !px-3 text-xs">+ Add card</button>
        </div>
        <div className="mt-3 space-y-3">
          {cards.map((c) => (
            <div key={c.id} className="card space-y-2">
              <textarea className="input" rows={2} value={c.front} onChange={(e) => setCards((cs) => cs.map((x) => (x.id === c.id ? { ...x, front: e.target.value } : x)))} onBlur={(e) => updateCard(c.id, { front: e.target.value })} />
              <textarea className="input" rows={2} value={c.back} onChange={(e) => setCards((cs) => cs.map((x) => (x.id === c.id ? { ...x, back: e.target.value } : x)))} onBlur={(e) => updateCard(c.id, { back: e.target.value })} />
              <button onClick={() => deleteCard(c.id)} className="btn-danger !py-1 !px-2 text-xs">Delete</button>
            </div>
          ))}
          {cards.length === 0 && <p className="card text-center text-sm text-gray-500">No flashcards left.</p>}
        </div>
      </section>

      {quiz && (
        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-navy">Quiz questions ({questions.length})</h2>
            <button onClick={addQuestion} className="btn-outline !py-1.5 !px-3 text-xs">+ Add question</button>
          </div>
          <div className="mt-3 space-y-3">
            {questions.map((q) => (
              <div key={q.id} className="card space-y-2">
                {q.locked && <span className="badge bg-warn/15 text-warn">Has quiz history — only prompt/explanation editable</span>}
                <textarea className="input" rows={2} value={q.prompt} onChange={(e) => setQuestions((qs) => qs.map((x) => (x.id === q.id ? { ...x, prompt: e.target.value } : x)))} onBlur={(e) => updateQuestion(q.id, { prompt: e.target.value })} />
                <div className="space-y-1">
                  {q.choices.map((choice, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={q.correctIndex === i}
                        disabled={q.locked}
                        onChange={() => updateQuestion(q.id, { correctIndex: i, choices: q.choices })}
                      />
                      <input
                        className="input"
                        value={choice}
                        disabled={q.locked}
                        onChange={(e) => setQuestions((qs) => qs.map((x) => (x.id === q.id ? { ...x, choices: x.choices.map((c, ci) => (ci === i ? e.target.value : c)) } : x)))}
                        onBlur={() => updateQuestion(q.id, { choices: q.choices, correctIndex: q.correctIndex })}
                      />
                    </div>
                  ))}
                </div>
                <textarea className="input" rows={2} value={q.explanation} onChange={(e) => setQuestions((qs) => qs.map((x) => (x.id === q.id ? { ...x, explanation: e.target.value } : x)))} onBlur={(e) => updateQuestion(q.id, { explanation: e.target.value })} />
                <button onClick={() => deleteQuestion(q.id)} disabled={q.locked} className="btn-danger !py-1 !px-2 text-xs">Delete</button>
              </div>
            ))}
            {questions.length === 0 && <p className="card text-center text-sm text-gray-500">No questions left.</p>}
          </div>
        </section>
      )}
    </div>
  );
}
