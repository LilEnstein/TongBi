import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Dùng thẳng source TS của package rules để không cần bước build riêng.
      '@tongbi/game-rules': fileURLToPath(
        new URL('../../packages/game-rules/src/index.ts', import.meta.url),
      ),
    },
  },
  server: {
    port: 5173,
    host: true, // cho phép mở từ điện thoại trong cùng mạng LAN
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three', '@react-three/fiber', '@react-three/drei'],
        },
      },
    },
  },
});
