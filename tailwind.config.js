/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f7ff",
          100: "#e0effe",
          200: "#b9dffe",
          300: "#7cc4fd",
          400: "#36a4fa",
          500: "#0c87eb",
          600: "#0069c7",
          700: "#0154a1",
          800: "#064785",
          900: "#0b3c6f",
          950: "#07264a",
        },
        sidebar: {
          bg: "#0f172a",
          hover: "#1e293b",
          active: "#0284c7",
          text: "#94a3b8",
          textActive: "#ffffff",
        },
        status: {
          created: "#64748b",
          awaiting: "#f59e0b",
          dispatched: "#3b82f6",
          transit: "#8b5cf6",
          arrived: "#06b6d4",
          ready: "#10b981",
          collected: "#059669",
          missing: "#ef4444",
          damaged: "#dc2626",
          onhold: "#d97706",
          cancelled: "#991b1b",
        }
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
