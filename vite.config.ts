/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // Separate vendor chunks so app updates don't invalidate cached libraries.
        manualChunks: {
          react: ['react', 'react-dom', 'react-dom/client'],
          katex: ['katex'],
          mathjs: ['mathjs/number'],
          motion: ['framer-motion'],
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
