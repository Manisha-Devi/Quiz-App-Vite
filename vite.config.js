import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      "b7c4b305-dc5f-4ba9-ae2c-5c3efc5ab025-00-36rehncjxgmzj.sisko.replit.dev",
      // Add any other hosts you want to allow here
    ],
  },
});
