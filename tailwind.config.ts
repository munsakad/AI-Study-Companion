import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#003366", dark: "#002244", light: "#0056b3" },
        gold: { DEFAULT: "#ffcc00", dark: "#e6b800" },
        paper: "#f4f6f8",
        ink: "#333333",
        ok: "#007a3d",
        warn: "#b5862b",
        danger: "#cc0000",
      },
      borderRadius: { DEFAULT: "8px", lg: "12px" },
      fontFamily: { sans: ["Arial", "sans-serif"] },
    },
  },
  plugins: [],
};
export default config;
