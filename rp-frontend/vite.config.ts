import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

// Backend target for the dev proxy. Override with VITE_PROXY_TARGET inside
// docker-compose (e.g. http://rp-backend:5001); defaults to local dev.
const proxyTarget = process.env.VITE_PROXY_TARGET ?? "http://localhost:5001";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true, // listen on 0.0.0.0 so the container is reachable
    port: 5000,
    strictPort: true,
    // Forward API/Sonolus calls to the FastAPI backend during dev.
    proxy: {
      "/api": { target: proxyTarget, changeOrigin: true },
      "/sonolus": { target: proxyTarget, changeOrigin: true },
    },
    // Bind-mounted source on Windows/Docker Desktop doesn't propagate native
    // fs change events into the container, so HMR needs polling instead.
    watch: { usePolling: true, interval: 300 },
  },
  preview: {
    host: true,
    port: 5000,
    strictPort: true,
  },
});
