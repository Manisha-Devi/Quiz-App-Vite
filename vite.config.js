import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      "729f9f0f-eb76-4245-ac3f-3ad980d225fd-00-1wb0tpoio78dp.pike.replit.dev",
      // Add any other hosts you want to allow here
    ],
  },
});
