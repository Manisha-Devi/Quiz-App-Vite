import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      "892faaa6-d8f2-47f0-a0de-f654030b44ad-00-39pka3kkolyzd.pike.replit.dev",
      // Add any other hosts you want to allow here
    ],
  },
});
