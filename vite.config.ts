import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // History-роутинг (/admin) вимагає АБСОЛЮТНОЇ бази; прод (GitHub Pages) —
  // підпапка, задається енв-змінною у CI; дев — корінь. Той самий патерн, що й pw-calc.
  base: command === 'build' ? process.env.VITE_BASE || '/' : '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: 'index.html',
    },
  },
}));
