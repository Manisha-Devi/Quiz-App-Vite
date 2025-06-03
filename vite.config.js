import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      "03eba55e-d242-4045-a19c-cd64d8fd31a6-00-3tp4wr24lokel.pike.replit.dev",
      "0717a734-836f-41fc-a426-0ee412264c53-00-1jm7npgqnno8g.sisko.replit.dev",
      // Add any other hosts you want to allow here
    ],
  },
});
