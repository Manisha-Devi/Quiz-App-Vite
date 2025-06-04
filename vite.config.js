import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      "2d6cb4b1-1aac-4e06-b32b-2838b72fd40d-00-3578vfeywimlp.pike.replit.dev",
      // Add any other hosts you want to allow here
    ],
  },
});
