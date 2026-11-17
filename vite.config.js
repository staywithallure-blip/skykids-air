import { defineConfig } from 'vite';

// Relative base so `dist/` works from any static host, including a subfolder.
export default defineConfig({
  base: './',
  server: {
    host: '0.0.0.0',
    port: 5199,
    strictPort: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 5201,
    strictPort: true,
  },
});
