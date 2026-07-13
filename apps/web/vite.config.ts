import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxying /api to the server keeps dev SAME-ORIGIN. Session cookies then
    // "just work" — no third-party-cookie rules, no SameSite=None, no reflexive
    // CORS loosening that quietly ships to production.
    proxy: {
      '/api': { target: 'http://localhost:3005', changeOrigin: true },
    },
  },
});
