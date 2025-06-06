import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      "65f8cbde-6a4d-4c71-b8eb-2d0c2dab8cf2-00-148d2h406q7rh.sisko.replit.dev",
      // Add any other hosts you want to allow here
    ],
  },
});
