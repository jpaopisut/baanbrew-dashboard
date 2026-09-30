import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "./", // path แบบ relative: deploy ได้ทั้ง root domain และ sub-path
  plugins: [react(), tailwindcss()],
});
