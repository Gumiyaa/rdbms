import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Sumber aplikasi ada di folder `frontend/`.
// `npm run build` menghasilkan file statis di `dist/`, lalu `scripts/publish.mjs`
// menyalinnya ke root folder ini supaya Laragon bisa menyajikan aplikasi
// langsung di http://rdbms.test
export default defineConfig({
  root: 'frontend',
  base: './',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      // Saat `npm run dev`, request /api/* diteruskan ke backend PHP di Laragon.
      '/api': {
        target: 'http://rdbms.test',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    assetsDir: 'assets',
    chunkSizeWarningLimit: 1200,
  },
})
