import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      "03eba55e-d242-4045-a19c-cd64d8fd31a6-00-3tp4wr24lokel.pike.replit.dev",
      "7acf9296-3260-40a4-8f1e-9adf4cba8021-00-1ku2bxq8ygi2x.pike.replit.dev",
      // Add any other hosts you want to allow here
    ],
  },
});
