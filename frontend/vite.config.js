import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Used by npm run dev. Vercel Services routes /api at the project level.
  server: {
    proxy: {'/api': 'http://localhost:3001'},
  },
})
