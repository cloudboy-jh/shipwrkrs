import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  plugins: [vue(), tailwindcss()],
  server: {
    port: 5173,
    proxy: mode === 'development' ? {
      '/api': {
        target: 'http://localhost:8788',
        changeOrigin: true,
      },
    } : undefined,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
}));
