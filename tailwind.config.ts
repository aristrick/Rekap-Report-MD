import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          DEFAULT: "#0F1720", // deep navy-slate, background
          panel: "#161F2C",   // card / panel surface
          line: "#26313F",    // hairline borders
        },
        ink: {
          DEFAULT: "#E7EBEF", // primary text on dark
          dim: "#8C99A8",     // secondary text
        },
        signal: {
          amber: "#E8A33D",   // primary accent — deadline / attention
          green: "#4C9A6A",   // submitted / complete
          red: "#C9564C",     // overdue / rejected
        },
      },
      fontFamily: {
        display: ["'IBM Plex Sans Condensed'", "system-ui", "sans-serif"],
        body: ["'Inter'", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "6px",
      },
    },
  },
  plugins: [],
};

export default config;
