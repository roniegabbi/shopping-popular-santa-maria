import type { Config } from "tailwindcss";

/**
 * Paleta oficial SMDEI / Prefeitura de Santa Maria
 * (extraída de santamariaemnumeros.com)
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#3D1A5B", // roxo profundo (primária)
        navy2: "#5B2785",
        brand: "#8A2BAE", // roxo
        accent: "#F7901E", // laranja (CTA)
        gold: "#F7A81E",
        green: "#58B947",
        magenta: "#E6188D",
        sky: "#1F9BD4",
        ink: "#241433",
        muted: "#6E5C82",
        line: "#EAE2F2",
        ok: "#58B947",
        warn: "#F7A81E",
        bad: "#E6188D",
        wait: "#1F9BD4",
      },
      borderRadius: {
        xl: "14px",
        "2xl": "18px",
      },
      boxShadow: {
        soft: "0 12px 40px rgba(61,26,91,.12)",
      },
    },
  },
  plugins: [],
};
export default config;
