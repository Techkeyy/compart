import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/",
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom"],
          "solana-vendor": ["@solana/web3.js"],
          "magicblock-vendor": ["@magicblock-labs/ephemeral-rollups-sdk"],
        },
      },
    },
  },
  server: {
    port: 4173,
  },
});
