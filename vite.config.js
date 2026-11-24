import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: '/22-artistry-luxury-hairs/' when deploying to GitHub Pages
// base: '/' for custom domain / Netlify / Vercel
export default defineConfig({
  plugins: [react()],
  base: '/',
  // `npm run dev` has no serverless API, so pass /api calls to the deployed site.
  // This means the local preview shows (and can change) the REAL data.
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'https://22-artistry-luxury-hairs.vercel.app',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
