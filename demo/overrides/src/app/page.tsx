"use client";
// Static GitHub Pages build: client-side version of src/app/page.tsx
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function HomePage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [status, router]);

  return (
    <div className="bg-navy text-white">
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="text-4xl font-bold sm:text-5xl">Turn your notes into a study session.</h1>
        <p className="mt-4 text-lg text-blue-100">
          Paste your notes or upload a document — Gemini generates flashcards and a quiz.
          Study, get scored, and see exactly which topics need another pass.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/register" className="btn-primary">Get started</Link>
          <Link href="/login" className="btn-outline !border-white !text-white hover:!bg-white hover:!text-navy">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
