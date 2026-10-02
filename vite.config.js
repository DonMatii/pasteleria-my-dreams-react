import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Demo local: enrutado por path hacia cada servicio Spring (misma idea que la
  // API Gateway de AWS, pero en dev). VITE_API_BASE_URL apunta a este mismo
  // origen (localhost:5173) vía .env.development, así el navegador no necesita CORS.
  server: {
    proxy: {
      '/api/productos': 'http://localhost:8080',
      '/api/pedidos': 'http://localhost:8082',
      '/api/estadisticas': 'http://localhost:8081',
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.js',
  },
})