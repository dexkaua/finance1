import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "./",
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    hmr: {
      port: 3000,
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          charts: ["recharts", "d3-array", "d3-scale", "d3-time", "d3-format"],
          ui: ["framer-motion", "lucide-react", "canvas-confetti"],
          data: ["date-fns", "decimal.js-light", "uuid"],
        },
      },
    },
  },
});
