import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "var(--background)",
                foreground: "var(--foreground)",
                primary: {
                    DEFAULT: "#6C5CE7",
                    light: "#A29BFE",
                    dark: "#4A3CB5",
                },
                accent: {
                    cyan: "#00CEC9",
                    magenta: "#FD79A8",
                    amber: "#FDCB6E",
                    emerald: "#00B894",
                },
                surface: {
                    DEFAULT: "#1A1A2E",
                    light: "#25253E",
                    lighter: "#2D2D4A",
                    dark: "#12121F",
                },
                muted: "#6C7293",
            },
            fontFamily: {
                sans: ["Inter", "system-ui", "sans-serif"],
                mono: ["JetBrains Mono", "Fira Code", "monospace"],
            },
            animation: {
                "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                "glow": "glow 2s ease-in-out infinite alternate",
                "slide-up": "slideUp 0.5s ease-out",
                "fade-in": "fadeIn 0.3s ease-out",
            },
            keyframes: {
                glow: {
                    "0%": { boxShadow: "0 0 5px rgba(108, 92, 231, 0.2)" },
                    "100%": { boxShadow: "0 0 20px rgba(108, 92, 231, 0.6)" },
                },
                slideUp: {
                    "0%": { transform: "translateY(10px)", opacity: "0" },
                    "100%": { transform: "translateY(0)", opacity: "1" },
                },
                fadeIn: {
                    "0%": { opacity: "0" },
                    "100%": { opacity: "1" },
                },
            },
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
                "hero-glow": "radial-gradient(ellipse at center, rgba(108, 92, 231, 0.15) 0%, transparent 70%)",
            },
        },
    },
    plugins: [],
};

export default config;
