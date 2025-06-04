import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      "680e202f-d0b9-443f-a9b9-72bf268a6ea0-00-1v5i6hdsfws9g.pike.replit.dev",
      // Add any other hosts you want to allow here
    ],
  },
});
