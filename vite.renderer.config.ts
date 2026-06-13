import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: path.resolve(dirname, 'src/renderer'),
  clearScreen: false,
  plugins: [react()],
  build: {
    outDir: path.resolve(dirname, '.vite/renderer/main_window'),
    emptyOutDir: true,
  },
});
