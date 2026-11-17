import { defineConfig } from 'vitest/config';

// GitHub Pages serves the site from /<repo>/, so the base comes from VITE_BASE.
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
