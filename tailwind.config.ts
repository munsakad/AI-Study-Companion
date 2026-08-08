import type { Config } from "tailwindcss";

// navy/gold/ok/warn/danger/white are brand chrome — the navbar, hero,
// buttons, and badges use them as fixed colors against a permanently-dark
// or permanently-bright background, and stay the same hex in both themes
// (see globals.css for why: a color can't be both "light text fixed on a
// dark navy header" and "page-surface text that must flip with the page"
// at once). Only `ink`/`gray-*`/`paper` — the tokens actually used for
// page/card surfaces and body text — are wired to CSS variables that flip
// in .dark, via the `withOpacity` helper below. `.card`/`.input`/
// `.btn-outline`'s surface color is handled directly in globals.css with
// the same --surface variable, since aliasing Tailwind's own `white` would
// also repaint the navbar/hero's fixed-white text and break their contrast.
// Tailwind's Config type only declares string color values, but the
// library itself accepts this function form at runtime (it's how
// Tailwind's own opacity modifiers, e.g. bg-navy/50, work) — hence the cast.
function withOpacity(cssVar: string): string {
  return (({ opacityValue }: { opacityValue?: string }) =>
    opacityValue !== undefined ? `rgb(var(${cssVar}) / ${opacityValue})` : `rgb(var(${cssVar}))`) as unknown as string;
}

const config: Config = {
  // No dark: utility classes are used anywhere — theming is done entirely
  // via the CSS variables in globals.css, keyed off this same attribute.
  // Declared here so any future dark: utility stays consistent with it.
  darkMode: ["selector", '[data-theme="dark"]'],
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // navy.light is accent *text* only (never a background in this
        // app), so unlike navy/navy.dark it can safely flip per theme.
        navy: { DEFAULT: "#003366", dark: "#002244", light: withOpacity("--accent") },
        gold: { DEFAULT: "#ffcc00", dark: "#e6b800" },
        ok: "#007a3d",
        warn: "#b5862b",
        danger: "#cc0000",

        // Theme-aware surface tokens (see globals.css :root / .dark).
        paper: withOpacity("--surface-alt"),
        ink: withOpacity("--ink"),
        gray: {
          50: withOpacity("--surface-alt"),
          100: withOpacity("--border-subtle"),
          200: withOpacity("--border"),
          300: withOpacity("--border"),
          400: withOpacity("--text-muted-1"),
          500: withOpacity("--text-muted-2"),
          600: withOpacity("--text-muted-3"),
        },
      },
      borderRadius: { DEFAULT: "8px", lg: "12px" },
      fontFamily: { sans: ["Arial", "sans-serif"] },
    },
  },
  plugins: [],
};
export default config;
