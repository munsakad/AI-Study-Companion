"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export default function ThemeToggle() {
  // Matches the no-flash script in layout.tsx: an explicit data-theme
  // attribute wins, otherwise fall back to the OS preference.
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const current = (document.documentElement.dataset.theme as Theme | undefined) ?? (systemPrefersDark() ? "dark" : "light");
    setTheme(current);
    setMounted(true);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem("theme", next);
  }

  // Avoid a hydration mismatch: render nothing identifiable until mounted,
  // then show the real toggle. The page itself never flashes the wrong
  // theme — that's handled by the inline script in layout.tsx, which runs
  // before paint, independent of when this component hydrates.
  if (!mounted) return <button className="w-8 rounded p-1.5 text-white/0" aria-hidden />;

  return (
    <button
      onClick={toggle}
      className="rounded p-1.5 text-white hover:bg-white/10"
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
