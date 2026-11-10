import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // Chemins relatifs : GitHub Pages sert le site depuis un sous-dossier.
  base: './',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    // En developpement, /api et /uploads sont renvoyes vers le backend local :
    // l'admin et le formulaire de reservation fonctionnent sans configurer
    // VITE_API_URL. Sans le proxy /uploads, les photos deposees par l'admin
    // s'affichent en 404 sur le site alors que le serveur les sert bien.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
})
