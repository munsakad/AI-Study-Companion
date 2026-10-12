"use client";
// Static GitHub Pages build: replaces src/app/decks/[id]/edit/page.tsx (?id= instead of /[id]/)
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import RequireAuth from "@/demo/RequireAuth";
import DeckEditor from "./DeckEditor";

type Props = React.ComponentProps<typeof DeckEditor>;

function Edit() {
  const id = useSearchParams().get("id");
  const [data, setData] = useState<Props | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!id) return setMissing(true);
    fetch(`/api/_demo/deck-editor/${encodeURIComponent(id)}`).then(async (res) => (res.ok ? setData(await res.json()) : setMissing(true)));
  }, [id]);

  if (missing) return <p className="mx-auto max-w-2xl px-6 py-12 text-center text-gray-500">Deck not found.</p>;
  if (!data) return <p className="mx-auto max-w-2xl px-6 py-12 text-center text-sm text-gray-500">Loading…</p>;

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <DeckEditor key={data.deck.id} {...data} />
    </div>
  );
}

export default function EditDeckPage() {
  return (
    <RequireAuth>
      <Suspense fallback={null}>
        <Edit />
      </Suspense>
    </RequireAuth>
  );
}
