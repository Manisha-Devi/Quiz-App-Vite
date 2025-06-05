import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      "cfa841eb-48aa-4d6b-835c-99ba0cbfbb28-00-2e0zwdxd8kpcx.pike.replit.dev",
      // Add any other hosts you want to allow here
    ],
  },
});
