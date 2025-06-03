import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      "03eba55e-d242-4045-a19c-cd64d8fd31a6-00-3tp4wr24lokel.pike.replit.dev",
      "2e1902a0-7a59-445c-86b1-fe964e8d5474-00-17twr0g9yij61.pike.replit.dev",
      // Add any other hosts you want to allow here
    ],
  },
});
