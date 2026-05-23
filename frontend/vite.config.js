import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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
