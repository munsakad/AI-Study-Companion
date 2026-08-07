"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-50 bg-navy text-white shadow-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <Link href="/" className="text-lg font-bold text-gold">Devweekends</Link>
        <nav className="flex items-center gap-4 text-sm font-semibold">
          {session ? (
            <>
              <Link href="/dashboard" className="hover:text-gold">Dashboard</Link>
              <Link href="/analytics" className="hover:text-gold">Analytics</Link>
              <Link href="/decks/new" className="hover:text-gold">New deck</Link>
              <button onClick={() => signOut({ callbackUrl: "/" })} className="rounded bg-gold px-3 py-1.5 text-navy hover:bg-gold-dark">
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-gold">Sign in</Link>
              <Link href="/register" className="rounded bg-gold px-3 py-1.5 text-navy hover:bg-gold-dark">Sign up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
