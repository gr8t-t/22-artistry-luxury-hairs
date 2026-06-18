import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: '/22-artistry-luxury-hairs/' when deploying to GitHub Pages
// base: '/' for custom domain / Netlify / Vercel
export default defineConfig({
  plugins: [react()],
  base: '/',
})
