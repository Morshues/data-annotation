import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Listen on all interfaces so other devices on the LAN can connect
  server: {
    host: true,
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
  preview: {
    host: true,
  },
})
