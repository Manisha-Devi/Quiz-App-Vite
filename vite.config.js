import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      "f0344730-f52a-4e2c-85c2-efd41e91b63d-00-349y0m8at4j0o.sisko.replit.dev",
      // Add any other hosts you want to allow here
    ],
  },
});
