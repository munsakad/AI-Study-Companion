"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewDeckPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"paste" | "upload">("paste");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData();
    if (mode === "paste") form.append("text", text);
    if (mode === "upload" && file) form.append("file", file);

    const res = await fetch("/api/generate", { method: "POST", body: form });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(body.error ?? "Could not generate study material");
      return;
    }
    router.push(`/decks/${body.deckId}/study`);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <h1 className="text-2xl font-bold text-navy">Generate a new deck</h1>
      <p className="mt-1 text-sm text-gray-600">Gemini will turn this into flashcards and a quiz.</p>

      <div className="mt-6 flex gap-2">
        <button type="button" onClick={() => setMode("paste")} className={mode === "paste" ? "btn-secondary !py-1.5 !px-3 text-xs" : "btn-outline !py-1.5 !px-3 text-xs"}>
          Paste notes
        </button>
        <button type="button" onClick={() => setMode("upload")} className={mode === "upload" ? "btn-secondary !py-1.5 !px-3 text-xs" : "btn-outline !py-1.5 !px-3 text-xs"}>
          Upload a file
        </button>
      </div>

      <form onSubmit={onSubmit} className="card mt-4 space-y-4">
        {mode === "paste" ? (
          <div>
            <label className="label">Your notes</label>
            <textarea
              required={mode === "paste"}
              rows={10}
              className="input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your notes, a textbook excerpt, or describe a topic in detail…"
            />
          </div>
        ) : (
          <div>
            <label className="label">Upload a document</label>
            <input
              required={mode === "upload"}
              type="file"
              accept=".pdf,.txt,text/plain,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="input"
            />
            <p className="mt-1 text-xs text-gray-500">PDF or plain text.</p>
          </div>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <button type="submit" disabled={loading} className="btn-secondary w-full">
          {loading ? "Generating with Gemini…" : "Generate flashcards & quiz"}
        </button>
      </form>
    </div>
  );
}
