import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Pinned so the OAuth origin/redirect registered in Google + Supabase always matches.
    port: 5173,
    strictPort: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.js',
    deps: {
      optimizer: {
        web: {
          include: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
})
