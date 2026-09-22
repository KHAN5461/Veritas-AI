import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  esbuild: {
    jsx: 'automatic'
  },
  plugins: [
    tailwindcss(),
    {
      name: 'copy-manifest',
      writeBundle() {
        if (!fs.existsSync('dist')) {
          fs.mkdirSync('dist');
        }
        if (fs.existsSync('public/manifest.json')) {
          fs.copyFileSync('public/manifest.json', 'dist/manifest.json');
        }
        if (fs.existsSync('public/icons')) {
          fs.cpSync('public/icons', 'dist/icons', { recursive: true });
        }
      }
    }
  ],
  build: {
    rollupOptions: {
      input: {
        sidepanel: resolve(__dirname, 'sidepanel.html'),
        background: resolve(__dirname, 'src/background.ts'),
        content: resolve(__dirname, 'src/content.ts'),
        sync: resolve(__dirname, 'src/sync.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].[hash].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  }
});
