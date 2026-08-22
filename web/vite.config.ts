import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // 开发环境下将 /api 与 /uploads 转发给后端服务，避免跨域配置负担
      "/api": "http://localhost:8787",
      "/uploads": "http://localhost:8787",
    },
  },
});
