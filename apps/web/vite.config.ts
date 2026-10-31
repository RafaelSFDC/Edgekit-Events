import { defineConfig } from 'vite';
import viteReact from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [
    viteReact({
      compiler: true,
    }),
    tailwindcss(),
  ],
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/app': {
        target: 'http://127.0.0.1:8787',
        ws: true,
      },
      '/apps': 'http://127.0.0.1:8787',
      '/api': {
        target: 'http://127.0.0.1:8787',
        ws: true,
      },
      '/health': 'http://127.0.0.1:8787',
    },
  },
});
