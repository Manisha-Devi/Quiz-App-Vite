import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      "74d32585-c90a-4cfa-8fac-9de0fa2d36d8-00-2l6773x25cwxc.sisko.replit.dev",
      // Add any other hosts you want to allow here
    ],
  },
});
