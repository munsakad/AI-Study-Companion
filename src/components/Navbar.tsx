"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-navy text-white shadow-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <Link href="/" className="text-lg font-bold text-gold" onClick={() => setMenuOpen(false)}>Devweekends</Link>

        <nav className="hidden items-center gap-4 text-sm font-semibold sm:flex">
          {session ? (
            <>
              <Link href="/dashboard" className="hover:text-gold">Dashboard</Link>
              <Link href="/analytics" className="hover:text-gold">Analytics</Link>
              <Link href="/decks/new" className="hover:text-gold">New deck</Link>
              <ThemeToggle />
              <button onClick={() => signOut({ callbackUrl: "/" })} className="rounded bg-gold px-3 py-1.5 text-navy hover:bg-gold-dark">
                Sign out
              </button>
            </>
          ) : (
            <>
              <ThemeToggle />
              <Link href="/login" className="hover:text-gold">Sign in</Link>
              <Link href="/register" className="rounded bg-gold px-3 py-1.5 text-navy hover:bg-gold-dark">Sign up</Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-1 sm:hidden">
          <ThemeToggle />
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="rounded p-1.5 text-white hover:bg-white/10"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="flex flex-col gap-1 border-t border-white/10 px-6 py-3 text-sm font-semibold sm:hidden">
          {session ? (
            <>
              <Link href="/dashboard" className="py-1.5 hover:text-gold" onClick={() => setMenuOpen(false)}>Dashboard</Link>
              <Link href="/analytics" className="py-1.5 hover:text-gold" onClick={() => setMenuOpen(false)}>Analytics</Link>
              <Link href="/decks/new" className="py-1.5 hover:text-gold" onClick={() => setMenuOpen(false)}>New deck</Link>
              <button onClick={() => signOut({ callbackUrl: "/" })} className="mt-1 rounded bg-gold px-3 py-1.5 text-navy hover:bg-gold-dark">
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="py-1.5 hover:text-gold" onClick={() => setMenuOpen(false)}>Sign in</Link>
              <Link href="/register" className="mt-1 rounded bg-gold px-3 py-1.5 text-navy hover:bg-gold-dark" onClick={() => setMenuOpen(false)}>Sign up</Link>
            </>
          )}
        </nav>
      )}
    </header>
  );
}
