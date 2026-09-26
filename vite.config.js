import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // Ensures relative paths for GitHub Pages, Vercel, Netlify, and static deployments
  build: {
    outDir: 'dist',
    sourcemap: false
  },
  server: {
    port: 3000,
    open: true
  }
});
