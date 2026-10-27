import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/expenses": {
        target: "http://localhost:5000",
        changeOrigin: true,
        bypass(request) {
          if (request.headers.accept?.includes("text/html"))
            return "/index.html";
        },
      },
      "/income": {
        target: "http://localhost:5000",
        changeOrigin: true,
        bypass(request) {
          if (request.headers.accept?.includes("text/html"))
            return "/index.html";
        },
      },
    },
  },
});
