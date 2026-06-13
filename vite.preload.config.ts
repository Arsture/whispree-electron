import { defineConfig } from 'vite';

export default defineConfig({
  clearScreen: false,
  build: {
    target: 'node22',
    rollupOptions: {
      external: ['electron'],
    },
  },
});
