import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Devweekends",
  description: "AI-generated flashcards and quizzes from your notes, powered by Gemini.",
};

// Runs before paint so the page never flashes the wrong theme while
// hydrating. Reads the explicit choice from ThemeToggle if there is one;
// otherwise leaves no data-theme attribute at all, so the CSS
// prefers-color-scheme media query (globals.css) governs.
const noFlashThemeScript = `
(function () {
  try {
    var stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") {
      document.documentElement.dataset.theme = stored;
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashThemeScript }} />
      </head>
      <body>
        <Providers>
          <Navbar />
          <main className="min-h-screen">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
