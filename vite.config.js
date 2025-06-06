import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      "ce79a939-c14a-4b24-a048-f37a182dfd7a-00-3d7fu30aj1s9g.pike.replit.dev",
      // Add any other hosts you want to allow here
    ],
  },
});
