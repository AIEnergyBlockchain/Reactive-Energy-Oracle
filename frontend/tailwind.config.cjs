module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        chrome: "#f4f7fb",
        graphite: "#131a24",
        cyan: "#63e7ff",
        lime: "#d3ff6b",
        signal: "#ff8c5a"
      },
      fontFamily: {
        display: ["\"Space Grotesk\"", "sans-serif"],
        mono: ["\"IBM Plex Mono\"", "monospace"]
      },
      boxShadow: {
        chrome: "0 24px 80px rgba(12, 17, 23, 0.12)",
        glow: "0 0 0 1px rgba(99, 231, 255, 0.35), 0 0 32px rgba(99, 231, 255, 0.18)"
      },
      backgroundImage: {
        grain:
          "radial-gradient(circle at top, rgba(99, 231, 255, 0.24), transparent 32%), radial-gradient(circle at 80% 20%, rgba(211, 255, 107, 0.2), transparent 28%), linear-gradient(135deg, rgba(244, 247, 251, 0.96), rgba(227, 235, 244, 0.94))"
      }
    }
  },
  plugins: []
};
