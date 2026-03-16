import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  server: {
    host: true,
    port: 3005,
    allowedHosts: ['bufing-lounge-reynolds-based.trycloudflare.com', 'gerald-flu-mixed-author.trycloudflare.com', 'organizational-brain-prize-rfc.trycloudflare.com', 'innocent-thinks-processed-www.trycloudflare.com', 'dealing-about-aircraft-thumbs.trycloudflare.com', 'lobby-costa-subjects-girls.trycloudflare.com', 'recruiting-basename-tel-colon.trycloudflare.com'],
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/static': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
