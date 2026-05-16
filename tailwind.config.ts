import type { Config } from "tailwindcss";

// Design tokens ported from Stitch v2 "Agentic Precision v2.4" design system.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Surface system
        background: "#f7f9fb",
        surface: "#ffffff",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f2f4f6",
        "surface-container": "#eceef0",
        "surface-container-high": "#e6e8ea",
        "surface-container-highest": "#e0e3e5",
        "on-surface": "#191c1e",
        "on-surface-variant": "#434655",
        "on-background": "#191c1e",
        outline: "#737686",
        "outline-variant": "#c3c6d7",
        "border-subtle": "#e5e7eb",

        // Brand
        primary: "#2563eb",
        "on-primary": "#ffffff",
        "primary-container": "#dbe1ff",
        "on-primary-container": "#00174b",
        "inverse-primary": "#b4c5ff",

        // Sidebar (Agentic Navy)
        "sidebar-navy": "#0f172a",
        "canvas-white": "#ffffff",

        // Secondary / accent
        secondary: "#565e74",
        "secondary-container": "#dae2fd",
        "on-secondary": "#ffffff",
        "secondary-fixed-dim": "#bec6e0",

        // Status
        "success-green": "#16a34a",
        "warning-amber": "#d97706",
        "error-red": "#dc2626",
        error: "#ba1a1a",
        "error-container": "#ffdad6",

        // Tertiary
        tertiary: "#943700",
        "tertiary-container": "#bc4800",
      },
      fontFamily: {
        sans: ['"Inter"', "system-ui", "sans-serif"],
        display: ['"Inter Tight"', '"Inter"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      fontSize: {
        "display-hero": ["48px", { lineHeight: "56px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "display-lg": ["32px", { lineHeight: "40px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-lg": ["24px", { lineHeight: "32px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-md": ["18px", { lineHeight: "24px", fontWeight: "600" }],
        "headline-sm": ["14px", { lineHeight: "20px", fontWeight: "600" }],
        "body-lg": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "body-md": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "body-sm": ["12px", { lineHeight: "16px", fontWeight: "400" }],
        "label-sm": ["12px", { lineHeight: "16px", fontWeight: "500" }],
        "label-caps": ["10px", { lineHeight: "12px", fontWeight: "700", letterSpacing: "0.05em" }],
        "data-mono": ["13px", { lineHeight: "18px", fontWeight: "500" }],
        "data-sm": ["11px", { lineHeight: "14px", fontWeight: "500" }],
      },
      borderRadius: {
        DEFAULT: "4px",
        sm: "2px",
        md: "6px",
        lg: "8px",
        xl: "12px",
        "2xl": "16px",
        "3xl": "24px",
      },
      spacing: {
        "sidebar-width": "280px",
        gutter: "16px",
        "margin-mobile": "16px",
        "margin-desktop": "32px",
      },
      boxShadow: {
        "ai-glow": "0 0 20px rgba(59, 130, 246, 0.2)",
        "ai-glow-strong": "0 0 32px rgba(59, 130, 246, 0.35)",
      },
      backdropBlur: {
        glass: "12px",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        "pulse-subtle": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
      },
      animation: {
        shimmer: "shimmer 1.6s linear infinite",
        "pulse-subtle": "pulse-subtle 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
