import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      "111a153d-1bb1-45ae-8040-72cdb7bfca0c-00-3adrlgvh23jhw.pike.replit.dev",
      // Add any other hosts you want to allow here
    ],
  },
});
